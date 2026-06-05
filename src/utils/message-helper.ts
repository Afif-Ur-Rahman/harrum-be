import { whatsapp } from "@/config";
import { LOGUI, WHATSAPP } from "@/constants";

export const sendWhatsAppMessage = async (messageInfo: {
  to?: string;
  templateName: string;
  otp: string;
}) => {
  try {
    const response = await whatsapp.post(`/${WHATSAPP.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to: messageInfo.to,
      type: "template",
      template: {
        name: messageInfo.templateName,
        language: {
          code: "en_US",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: messageInfo.otp,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: messageInfo.otp,
              },
            ],
          },
        ],
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(LOGUI.FgRed, "Error sending WhatsApp message:", error.response?.data);
    throw error;
  }
};
