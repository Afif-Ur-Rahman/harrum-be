import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Employee } from "@/models/employee-model";
import { IUser, User } from "@/modules/user/model";
import { buildDashboardStats } from "@/services";
import { catchAsync, hashPassword } from "@/utils";

export const createEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { email, password, type, fullName } = req.body;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Owner not found" });
    }

    if (!email || !password || !type) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Please provide all required fields" });
    }

    const allowedTypes = ["worker", "accountant"];
    if (!allowedTypes.includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid employee type. Allowed types are: ${allowedTypes.join(", ")}`,
      });
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Employee already exists" });
    }

    const roleExists = await Employee.findOne({ owner: owner._id, type });
    if (roleExists) {
      return res.status(statusCodes.FORBIDDEN).json({
        message: `Basic plan allows only 1 ${type}. Employee of this type already exists.`,
      });
    }

    const hashedPassword = await hashPassword(password);
    const newEmployee = new Employee({
      email,
      username: email.split("@")[0],
      fullName,
      password: hashedPassword,
      type,
      owner: owner._id,
    });

    await newEmployee.save();
    return res
      .status(statusCodes.CREATED)
      .json({ message: `${type} created successfully`, data: newEmployee });
  } catch (error: Error | any) {
    console.log("error creating employee", error);
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating employee",
      error,
    });
  }
});

export const getEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({ message: "Access denied. Not owner" });
    }

    const employees = await Employee.find({ owner: owner._id });

    return res.status(statusCodes.OK).json({
      message: "Employees fetched successfully",
      data: {
        worker: employees.filter((e) => e.type === "worker"),
        accountant: employees.filter((e) => e.type === "accountant"),
      },
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching employees",
      error,
    });
  }
});

export const deleteEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Employee not found" });
    }

    if (owner._id.toString() !== employee.owner?.toString()) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "You are not authorized to delete this employee." });
    }

    await Employee.findByIdAndDelete(id);

    return res.status(statusCodes.ACCEPTED).json({ message: "Employee deleted successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error deleting employee", error });
  }
});

export const getOwnerProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const ownerProfile = await User.findById(owner._id).select("-password");
    if (!ownerProfile) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Owner not found" });
    }
    return res.status(statusCodes.OK).json({ message: "Profile fetched", data: ownerProfile });
  } catch (error: any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error fetching profile", error });
  }
});

export const updateOwnerProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { fullName, phone, location } = req.body;

    const updateData: Record<string, any> = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (location) {
      const loc = typeof location === "string" ? JSON.parse(location) : location;
      if (loc.latitude && loc.longitude) {
        updateData.location = { type: "Point", coordinates: [loc.longitude, loc.latitude] };
      }
    }

    const updated = await User.findByIdAndUpdate(owner._id, updateData, { new: true }).select(
      "-password",
    );

    return res.status(statusCodes.OK).json({ message: "Profile updated", data: updated });
  } catch (error: any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error updating profile", error });
  }
});

export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({ message: "Access denied. Not owner" });
    }

    const threshold = Number(req.query.threshold || 20);
    const months = Number(req.query.months || 6);

    const data = await buildDashboardStats(String(owner._id), { threshold, months });

    return res.status(statusCodes.OK).json({
      message: "Dashboard stats fetched successfully",
      data,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching dashboard stats",
      error,
    });
  }
});
