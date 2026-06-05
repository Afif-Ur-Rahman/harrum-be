// @description Removes unreferenced or orphaned documents from the database to maintain data integrity

import { Request, Response } from "express";

import { Restaurant, Category, Employee, Table, Product, Subscription } from "../src/models";
// import { User } from "../src/modules/user/model";
import { catchAsync } from "../src/utils";

export const CleanupData = catchAsync(async (req: Request, res: Response) => {
  try {
    await cleanupDatabase();
    return res.status(200).json({ message: "Cleanup completed successfully!" });
  } catch (error: Error | any) {
    return res.status(500).json({ message: error.message || "Error during cleanup", error });
  }
});

// Extract the cleanup logic to a standalone function
export async function cleanupDatabase(): Promise<void> {
  // 1. Get all valid user and store IDs
  // const existingUserIds = await User.find({}, "_id").lean();
  // const validUserIds = new Set(existingUserIds.map((user) => user._id.toString()));
  const restaurants = await Restaurant.find({}, "_id fullName").lean();
  const validRestaurantIds = new Set(restaurants.map((rest) => rest._id.toString()));

  // 2. Remove Restaurants with invalid owner
  const restaurantsDeleted = await Restaurant.deleteMany({
    _id: { $in: Array.from(validRestaurantIds) },
  });

  // 3. Remove Categories with invalid restaurant
  const categories = await Category.find().lean();
  const validCategoryIds = categories
    .filter((cat) => validRestaurantIds.has(cat.restaurant.toString()))
    .map((cat) => cat._id.toString());
  const categoriesDeleted = await Category.deleteMany({ _id: { $nin: validCategoryIds } });

  // 4 Remove Employees with invalid restaurant
  const employees = await Employee.find({ role: { $in: ["chef", "waitor", "accountant"] } }).lean();
  const validEmployeeIds = employees
    .filter((emp) => validRestaurantIds.has(emp.restaurant.toString()))
    .map((emp) => emp._id.toString());
  const employeesDeleted = await Employee.deleteMany({ _id: { $nin: validEmployeeIds } });

  // 5. Remove Tables with invalid restaurant
  const tables = await Table.find().lean();
  const validTableIds = tables
    .filter((table) => validRestaurantIds.has(table.restaurant.toString()))
    .map((table) => table._id.toString());
  const tablesDeleted = await Table.deleteMany({ _id: { $nin: validTableIds } });

  // 6. Remove Products with invalid restaurant or category
  const products = await Product.find().lean();
  const validProductIds = products
    .filter(
      (prod) =>
        validRestaurantIds.has(prod.restaurant.toString()) &&
        validCategoryIds.includes(prod.category.toString()),
    )
    .map((prod) => prod._id.toString());
  const productsDeleted = await Product.deleteMany({ _id: { $nin: validProductIds } });

  // 7. Remove Subscriptions with invalid user or restaurant
  const subscriptions = await Subscription.find().lean();
  const validSubscriptionIds = subscriptions
    .filter((sub) => validRestaurantIds.has(sub.restaurant.toString()))
    .map((sub) => sub._id.toString());
  const subscriptionsDeleted = await Subscription.deleteMany({
    _id: { $nin: validSubscriptionIds },
  });

  // // 10. Remove Reviews with invalid reviewer
  // const reviews = await Review.find().lean();
  // const invalidReviewIds = reviews
  //   .filter((review) => !validUserIds.has(review.reviewer?.toString()))
  //   .map((review) => review._id);
  // const reviewsDeleted = await Review.deleteMany({ _id: { $in: invalidReviewIds } });

  // // 11. Remove Notifications with invalid sender or owner
  // const notifications = await Notification.find().lean();
  // const invalidNotificationIds = notifications
  //   .filter(
  //     (notif) =>
  //       !validUserIds.has(notif.sender?.toString()) || !validUserIds.has(notif.owner?.toString()),
  //   )
  //   .map((notif) => notif._id);
  // const notificationsDeleted = await Notification.deleteMany({
  //   _id: { $in: invalidNotificationIds },
  // });

  // 13. Remove Messages with invalid sender or room
  // const messages = await Message.find().lean();
  // // If you have a Chat model, you can validate room as well
  // const invalidMessageIds = messages
  //   .filter((msg) => !validUserIds.has(msg.sender?.toString()))
  //   .map((msg) => msg._id);
  // const messagesDeleted = await Message.deleteMany({ _id: { $in: invalidMessageIds } });

  // 14. Update all users' gender to have first character uppercase
  // const usersUpdated = await User.updateMany({ gender: { $type: "string", $ne: null } }, [
  //   {
  //     $set: {
  //       gender: {
  //         $concat: [
  //           { $toUpper: { $substrCP: ["$gender", 0, 1] } },
  //           { $substrCP: ["$gender", 1, { $strLenCP: "$gender" }] },
  //         ],
  //       },
  //     },
  //   },
  // ]);

  console.log("✅ Database cleanup completed");
  console.log("Summary:");
  console.log("Categories deleted:", categoriesDeleted.deletedCount || 0);
  console.log("Restaurants deleted:", restaurantsDeleted.deletedCount || 0);
  console.log("Employees deleted:", employeesDeleted.deletedCount || 0);
  console.log("Tables deleted:", tablesDeleted.deletedCount || 0);
  console.log("Products deleted:", productsDeleted.deletedCount || 0);
  console.log("Subscriptions deleted:", subscriptionsDeleted.deletedCount || 0);
  // console.log("Reviews deleted:", reviewsDeleted.deletedCount || 0);
  // console.log("Notifications deleted:", notificationsDeleted.deletedCount || 0);
  // console.log("Users gender updated:", usersUpdated.modifiedCount || 0);
}

// CLI entry point
if (require.main === module) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    import("mongoose").then(async (mongoose) => {
      const DB_URI = process.env.DB_URI;
      if (!DB_URI) {
        console.error("❌ DB_URI is not set");
        process.exit(1);
      }
      await mongoose.connect(DB_URI);
      console.log("✅ Connected to DB");
      try {
        await cleanupDatabase();
      } catch (err) {
        console.error("❌ Error during cleanup:", err);
        process.exit(1);
      } finally {
        await mongoose.disconnect();
        process.exit(0);
      }
    });
  });
}
