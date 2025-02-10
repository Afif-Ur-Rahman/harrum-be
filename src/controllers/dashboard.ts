import { Request, Response } from "express";
import { statusCodes } from "@/constants/statusCodes";
import { Pray } from "@/models";

export const updatePray = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const pray = await Pray.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!pray) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: "Pray not found" });
    }
    return res
      .status(statusCodes.OK)
      .json({ message: "Pray approved successfully", data: pray });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error approving pray", error });
  }
};

export const deletePrays = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "No IDs provided" });
    }

    const result = await Pray.deleteMany({ _id: { $in: ids } });

    return res.status(statusCodes.OK).json({
      message: "Prays deleted successfully",
      data: result.deletedCount,
    });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error deleting prays", error });
  }
};

export const getPray = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const status = req.query.status
      ? { status: req.query.status as "Pending" | "Approved" | "Rejected" }
      : {};
    const prays = await Pray.find(status).populate("owner");
    return res
      .status(statusCodes.OK)
      .json({ message: "Prays fetched successfully", data: prays });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching prays", error });
  }
};

export const prayStats = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const allPrays = await Pray.find();
    const stats = {
      total: allPrays.length,
      pending: allPrays.filter((pray) => pray.status === "Pending").length,
      approved: allPrays.filter((pray) => pray.status === "Approved").length,
      rejected: allPrays.filter((pray) => pray.status === "Rejected").length,
    };
    return res
      .status(statusCodes.OK)
      .json({ message: "Prays stats fetched successfully", data: stats });
  } catch (error) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Error fetching prays stats", error });
  }
};
