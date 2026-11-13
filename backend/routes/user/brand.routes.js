import express from "express";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  getAllBrandsUser,
  getBrandById,
} from "../../controllers/brand.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

// optionalProtect: allows guests (?city=) and authenticated users (selectedCity)
router.get("/", optionalProtect, cacheMiddleware({ ttl: 300, prefix: "user-brands" }), getAllBrandsUser);
router.get("/:id", cacheMiddleware({ ttl: 300, prefix: "user-brand" }), getBrandById);

export default router;
