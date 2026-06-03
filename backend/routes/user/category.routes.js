import express from "express";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  getAllCategoriesUser,
  getCategoryById,
} from "../../controllers/category.controller.js";

const router = express.Router();

// optionalProtect: allows guests (?city=) and authenticated users (selectedCity)
router.get("/", optionalProtect, getAllCategoriesUser);
router.get("/:id", getCategoryById);


export default router;
