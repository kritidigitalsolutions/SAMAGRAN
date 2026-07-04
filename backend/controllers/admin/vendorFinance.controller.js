import VendorWithdrawal from "../../models/vendorWithdrawal.model.js";
import Vendor from "../../models/vendor.model.js";
import Order from "../../models/order.model.js";
import { buildVendorFinance, toMoney, normalizeOrderStatus } from "../../utils/vendorFinance.js";

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

export const getVendorEarningsSummary = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const finance = await buildVendorFinance({ vendorId });

    return res.json({
      success: true,
      data: {
        totalSales: finance.totalSales,
        totalEarnings: finance.vendorNetEarning,
        vendorNetEarning: finance.vendorNetEarning,
        superAdminCommission: finance.superAdminCommission,
        pendingBalance: finance.pendingNetEarning,
        pendingCommission: finance.pendingCommission,
        availableBalance: finance.availableBalance,
        completedOrders: finance.completedOrders,
        cancelledOrders: finance.cancelledOrders,
        pendingOrders: finance.pendingOrders,
        withdrawals: finance.withdrawals,
        todayRevenue: finance.todayRevenue,
        totalSettlementsPaid: finance.withdrawals.totalPaid,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch earnings" });
  }
};

export const getVendorWithdrawals = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const query = vendorId ? { vendor: vendorId } : {};
    const withdrawals = await VendorWithdrawal.find(query)
      .populate("vendor", "name businessName email phone")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { withdrawals } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch withdrawals" });
  }
};

export const createVendorWithdrawal = async (req, res) => {
  try {
    const { vendorId } = resolveVendorScope(req);

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

    const finance = await buildVendorFinance({ vendorId });

    if (parsedAmount > finance.availableBalance) {
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
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const finance = await buildVendorFinance({ vendorId });

    const earningTransactions = finance.commissionOrders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === "delivered")
      .map((order) => ({
        id: `${String(order.orderId)}-earning`,
        type: "earning",
        status: "completed",
        amount: order.vendorNetEarning,
        grossAmount: order.itemGrossTotal,
        superAdminCommission: order.superAdminCommission,
        reference: String(order.orderId),
        orderId: order.orderId,
        vendorId: order.vendorId || null,
        createdAt: order.updatedAt || order.createdAt,
      }));

    const commissionTransactions = finance.commissionOrders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === "delivered" && order.superAdminCommission > 0)
      .map((order) => ({
        id: `${String(order.orderId)}-commission`,
        type: "super-admin-commission",
        status: "completed",
        amount: order.superAdminCommission,
        grossAmount: order.itemGrossTotal,
        vendorNetEarning: order.vendorNetEarning,
        reference: String(order.orderId),
        orderId: order.orderId,
        vendorId: order.vendorId || null,
        createdAt: order.updatedAt || order.createdAt,
      }));

    const refundTransactions = finance.commissionOrders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === "cancelled")
      .map((order) => ({
        id: String(order.orderId),
        type: "refund",
        status: "completed",
        amount: order.revenue,
        reference: String(order.orderId),
        orderId: order.orderId,
        vendorId: order.vendorId || null,
        createdAt: order.updatedAt || order.createdAt,
      }));

    const withdrawalTransactions = finance.withdrawalsList.map((withdrawal) => ({
      id: String(withdrawal._id),
      type: "withdrawal",
      status: withdrawal.status,
      amount: toMoney(withdrawal.amount),
      reference: withdrawal.reference || String(withdrawal._id),
      orderId: null,
      vendorId: withdrawal.vendor || null,
      createdAt: withdrawal.createdAt || withdrawal.requestedAt,
    }));

    const transactions = [...earningTransactions, ...commissionTransactions, ...refundTransactions, ...withdrawalTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const populatedTransactions = await Vendor.populate(transactions, {
      path: "vendorId",
      select: "name businessName email phone address"
    });

    return res.json({ success: true, data: { transactions: populatedTransactions } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch transactions" });
  }
};

export const getVendorRefunds = async (req, res) => {
  try {
    const { vendorId, isAll } = resolveVendorScope(req);

    if (!vendorId && !isAll) {
      return res.status(400).json({ success: false, message: "Vendor not resolved" });
    }

    const finance = await buildVendorFinance({ vendorId });

    const refunds = finance.commissionOrders
      .filter((order) => normalizeOrderStatus(order.orderStatus) === "cancelled")
      .map((order) => {
        return {
          id: String(order.orderId),
          orderId: order.orderId,
          amount: order.revenue,
          status: order.orderStatus,
          reason: "",
          requestedAt: order.updatedAt || order.createdAt,
          vendorId: order.vendorId || null,
        };
      });

    return res.json({ success: true, data: { refunds } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to fetch refunds" });
  }
};

export const getSuperAdminCommissionReport = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const vendors = await Vendor.find({}).select("name businessName email phone status address image").lean();
    const rows = await Promise.all(
      vendors.map(async (vendor) => {
        const finance = await buildVendorFinance({ vendorId: vendor._id });
        return {
          vendor,
          totalRevenue: finance.totalRevenue,
          vendorNetEarning: finance.vendorNetEarning,
          superAdminCommission: finance.superAdminCommission,
          pendingVendorEarning: finance.pendingNetEarning,
          pendingCommission: finance.pendingCommission,
          pendingPayout: finance.withdrawals.totalPending,
          availableBalance: finance.availableBalance,
          totalOrders: finance.totalOrders,
          completedOrders: finance.completedOrders,
          commissionOrders: finance.commissionOrders
            .filter((order) => normalizeOrderStatus(order.orderStatus) === "delivered")
            .map((order) => ({
              orderId: order.orderId,
              grossAmount: order.itemGrossTotal,
              vendorNetEarning: order.vendorNetEarning,
              superAdminCommission: order.superAdminCommission,
              createdAt: order.createdAt,
              lines: order.lines,
            })),
        };
      })
    );

    return res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: toMoney(rows.reduce((sum, row) => sum + row.totalRevenue, 0)),
          vendorNetEarning: toMoney(rows.reduce((sum, row) => sum + row.vendorNetEarning, 0)),
          superAdminCommission: toMoney(rows.reduce((sum, row) => sum + row.superAdminCommission, 0)),
          pendingPayout: toMoney(rows.reduce((sum, row) => sum + row.pendingPayout, 0)),
        },
        vendors: rows,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to load commission report" });
  }
};

export const deleteVendorTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (id.endsWith("-earning")) {
      const orderId = id.replace("-earning", "");
      await Order.findByIdAndDelete(orderId);
    } else if (id.endsWith("-commission")) {
      const orderId = id.replace("-commission", "");
      await Order.findByIdAndDelete(orderId);
    } else {
      // Try deleting withdrawal first
      const withdrawal = await VendorWithdrawal.findByIdAndDelete(id);
      if (!withdrawal) {
        // If not withdrawal, delete order
        await Order.findByIdAndDelete(id);
      }
    }

    return res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to delete transaction" });
  }
};

export const markWithdrawalPaid = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const { id } = req.params;
    const { reference = "", amount, notes = "", expectedArrival = "" } = req.body || {};

    const withdrawal = await VendorWithdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status === "paid") {
      return res.status(400).json({ success: false, message: "Withdrawal is already marked as paid" });
    }

    // Update amount if super admin overrides it
    if (amount !== undefined && amount !== null && amount !== "") {
      const parsedAmount = toMoney(amount);
      if (parsedAmount < 0) {
        return res.status(400).json({ success: false, message: "Valid amount is required" });
      }
      withdrawal.amount = parsedAmount;
    }

    withdrawal.status = "paid";
    withdrawal.reference = String(reference || "").trim();
    withdrawal.notes = String(notes || "").trim();
    withdrawal.expectedArrival = String(expectedArrival || "").trim();
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin._id;

    await withdrawal.save();

    return res.json({
      success: true,
      message: "Withdrawal marked as paid successfully",
      data: { withdrawal },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to mark withdrawal as paid" });
  }
};

