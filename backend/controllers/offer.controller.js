import Offer from "../models/offer.model.js";

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

const isWithinWindow = (offer) => {
  const now = new Date();
  if (offer.startsAt && now < offer.startsAt) return false;
  if (offer.expiresAt && now > offer.expiresAt) return false;
  return true;
};

export const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).lean();
    const active = offers.filter((offer) => isWithinWindow(offer));

    return res.json({
      success: true,
      data: {
        offers: active,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const computeOfferBenefit = ({ amount, offer }) => {
  const orderAmount = toMoney(amount);
  if (orderAmount < toMoney(offer.minOrderAmount)) {
    return 0;
  }

  if (offer.discountType === "percent") {
    const raw = (orderAmount * offer.value) / 100;
    const capped = offer.maxBenefit ? Math.min(raw, offer.maxBenefit) : raw;
    return toMoney(capped);
  }

  return toMoney(Math.min(offer.value, orderAmount));
};
