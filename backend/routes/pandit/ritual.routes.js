import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  addCustomSamagriToPanditRitual,
  addRitualForPandit,
  getCustomSamagriToPanditRitual,
  getAllRitualsForPandit,
  getMyRitualsForPandit,
  removeCustomSamagriFromPanditRitual,
} from "../../controllers/pandit/ritual.controller.js";

const router = express.Router();

router.get("/", protectPandit, getAllRitualsForPandit);
router.get("/my", protectPandit, getMyRitualsForPandit);
router.get("/:ritualId/custom-samagri", protectPandit, getCustomSamagriToPanditRitual);
router.post("/", protectPandit, addRitualForPandit);
router.patch("/:ritualId/custom-samagri", protectPandit, addCustomSamagriToPanditRitual);
router.delete(
  "/:ritualId/custom-samagri/:itemId",
  protectPandit,
  removeCustomSamagriFromPanditRitual
);

export default router;
router.post("/", protectPandit, addRitualForPandit);
// router.post("/:ritualId/custom-samagri", protectPandit, addCustomSamagriToPanditRitual);