import express from "express";
import protect, { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  addProductRating,
  getProductRatings,
  getProductsUser,
  getSingleProductUser,
} from "../../controllers/product.controller.js";

const router = express.Router();

// optionalProtect: attaches req.user if JWT is present (for selectedCity),
// but does NOT reject unauthenticated (guest) requests.
router.get("/", optionalProtect, getProductsUser);
router.get("/:id", getSingleProductUser);
router.get("/:id/ratings", getProductRatings);
router.post("/:id/ratings", protect, addProductRating);

export default router;
