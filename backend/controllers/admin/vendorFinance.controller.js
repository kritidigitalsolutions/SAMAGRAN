import mongoose from "mongoose";
import Order from "../../models/order.model.js";
import VendorWithdrawal from "../../models/vendorWithdrawal.model.js";

const ORDER_STATUSES = {
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

const normalizeOrderStatus = (value = "Placed") => String(value || "").trim().toLowerCase();

const getPayableAmount = (order = {}) =>
  toMoney(order?.amountBreakup?.payableAmount ?? order?.payableAmount ?? order?.totalAmount ?? 0);

const getVendorIdFromRequest = (req) => {
  if (req.admin?.role === "vendor") {
    return req.admin.vendorId ? String(req.admin.vendorId) : null;
  }

  if (req.query?.vendorId && mongoose.Types.ObjectId.isValid(req.query.vendorId)) {
    return String(req.query.vendorId);
  }

  return null;
};

const buildWithdrawalTotals = (withdrawals = []) => {
  const paid = withdrawals.filter((item) => item.status === "paid");
  const approved = withdrawals.filter((item) => item.status === "approved");
  const pending = withdrawals.filter((item) => item.status === "pending");

  const totalPaid = paid.reduce((sum, item) => sum + toMoney(item.amount), 0);
  const totalApproved = approved.reduce((sum, item) => sum + toMoney(item.amount), 0);
  const totalPending = pending.reduce((sum, item) => sum + toMoney(item.amount), 0);

  return {
    totalPaid: toMoney(totalPaid),
    totalApproved: toMoney(totalApproved),
    totalPending: toMoney(totalPending),
  };
};

export const getVendorEarningsSummary = async (req, res) => {
  try {
    const vendorId = getVendorIdFromRequest(req);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const orders = await Order.find({ vendorId }).lean();

    const deliveredOrders = orders.filter(
      (order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.DELIVERED
    );
    const cancelledOrders = orders.filter(
      (order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.CANCELLED
    );

    const totalSales = toMoney(orders.reduce((sum, order) => sum + toMoney(order.totalAmount), 0));
    const totalEarnings = toMoney(deliveredOrders.reduce((sum, order) => sum + getPayableAmount(order), 0));

    const pendingBalance = toMoney(
      orders
        .filter((order) => {
          const status = normalizeOrderStatus(order.orderStatus);
          return status !== ORDER_STATUSES.DELIVERED && status !== ORDER_STATUSES.CANCELLED;
        })
        .reduce((sum, order) => sum + getPayableAmount(order), 0)
    );

    const withdrawals = await VendorWithdrawal.find({ vendor: vendorId }).lean();
    const withdrawalTotals = buildWithdrawalTotals(withdrawals);

    const availableBalance = toMoney(totalEarnings - withdrawalTotals.totalPaid - withdrawalTotals.totalApproved - withdrawalTotals.totalPending);

    return res.json({
      success: true,
      data: {
        totalSales,
        totalEarnings,
        pendingBalance,
        availableBalance: availableBalance >= 0 ? availableBalance : 0,
        completedOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length,
        pendingOrders: orders.length - deliveredOrders.length - cancelledOrders.length,
        withdrawals: withdrawalTotals,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch earnings" });
  }
};

export const getVendorWithdrawals = async (req, res) => {
  try {
    const vendorId = getVendorIdFromRequest(req);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const withdrawals = await VendorWithdrawal.find({ vendor: vendorId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { withdrawals } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch withdrawals" });
  }
};

export const createVendorWithdrawal = async (req, res) => {
  try {
    const vendorId = getVendorIdFromRequest(req);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const { amount, method = "bank", bankDetails = {}, upiId = "", notes = "" } = req.body || {};
    const parsedAmount = toMoney(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    if (method === "upi" && !String(upiId || "").trim()) {
      return res.status(400).json({ success: false, message: "UPI ID is required" });
    }

    if (method === "bank") {
      const accountName = String(bankDetails?.accountName || "").trim();
      const accountNumber = String(bankDetails?.accountNumber || "").trim();
      const ifsc = String(bankDetails?.ifsc || "").trim();

      if (!accountName || !accountNumber || !ifsc) {
        return res.status(400).json({ success: false, message: "Bank details are required" });
      }
    }

    const orders = await Order.find({ vendorId }).lean();
    const deliveredOrders = orders.filter(
      (order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.DELIVERED
    );
    const totalEarnings = toMoney(deliveredOrders.reduce((sum, order) => sum + getPayableAmount(order), 0));

    const withdrawals = await VendorWithdrawal.find({ vendor: vendorId }).lean();
    const withdrawalTotals = buildWithdrawalTotals(withdrawals);

    const availableBalance = toMoney(totalEarnings - withdrawalTotals.totalPaid - withdrawalTotals.totalApproved - withdrawalTotals.totalPending);

    if (parsedAmount > availableBalance) {
      return res.status(400).json({ success: false, message: "Withdrawal amount exceeds available balance" });
    }

    const withdrawal = await VendorWithdrawal.create({
      vendor: vendorId,
      amount: parsedAmount,
      method: method === "upi" ? "upi" : "bank",
      bankDetails: {
        accountName: String(bankDetails?.accountName || "").trim(),
        accountNumber: String(bankDetails?.accountNumber || "").trim(),
        ifsc: String(bankDetails?.ifsc || "").trim(),
      },
      upiId: String(upiId || "").trim(),
      notes: String(notes || "").trim(),
    });

    return res.status(201).json({ success: true, data: { withdrawal } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to request withdrawal" });
  }
};

export const getVendorTransactions = async (req, res) => {
  try {
    const vendorId = getVendorIdFromRequest(req);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const orders = await Order.find({ vendorId }).lean();
    const withdrawals = await VendorWithdrawal.find({ vendor: vendorId }).lean();

    const earningTransactions = orders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.DELIVERED)
      .map((order) => ({
        id: String(order._id),
        type: "earning",
        status: "completed",
        amount: getPayableAmount(order),
        reference: order.razorpayPaymentId || order.razorpayOrderId || String(order._id),
        orderId: order._id,
        createdAt: order.updatedAt || order.createdAt,
      }));

    const refundTransactions = orders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.CANCELLED)
      .map((order) => ({
        id: String(order._id),
        type: "refund",
        status: "completed",
        amount: getPayableAmount(order),
        reference: order.razorpayPaymentId || order.razorpayOrderId || String(order._id),
        orderId: order._id,
        createdAt: order.updatedAt || order.createdAt,
      }));

    const withdrawalTransactions = withdrawals.map((withdrawal) => ({
      id: String(withdrawal._id),
      type: "withdrawal",
      status: withdrawal.status,
      amount: toMoney(withdrawal.amount),
      reference: withdrawal.reference || String(withdrawal._id),
      orderId: null,
      createdAt: withdrawal.createdAt || withdrawal.requestedAt,
    }));

    const transactions = [...earningTransactions, ...refundTransactions, ...withdrawalTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({ success: true, data: { transactions } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch transactions" });
  }
};

export const getVendorRefunds = async (req, res) => {
  try {
    const vendorId = getVendorIdFromRequest(req);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const orders = await Order.find({ vendorId }).lean();

    const refunds = orders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === ORDER_STATUSES.CANCELLED)
      .map((order) => {
        const latestRequest = Array.isArray(order.cancellationRequests) && order.cancellationRequests.length
          ? order.cancellationRequests[order.cancellationRequests.length - 1]
          : null;

        return {
          id: String(order._id),
          orderId: order._id,
          amount: getPayableAmount(order),
          status: order.orderStatus,
          reason: latestRequest?.reason || "",
          requestedAt: latestRequest?.requestedAt || order.updatedAt || order.createdAt,
        };
      });

    return res.json({ success: true, data: { refunds } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch refunds" });
  }
};
