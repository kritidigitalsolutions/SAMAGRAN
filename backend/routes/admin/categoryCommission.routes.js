import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createCategoryCommission,
  getAllCategoryCommissions,
  getCategoryCommissionById,
  updateCategoryCommission,
  deleteCategoryCommission,
  getCategoryCommissionStats,
} from "../../controllers/admin/categoryCommission.controller.js";

const router = express.Router();

router.get("/category-commissions/stats", protectAdmin, getCategoryCommissionStats);
router.post("/category-commissions", protectAdmin, createCategoryCommission);
router.get("/category-commissions", protectAdmin, getAllCategoryCommissions);
router.get("/category-commissions/:id", protectAdmin, getCategoryCommissionById);
router.put("/category-commissions/:id", protectAdmin, updateCategoryCommission);
router.delete("/category-commissions/:id", protectAdmin, deleteCategoryCommission);

export default router;
