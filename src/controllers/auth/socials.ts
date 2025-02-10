import { Request, Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import jwt from "jsonwebtoken";
import { statusCodes } from "@/constants/statusCodes";
import { IUser, User } from "@/models/userModel";
import { generateToken } from "@/utils/jwtHelper";
import userService from "@/services/userService";

export const googleLogin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idToken, user, device, platform } = req.body;

  // const googleClient = new OAuth2Client(
  //   platform === "ios" ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID
  // );

  try {
    // const ticket = await googleClient.verifyIdToken({
    //   idToken: idToken,
    //   audience:
    //     platform === "ios" ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID,
    // });

    // const payload = ticket.getPayload() as TokenPayload | null;

    // if (!payload) {
    //   return res
    //     .status(statusCodes.UNAUTHORIZED)
    //     .json({ message: "Invalid Google token." });
    // }

    let userResult = await User.findOne({ email: user.email });

    if (!userResult) {
      const newUser = new User({
        email: user.email,
        username: `${user.givenName} ${user.familyName}`,
        image: user.photo,
        password: "social", // No password for social login
        type: "social",
      });

      userResult = await newUser.save();
    }

    const jwtToken = generateToken({ id: userResult._id });

    const sanitizedUser = sanitizeUser(userResult);

    return res.status(statusCodes.OK).json({
      message: "'Login successful. Welcome to App. 😀🎊 !",
      data: { ...sanitizedUser, token: jwtToken },
    });
  } catch (error) {
    console.error("Error during Google login:", error);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error during Google login." });
  }
};

export const appleLogin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    authorizationCode,
    email,
    fullName,
    identityToken,
    device,
    platform,
  } = req.body;
  console.log("req.body >> ", req.body);

  if (!identityToken) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Identity token is required." });
  }

  try {
    const decodedToken = jwt.decode(identityToken, { complete: true });

    if (!decodedToken) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "Invalid identity token." });
    }

    const payload = decodedToken.payload as {
      sub: string;
      email?: string;
      email_verified?: string;
      aud: string;
    };
    console.log(payload);

    // if (payload.aud !== APPLE_CLIENT_ID) {
    //   return res
    //     .status(statusCodes.UNAUTHORIZED)
    //     .json({ message: "Invalid audience in token." });
    // }

    // const { sub: appleId, email, email_verified } = payload;

    // if (email_verified !== "true") {
    //   return res
    //     .status(statusCodes.UNAUTHORIZED)
    //     .json({ message: "Email is not verified." });
    // }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        username: email?.split("@")[0] || "AppleUser",
        password: "social", // No password for social login
        type: "social",
      });
      await user.save();
    }

    const sanitizedUser = sanitizeUser(user);

    const jwtToken = generateToken({ id: user._id });

    return res.status(statusCodes.OK).json({
      message: "'Login successful. Welcome to App. 😀🎊 !",
      data: { ...sanitizedUser, token: jwtToken },
    });
  } catch (error) {
    console.error("Error during Apple signup:", error);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error during Apple signup." });
  }
};

const sanitizeUser = (user: IUser) => {
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};
