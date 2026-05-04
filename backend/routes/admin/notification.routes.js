import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  getNotificationHistory,
  sendAdminNotification,
} from "../../controllers/admin/notification.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getNotificationHistory);
router.post("/send", protectAdmin, sendAdminNotification);

export default router;