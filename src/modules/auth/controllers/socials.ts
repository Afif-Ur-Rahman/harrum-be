import { Request, Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import jwt from "jsonwebtoken";

import { statusCodes } from "@/constants";
import { IUser, User } from "@/modules/user/model";
import { catchAsync } from "@/utils/catch-async";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID as string;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

import { generateToken } from "../utils";

export const googleLogin = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { idToken, device, platform } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as TokenPayload | null;

    if (!payload) {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid Google token." });
    }

    if (!payload.email_verified) {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Email is not verified." });
    }

    const { email, name, picture } = payload;

    let userResult = await User.findOne({ email });

    if (!userResult) {
      const newUser = new User({
        email,
        username: name,
        image: picture,
        password: "social", // No password for social login
        type: "social",
        device,
        platform,
      });

      userResult = await newUser.save();
    } else {
      if (device) userResult.device = device;
      if (platform) userResult.platform = platform;
      await userResult.save();
    }

    const jwtToken = generateToken(userResult);

    const sanitizedUser = sanitizeUser(userResult);

    return res.status(statusCodes.OK).json({
      message: "'Login successful. Welcome to App. 😀🎊 !",
      data: { ...sanitizedUser, token: jwtToken },
    });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error during Google login.", error });
  }
});

export const appleLogin = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const { identityToken, device, platform } = req.body;

  if (!identityToken) {
    return res.status(statusCodes.BAD_REQUEST).json({ message: "Identity token is required." });
  }

  try {
    // Decode header to get key ID, then fetch Apple's public key to verify signature
    const decoded = jwt.decode(identityToken, { complete: true });

    if (!decoded || typeof decoded.payload !== "object") {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid identity token." });
    }

    // Fetch Apple's public keys and verify the token signature
    const appleKeysResponse = await fetch("https://appleid.apple.com/auth/keys");
    const { keys } = (await appleKeysResponse.json()) as { keys: any[] };
    const matchingKey = keys.find((k) => k.kid === decoded.header.kid);

    if (!matchingKey) {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Apple public key not found." });
    }

    const publicKey = require("crypto").createPublicKey({ key: matchingKey, format: "jwk" });
    let verifiedPayload: any;
    try {
      verifiedPayload = jwt.verify(identityToken, publicKey, { algorithms: ["RS256"] });
    } catch {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "Identity token signature invalid." });
    }

    const payload = verifiedPayload as {
      sub: string;
      email?: string;
      email_verified?: string | boolean;
      aud: string;
    };

    if (payload.aud !== APPLE_CLIENT_ID) {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid audience in token." });
    }

    if (!payload.email_verified) {
      return res.status(statusCodes.UNAUTHORIZED).json({ message: "Email is not verified." });
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = new User({
        email: payload.email,
        username: payload.email?.split("@")[0] || "AppleUser",
        password: "social", // No password for social login
        type: "social",
        device,
        platform,
      });
      await user.save();
    } else {
      if (device) user.device = device;
      if (platform) user.platform = platform;
      await user.save();
    }

    const sanitizedUser = sanitizeUser(user);

    const jwtToken = generateToken(user);

    return res.status(statusCodes.OK).json({
      message: "'Login successful. Welcome to App. 😀🎊 !",
      data: { ...sanitizedUser, token: jwtToken },
    });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error during Apple signup.", error });
  }
});

const sanitizeUser = (user: IUser) => {
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};
