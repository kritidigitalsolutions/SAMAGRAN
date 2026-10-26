import express from "express";
import protect, { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  addProductRating,
  getProductRatings,
  getProductsUser,
  getSingleProductUser,
} from "../../controllers/product.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

// optionalProtect: attaches req.user if JWT is present (for selectedCity),
// but does NOT reject unauthenticated (guest) requests.
router.get("/", optionalProtect, cacheMiddleware({ ttl: 60, prefix: "user-items" }), getProductsUser);
router.get("/:id", cacheMiddleware({ ttl: 120, prefix: "user-item" }), getSingleProductUser);
router.get("/:id/ratings", getProductRatings);
router.post("/:id/ratings", protect, addProductRating);

export default router;
