import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  addRitualForPandit,
  getAllRitualsForPandit,
} from "../../controllers/pandit/ritual.controller.js";

const router = express.Router();

router.get("/", protectPandit, getAllRitualsForPandit);
router.post("/", protectPandit, addRitualForPandit);

export default router;
