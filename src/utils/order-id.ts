import crypto from "crypto";

export const generateOrderId = () => {
  // Generate a random 6-digit number (000000 - 999999)
  const randomNumber = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

  const orderId = `YN${randomNumber}`;
  return { orderId };
};
export const orderIdService = {
  generateOrderId,
};
