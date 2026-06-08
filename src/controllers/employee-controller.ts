import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Employee, IEmployee } from "@/models/employee-model";
import { Product } from "@/models/product-model";
import { Stock } from "@/modules/stock/model/stock-model";
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

export const sellProduct = catchAsync(async (req: Request, res: Response) => {
  try {
    const employee = req.user as unknown as IEmployee;

    const { productId, quantity, color } = req.body;

    // Permission check
    if (employee.type !== "worker" && employee.type !== "accountant") {
      return res.status(statusCodes.FORBIDDEN).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    // Validate quantity
    if (!quantity || Number(quantity) <= 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find product variant
    const variant = product.variants.find((v) => (v.color || "") === (color || ""));

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    // Check variant stock
    if (variant.quantity < Number(quantity)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    // Find real stock document
    const stock = await Stock.findById(variant.stock);

    if (!stock) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Stock not found",
      });
    }

    // Check stock quantity
    if (stock.quantity < Number(quantity)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Insufficient stock quantity",
      });
    }

    // Update product variant quantity
    variant.quantity -= Number(quantity);

    // Update stock quantity
    stock.quantity -= Number(quantity);

    // Add stock history
    const createdByName = (employee.username as string) || employee.email || "Unknown";
    stock.stockHistory.push({
      price: product.sellingPrice,
      quantity: Number(quantity),
      size: product.size || "",
      color: variant.color || "",
      brand: product.brand || "",
      createdBy: employee._id,
      createdByName,
    });

    // Save updates
    await stock.save();
    await product.save();

    // Calculate total price
    const totalPrice = product.sellingPrice * Number(quantity);

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Product sold successfully",
      totalPrice,
      data: {
        product,
        stock,
      },
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
});
