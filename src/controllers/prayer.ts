import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import { IUser, Pray } from "@/models";

export const createPray = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const owner = (req.user as IUser)._id;
    const { reason } = req.body;
    const unread = Array.from({ length: 150 }, (_, i) => (i + 1).toString());

    const prayData = {
      reason,
      owner,
      unread,
    };
    const pray = new Pray(prayData);
    const response = await pray.save();
    return res.status(statusCodes.CREATED).json(response);
  } catch (error) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Error creating pray", error });
  }
};

export const getPrays = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const prays = await Pray.find({ status: "Approved" }).populate("owner");
    return res
      .status(statusCodes.OK)
      .json({ message: "Prays fetched successfully", data: prays });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching prays", error });
  }
};

export const getMyPrays = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const prays = await Pray.find();
    return res
      .status(statusCodes.OK)
      .json({ message: "Prays fetched successfully", data: prays });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching prays", error });
  }
};

export const deletePray = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const pray = await Pray.findOneAndDelete({ _id: req.params.id });
    if (!pray) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "Pray not found" });
    }
    return res
      .status(statusCodes.OK)
      .json({ message: "Pray deleted successfully" });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error deleting pray", error });
  }
};

export const readPray = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { prayId, paragraph } = req.body;
    const pray = await Pray.findById(prayId);

    if (!pray) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "Pray not found" });
    }
    if (!pray.unread.includes(paragraph)) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Paragraph already read" });
    }

    pray.unread = pray.unread.filter((i) => i !== paragraph);
    pray.read = [...pray.read, paragraph];

    await pray.save();

    return res.status(statusCodes.OK).json(pray);
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error reading pray", error });
  }
};
