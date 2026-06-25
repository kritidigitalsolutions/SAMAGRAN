import mongoose from "mongoose";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Pandit from "../models/pandit.model.js";
import Vendor from "../models/vendor.model.js";
import Notification from "../models/notification.model.js";
import { isFcmTokenValid, sendPushNotifications } from "./fcm.service.js";

const collectTokens = (documents = []) => {
  return documents
    .map((document) => document?.fcmToken)
    .filter(isFcmTokenValid);
};

const queryWithToken = { fcmToken: { $exists: true, $ne: "" } };

const mapSendStatus = (status) => {
  if (status === "SKIPPED") return "skipped";
  if (status === "PARTIAL") return "partial";
  if (status === "FAILED") return "failed";
  return "sent";
};

const createNotificationRecord = async ({
  title,
  body,
  data = {},
  audienceType = "user",
  audienceIds = [],
  createdBy = null,
  vendorId = null,
  sendResult = {},
}) => {
  try {
    await Notification.create({
      title: String(title || "").trim(),
      body: String(body || "").trim(),
      data: data || {},
      audience: {
        type: String(audienceType || "user").trim(),
        ids: Array.isArray(audienceIds)
          ? audienceIds
              .map((id) => {
                try {
                  return new mongoose.Types.ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
          : [],
      },
      sentCount: sendResult.sentCount || 0,
      failedCount: sendResult.failedCount || 0,
      status: mapSendStatus(sendResult.status),
      error: sendResult.error || sendResult.message || "",
      createdBy: createdBy || null,
      vendorId: vendorId || null,
    });
  } catch {
    // ignore persistence errors
  }
};

export const notifyAdmins = async ({ title, body, data = {} }) => {
  const admins = await Admin.find(queryWithToken).select("fcmToken").lean();
  const sendResult = await sendPushNotifications({
    tokens: collectTokens(admins),
    title,
    body,
    data,
  });

  try {
    await Notification.create({
      title: String(title || "").trim(),
      body: String(body || "").trim(),
      data: data || {},
      audience: { type: "admin", ids: [] },
      sentCount: sendResult.sentCount || 0,
      failedCount: sendResult.failedCount || 0,
      status: mapSendStatus(sendResult.status),
      error: sendResult.error || sendResult.message || "",
    });
  } catch {
    // ignore persistence errors
  }

  return sendResult;
};

export const notifyAllUsers = async ({ title, body, data = {} }) => {
  const users = await User.find(queryWithToken).select("fcmToken").lean();
  const sendResult = await sendPushNotifications({
    tokens: collectTokens(users),
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "user",
    audienceIds: [],
    sendResult,
  });

  return sendResult;
};

export const notifyUsersByIds = async ({ userIds = [], title, body, data = {} }) => {
  if (!Array.isArray(userIds) || !userIds.length) {
    return {
      status: "SKIPPED",
      message: "No user ids provided",
      sentCount: 0,
      failedCount: 0,
      responses: [],
    };
  }

  const users = await User.find({
    _id: { $in: userIds },
    ...queryWithToken,
  })
    .select("fcmToken")
    .lean();

  const sendResult = await sendPushNotifications({
    tokens: collectTokens(users),
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "user",
    audienceIds: userIds,
    sendResult,
  });

  return sendResult;
};

export const notifyPandits = async ({ title, body, data = {} }) => {
  const pandits = await Pandit.find(queryWithToken).select("fcmToken").lean();
  const sendResult = await sendPushNotifications({
    tokens: collectTokens(pandits),
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "pandit",
    audienceIds: [],
    sendResult,
  });

  return sendResult;
};

export const notifyPanditById = async ({ panditId, title, body, data = {} }) => {
  const pandit = await Pandit.findById(panditId).select("fcmToken").lean();
  if (!pandit) {
    return { status: "FAILED", message: "Pandit not found" };
  }

  const sendResult = await sendPushNotifications({
    tokens: [pandit.fcmToken],
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "pandit",
    audienceIds: [panditId],
    sendResult,
  });

  return sendResult;
};

export const notifyVendors = async ({ title, body, data = {} }) => {
  const vendors = await Vendor.find(queryWithToken).select("fcmToken").lean();
  const sendResult = await sendPushNotifications({
    tokens: collectTokens(vendors),
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "vendor",
    audienceIds: [],
    sendResult,
  });

  return sendResult;
};

export const notifyVendorsByIds = async ({ vendorIds = [], title, body, data = {} }) => {
  if (!Array.isArray(vendorIds) || !vendorIds.length) {
    return {
      status: "SKIPPED",
      message: "No vendor ids provided",
      sentCount: 0,
      failedCount: 0,
      responses: [],
    };
  }

  const vendors = await Vendor.find({
    _id: { $in: vendorIds },
    ...queryWithToken,
  })
    .select("fcmToken")
    .lean();

  const sendResult = await sendPushNotifications({
    tokens: collectTokens(vendors),
    title,
    body,
    data,
  });

  await createNotificationRecord({
    title,
    body,
    data,
    audienceType: "vendor",
    audienceIds: vendorIds,
    sendResult,
  });

  return sendResult;
};

export const updateDeviceToken = async ({ Model, id, token }) => {
  if (!isFcmTokenValid(token)) {
    return null;
  }

  const document = await Model.findById(id);
  if (!document) {
    return null;
  }

  document.fcmToken = String(token).trim();
  document.fcmTokenUpdatedAt = new Date();
  await document.save();

  return document;
};