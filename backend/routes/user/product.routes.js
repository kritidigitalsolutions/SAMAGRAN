import express from "express";
import {
  getProductsUser,
  getSingleProductUser,
} from "../../controllers/product.controller.js";

const router = express.Router();

router.get("/", getProductsUser);
router.get("/:id", getSingleProductUser);

export default router;
