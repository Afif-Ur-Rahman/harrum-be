import mongoose from "mongoose";

type Settings = {
  database: string;
  brevo: { senderName: string; senderEmail: string; mailApiKey: string };
};

export interface ISettings extends mongoose.Document, Settings {}

const settingsSchema = new mongoose.Schema(
  {
    database: { type: String, required: true },
    brevo: {
      senderName: { type: String, required: true },
      senderEmail: { type: String, required: true },
      mailApiKey: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export const Settings = mongoose.model<ISettings>("Settings", settingsSchema);
