import Notification from "../models/notification.model.js";
import { sendPushNotification } from "./fcm.service.js";

/**
 * Send notification to user for pandit booking status update
 * @param {String} userId - User ID to notify
 * @param {String} bookingId - Booking ID for reference
 * @param {String} status - New booking status
 * @param {Object} pandit - Pandit details {_id, name}
 * @param {String} ritualTitle - Ritual/pooja title
 * @returns {Promise<Object>} Notification result
 */
export const notifyPanditBookingStatusUpdate = async (
  userId,
  bookingId,
  status,
  pandit,
  ritualTitle
) => {
  try {
    let title = "";
    let body = "";
    let type = "booking_status_update";

    switch (status) {
      case "requested":
        title = "Booking Requested! 📋";
        body = `Your booking request for ${ritualTitle} has been submitted to ${pandit.name}.`;
        type = "booking_requested";
        break;

      case "confirmed":
        title = "Booking Confirmed! ✅";
        body = `${pandit.name} has confirmed your ${ritualTitle} booking.`;
        type = "booking_confirmed";
        break;

      case "completed":
        title = "Booking Completed! 🎉";
        body = `Your ${ritualTitle} booking with ${pandit.name} is now complete.`;
        type = "booking_completed";
        break;

      case "cancelled":
        title = "Booking Cancelled ❌";
        body = `${pandit.name} has cancelled your ${ritualTitle} booking. A refund will be processed.`;
        type = "booking_cancelled";
        break;

      default:
        title = "Booking Status Updated";
        body = `Your booking status has been updated to ${status}.`;
    }

    // Save notification to database
    const notification = new Notification({
      title,
      body,
      type,
      data: {
        bookingId: bookingId.toString(),
        panditId: pandit._id.toString(),
        panditName: pandit.name,
        newStatus: status,
        ritual: ritualTitle,
      },
      audience: {
        type: "user",
        ids: [userId],
      },
    });

    await notification.save();

    // Send FCM push notification if available
    try {
      const userDoc = await (await import("../models/user.model.js")).default.findById(userId);
      if (userDoc?.fcmToken) {
        const result = await sendPushNotification({
          token: userDoc.fcmToken,
          title,
          body,
          data: {
            bookingId: bookingId.toString(),
            type: "booking_status_update",
            status: status,
          },
        });
        console.log(`✓ FCM notification send result for user ${userId}:`, result);
      }
    } catch (fcmError) {
      console.log(
        `ℹ FCM notification skipped for user ${userId}:`,
        fcmError.message
      );
    }

    return {
      success: true,
      notificationId: notification._id,
      message: "Notification sent successfully",
    };
  } catch (error) {
    console.error("Error sending booking status notification:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send notification to pandit when user updates booking
 * @param {String} panditId - Pandit ID to notify
 * @param {String} bookingId - Booking ID for reference
 * @param {String} action - Action taken (confirm, complete, etc)
 * @param {Object} user - User details {_id, name}
 * @param {String} ritualTitle - Ritual/pooja title
 * @returns {Promise<Object>} Notification result
 */
export const notifyPanditBookingAction = async (
  panditId,
  bookingId,
  action,
  user,
  ritualTitle
) => {
  try {
    let title = "";
    let body = "";

    switch (action) {
      case "user_confirmed":
        title = "User Confirmed Booking ✅";
        body = `${user.name} confirmed the ${ritualTitle} booking with you.`;
        break;

      case "user_cancelled":
        title = "User Cancelled Booking";
        body = `${user.name} cancelled the ${ritualTitle} booking with you.`;
        break;

      case "booking_requested":
      case "new_booking":
        title = "New Booking Request! 📋";
        body = `You have a new booking request for ${ritualTitle} from ${user.name}.`;
        break;

      default:
        title = "Booking Update";
        body = `New update on your ${ritualTitle} booking.`;
    }

    // Save notification to database
    const notification = new Notification({
      title,
      body,
      type: "booking_action",
      data: {
        bookingId: bookingId.toString(),
        userId: user._id.toString(),
        userName: user.name,
        action,
        ritual: ritualTitle,
      },
      audience: {
        type: "pandit",
        ids: [panditId],
      },
    });

    await notification.save();

    // Send FCM push notification if available
    try {
      const panditDoc = await (
        await import("../models/pandit.model.js")
      ).default.findById(panditId);
      if (panditDoc?.fcmToken) {
        const result = await sendPushNotification({
          token: panditDoc.fcmToken,
          title,
          body,
          data: {
            bookingId: bookingId.toString(),
            type: "booking_action",
          },
        });
        console.log(`✓ FCM notification send result for pandit ${panditId}:`, result);
      }
    } catch (fcmError) {
      console.log(
        `ℹ FCM notification skipped for pandit ${panditId}:`,
        fcmError.message
      );
    }

    return {
      success: true,
      notificationId: notification._id,
      message: "Notification sent successfully",
    };
  } catch (error) {
    console.error("Error sending pandit notification:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  notifyPanditBookingStatusUpdate,
  notifyPanditBookingAction,
};
