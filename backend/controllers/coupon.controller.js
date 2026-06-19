import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import UserCoupon from "../models/userCoupon.model.js";

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

// 🕐 Lazy expiry check: user ka welcome coupon validDays ke hisaab se expire hua ya nahi
// Agar expire hua toh user ke account se welcome coupon auto-remove ho jaata hai
export const checkAndClearExpiredWelcomeCoupon = async (user) => {
  if (!user || !user.welcomeCouponCode || user.welcomeCouponRedeemed) {
    return false;
  }

  const welcomeCouponCode = String(user.welcomeCouponCode || "").trim().toUpperCase();
  if (!welcomeCouponCode) return false;

  // Coupon DB se dhundo aur welcomeValidDays check karo
  const coupon = await Coupon.findOne({ code: welcomeCouponCode, isWelcomeCoupon: true });

  if (!coupon) {
    // Coupon DB mein nahi hai, user se bhi clear karo
    await user.constructor.updateOne(
      { _id: user._id },
      { $set: { welcomeCouponCode: "", welcomeCouponAssignedAt: null } }
    );
    return true;
  }

  // welcomeValidDays check: 0 means unlimited
  const validDays = Number(coupon.welcomeValidDays || 0);
  if (validDays > 0 && user.welcomeCouponAssignedAt) {
    const assignedAt = new Date(user.welcomeCouponAssignedAt);
    const expiryDate = new Date(assignedAt.getTime() + validDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > expiryDate) {
      // Expire ho gayi — user ke account se remove karo
      await user.constructor.updateOne(
        { _id: user._id },
        { $set: { welcomeCouponCode: "", welcomeCouponAssignedAt: null } }
      );
      return true; // expired, removed
    }
  }

  return false; // not expired
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

    if (coupon.isRestricted) {
      const mapping = await UserCoupon.findOne({
        userId: req.user._id,
        couponId: coupon._id,
        isRedeemed: false,
      });
      if (!mapping) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not valid for your account or has already been redeemed",
        });
      }
    }

    // If it is a welcome coupon, run welcome coupon specific validations
    if (coupon.isWelcomeCoupon) {
      if (req.user?.welcomeCouponRedeemed) {
        return res.status(400).json({
          success: false,
          message: "Welcome coupon already used",
        });
      }

      // 🕐 Lazy expiry check
      const wasExpired = await checkAndClearExpiredWelcomeCoupon(req.user);
      if (wasExpired) {
        return res.status(400).json({
          success: false,
          message: "Welcome coupon has expired",
        });
      }

      if (req.user?.welcomeCouponCode && normalizedCode !== String(req.user.welcomeCouponCode).trim().toUpperCase()) {
        return res.status(403).json({
          success: false,
          message: "Only your assigned welcome coupon is available",
        });
      }
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

export const getCoupons = async (req, res) => {
  try {
    const coupons = [];

    // 1. Fetch active welcome coupon if user hasn't redeemed it yet
    if (req.user && !req.user.welcomeCouponRedeemed) {
      const activeWelcome = await Coupon.findOne({ isWelcomeCoupon: true, isActive: true });
      if (activeWelcome) {
        // If the user's welcome coupon code is empty or doesn't match the active welcome coupon code, assign it
        const currentCode = String(req.user.welcomeCouponCode || "").trim().toUpperCase();
        if (currentCode !== activeWelcome.code) {
          req.user.welcomeCouponCode = activeWelcome.code;
          req.user.welcomeCouponAssignedAt = new Date();
          await req.user.save();
        }

        // Run lazy expiry check
        const wasExpired = await checkAndClearExpiredWelcomeCoupon(req.user);
        if (!wasExpired) {
          const couponDoc = await Coupon.findOne({ code: activeWelcome.code, isActive: true });
          if (couponDoc && isWithinWindow(couponDoc)) {
            coupons.push(couponDoc);
          }
        }
      }
    }

    // 2. Fetch all other active general coupons (that are NOT welcome coupons and NOT restricted)
    const now = new Date();
    const generalCoupons = await Coupon.find({
      isWelcomeCoupon: { $ne: true },
      isRestricted: { $ne: true },
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }
      ]
    }).sort({ createdAt: -1 });

    coupons.push(...generalCoupons);

    // 3. Fetch user's unredeemed assigned coupons
    if (req.user) {
      const userAssignedMappings = await UserCoupon.find({
        userId: req.user._id,
        isRedeemed: false,
      }).populate("couponId").lean();

      for (const mapping of userAssignedMappings) {
        const assignedCoupon = mapping.couponId;
        if (assignedCoupon && assignedCoupon.isActive && isWithinWindow(assignedCoupon)) {
          if (!coupons.some((c) => String(c._id) === String(assignedCoupon._id))) {
            coupons.push(assignedCoupon);
          }
        }
      }
    }

    return res.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
