// @description Creates automated MongoDB backups and uploads them to S3, with cleanup of old backups

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

import { deleteFileFromAws, uploadFileToAws } from "../src/config/s3";
import { LOGUI } from "../src/constants";

// === CONFIG ===
const BACKUP_DIR = path.join(process.cwd(), "uploads", "backups");
const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI;
const PROJECT_DIR = process.env.PROJECT_DIR || path.basename(process.cwd());
const S3_FOLDER = `backups/${PROJECT_DIR}`;

async function runBackup(backupType: "manual" | "auto" = "auto") {
  console.log(LOGUI.FgYellow, `BACKUP: Running ${backupType} backup...`);
  try {
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(LOGUI.FgYellow, `BACKUP: Created backup directory: ${BACKUP_DIR}`);
    }

    // Generate filename with backup type
    const DATE = new Date().toISOString().replace(/[:.]/g, "-");
    const FILENAME = `mongo-${PROJECT_DIR}-${backupType}-${DATE}`;
    const TGZ_FILE = `${FILENAME}.tar.gz`;

    const dumpPath = path.join(BACKUP_DIR, FILENAME);

    // Run mongodump
    console.log(LOGUI.FgYellow, "BACKUP: Running mongodump...");
    const mongodumpResult = spawnSync("mongodump", ["--uri", MONGO_URI || "", "--out", dumpPath], {
      stdio: "inherit",
      shell: false,
    });
    if (mongodumpResult.error || mongodumpResult.status !== 0) {
      throw new Error(`mongodump failed: ${mongodumpResult.error?.message || "Unknown error"}`);
    }

    // Compress backup
    console.log(LOGUI.FgYellow, "BACKUP: Compressing backup...");
    const tarResult = spawnSync("tar", ["-czf", `${dumpPath}.tar.gz`, "-C", BACKUP_DIR, FILENAME], {
      stdio: "inherit",
      shell: false,
    });
    if (tarResult.error || tarResult.status !== 0) {
      throw new Error(`tar compression failed: ${tarResult.error?.message || "Unknown error"}`);
    }

    // Remove dump folder
    console.log(LOGUI.FgYellow, "BACKUP: Cleaning up uncompressed backup...");
    if (fs.existsSync(dumpPath)) {
      fs.rmSync(dumpPath, { recursive: true, force: true });
    }

    // Upload to AWS
    const s3Key = `${S3_FOLDER}/${TGZ_FILE}`;
    console.log(LOGUI.FgYellow, `BACKUP: Uploading backup to S3`);

    const publicUrl = await uploadFileToAws(s3Key, `${dumpPath}.tar.gz`, "application/gzip");

    console.log(LOGUI.FgGreen, "BACKUP: ✅ Backup uploaded:", publicUrl);
    // Delete local file
    if (fs.existsSync(`${dumpPath}.tar.gz`)) {
      fs.unlinkSync(`${dumpPath}.tar.gz`);
      console.log(LOGUI.FgGreen, "BACKUP: Deleted local backup file");
    }

    // Delete S3 backups older than 30 days (optional)
    await deleteOldS3Backups();

    console.log(LOGUI.FgGreen, "BACKUP: ✅ Backup completed successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error(LOGUI.FgRed, "BACKUP: ❌ Backup failed:", err.message);
    process.exit(1);
  }
}

// === DELETE OLD BACKUPS FROM S3 (OLDER THAN 30 DAYS) ===
async function deleteOldS3Backups() {
  console.log(LOGUI.FgYellow, "BACKUP: Checking for backups older than 30 days...");

  const days30 = 30 * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(LOGUI.FgYellow, "BACKUP: Backup directory does not exist, skipping cleanup.");
    return;
  }

  const backupFiles = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".tar.gz"));

  console.log(
    LOGUI.FgYellow,
    `BACKUP: Found ${backupFiles.length} backup files in local directory`,
  );

  for (const file of backupFiles) {
    const fullPath = path.join(BACKUP_DIR, file);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const stats = fs.statSync(fullPath);

    if (Date.now() - stats.mtimeMs > days30) {
      const s3Key = `${S3_FOLDER}/${file}`;
      console.log(LOGUI.FgYellow, `BACKUP: Deleting old backup from S3: ${s3Key}`);
      try {
        await deleteFileFromAws(s3Key);
        // Also delete local file
        fs.unlinkSync(fullPath);
        console.log(LOGUI.FgGreen, `BACKUP: ✅ Deleted local file: ${file}`);
      } catch (error: any) {
        console.error(LOGUI.FgRed, `BACKUP: ❌ Failed to delete ${s3Key}:`, error.message);
      }
    }
  }

  console.log(LOGUI.FgGreen, "BACKUP: ✅ Cleanup completed");
}

// CLI entry point
if (require.main === module) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    import("mongoose").then(async (mongoose) => {
      const DB_URI = process.env.DB_URI;
      if (!DB_URI) {
        console.error(LOGUI.FgRed, "BACKUP: ❌ DB_URI is not set");
        process.exit(1);
      }
      await mongoose.connect(DB_URI);
      console.log(LOGUI.FgGreen, "BACKUP: ✅ Connected to DB");

      // Detect if running manually (TTY) or automatically (PM2 cron)
      // Manual runs typically have a TTY (interactive terminal), automated runs don't
      // When PM2 runs cron jobs, stdin is not a TTY
      const isManual = process.stdin.isTTY === true;
      const backupType: "manual" | "auto" = isManual ? "manual" : "auto";

      // For auto backups, only execute between 12:00 AM - 1:00 AM
      if (backupType === "auto") {
        const now = new Date();
        const currentHour = now.getHours();

        // Only allow execution between 12:00 AM (hour 0) and 1:00 AM (hour 0, before 1:00)
        // Hour 0 = 12:00 AM to 12:59 AM
        if (currentHour !== 0) {
          console.log(
            LOGUI.FgYellow,
            `BACKUP: ⏭️  Auto backup skipped. Current time: ${now.toLocaleTimeString()}. Auto backups only run between 12:00 AM - 1:00 AM.`,
          );
          await mongoose.disconnect();
          process.exit(0);
        }
      }

      try {
        await runBackup(backupType);
      } catch (err) {
        console.error(LOGUI.FgRed, "BACKUP: ❌ Error during backup:", err);
        process.exit(1);
      } finally {
        await mongoose.disconnect();
        process.exit(0);
      }
    });
  });
}

export { runBackup, deleteOldS3Backups };
