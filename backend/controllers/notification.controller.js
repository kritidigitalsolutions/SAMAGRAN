import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const buildUserAudienceQuery = (userId) => ({
  "audience.type": "user",
  $or: [
    { "audience.ids": { $size: 0 } },
    { "audience.ids": toObjectId(userId) },
  ],
});

const buildUserVisibilityQuery = (userId) => ({
  deletedBy: { $ne: toObjectId(userId) },
});

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 20), 1);
    const status = String(req.query.status || "all").toLowerCase();

    const baseQuery = {
      ...buildUserAudienceQuery(userId),
      ...buildUserVisibilityQuery(userId),
    };

    if (status === "read") {
      baseQuery.readBy = toObjectId(userId);
    } else if (status === "unread") {
      baseQuery.readBy = { $ne: toObjectId(userId) };
    }

    const total = await Notification.countDocuments(baseQuery);
    const notifications = await Notification.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = notifications.map((notification) => ({
      ...notification,
      isRead: Array.isArray(notification.readBy)
        ? notification.readBy.some((id) => String(id) === String(userId))
        : false,
    }));

    return res.json({
      success: true,
      count: data.length,
      total,
      page,
      limit,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load notifications",
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    const query = {
      _id: notificationId,
      ...buildUserAudienceQuery(userId),
      ...buildUserVisibilityQuery(userId),
    };

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { readBy: toObjectId(userId) } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update notification",
    });
  }
};

export const deleteUserNotification = async (req, res) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    const query = {
      _id: notificationId,
      ...buildUserAudienceQuery(userId),
      ...buildUserVisibilityQuery(userId),
    };

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { deletedBy: toObjectId(userId) } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({
      success: true,
      message: "Notification deleted",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete notification",
    });
  }
};

export const clearUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;

    const query = {
      ...buildUserAudienceQuery(userId),
      ...buildUserVisibilityQuery(userId),
    };

    const result = await Notification.updateMany(query, {
      $addToSet: { deletedBy: toObjectId(userId) },
    });

    return res.json({
      success: true,
      message: "Notifications cleared",
      data: {
        matched: result.matchedCount ?? result.n,
        modified: result.modifiedCount ?? result.nModified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to clear notifications",
    });
  }
};
