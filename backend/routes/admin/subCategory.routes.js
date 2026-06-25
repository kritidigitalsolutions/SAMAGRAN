import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createSubCategory,
  deleteSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
} from "../../controllers/admin/subCategory.controller.js";

const router = express.Router();

router.post("/", protectAdmin, upload.single("imageFile"), createSubCategory);
router.get("/", protectAdmin, getAllSubCategories);
router.get("/:id", protectAdmin, getSubCategoryById);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateSubCategory);
router.delete("/:id", protectAdmin, deleteSubCategory);

export default router;
