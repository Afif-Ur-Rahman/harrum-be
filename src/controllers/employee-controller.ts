import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Employee } from "@/models/employee-model";
import { IUser } from "@/modules/user/model";
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

    const employees = await Employee.find({ isDeleted: false });

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
    const employee = await Employee.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Employee not found" });
    }

    if (owner.type !== "owner") {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .json({ message: "You are not authorized to delete this employee." });
    }

    return res.status(statusCodes.ACCEPTED).json({ message: "Employee deleted successfully" });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error deleting employee", error });
  }
});
