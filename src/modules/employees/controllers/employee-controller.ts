import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Permission } from "@/modules/permissions";
import { IUser } from "@/modules/user/model";
import { catchAsync, hashPassword } from "@/utils";

import { Employee } from "../model";

const NIC_REGEX = /^\d{5}-?\d{7}-?\d$/;

const formatNic = (nic: string) => {
  const digits = nic.replace(/\D/g, "");
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

export const createEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      type,
      username,
      phone,
      cnic,
      guardianName,
      guardianPhone,
      permanentAddress,
      currentAddress,
    } = req.body;

    if (
      !email ||
      !password ||
      !type ||
      !username ||
      !phone ||
      !cnic ||
      !guardianName ||
      !guardianPhone ||
      !permanentAddress ||
      !currentAddress
    ) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Please provide all required fields" });
    }

    if (!NIC_REGEX.test(String(cnic).trim())) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Invalid NIC. Use format 12345-1234567-1" });
    }
    const formattedNic = formatNic(String(cnic).trim());

    const allowedTypes = ["salesman", "accountant"];
    if (!allowedTypes.includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid employee type. Allowed types are: ${allowedTypes.join(", ")}`,
      });
    }

    const existingEmployee = await Employee.findOne({
      email,
      cnic: formattedNic,
    });
    if (existingEmployee) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Employee with this CNIC or email already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const newEmployee = new Employee({
      email,
      cnic: formattedNic,
      username,
      password: hashedPassword,
      type,
      phone,
      guardianName,
      guardianPhone,
      permanentAddress,
      currentAddress,
    });

    await newEmployee.save();

    await Permission.create({
      employee: newEmployee._id,
      pages: [],
    });
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
    const employees = await Employee.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "permissions",
          localField: "_id",
          foreignField: "employee",
          as: "permission",
        },
      },
      {
        $unwind: {
          path: "$permission",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          permissions: {
            $ifNull: ["$permission.pages", []],
          },
        },
      },
      {
        $project: {
          password: 0,
          __v: 0,
          permission: 0,
        },
      },
    ]);

    return res.status(statusCodes.OK).json({
      message: "Employees fetched successfully",
      data: {
        salesman: employees.filter((employee) => employee.type === "salesman"),
        accountant: employees.filter((employee) => employee.type === "accountant"),
      },
    });
  } catch (error: Error | any) {
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

export const updateEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "Access denied. Not owner",
      });
    }

    const {
      email,
      nic,
      type,
      username,
      phone,
      guardianName,
      guardianPhone,
      permanentAddress,
      currentAddress,
    } = req.body;

    if (!NIC_REGEX.test(String(nic).trim())) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Invalid NIC. Use format 12345-1234567-1" });
    }
    const formattedNic = formatNic(String(nic).trim());

    const employee = await Employee.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Employee not found",
      });
    }

    const allowedTypes = ["salesman", "accountant"];

    if (type && !allowedTypes.includes(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid employee type. Allowed types are: ${allowedTypes.join(", ")}`,
      });
    }

    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email: email.toLowerCase(),
        cnic: formattedNic,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingEmployee) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Employee with this CNIC or email already exists.",
        });
      }
    }

    const updateData: Record<string, unknown> = {
      email,
      cnic: formattedNic,
      type,
      username,
      phone,
      guardianName,
      guardianPhone,
      permanentAddress,
      currentAddress,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === "") {
        delete updateData[key];
      }
    });

    const updatedEmployee = await Employee.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(statusCodes.OK).json({
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating employee",
      error,
    });
  }
});
