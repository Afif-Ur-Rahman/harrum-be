import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Permission } from "@/modules/permissions";
import { IUser } from "@/modules/user/model";
import { catchAsync, hashPassword } from "@/utils";

import { Employee, EmployeeRole } from "../model";

const NIC_REGEX = /^\d{5}-?\d{7}-?\d$/;

const ALLOWED_TYPES: EmployeeRole[] = [
  "cleaner",
  "mop_boy",
  "salesman",
  "accountant",
  "manager",
  "senior_salesman",
];

const formatNic = (nic: string) => {
  const digits = nic.replace(/\D/g, "");

  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

const isValidRole = (type: unknown): type is EmployeeRole =>
  typeof type === "string" && ALLOWED_TYPES.includes(type as EmployeeRole);

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
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Please provide all required fields",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Email and password must be valid strings",
      });
    }

    if (password.length < 8) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (typeof cnic !== "string" || !NIC_REGEX.test(cnic.trim())) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Invalid CNIC. Use format 12345-1234567-1",
      });
    }

    if (!isValidRole(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid employee type. Allowed types are: ${ALLOWED_TYPES.join(", ")}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const formattedCnic = formatNic(cnic.trim());

    const existingEmployee = await Employee.findOne({
      $or: [{ email: normalizedEmail }, { cnic: formattedCnic }],
    });

    if (existingEmployee) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message:
          existingEmployee.email === normalizedEmail
            ? "An employee with this email already exists"
            : "An employee with this CNIC already exists",
      });
    }

    const hashedPassword = await hashPassword(password);

    const newEmployee = new Employee({
      email: normalizedEmail,
      password: hashedPassword,
      cnic: formattedCnic,
      username,
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

    return res.status(statusCodes.CREATED).json({
      message: `${type} created successfully`,
      data: newEmployee,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "An employee with this email or CNIC already exists",
      });
    }

    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating employee",
    });
  }
});

export const getEmployee = catchAsync(async (_req: Request, res: Response) => {
  try {
    const employees = await Employee.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
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

    const data: Record<string, typeof employees> = {
      cleaner: [],
      mop_boy: [],
      salesman: [],
      accountant: [],
      manager: [],
      senior_salesman: [],
    };

    for (const employee of employees) {
      const type = employee.type as EmployeeRole;

      if (ALLOWED_TYPES.includes(type)) {
        data[type].push(employee);
      }
    }

    return res.status(statusCodes.OK).json({
      message: "Employees fetched successfully",
      data,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching employees",
    });
  }
});

export const deleteEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "Access denied. Only the owner can delete employees.",
      });
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Employee not found",
      });
    }

    return res.status(statusCodes.OK).json({
      message: "Employee deleted successfully",
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error deleting employee",
    });
  }
});

export const updateEmployee = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;

    if (!owner || owner.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "Access denied. Only the owner can update employees.",
      });
    }

    const {
      email,
      password,
      cnic,
      type,
      username,
      phone,
      guardianName,
      guardianPhone,
      permanentAddress,
      currentAddress,
    } = req.body;

    const employee = await Employee.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Employee not found",
      });
    }

    if (email !== undefined && typeof email !== "string") {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Email must be a valid string",
      });
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Password must be at least 8 characters long",
        });
      }
    }

    if (type !== undefined && !isValidRole(type)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid employee type. Allowed types are: ${ALLOWED_TYPES.join(", ")}`,
      });
    }

    let formattedCnic: string | undefined;

    if (cnic !== undefined) {
      if (typeof cnic !== "string" || !NIC_REGEX.test(cnic.trim())) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Invalid CNIC. Use format 12345-1234567-1",
        });
      }

      formattedCnic = formatNic(cnic.trim());
    }

    const normalizedEmail = email !== undefined ? email.trim().toLowerCase() : undefined;

    if (normalizedEmail !== undefined || formattedCnic !== undefined) {
      const duplicateConditions = [];

      if (normalizedEmail) {
        duplicateConditions.push({ email: normalizedEmail });
      }

      if (formattedCnic) {
        duplicateConditions.push({ cnic: formattedCnic });
      }

      if (duplicateConditions.length > 0) {
        const existingEmployee = await Employee.findOne({
          _id: { $ne: employee._id },
          $or: duplicateConditions,
        });

        if (existingEmployee) {
          return res.status(statusCodes.BAD_REQUEST).json({
            message:
              normalizedEmail && existingEmployee.email === normalizedEmail
                ? "An employee with this email already exists"
                : "An employee with this CNIC already exists",
          });
        }
      }
    }

    const updateData: Record<string, unknown> = {};

    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (formattedCnic !== undefined) updateData.cnic = formattedCnic;
    if (type !== undefined) updateData.type = type;
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;
    if (guardianName !== undefined) updateData.guardianName = guardianName;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
    if (permanentAddress !== undefined) {
      updateData.permanentAddress = permanentAddress;
    }
    if (currentAddress !== undefined) {
      updateData.currentAddress = currentAddress;
    }

    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      {
        _id: employee._id,
        isDeleted: { $ne: true },
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
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "An employee with this email or CNIC already exists",
      });
    }

    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating employee",
    });
  }
});
