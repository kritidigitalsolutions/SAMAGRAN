import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../../controllers/admin/category.controller.js";

const router = express.Router();

router.post("/categories", protectAdmin, upload.single("imageFile"), createCategory);
router.get("/categories", protectAdmin, getAllCategories);
router.get("/categories/:id", protectAdmin, getCategoryById);
router.put("/categories/:id", protectAdmin, upload.single("imageFile"), updateCategory);
router.delete("/categories/:id", protectAdmin, deleteCategory);

export default router;
