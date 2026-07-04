import PanditBooking from "../../models/panditBooking.model.js";
import Pandit from "../../models/pandit.model.js";
import mongoose from "mongoose";
import BookingPricing from "../../models/bookingPrice.js";
import PanditWalletTransaction from "../../models/panditWalletTransaction.model.js";

export const getPanditEarningsSummary = async (req, res) => {
  try {
    const { panditId, status = "all" } = req.query;

    // Load active booking pricing to get the commission percentage dynamically
    const pricing = await BookingPricing.findOne({ isActive: true }).lean();
    const commissionPercent = pricing && typeof pricing.panditCommissionPercent === "number"
      ? pricing.panditCommissionPercent
      : 20; // Fallback to 20% if not found or set

    // Build filter for PanditWalletTransaction recommendation commissions
    const txFilter = {
      type: "credit",
      source: "pandit-commission",
    };

    if (panditId && mongoose.Types.ObjectId.isValid(panditId)) {
      txFilter.pandit = new mongoose.Types.ObjectId(panditId);
    }

    // Fetch transactions and populate Pandit details
    const transactions = await PanditWalletTransaction.find(txFilter)
      .populate("pandit", "fullName phone profileImage address")
      .sort({ createdAt: -1 })
      .lean();

    // Group by pandit
    const panditMap = new Map();

    for (const tx of transactions) {
      const pid = String(tx.pandit?._id || "unknown");
      
      // bookingAmount represents the recommended order/kit's total amount
      const bookingAmount = Number(tx.meta?.orderAmount || tx.amount || 0);
      const panditShare = Number(tx.amount || 0); // commission credited to pandit
      const adminShare = Math.max(bookingAmount - panditShare, 0); // rest of the kit/product price goes to admin
      const isPaid = tx.payoutPaid === true;

      if (!panditMap.has(pid)) {
        panditMap.set(pid, {
          pandit: tx.pandit,
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
        _id: tx._id,
        ritualName: `Recommendation (Order #${tx.reference ? String(tx.reference).slice(-6).toUpperCase() : "N/A"})`,
        bookingDate: tx.createdAt,
        bookingAmount,
        adminShare,
        panditShare,
        payoutPaid: isPaid,
        payoutPaidAt: tx.payoutPaidAt || null,
        createdAt: tx.createdAt,
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
      adminCommissionPercent: commissionPercent,
    };

    return res.json({ success: true, data: { summary, pandits: rows } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch pandit earnings" });
  }
};

/**
 * PATCH /admin/pandit-bookings/:id/mark-payout-paid
 * Marks a specific pandit wallet transaction's payout as paid
 */
export const markPanditPayoutPaid = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    const transaction = await PanditWalletTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Recommendation transaction not found" });
    }

    if (transaction.payoutPaid) {
      return res.status(400).json({ success: false, message: "Payout already marked as paid" });
    }

    transaction.payoutPaid = true;
    transaction.payoutPaidAt = new Date();
    transaction.payoutPaidBy = req.admin?._id || null;
    await transaction.save();

    return res.json({ success: true, message: "Payout marked as paid", data: { transaction } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to mark payout" });
  }
};

/**
 * PATCH /admin/pandits/mark-all-payout-paid/:panditId
 * Mark all pending recommendation payouts for a specific pandit as paid
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

    const result = await PanditWalletTransaction.updateMany(
      {
        pandit: panditId,
        type: "credit",
        source: "pandit-commission",
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
