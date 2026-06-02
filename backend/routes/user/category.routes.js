import express from "express";
import { upload } from "../../middleware/upload.js";
import {
  deleteCategory,
  getAllCategories,
  getCategoryById,
} from "../../controllers/admin/category.controller.js";

const router = express.Router();

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);


export default router;
