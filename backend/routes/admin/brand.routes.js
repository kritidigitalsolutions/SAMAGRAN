import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
} from "../../controllers/admin/brand.controller.js";

const router = express.Router();

router.post("/brands", protectAdmin, upload.single("imageFile"), createBrand);
router.get("/brands", protectAdmin, getAllBrands);
router.get("/brands/:id", protectAdmin, getBrandById);
router.put("/brands/:id", protectAdmin, upload.single("imageFile"), updateBrand);
router.delete("/brands/:id", protectAdmin, deleteBrand);

export default router;
