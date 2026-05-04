import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Pandit from "../models/pandit.model.js";
import { isFcmTokenValid, sendPushNotifications } from "./fcm.service.js";

const collectTokens = (documents = []) => {
  return documents
    .map((document) => document?.fcmToken)
    .filter(isFcmTokenValid);
};

const queryWithToken = { fcmToken: { $exists: true, $ne: "" } };

export const notifyAdmins = async ({ title, body, data = {} }) => {
  const admins = await Admin.find(queryWithToken).select("fcmToken").lean();
  return sendPushNotifications({
    tokens: collectTokens(admins),
    title,
    body,
    data,
  });
};

export const notifyAllUsers = async ({ title, body, data = {} }) => {
  const users = await User.find(queryWithToken).select("fcmToken").lean();
  return sendPushNotifications({
    tokens: collectTokens(users),
    title,
    body,
    data,
  });
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

  return sendPushNotifications({
    tokens: collectTokens(users),
    title,
    body,
    data,
  });
};

export const notifyPandits = async ({ title, body, data = {} }) => {
  const pandits = await Pandit.find(queryWithToken).select("fcmToken").lean();
  return sendPushNotifications({
    tokens: collectTokens(pandits),
    title,
    body,
    data,
  });
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