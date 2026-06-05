import { BREVO, MODE } from "@/constants/env";
import { Settings } from "@/modules/setting/settings";

const SibApiV3Sdk = require("sib-api-v3-sdk");

interface IMailInfo {
  to: string;
  subject: string;
  html: string;
}

interface IBrevoConfig {
  apiKey: string;
  senderName: string;
  senderEmail: string;
}

let configCache: IBrevoConfig | null = null;
let configCachedAt = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

const getBrevoConfig = async (): Promise<IBrevoConfig> => {
  const now = Date.now();
  if (configCache && now - configCachedAt < CONFIG_TTL_MS) {
    return configCache;
  }

  const settings = await Settings.findOne().lean();
  configCache = {
    apiKey: settings?.brevo?.mailApiKey || BREVO.API_KEY,
    senderName: settings?.brevo?.senderName || BREVO.NAME,
    senderEmail: settings?.brevo?.senderEmail || BREVO.EMAIL,
  };
  configCachedAt = now;

  return configCache;
};

export const sendEmail = async (mailInfo: IMailInfo): Promise<void> => {
  if (MODE === "dev") {
    console.log("[Brevo] Skipping email in dev mode:", mailInfo.subject, "->", mailInfo.to);
    return;
  }

  const { apiKey, senderName, senderEmail } = await getBrevoConfig();

  if (!apiKey) {
    throw new Error("Brevo API key is not configured");
  }

  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = apiKey;

    const api = new SibApiV3Sdk.TransactionalEmailsApi();
    const mail = new SibApiV3Sdk.SendSmtpEmail();

    mail.subject = mailInfo.subject;
    mail.sender = { email: senderEmail, name: senderName };
    mail.to = [{ email: mailInfo.to }];
    mail.htmlContent = mailInfo.html;

    await api.sendTransacEmail(mail);
  } catch (error: any) {
    console.log("[Brevo] Failed to send email:", error);
    throw new Error(`Failed to send email to ${mailInfo.to}: ${error.message}`);
  }
};
