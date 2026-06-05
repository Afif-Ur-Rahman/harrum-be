import { Request, Response } from "express";

import { sendEmail } from "@/config";
import { BREVO } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { catchAsync } from "@/utils/catch-async";

import { User } from "../user/model";

import { Settings } from "./settings";

export const getSettings = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    let settings = await Settings.findOne({});

    const settingsObj: any = settings ? settings.toObject() : {};

    settings = {
      brevo: {
        senderName: settingsObj.brevo?.senderName || BREVO.NAME,
        senderEmail: settingsObj.brevo?.senderEmail || BREVO.EMAIL,
        mailApiKey: settingsObj.brevo?.mailApiKey || BREVO.API_KEY,
        isLocal:
          settingsObj.brevo?.senderName &&
          settingsObj.brevo?.senderEmail &&
          settingsObj.brevo?.mailApiKey
            ? false
            : true,
      },
    } as any;
    return res.status(statusCodes.OK).json({
      message: "Settings retrieved successfully",
      data: settings,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error retrieving settings",
      error,
    });
  }
});

export const updateSettings = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const { aws, brevo } = req.body;
    const allowedUpdate: Record<string, any> = {};
    if (aws) allowedUpdate.aws = aws;
    if (brevo) allowedUpdate.brevo = brevo;
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: allowedUpdate },
      { upsert: true, new: true },
    );
    return res.status(statusCodes.OK).json({
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating settings",
      error,
    });
  }
});

export const sendTestNotification = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, subject, content } = req.body;
      if (!email || !subject || !content) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Email, subject and content are required",
        });
      }

      const mailInfo = {
        to: email,
        subject,
        html: content,
      };

      await sendEmail(mailInfo);
      return res.status(statusCodes.OK).json({
        message: "Notification sent successfully",
      });
    } catch (error: Error | any) {
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error sending test notification",
        error,
      });
    }
  },
);

export const getALlAdmin = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const admins = await User.find({ type: "admin" }).select("-password");
    if (!admins) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Admin not found",
      });
    }
    return res.status(statusCodes.OK).json({
      message: "Admins retrieved successfully",
      data: admins,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error retrieving settings",
      error,
    });
  }
});

export const getAllUser = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const users = await User.find({ type: "normal" }).select("-password");
    if (!users) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Users not found",
      });
    }
    return res.status(statusCodes.OK).json({
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error retrieving users",
      error,
    });
  }
});

// export const getAllStore = catchAsync(async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const stores = await Store.find({ type: "business" }).select("-password");
//     if (!stores) {
//       return res.status(statusCodes.NOT_FOUND).json({
//         message: "Stores not found",
//       });
//     }
//     return res.status(statusCodes.OK).json({
//       message: "Stores retrieved successfully",
//       data: stores,
//     });
//   } catch (error: Error | any) {
//     return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
//       message: error.message || "Error retrieving stores",
//       error,
//     });
//   }
// });

export const createAdmin = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    if (!type || !["admin", "support"].includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Valid type (admin or support) is required",
      });
    }
    const user = await User.findByIdAndUpdate(id, { $set: { type } }, { new: true });

    if (!user) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }
    await user.save();
    return res.status(statusCodes.OK).json({
      message: "Admin created successfully",
      data: user,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating admin",
      error,
    });
  }
});
