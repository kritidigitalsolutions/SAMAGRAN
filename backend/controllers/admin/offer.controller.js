import Offer from "../../models/offer.model.js";

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

export const createOffer = async (req, res) => {
  try {
    const payload = req.body || {};

    const offer = await Offer.create({
      vendorId: resolveVendorIdForCreate(req),
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      offerType: payload.offerType === "cashback" ? "cashback" : "discount",
      discountType: payload.discountType === "percent" ? "percent" : "flat",
      value: toMoney(payload.value),
      minOrderAmount: toMoney(payload.minOrderAmount),
      maxBenefit: toMoney(payload.maxBenefit),
      isActive: payload.isActive !== false,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    });

    return res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find(resolveVendorFilter(req)).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: offers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const offer = await Offer.findOne({ _id: id, ...resolveVendorFilter(req) });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    if (payload.title !== undefined) offer.title = String(payload.title || "").trim();
    if (payload.description !== undefined) offer.description = String(payload.description || "").trim();
    if (payload.offerType !== undefined) offer.offerType = payload.offerType === "cashback" ? "cashback" : "discount";
    if (payload.discountType !== undefined) offer.discountType = payload.discountType === "percent" ? "percent" : "flat";
    if (payload.value !== undefined) offer.value = toMoney(payload.value);
    if (payload.minOrderAmount !== undefined) offer.minOrderAmount = toMoney(payload.minOrderAmount);
    if (payload.maxBenefit !== undefined) offer.maxBenefit = toMoney(payload.maxBenefit);
    if (payload.isActive !== undefined) offer.isActive = Boolean(payload.isActive);
    if (payload.startsAt !== undefined) offer.startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
    if (payload.expiresAt !== undefined) offer.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

    await offer.save();

    return res.json({
      success: true,
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findOneAndDelete({ _id: id, ...resolveVendorFilter(req) });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.json({
      success: true,
      message: "Offer deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
