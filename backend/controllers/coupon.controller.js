import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

const isWithinWindow = (coupon) => {
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return false;
  if (coupon.expiresAt && now > coupon.expiresAt) return false;
  return true;
};

const computeDiscount = ({ amount, coupon }) => {
  if (coupon.discountType === "percent") {
    const raw = (toMoney(amount) * coupon.discountValue) / 100;
    const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    return toMoney(capped);
  }
  return toMoney(Math.min(coupon.discountValue, amount));
};

export const applyCoupon = async (req, res) => {
  try {
    const { code = "", amount } = req.body || {};
    const normalizedCode = String(code || "").trim().toUpperCase();
    const orderAmount = toMoney(amount);

    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "code is required",
      });
    }

    const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });
    if (!coupon || !isWithinWindow(coupon)) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or inactive",
      });
    }

    if (orderAmount < toMoney(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        message: "Order amount is below coupon minimum",
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    if (coupon.perUserLimit) {
      const userUsage = await Order.countDocuments({
        user: req.user._id,
        couponCode: normalizedCode,
      });

      if (userUsage >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: "Coupon usage limit reached for user",
        });
      }
    }

    const discount = computeDiscount({ amount: orderAmount, coupon });

    return res.json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
        },
        discount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
