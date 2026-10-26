import express from "express";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  getAllCategoriesUser,
  getCategoryById,
} from "../../controllers/category.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

// optionalProtect: allows guests (?city=) and authenticated users (selectedCity)
router.get("/", optionalProtect, cacheMiddleware({ ttl: 300, prefix: "user-categories" }), getAllCategoriesUser);
router.get("/:id", cacheMiddleware({ ttl: 300, prefix: "user-category" }), getCategoryById);


export default router;
