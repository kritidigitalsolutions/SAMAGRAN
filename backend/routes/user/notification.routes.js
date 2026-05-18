import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
  getUserNotifications,
  markNotificationRead,
  deleteUserNotification,
  clearUserNotifications,
} from "../../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);
router.patch("/:id/read", protect, markNotificationRead);
router.delete("/:id", protect, deleteUserNotification);
router.delete("/", protect, clearUserNotifications);

export default router;
