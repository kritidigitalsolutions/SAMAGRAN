import PanditBooking from "../../models/panditBooking.model.js";
import Pandit from "../../models/pandit.model.js";
import mongoose from "mongoose";

// Default commission split: admin takes 20%, pandit gets 80%
// This can later be made configurable via bookingPricing
const ADMIN_COMMISSION_PERCENT = 20;

/**
 * GET /admin/pandit-earnings
 * Returns earnings summary for all pandits (super admin) or specific pandit
 */
export const getPanditEarningsSummary = async (req, res) => {
  try {
    const { panditId, status = "all" } = req.query;

    // If vendor scope, restrict to pandits under them (future scope)
    const filter = {};
    if (panditId && mongoose.Types.ObjectId.isValid(panditId)) {
      filter.pandit = new mongoose.Types.ObjectId(panditId);
    }

    // Fetch all completed (paid) bookings
    const completedFilter = {
      ...filter,
      bookingStatus: "completed",
      "payment.status": "paid",
    };

    const allBookings = await PanditBooking.find(completedFilter)
      .populate("pandit", "fullName phone profileImage address")
      .lean();

    // Group by pandit
    const panditMap = new Map();

    for (const booking of allBookings) {
      const pid = String(booking.pandit?._id || "unknown");
      const bookingAmount = Number(booking.bookingAmount || booking.dakshinaAmount || booking.price || 0);
      const adminShare = Math.round((bookingAmount * ADMIN_COMMISSION_PERCENT) / 100 * 100) / 100;
      const panditShare = Math.round((bookingAmount - adminShare) * 100) / 100;
      const isPaid = booking.payoutPaid === true;

      if (!panditMap.has(pid)) {
        panditMap.set(pid, {
          pandit: booking.pandit,
          totalBookings: 0,
          totalBookingAmount: 0,
          adminCommission: 0,
          panditEarnings: 0,
          paidAmount: 0,
          pendingAmount: 0,
          bookings: [],
        });
      }

      const row = panditMap.get(pid);
      row.totalBookings += 1;
      row.totalBookingAmount += bookingAmount;
      row.adminCommission += adminShare;
      row.panditEarnings += panditShare;
      if (isPaid) {
        row.paidAmount += panditShare;
      } else {
        row.pendingAmount += panditShare;
      }
      row.bookings.push({
        _id: booking._id,
        ritualName: booking.ritual?.name || "",
        bookingDate: booking.bookingDate,
        bookingAmount,
        adminShare,
        panditShare,
        payoutPaid: isPaid,
        payoutPaidAt: booking.payoutPaidAt || null,
        createdAt: booking.createdAt,
      });
    }

    const rows = Array.from(panditMap.values()).map((row) => ({
      ...row,
      totalBookingAmount: Math.round(row.totalBookingAmount * 100) / 100,
      adminCommission: Math.round(row.adminCommission * 100) / 100,
      panditEarnings: Math.round(row.panditEarnings * 100) / 100,
      paidAmount: Math.round(row.paidAmount * 100) / 100,
      pendingAmount: Math.round(row.pendingAmount * 100) / 100,
    }));

    const summary = {
      totalBookingAmount: rows.reduce((s, r) => s + r.totalBookingAmount, 0),
      totalAdminCommission: rows.reduce((s, r) => s + r.adminCommission, 0),
      totalPanditEarnings: rows.reduce((s, r) => s + r.panditEarnings, 0),
      totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
      totalPending: rows.reduce((s, r) => s + r.pendingAmount, 0),
      adminCommissionPercent: ADMIN_COMMISSION_PERCENT,
    };

    return res.json({ success: true, data: { summary, pandits: rows } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch pandit earnings" });
  }
};

/**
 * PATCH /admin/pandit-bookings/:id/mark-payout-paid
 * Marks a specific pandit booking's payout as paid
 */
export const markPanditPayoutPaid = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await PanditBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.payoutPaid) {
      return res.status(400).json({ success: false, message: "Payout already marked as paid" });
    }

    booking.payoutPaid = true;
    booking.payoutPaidAt = new Date();
    booking.payoutPaidBy = req.admin?._id || null;
    await booking.save();

    return res.json({ success: true, message: "Payout marked as paid", data: { booking } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to mark payout" });
  }
};

/**
 * PATCH /admin/pandits/mark-all-payout-paid/:panditId
 * Mark all pending payouts for a specific pandit as paid
 */
export const markAllPanditPayoutsPaid = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const { panditId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(panditId)) {
      return res.status(400).json({ success: false, message: "Invalid pandit ID" });
    }

    const result = await PanditBooking.updateMany(
      {
        pandit: panditId,
        bookingStatus: "completed",
        "payment.status": "paid",
        payoutPaid: { $ne: true },
      },
      {
        $set: {
          payoutPaid: true,
          payoutPaidAt: new Date(),
          payoutPaidBy: req.admin?._id || null,
        },
      }
    );

    return res.json({
      success: true,
      message: `${result.modifiedCount} payout(s) marked as paid`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to mark payouts" });
  }
};
