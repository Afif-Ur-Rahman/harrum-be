import { body, param, query } from "express-validator";

import { validateRequest } from "./security-middleware";

// User validation rules
export const userValidation = {
  create: [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
    body("username").trim().isLength({ min: 3, max: 30 }),
    body("location").optional(),
    body("location.latitude")
      .if(body("location").exists())
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("location.longitude")
      .if(body("location").exists())
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    validateRequest,
  ],
  update: [
    body("email").optional().isEmail().normalizeEmail(),
    body("username").optional().trim().isLength({ min: 3, max: 30 }),
    body("location").optional(),
    body("location.latitude")
      .if(body("location").exists())
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("location.longitude")
      .if(body("location").exists())
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    validateRequest,
  ],
  login: [body("email").isEmail().normalizeEmail(), body("password").notEmpty(), validateRequest],
};

// Post validation rules
export const postValidation = {
  create: [
    body("content").trim().isLength({ min: 1, max: 1000 }),
    body("eventId").optional().isMongoId(),
    validateRequest,
  ],
  update: [
    param("id").isMongoId(),
    body("content").trim().isLength({ min: 1, max: 1000 }),
    validateRequest,
  ],
};

// Comment validation rules
export const commentValidation = {
  create: [
    body("content").trim().isLength({ min: 1, max: 500 }),
    body("postId").isMongoId(),
    validateRequest,
  ],
  update: [
    param("id").isMongoId(),
    body("content").trim().isLength({ min: 1, max: 500 }),
    validateRequest,
  ],
};

// Pagination validation
export const paginationValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  validateRequest,
];

// Search validation
export const searchValidation = [
  query("query").trim().isLength({ min: 1, max: 100 }),
  validateRequest,
];
