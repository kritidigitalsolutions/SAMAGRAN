import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
  addProductRating,
  getProductsUser,
  getSingleProductUser,
} from "../../controllers/product.controller.js";

const router = express.Router();

router.get("/", getProductsUser);
router.get("/:id", getSingleProductUser);
router.post("/:id/ratings", protect, addProductRating);

export default router;
