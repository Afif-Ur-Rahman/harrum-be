import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Employee } from "@/modules/employees/model/employee-model";
import { Permission, PERMISSION_PAGES } from "@/modules/permissions/model";
import { catchAsync } from "@/utils";

export const updatePermissions = catchAsync(async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { pages } = req.body;

    if (!employeeId) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Employee ID is required" });
    }

    if (!Array.isArray(pages)) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Pages must be an array" });
    }

    const invalidPages = pages.filter(
      (page) =>
        !page ||
        typeof page !== "object" ||
        !PERMISSION_PAGES.includes(page.key) ||
        typeof page.allowed !== "boolean",
    );

    if (invalidPages.length > 0) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: "Invalid permission pages", invalidPages });
    }

    const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });

    if (!employee) {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Employee not found" });
    }

    const permission = await Permission.findOneAndUpdate(
      { employee: employeeId },
      { $set: { pages } },
      { new: true, upsert: true, runValidators: true },
    );

    return res
      .status(statusCodes.OK)
      .json({ message: "Permissions updated successfully", data: permission });
  } catch (error: Error | any) {
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Error updating permissions", error });
  }
});
