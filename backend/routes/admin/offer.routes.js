import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  createOffer,
  deleteOffer,
  getOffers,
  updateOffer,
} from "../../controllers/admin/offer.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getOffers);
router.post("/", protectAdmin, createOffer);
router.put("/:id", protectAdmin, updateOffer);
router.delete("/:id", protectAdmin, deleteOffer);

export default router;
