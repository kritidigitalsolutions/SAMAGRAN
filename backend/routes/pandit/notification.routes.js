import express from "express";
import { protectPandit } from "../../middleware/pandit.middleware.js";
import {
  getUserNotifications as getPanditNotifications,
  markNotificationRead,
  deleteUserNotification,
  clearUserNotifications,
} from "../../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectPandit, getPanditNotifications);
router.patch("/:id/read", protectPandit, markNotificationRead);
router.delete("/:id", protectPandit, deleteUserNotification);
router.delete("/", protectPandit, clearUserNotifications);

export default router;
