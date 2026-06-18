import Coupon from "../../models/coupon.model.js";
import crypto from "crypto";

const generateUniqueCouponCode = async (isWelcomeCoupon) => {
  const prefix = isWelcomeCoupon ? "WELCOME" : "COUPON";
  let code = "";
  let exists = true;

  while (exists) {
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    code = `${prefix}${randomHex}`;
    const duplicate = await Coupon.findOne({ code });
    if (!duplicate) {
      exists = false;
    }
  }
  return code;
};

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

const resolveVendorFilter = (req) => {
  if (req.admin?.role === "vendor") {
    return { vendorId: req.admin.vendorId };
  }

  return {};
};

const resolveVendorIdForCreate = (req) => {
  if (req.admin?.role === "vendor") {
    return req.admin.vendorId || null;
  }

  return req.body?.vendorId || null;
};

export const createCoupon = async (req, res) => {
  try {
    const payload = req.body || {};
    const isWelcomeCoupon = Boolean(payload.isWelcomeCoupon);

    // 🎁 Welcome coupon uniqueness check — sirf ek active welcome coupon ho sakta hai
    if (isWelcomeCoupon) {
      const existingWelcome = await Coupon.findOne({ isWelcomeCoupon: true });
      if (existingWelcome) {
        return res.status(400).json({
          success: false,
          message: `Already a welcome coupon exists: "${existingWelcome.code}". Pehle use delete ya disable karo.`,
        });
      }
    }

    const code = await generateUniqueCouponCode(isWelcomeCoupon);

    const coupon = await Coupon.create({
      vendorId: resolveVendorIdForCreate(req),
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
      isWelcomeCoupon,
      welcomeValidDays: Number(payload.welcomeValidDays || 0),
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
    const { status = "all", discountType = "all", query = "" } = req.query || {};
    const now = new Date();

    const filter = { ...resolveVendorFilter(req) };

    if (discountType === "flat" || discountType === "percent") {
      filter.discountType = discountType;
    }

    if (query) {
      const regex = { $regex: String(query).trim(), $options: "i" };
      filter.$or = [{ code: regex }, { title: regex }, { description: regex }];
    }

    if (status === "active") {
      filter.isActive = true;
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
      filter.$and.push({
        $or: [
          { usageLimit: { $lte: 0 } },
          { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
      });
    }

    if (status === "expired") {
      filter.$or = filter.$or || [];
      filter.$or.push({ isActive: false });
      filter.$or.push({ expiresAt: { $lte: now } });
      filter.$or.push({
        $expr: {
          $and: [
            { $gt: ["$usageLimit", 0] },
            { $gte: ["$usedCount", "$usageLimit"] },
          ],
        },
      });
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
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

    const coupon = await Coupon.findOne({ _id: id, ...resolveVendorFilter(req) });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    if (payload.code !== undefined) {
      const nextCode = String(payload.code || "").trim().toUpperCase();
      if (!nextCode) {
        return res.status(400).json({
          success: false,
          message: "code is required",
        });
      }
      if (nextCode !== coupon.code) {
        const existing = await Coupon.findOne({ code: nextCode, ...resolveVendorFilter(req), _id: { $ne: coupon._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Coupon code already exists",
          });
        }
        coupon.code = nextCode;
      }
    }

    if (payload.isWelcomeCoupon !== undefined) {
      const isWelcome = Boolean(payload.isWelcomeCoupon);
      if (isWelcome && !coupon.isWelcomeCoupon) {
        const existingWelcome = await Coupon.findOne({ isWelcomeCoupon: true, _id: { $ne: coupon._id } });
        if (existingWelcome) {
          return res.status(400).json({
            success: false,
            message: `Already a welcome coupon exists: "${existingWelcome.code}". Pehle use normal coupon banao ya delete karo.`,
          });
        }
      }
      coupon.isWelcomeCoupon = isWelcome;
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
    if (payload.welcomeValidDays !== undefined) coupon.welcomeValidDays = Number(payload.welcomeValidDays || 0);
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

// 🎁 Welcome Coupon Settings — Super Admin ke liye
export const getWelcomeCouponSettings = async (req, res) => {
  try {
    const welcomeCoupon = await Coupon.findOne({ isWelcomeCoupon: true });
    return res.json({
      success: true,
      data: welcomeCoupon || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 🔄 Welcome Coupon Enable/Disable toggle
export const toggleWelcomeCoupon = async (req, res) => {
  try {
    const { isActive } = req.body || {};

    const welcomeCoupon = await Coupon.findOne({ isWelcomeCoupon: true });
    if (!welcomeCoupon) {
      return res.status(404).json({
        success: false,
        message: "Koi welcome coupon nahi hai. Pehle ek welcome coupon banao.",
      });
    }

    welcomeCoupon.isActive = isActive !== false ? true : false;
    await welcomeCoupon.save();

    return res.json({
      success: true,
      message: `Welcome coupon ${welcomeCoupon.isActive ? "enabled" : "disabled"} successfully`,
      data: welcomeCoupon,
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
    const coupon = await Coupon.findOneAndDelete({ _id: id, ...resolveVendorFilter(req) });

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
