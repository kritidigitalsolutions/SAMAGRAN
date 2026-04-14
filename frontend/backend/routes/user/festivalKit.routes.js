import express from "express";
import {
  getAllKitsUser,
  getSingleKitUser
} from "../../controllers/festivalKit.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllKitsUser);
router.get("/:id", getSingleKitUser);

export default router;