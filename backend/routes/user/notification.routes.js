import express from "express";
import { protectUserOrPandit } from "../../middleware/auth.middleware.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteUserNotification,
  clearUserNotifications,
} from "../../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectUserOrPandit, getUserNotifications);
router.patch("/read-all", protectUserOrPandit, markAllNotificationsRead);
router.patch("/:id/read", protectUserOrPandit, markNotificationRead);
router.delete("/:id", protectUserOrPandit, deleteUserNotification);
router.delete("/", protectUserOrPandit, clearUserNotifications);

export default router;
