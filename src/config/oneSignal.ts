import axios from "axios";

import { ONESIGNAL } from "@/constants/env";
import { Settings } from "@/modules/setting/settings";

let configCache: { apiKey: string; appId: string } | null = null;
let configCachedAt = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

const getOneSignalConfig = async () => {
  const now = Date.now();
  if (configCache && now - configCachedAt < CONFIG_TTL_MS) return configCache;

  const config = await Settings.findOne().lean();
  configCache = {
    apiKey: config?.oneSignal?.oneSignalApiKey || ONESIGNAL.API_KEY,
    appId: config?.oneSignal?.oneSignalAppId || ONESIGNAL.APP_ID,
  };
  configCachedAt = now;
  return configCache;
};

export const checkPlayerSubscription = async (playerId: string) => {
  const { apiKey, appId } = await getOneSignalConfig();
  if (!apiKey || !appId) return false;

  try {
    const response = await axios.get(
      `https://onesignal.com/api/v1/players/${playerId}?app_id=${appId}`,
      { headers: { Authorization: `Basic ${apiKey}` } },
    );
    return response.data;
  } catch {
    return false;
  }
};

export const sendNotification = async ({
  title = "New Notification",
  message = "New Notification Message",
  data = {},
  playerIds = [],
}: {
  title?: string;
  message?: string;
  data?: Record<string, any>;
  playerIds: string[];
}) => {
  const { apiKey, appId } = await getOneSignalConfig();
  if (!apiKey || !appId || !playerIds.length) return;

  try {
    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: appId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${apiKey}`,
        },
      },
    );
    return { success: true, result: response.data, playerIds, title, notification: message, data };
  } catch (error: any) {
    console.error("OneSignal notification failed:", error.response?.data?.errors || error.message);
  }
};
