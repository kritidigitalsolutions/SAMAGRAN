import mongoose from "mongoose";
import Notification from "../../models/notification.model.js";
import { notifyAllUsers, notifyUsersByIds } from "../../utils/notification.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const buildAdminAudienceQuery = (adminId) => ({
  "audience.type": "admin",
  $or: [
    { "audience.ids": { $size: 0 } },
    { "audience.ids": toObjectId(adminId) },
  ],
});

const buildAdminVisibilityQuery = (adminId) => ({
  deletedBy: { $ne: toObjectId(adminId) },
});

export const getNotificationHistory = async (req, res) => {
  try {
    const filter = {};

    if (req.admin?.role === "vendor" && req.admin?.vendorId) {
      filter.vendorId = req.admin.vendorId;
    }

    const notifications = await Notification.find(filter)
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
    const { target = "all-users", userIds = [], title = "", body = "" } = req.body || {};
    const normalizedTitle = String(title || "").trim();
    const normalizedBody = String(body || "").trim();

    if (!normalizedTitle || !normalizedBody) {
      return res.status(400).json({
        success: false,
        message: "title and body are required",
      });
    }

    const parsedData = {};
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
      vendorId: req.admin?.role === "vendor" ? req.admin.vendorId : null,
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

export const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 20), 1);
    const status = String(req.query.status || "all").toLowerCase();

    // For vendors, show vendor notifications; for admins, show admin notifications
    const isVendor = req.admin?.role === "vendor" && req.admin?.vendorId;
    
    let baseQuery;
    if (isVendor) {
      // Vendors see vendor-type notifications for their vendorId
      baseQuery = {
        "audience.type": "vendor",
        $or: [
          { "audience.ids": { $size: 0 } },
          { "audience.ids": new mongoose.Types.ObjectId(req.admin.vendorId) },
        ],
        deletedBy: { $ne: new mongoose.Types.ObjectId(adminId) },
      };
    } else {
      // Admins see admin-type notifications
      baseQuery = {
        ...buildAdminAudienceQuery(adminId),
        ...buildAdminVisibilityQuery(adminId),
      };
    }

    if (status === "read") {
      baseQuery.readBy = toObjectId(adminId);
    } else if (status === "unread") {
      baseQuery.readBy = { $ne: toObjectId(adminId) };
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
        ? notification.readBy.some((id) => String(id) === String(adminId))
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

export const getAdminUnreadCount = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    
    // For vendors, count vendor-type unread notifications; for admins, count admin-type unread
    const isVendor = req.admin?.role === "vendor" && req.admin?.vendorId;
    
    let baseQuery;
    if (isVendor) {
      baseQuery = {
        "audience.type": "vendor",
        $or: [
          { "audience.ids": { $size: 0 } },
          { "audience.ids": new mongoose.Types.ObjectId(req.admin.vendorId) },
        ],
        deletedBy: { $ne: new mongoose.Types.ObjectId(adminId) },
        readBy: { $ne: toObjectId(adminId) },
      };
    } else {
      baseQuery = {
        ...buildAdminAudienceQuery(adminId),
        ...buildAdminVisibilityQuery(adminId),
        readBy: { $ne: toObjectId(adminId) },
      };
    }

    const count = await Notification.countDocuments(baseQuery);

    return res.json({
      success: true,
      count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load unread count",
    });
  }
};

export const markAdminNotificationRead = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    // For vendors, check vendor-type notifications; for admins, check admin-type notifications
    const isVendor = req.admin?.role === "vendor" && req.admin?.vendorId;
    
    let query;
    if (isVendor) {
      query = {
        _id: notificationId,
        "audience.type": "vendor",
        $or: [
          { "audience.ids": { $size: 0 } },
          { "audience.ids": new mongoose.Types.ObjectId(req.admin.vendorId) },
        ],
        deletedBy: { $ne: new mongoose.Types.ObjectId(adminId) },
      };
    } else {
      query = {
        _id: notificationId,
        ...buildAdminAudienceQuery(adminId),
        ...buildAdminVisibilityQuery(adminId),
      };
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { readBy: toObjectId(adminId) } },
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

export const deleteAdminNotification = async (req, res) => {
  try {
    const adminId = req.admin?._id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id",
      });
    }

    // For vendors, check vendor-type notifications; for admins, check admin-type notifications
    const isVendor = req.admin?.role === "vendor" && req.admin?.vendorId;
    
    let query;
    if (isVendor) {
      query = {
        _id: notificationId,
        "audience.type": "vendor",
        $or: [
          { "audience.ids": { $size: 0 } },
          { "audience.ids": new mongoose.Types.ObjectId(req.admin.vendorId) },
        ],
        deletedBy: { $ne: new mongoose.Types.ObjectId(adminId) },
      };
    } else {
      query = {
        _id: notificationId,
        ...buildAdminAudienceQuery(adminId),
        ...buildAdminVisibilityQuery(adminId),
      };
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { $addToSet: { deletedBy: toObjectId(adminId) } },
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

export const clearAdminNotifications = async (req, res) => {
  try {
    const adminId = req.admin?._id;

    const query = {
      ...buildAdminAudienceQuery(adminId),
      ...buildAdminVisibilityQuery(adminId),
    };

    const result = await Notification.updateMany(query, {
      $addToSet: { deletedBy: toObjectId(adminId) },
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