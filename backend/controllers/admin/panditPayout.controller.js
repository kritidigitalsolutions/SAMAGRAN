import mongoose from "mongoose";
import Pandit from "../../models/pandit.model.js";
import PanditWallet from "../../models/panditWallet.model.js";
import PanditWalletTransaction from "../../models/panditWalletTransaction.model.js";
import BookingPricing from "../../models/bookingPrice.js";
import PanditPayout from "../../models/panditPayout.model.js";
import { notifyPanditById } from "../../utils/notification.service.js";

const toMoney = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) && num >= 0 ? Number(num.toFixed(2)) : 0;
};

const resolveVendorScope = (req) => {
  if (req.admin?.role === "vendor") {
    return {
      vendorId: req.admin.vendorId ? String(req.admin.vendorId) : null,
      isAll: false,
    };
  }

  if (req.query?.vendorId) {
    return { vendorId: String(req.query.vendorId), isAll: false };
  }

  if (req.admin?.role === "super") {
    return { vendorId: null, isAll: true };
  }

  return { vendorId: null, isAll: false };
};

/**
 * GET /api/admin/pandit-payouts/alerts
 * Returns list of pandits whose wallet balance >= payout threshold
 */
export const getPanditPayoutAlerts = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor scope not resolved" });
    }

    // Get active pricing to find threshold
    const pricing = await BookingPricing.findOne({ isActive: true }).lean();
    const threshold = Number(pricing?.panditCommissionThreshold || 500);

    // Fetch wallets that exceed the threshold and have some balance
    const query = {
      balance: { $gte: threshold, $gt: 0 },
    };

    const panditMatchQuery = vendorId ? { vendorId: new mongoose.Types.ObjectId(vendorId) } : {};

    const wallets = await PanditWallet.find(query)
      .populate({
        path: "pandit",
        select: "fullName phone profileImage accountHolderName accountNumber ifscCode bankName vendorId",
        match: panditMatchQuery,
      })
      .lean();

    // Filter out wallets where pandit didn't match the vendor filter
    const alerts = wallets
      .filter((w) => w.pandit)
      .map((w) => ({
        _id: w._id,
        pandit: w.pandit,
        balance: w.balance,
        payableBalance: w.payableBalance,
        totalEarned: w.totalEarned,
        totalPaid: w.totalPaid,
        threshold,
      }));

    return res.json({ success: true, data: { alerts, threshold } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch payout alerts" });
  }
};

/**
 * POST /api/admin/pandit-payouts
 * Marks a payout to a Pandit as paid, deducting the amount from their wallet
 */
export const createPanditPayout = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const { panditId, amount, method = "bank", reference, notes = "" } = req.body || {};
    const parsedAmount = toMoney(amount);

    if (!panditId || !mongoose.Types.ObjectId.isValid(panditId)) {
      return res.status(400).json({ success: false, message: "Valid panditId is required" });
    }

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    if (!reference || !String(reference).trim()) {
      return res.status(400).json({ success: false, message: "Transaction reference is required" });
    }

    const pandit = await Pandit.findById(panditId);
    if (!pandit) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    // Verify vendor scope if applicable
    if (vendorId && String(pandit.vendorId) !== String(vendorId)) {
      return res.status(403).json({ success: false, message: "You can only process payouts for your own pandits" });
    }

    let wallet = await PanditWallet.findOne({ pandit: panditId });
    if (!wallet) {
      wallet = await PanditWallet.create({ pandit: panditId, balance: 0 });
    }

    if (parsedAmount > wallet.balance) {
      return res.status(400).json({ success: false, message: "Payout amount exceeds available wallet balance" });
    }

    // Create the payout record
    const payout = await PanditPayout.create({
      pandit: panditId,
      vendorId: pandit.vendorId || null,
      amount: parsedAmount,
      method,
      bankDetails: {
        accountHolderName: pandit.accountHolderName || "",
        accountNumber: pandit.accountNumber || "",
        ifscCode: pandit.ifscCode || "",
        bankName: pandit.bankName || "",
      },
      upiId: method === "upi" ? (pandit.phone || "") : "", // fallback/placeholder if needed
      reference: String(reference).trim(),
      notes: String(notes).trim(),
      processedBy: req.admin._id,
      paidAt: new Date(),
    });

    // Update the wallet balance
    const pricing = await BookingPricing.findOne({ isActive: true }).lean();
    const threshold = Number(pricing?.panditCommissionThreshold || 500);

    const nextBalance = toMoney(wallet.balance - parsedAmount);
    wallet.balance = nextBalance;
    wallet.totalPaid = toMoney(wallet.totalPaid + parsedAmount);
    wallet.isPayable = nextBalance >= threshold;
    wallet.payableBalance = wallet.isPayable ? nextBalance : 0;
    wallet.lastPayoutAt = new Date();
    await wallet.save();

    // Log the transaction
    await PanditWalletTransaction.create({
      wallet: wallet._id,
      pandit: panditId,
      type: "debit",
      source: "payout",
      amount: parsedAmount,
      balanceAfter: nextBalance,
      reference: String(payout._id),
      notes: String(notes || `Manual payout of ${parsedAmount} recorded`).trim(),
    });

    // Send push notification to pandit
    try {
      const notificationTitle = "Payout Processed! 💸";
      const notificationBody = `Your payout of ₹${parsedAmount} has been processed successfully. Ref: ${reference}`;
      await notifyPanditById({
        panditId,
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: "payout_processed",
          amount: String(parsedAmount),
          reference: String(reference),
        },
      });
    } catch (notifErr) {
      console.error("Failed to notify pandit on payout: ", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Payout recorded successfully",
      data: { payout, wallet },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to process payout" });
  }
};

/**
 * GET /api/admin/pandit-payouts/history
 * Returns payout history for Pandits
 */
export const getPanditPayoutHistory = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor scope not resolved" });
    }

    const query = vendorId ? { vendorId } : {};

    const payouts = await PanditPayout.find(query)
      .populate("pandit", "fullName phone profileImage")
      .populate("processedBy", "name email")
      .sort({ paidAt: -1 })
      .lean();

    return res.json({ success: true, data: { payouts } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch payout history" });
  }
};
