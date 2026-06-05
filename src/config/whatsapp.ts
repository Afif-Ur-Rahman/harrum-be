import axios from "axios";

import { WHATSAPP } from "@/constants/env";
import { LOGUI } from "@/constants/logs";

if (!WHATSAPP.WHATSAPP_TOKEN) {
  console.log(LOGUI.FgRed, "WhatsApp API token not provided");
}

const whatsapp = axios.create({
  baseURL: WHATSAPP.WHATSAPP_BASE_URL,
  headers: {
    Authorization: `Bearer ${WHATSAPP.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export { whatsapp };
