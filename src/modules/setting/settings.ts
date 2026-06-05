import mongoose from "mongoose";

type Settings = {
  database: string;
  aws: { bucketName: string; region: string; accessKeyId: string; secretAccessKey: string };
  brevo: { senderName: string; senderEmail: string; mailApiKey: string };
  oneSignal: { oneSignalAppId: string; oneSignalApiKey: string };
  social: { appleId: string; googleId: string };
};

export interface ISettings extends mongoose.Document, Settings {}

const settingsSchema = new mongoose.Schema(
  {
    database: { type: String, required: true },
    aws: {
      bucketName: { type: String, required: true },
      region: { type: String, required: true },
      accessKeyId: { type: String, required: true },
      secretAccessKey: { type: String, required: true },
    },
    brevo: {
      senderName: { type: String, required: true },
      senderEmail: { type: String, required: true },
      mailApiKey: { type: String, required: true },
    },
    oneSignal: {
      oneSignalAppId: { type: String, required: true },
      oneSignalApiKey: { type: String, required: true },
    },
    social: {
      appleId: { type: String, required: true },
      googleId: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export const Settings = mongoose.model<ISettings>("Settings", settingsSchema);
