import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const getActorFromRequest = (req) => {
  if (req.pandit) {
    return {
      id: req.pandit._id,
      role: "pandit",
      createdAt: req.pandit.createdAt,
    };
  }
  if (req.user) {
    return {
      id: req.user._id,
      role: "user",
      createdAt: req.user.createdAt,
    };
  }
  return null;
};

const buildAudienceQuery = (actorId, role) => ({
  "audience.type": role,
  $or: [
    { "audience.ids": { $size: 0 } },
    { "audience.ids": toObjectId(actorId) },
  ],
});

const buildVisibilityQuery = (actorId) => ({
  deletedBy: { $ne: toObjectId(actorId) },
});

const buildCreatedAtQuery = (createdAt) => {
  if (createdAt) {
    return { createdAt: { $gte: new Date(createdAt) } };
  }
  return {};
};

export const getUserNotifications = async (req, res) => {
  try {
    const actor = getActorFromRequest(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { id: actorId, role, createdAt } = actor;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 20), 1);
    const status = String(req.query.status || "all").toLowerCase();

    const baseQuery = {
      ...buildAudienceQuery(actorId, role),
      ...buildVisibilityQuery(actorId),
      ...buildCreatedAtQuery(createdAt),
    };

    if (status === "read") {
      baseQuery.readBy = toObjectId(actorId);
    } else if (status === "unread") {
      baseQuery.readBy = { $ne: toObjectId(actorId) };
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
        ? notification.readBy.some((id) => String(id) === String(actorId))
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
    const actor = getActorFromRequest(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { id: actorId, role, createdAt } = actor;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    const query = {
      _id: notificationId,
      ...buildAudienceQuery(actorId, role),
      ...buildVisibilityQuery(actorId),
      ...buildCreatedAtQuery(createdAt),
    };

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { readBy: toObjectId(actorId) } },
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
    const actor = getActorFromRequest(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { id: actorId, role, createdAt } = actor;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    const query = {
      _id: notificationId,
      ...buildAudienceQuery(actorId, role),
      ...buildVisibilityQuery(actorId),
      ...buildCreatedAtQuery(createdAt),
    };

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { deletedBy: toObjectId(actorId) } },
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
    const actor = getActorFromRequest(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { id: actorId, role, createdAt } = actor;

    const query = {
      ...buildAudienceQuery(actorId, role),
      ...buildVisibilityQuery(actorId),
      ...buildCreatedAtQuery(createdAt),
    };

    const result = await Notification.updateMany(query, {
      $addToSet: { deletedBy: toObjectId(actorId) },
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

export const markAllNotificationsRead = async (req, res) => {
  try {
    const actor = getActorFromRequest(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { id: actorId, role, createdAt } = actor;

    const query = {
      ...buildAudienceQuery(actorId, role),
      ...buildVisibilityQuery(actorId),
      ...buildCreatedAtQuery(createdAt),
      readBy: { $ne: toObjectId(actorId) },
    };

    const result = await Notification.updateMany(query, {
      $addToSet: { readBy: toObjectId(actorId) },
    });

    return res.json({
      success: true,
      message: "All notifications marked as read",
      data: {
        matched: result.matchedCount ?? result.n,
        modified: result.modifiedCount ?? result.nModified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update notifications",
    });
  }
};



