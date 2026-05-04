import crypto from "crypto";
import Razorpay from "razorpay";
import Wallet from "../models/wallet.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";

const toMoney = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) && num >= 0 ? Number(num.toFixed(2)) : 0;
};

const getRazorpayCredentials = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || process.env.key_id || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || process.env.key_secret || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in environment");
  }

  return { keyId, keySecret };
};

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0 });
  }
  return wallet;
};

export const getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    return res.json({
      success: true,
      data: {
        wallet,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const wallet = await getOrCreateWallet(req.user._id);
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [total, transactions] = await Promise.all([
      WalletTransaction.countDocuments({ wallet: wallet._id }),
      WalletTransaction.find({ wallet: wallet._id })
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

export const createWalletTopupOrder = async (req, res) => {
  try {
    const { amount } = req.body || {};
    const normalizedAmount = toMoney(amount);

    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be greater than zero",
      });
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(normalizedAmount * 100),
      currency: "INR",
      receipt: `wallet_${String(req.user._id).slice(-6)}_${Date.now()}`,
      notes: {
        userId: String(req.user._id),
        purpose: "wallet_topup",
      },
    });

    return res.json({
      success: true,
      data: {
        keyId,
        amount: normalizedAmount,
        currency: "INR",
        razorpayOrder,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const confirmWalletTopup = async (req, res) => {
  try {
    const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};

    if (!amount || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "amount, razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
      });
    }

    const normalizedAmount = toMoney(amount);
    const { keySecret } = getRazorpayCredentials();

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
      });
    }

    const wallet = await getOrCreateWallet(req.user._id);
    const nextBalance = toMoney(wallet.balance + normalizedAmount);

    wallet.balance = nextBalance;
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: req.user._id,
      type: "credit",
      source: "topup",
      amount: normalizedAmount,
      balanceAfter: nextBalance,
      reference: String(razorpayPaymentId),
      meta: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    return res.json({
      success: true,
      message: "Wallet credited successfully",
      data: {
        wallet,
        transaction,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
