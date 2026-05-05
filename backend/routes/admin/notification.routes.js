import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  clearAdminNotifications,
  deleteAdminNotification,
  getAdminNotifications,
  getAdminUnreadCount,
  getNotificationHistory,
  markAdminNotificationRead,
  sendAdminNotification,
} from "../../controllers/admin/notification.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getNotificationHistory);
router.get("/inbox", protectAdmin, getAdminNotifications);
router.get("/unread-count", protectAdmin, getAdminUnreadCount);
router.delete("/clear", protectAdmin, clearAdminNotifications);
router.patch("/:id/read", protectAdmin, markAdminNotificationRead);
router.delete("/:id", protectAdmin, deleteAdminNotification);
router.post("/send", protectAdmin, sendAdminNotification);

export default router;