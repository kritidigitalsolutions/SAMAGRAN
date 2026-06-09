import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Order from "../models/order.model.js";
import Item from "../models/product.model.js";
import VendorWithdrawal from "../models/vendorWithdrawal.model.js";
import CategoryCommission from "../models/categoryCommission.model.js";

const DELIVERED = "delivered";
const CANCELLED = "cancelled";

export const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

export const normalizeOrderStatus = (value = "") => String(value || "").trim().toLowerCase();

export const getOrderRevenue = (order = {}) =>
  toMoney(order?.amountBreakup?.payableAmount ?? order?.payableAmount ?? order?.totalAmount ?? 0);

const buildObjectIds = (ids = []) =>
  ids
    .map((id) => String(id || ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

export const buildCommissionLines = async (orders = []) => {
  const categoryIds = new Set();
  const productIds = new Set();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (item.product?.categoryId) categoryIds.add(String(item.product.categoryId));
      if (!item.product?.categoryId && item.product) productIds.add(String(item.product));
    });
  });

  let productCategoryMap = new Map();
  if (productIds.size) {
    const products = await Item.find({ _id: { $in: buildObjectIds([...productIds]) } })
      .select("categoryId title category")
      .lean();
    productCategoryMap = new Map(products.map((product) => [String(product._id), product]));
    products.forEach((product) => {
      if (product.categoryId) categoryIds.add(String(product.categoryId));
    });
  }

  const categories = await Category.find({ _id: { $in: buildObjectIds([...categoryIds]) } })
    .select("name subCategory superAdminCommissionPercent")
    .lean();
  const categoryMap = new Map(categories.map((category) => [String(category._id), category]));

  // Fetch all active category commissions
  const categoryCommissions = await CategoryCommission.find({ status: "active" }).lean();

  return orders.map((order) => {
    const lines = (order.items || []).map((item) => {
      const productDoc = item.product && typeof item.product === "object" ? item.product : productCategoryMap.get(String(item.product || ""));
      const categoryId = productDoc?.categoryId ? String(productDoc.categoryId) : "";
      const category = categoryMap.get(categoryId);
      const quantity = Number(item.quantity || 0);
      const grossAmount = toMoney(Number(item.price || 0) * quantity);

      // Find customized category commission
      const itemSubCategory = String(productDoc?.category?.subCategory || category?.subCategory || "").trim();
      
      let commissionRule = categoryCommissions.find(
        (c) => String(c.categoryId) === String(categoryId) && c.subCategory.toLowerCase() === itemSubCategory.toLowerCase()
      );
      if (!commissionRule) {
        // Fallback to "All" subcategories for this category
        commissionRule = categoryCommissions.find(
          (c) => String(c.categoryId) === String(categoryId) && c.subCategory.toLowerCase() === "all"
        );
      }

      let commissionPercent = 0;
      let superAdminCommission = 0;
      let vendorNetEarning = grossAmount;

      if (commissionRule) {
        if (commissionRule.commissionType === "Percentage (%)") {
          commissionPercent = Number(commissionRule.superAdminSharePercent || 0);
          superAdminCommission = toMoney((grossAmount * commissionPercent) / 100);
          vendorNetEarning = toMoney(Math.max(grossAmount - superAdminCommission, 0));
        } else {
          // Flat Amount (₹)
          const flatAmt = Number(commissionRule.superAdminShareFlat || 0) * quantity;
          superAdminCommission = toMoney(flatAmt);
          vendorNetEarning = toMoney(Math.max(grossAmount - superAdminCommission, 0));
          commissionPercent = grossAmount > 0 ? toMoney((superAdminCommission / grossAmount) * 100) : 0;
        }
      } else {
        commissionPercent = Number(category?.superAdminCommissionPercent || 0);
        superAdminCommission = toMoney((grossAmount * commissionPercent) / 100);
        vendorNetEarning = toMoney(Math.max(grossAmount - superAdminCommission, 0));
      }

      return {
        productId: productDoc?._id || item.product || null,
        productName: productDoc?.title || item.product?.title || "",
        categoryId: category?._id || categoryId || null,
        categoryName: category?.name || "",
        subCategory: itemSubCategory || category?.subCategory || "",
        quantity,
        grossAmount,
        commissionPercent,
        superAdminCommission,
        vendorNetEarning,
      };
    });

    const itemGrossTotal = toMoney(lines.reduce((sum, line) => sum + line.grossAmount, 0));
    const superAdminCommission = toMoney(lines.reduce((sum, line) => sum + line.superAdminCommission, 0));
    const vendorNetEarning = toMoney(lines.reduce((sum, line) => sum + line.vendorNetEarning, 0));

    return {
      orderId: order._id,
      vendorId: order.vendorId || null,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      revenue: getOrderRevenue(order),
      itemGrossTotal,
      superAdminCommission,
      vendorNetEarning,
      lines,
    };
  });
};

export const buildVendorFinance = async ({ vendorId = null } = {}) => {
  const orderFilter = vendorId ? { vendorId } : {};
  const withdrawalFilter = vendorId ? { vendor: vendorId } : {};

  const [orders, withdrawals] = await Promise.all([
    Order.find(orderFilter).populate("items.product", "title categoryId").lean(),
    VendorWithdrawal.find(withdrawalFilter).lean(),
  ]);
  const commissionOrders = await buildCommissionLines(orders);

  const delivered = commissionOrders.filter((order) => normalizeOrderStatus(order.orderStatus) === DELIVERED);
  const cancelled = commissionOrders.filter((order) => normalizeOrderStatus(order.orderStatus) === CANCELLED);
  const pending = commissionOrders.filter((order) => {
    const status = normalizeOrderStatus(order.orderStatus);
    return status !== DELIVERED && status !== CANCELLED;
  });

  const totalRevenue = toMoney(commissionOrders.reduce((sum, order) => sum + order.revenue, 0));
  const vendorNetEarning = toMoney(delivered.reduce((sum, order) => sum + order.vendorNetEarning, 0));
  const superAdminCommission = toMoney(delivered.reduce((sum, order) => sum + order.superAdminCommission, 0));
  const pendingNetEarning = toMoney(pending.reduce((sum, order) => sum + order.vendorNetEarning, 0));
  const pendingCommission = toMoney(pending.reduce((sum, order) => sum + order.superAdminCommission, 0));

  const withdrawalTotals = withdrawals.reduce(
    (totals, withdrawal) => {
      const amount = toMoney(withdrawal.amount);
      if (withdrawal.status === "paid") totals.totalPaid = toMoney(totals.totalPaid + amount);
      if (withdrawal.status === "approved") totals.totalApproved = toMoney(totals.totalApproved + amount);
      if (withdrawal.status === "pending") totals.totalPending = toMoney(totals.totalPending + amount);
      return totals;
    },
    { totalPaid: 0, totalApproved: 0, totalPending: 0 }
  );

  const heldPayouts = toMoney(withdrawalTotals.totalPaid + withdrawalTotals.totalApproved + withdrawalTotals.totalPending);
  const availableBalance = toMoney(Math.max(vendorNetEarning - heldPayouts, 0));

  return {
    totalSales: totalRevenue,
    totalRevenue,
    totalEarnings: vendorNetEarning,
    vendorNetEarning,
    superAdminCommission,
    pendingBalance: pendingNetEarning,
    pendingNetEarning,
    pendingCommission,
    availableBalance,
    completedOrders: delivered.length,
    cancelledOrders: cancelled.length,
    pendingOrders: pending.length,
    totalOrders: commissionOrders.length,
    withdrawals: withdrawalTotals,
    commissionOrders,
    withdrawalsList: withdrawals,
  };
};

export const buildVendorMetricsMap = async (vendors = []) => {
  const vendorIds = vendors.map((vendor) => String(vendor._id));
  const vendorObjectIds = buildObjectIds(vendorIds);
  const productCounts = await Item.aggregate([
    { $match: { vendorId: { $in: vendorObjectIds } } },
    { $group: { _id: "$vendorId", count: { $sum: 1 } } },
  ]);
  const productCountMap = new Map(productCounts.map((entry) => [String(entry._id), Number(entry.count || 0)]));

  const entries = await Promise.all(
    vendorIds.map(async (id) => {
      const finance = await buildVendorFinance({ vendorId: id });
      return [
        id,
        {
          products: productCountMap.get(id) || 0,
          totalOrders: finance.totalOrders,
          revenue: finance.totalRevenue,
          vendorEarning: finance.vendorNetEarning,
          superAdminEarning: finance.superAdminCommission,
          pendingPayout: finance.withdrawals.totalPending,
          pendingEarning: finance.pendingNetEarning,
          availableBalance: finance.availableBalance,
        },
      ];
    })
  );

  return new Map(entries);
};
