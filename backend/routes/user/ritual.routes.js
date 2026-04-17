import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createRitual,
  deleteRitual,
  getAllRitualsForAdmin,
  updateRitual,
} from "../../controllers/user/ritual.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllRitualsForAdmin);
router.post("/", protectAdmin, createRitual);
router.put("/:id", protectAdmin, updateRitual);
router.delete("/:id", protectAdmin, deleteRitual);

export default router;
