import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { comparePasswords, hashPassword } from "@/modules/auth/utils";
import { Block, Follow, Friend, IUser } from "@/modules/user/model";
import { userService } from "@/modules/user/services";
import { fileHelper } from "@/utils";

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // req.user is already the correct document (Restaurant | Employee | User)
    // resolved by auth middleware — operate on it directly so the right collection is updated
    const account = req.user as any;

    const {
      fullName,
      bio,
      image,
      coverImage,
      location,
      address,
      language,
      phone,
      platform,
      device,
      currency,
    } = req.body;

    if (fullName !== undefined) account.fullName = fullName;
    if (address !== undefined && "address" in account) account.address = address;
    if (bio !== undefined && "bio" in account) account.bio = bio;
    if (currency !== undefined) account.currency = currency;
    if (language !== undefined && "language" in account) account.language = language;
    if (phone !== undefined) account.phone = phone;
    if (platform !== undefined) account.platform = platform;
    if (device !== undefined) account.device = device;

    if (location?.latitude !== undefined && location?.longitude !== undefined) {
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        account.location = { type: "Point", coordinates: [lng, lat] };
      }
    }

    const uploadedFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
    const previousImage = account.image;
    const previousCover = account.coverImage;

    if (uploadedFiles?.image?.length && image) account.image = image;
    if (uploadedFiles?.coverImage?.length && coverImage) account.coverImage = coverImage;

    await account.save();

    if (uploadedFiles?.image?.length && previousImage) fileHelper.deleteFile(previousImage);
    if (uploadedFiles?.coverImage?.length && previousCover) fileHelper.deleteFile(previousCover);

    const result = account.toObject();
    delete result.password;
    delete result.tempPassword;
    delete result.__v;

    return res
      .status(statusCodes.ACCEPTED)
      .json({ message: "Profile Updated Successfully", data: result });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
};

export const updateLanguage = async (req: Request, res: Response) => {
  try {
    const account = req.user as any;
    const { language } = req.body;

    if ("language" in account) {
      account.language = language;
      await account.save();
    }

    return res
      .status(statusCodes.ACCEPTED)
      .json({ message: "Language Updated Successfully", data: account });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
};

export const deleteProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const user = await userService.deleteUser(userId.toString());
    if (!user) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
    }
    return res.status(statusCodes.OK).json({ message: "User deleted successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error deleting user", error });
  }
};

export const changeProfilePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // req.user is the correct model document — work on it directly
    const account = req.user as any;

    // Fetch with password field since it's excluded by default in authMiddleware
    const accountWithPassword = await account.constructor.findById(account._id).select("+password");

    if (!accountWithPassword?.password) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Account not found" });
    }

    const isMatch = await comparePasswords(oldPassword, accountWithPassword.password);
    if (!isMatch) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Incorrect old password" });
    }

    accountWithPassword.password = await hashPassword(newPassword);
    await accountWithPassword.save();

    return res.status(statusCodes.OK).json({ message: "Password changed successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Server error", error });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const user = await userService.getUserById(userId.toString());

    const followers = await Follow.countDocuments({ following: userId });
    const following = await Follow.countDocuments({ follower: userId, type: "User" });
    const followingPets = await Follow.countDocuments({ follower: userId, type: "Pet" });
    const friends = await Friend.countDocuments({
      receiver: userId,
      status: "ACCEPTED",
    });
    const friendRequests = await Friend.countDocuments({
      receiver: userId,
      status: "PENDING",
    });
    const blocked = await Block.countDocuments({ blocker: userId });

    const userData = {
      ...user,
      followers,
      following,
      followingPets,
      friends,
      friendRequests,
      blocked,
    };

    return res.status(statusCodes.ACCEPTED).json(userData);
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Something Went Wrong!", error });
  }
};

// export const getMyAds = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const status = (req.query.status as string) || "Active";

//     // const market = await Market.find({ owner: userId, status }).populate("owner");

//     // const ads = [...market].sort(
//     //   (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0),
//     // );

//     const total = ads.length;
//     const start = (page - 1) * limit;
//     const end = start + limit;
//     const paginatedAds = ads.slice(start, end);

//     return res.status(statusCodes.OK).json({
//       data: paginatedAds,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error: Error | any) {
//     return res
//       .status(statusCodes.INTERNAL_SERVER_ERROR)
//       .json({ message: error.message || "Error fetching ads", error });
//   }
// };

// export const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
//   try {
//     const { userId } = req.params;
//     if (!userId) {
//       return res.status(statusCodes.BAD_REQUEST).json({ message: "User is required" });
//     }
//     const user = await User.findById(userId).select("-password -otp -otpExpires");
//     if (!user) {
//       return res.status(statusCodes.NOT_FOUND).json({ message: "User not found" });
//     }

//     const markets = await Product.find({ owner: userId }).populate("owner");
//     return res.status(statusCodes.OK).json({
//       message: "Public profile fetched successfully",
//       data: { user, markets },
//     });
//   } catch (error: any) {
//     return res.status(statusCodes.BAD_REQUEST).json({
//       message: error.message || "Failed to fetch profile",
//       error,
//     });
//   }
// });

// export const getStoreProfile = catchAsync(async (req: Request, res: Response) => {
//   try {
//     const { storeId } = req.params;

//     if (!storeId) {
//       return res.status(statusCodes.BAD_REQUEST).json({ message: "StoreId is required" });
//     }

//     const store = await Store.findById(storeId);
//     if (!store) {
//       return res.status(statusCodes.NOT_FOUND).json({ message: "Store not found" });
//     }
//     const products = await Market.find({ owner: storeId }).populate("owner");

//     return res.status(statusCodes.OK).json({
//       message: "Store and products fetched successfully",
//       store,
//       products,
//     });
//   } catch (error: any) {
//     return res.status(statusCodes.BAD_REQUEST).json({
//       message: error.message || "Failed to fetch store and products",
//       error,
//     });
//   }
// });
