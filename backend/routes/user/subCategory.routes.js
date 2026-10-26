import express from "express";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import { getAllSubCategoriesUser } from "../../controllers/subCategory.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

router.get("/", optionalProtect, cacheMiddleware({ ttl: 300, prefix: "user-subcategories" }), getAllSubCategoriesUser);

export default router;
