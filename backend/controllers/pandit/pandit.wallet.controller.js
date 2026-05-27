import PanditWallet from "../../models/panditWallet.model.js";
import PanditWalletTransaction from "../../models/panditWalletTransaction.model.js";
import BookingPricing from "../../models/bookingPrice.js";

const getOrCreatePanditWallet = async (panditId) => {
  let wallet = await PanditWallet.findOne({ pandit: panditId });
  if (!wallet) {
    wallet = await PanditWallet.create({ pandit: panditId, balance: 0 });
  }
  return wallet;
};



export const getPanditWallet = async (req, res) => {
  try {
    const pricing = await BookingPricing.findOne({ isActive: true });
    const wallet = await getOrCreatePanditWallet(req.pandit._id);
    if (!pricing) {
      return res.status(404).json({ message: "Pricing not found" });
    }
    return res.json({
      success: true,
      data: {
        wallet,
        success: true,
        panditCommissionPercent: pricing.panditCommissionPercent || 0,
        panditCommissionThreshold: pricing.panditCommissionThreshold || 0,
      },
    });


    res.status(200).json({
     
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPanditWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const wallet = await getOrCreatePanditWallet(req.pandit._id);
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [total, transactions] = await Promise.all([
      PanditWalletTransaction.countDocuments({ wallet: wallet._id }),
      PanditWalletTransaction.find({ wallet: wallet._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        wallet,
        transactions,
        pagination: {
          total,
          currentPage: safePage,
          totalPages: Math.ceil(total / safeLimit),
          limit: safeLimit,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
