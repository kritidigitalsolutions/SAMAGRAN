import Coupon from "../../models/coupon.model.js";

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

export const createCoupon = async (req, res) => {
  try {
    const payload = req.body || {};
    const code = String(payload.code || "").trim().toUpperCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "code is required",
      });
    }

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const coupon = await Coupon.create({
      code,
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      discountType: payload.discountType === "percent" ? "percent" : "flat",
      discountValue: toMoney(payload.discountValue),
      minOrderAmount: toMoney(payload.minOrderAmount),
      maxDiscount: toMoney(payload.maxDiscount),
      usageLimit: Number(payload.usageLimit || 0),
      perUserLimit: Number(payload.perUserLimit || 1),
      isActive: payload.isActive !== false,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    });

    return res.status(201).json({
      success: true,
      data: coupon,
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
    const coupons = await Coupon.find().sort({ createdAt: -1 });
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

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    if (payload.title !== undefined) coupon.title = String(payload.title || "").trim();
    if (payload.description !== undefined) coupon.description = String(payload.description || "").trim();
    if (payload.discountType !== undefined) coupon.discountType = payload.discountType === "percent" ? "percent" : "flat";
    if (payload.discountValue !== undefined) coupon.discountValue = toMoney(payload.discountValue);
    if (payload.minOrderAmount !== undefined) coupon.minOrderAmount = toMoney(payload.minOrderAmount);
    if (payload.maxDiscount !== undefined) coupon.maxDiscount = toMoney(payload.maxDiscount);
    if (payload.usageLimit !== undefined) coupon.usageLimit = Number(payload.usageLimit || 0);
    if (payload.perUserLimit !== undefined) coupon.perUserLimit = Number(payload.perUserLimit || 1);
    if (payload.isActive !== undefined) coupon.isActive = Boolean(payload.isActive);
    if (payload.startsAt !== undefined) coupon.startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
    if (payload.expiresAt !== undefined) coupon.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

    await coupon.save();

    return res.json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.json({
      success: true,
      message: "Coupon deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
