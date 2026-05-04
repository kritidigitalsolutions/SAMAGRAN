import mongoose from "mongoose";
import Notification from "../../models/notification.model.js";
import { notifyAllUsers, notifyUsersByIds } from "../../utils/notification.service.js";

const parseDataPayload = (value) => {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const getNotificationHistory = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("createdBy", "name email")
      .lean();

    return res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load notifications",
    });
  }
};

export const sendAdminNotification = async (req, res) => {
  try {
    const { target = "all-users", userIds = [], title = "", body = "", data = {} } = req.body || {};
    const normalizedTitle = String(title || "").trim();
    const normalizedBody = String(body || "").trim();

    if (!normalizedTitle || !normalizedBody) {
      return res.status(400).json({
        success: false,
        message: "title and body are required",
      });
    }

    const parsedData = parseDataPayload(data);
    const audienceType = target === "user" ? "user" : "user";
    const targetIds = Array.isArray(userIds) ? userIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];

    const sendResult =
      target === "all-users"
        ? await notifyAllUsers({ title: normalizedTitle, body: normalizedBody, data: parsedData })
        : await notifyUsersByIds({ userIds: targetIds, title: normalizedTitle, body: normalizedBody, data: parsedData });

    const notification = await Notification.create({
      title: normalizedTitle,
      body: normalizedBody,
      data: parsedData,
      audience: {
        type: audienceType,
        ids: target === "all-users" ? [] : targetIds,
      },
      sentCount: sendResult.sentCount || 0,
      failedCount: sendResult.failedCount || 0,
      status:
        sendResult.status === "SKIPPED"
          ? "skipped"
          : sendResult.status === "PARTIAL"
            ? "partial"
            : sendResult.status === "FAILED"
              ? "failed"
              : "sent",
      error: sendResult.error || sendResult.message || "",
      createdBy: req.admin._id,
    });

    return res.status(201).json({
      success: true,
      message: "Notification sent",
      data: {
        notification,
        sendResult,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to send notification",
    });
  }
};