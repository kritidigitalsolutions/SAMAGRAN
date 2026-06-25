import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import Admin from "./models/admin.model.js";
import connectDB from "./config/db.js";
// import { testSmsGateway } from "./utils/sms.service.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const parseOriginList = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  process.env.CORS_ORIGINS,
  "https://samagran-admin.vercel.app",
].flatMap((value) => parseOriginList(value));

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const isLocalhostOrigin = /^https?:\/\/(?:[a-z0-9-]+\.)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const isLanOrigin = /^https?:\/\/192\.168\.\d+\.\d+(?::\d+)?$/i.test(origin);
  const isVercelAppOrigin = /^https:\/\/samagran(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);

  return (
    allowedOrigins.includes(origin) ||
    isLocalhostOrigin ||
    isLanOrigin ||
    isVercelAppOrigin
  );
};

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
  }

  return next();
});
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

// // Test SMS Gateway
// app.get("/api/test-sms", async (req, res) => {
//   console.log("\n🧪 SMS Gateway Test Endpoint Called");
//   const result = await testSmsGateway();
//   res.json(result);
// });

// Admin ROUTES
import adminKitRoutes from "./routes/admin/kit.routes.js";
import userKitRoutes from "./routes/user/kit.routes.js";
import adminPanditRoutes from "./routes/admin/pandit.routes.js";
import adminPanditBookingRoutes from "./routes/admin/panditBooking.routes.js";
import adminRitualRoutes from "./routes/admin/ritual.routes.js";
import admintempleRoutes from "./routes/admin/temple.routes.js";
import adminOrderRoutes from "./routes/admin/order.routes.js";
import adminWishlistRoutes from "./routes/admin/wishlist.routes.js";
import adminAuthRoutes from "./routes/admin/auth.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import bookingPricingAdmin from "./routes/admin/bookingPricing.routes.js"
import userFromAdmin from "./routes/admin/user.routes.js";
import banner from "./routes/admin/banner.routes.js"
import adminCouponRoutes from "./routes/admin/coupon.routes.js";
import adminOfferRoutes from "./routes/admin/offer.routes.js";
import adminNotificationRoutes from "./routes/admin/notification.routes.js";
import adminDeliveryBoyRoutes from "./routes/admin/deliveryBoy.routes.js";
import adminVendorRoutes from "./routes/admin/vendor.routes.js";
import vendorProfileRoutes from "./routes/admin/vendorProfile.routes.js";
import vendorFinanceRoutes from "./routes/admin/vendorFinance.routes.js";
import adminPanditPayoutRoutes from "./routes/admin/panditPayout.routes.js";
import adminBrandRoutes from "./routes/admin/brand.routes.js";
import adminCategoryRoutes from "./routes/admin/category.routes.js";
import adminCategoryCommissionRoutes from "./routes/admin/categoryCommission.routes.js";
import adminSubCategoryRoutes from "./routes/admin/subCategory.routes.js";

import authRoutes from "./routes/user/auth.routes.js";
import panditAuthRoutes from "./routes/pandit/pandit.auth.routes.js";
import panditAvailabilityRoutes from "./routes/pandit/availability.routes.js";
import panditWalletRoutes from "./routes/pandit/wallet.routes.js";
import panditNotificationRoutes from "./routes/pandit/notification.routes.js";
import deliveryAuthRoutes from "./routes/delivery/delivery.auth.routes.js";
import deliveryRoutes from "./routes/delivery/delivery.routes.js";
import vendorAuthRoutes from "./routes/vendor/vendor.auth.routes.js";
import vendorProductRoutes from "./routes/vendor/product.routes.js";
import deliveryPricingRoute from "./routes/vendor/vendorDeliveryPricing.routes.js";


// User Routs
import userProductRoutes from "./routes/user/product.routes.js";
import categories from "./routes/user/category.routes.js";
import userSubCategoryRoutes from "./routes/user/subCategory.routes.js";
import brand from "./routes/user/brand.routes.js";
import panditBooking from "./routes/user/panditBooking.routes.js";
import cartRoutes from "./routes/user/cart.routes.js";
import wishlistRoutes from "./routes/user/wishlist.routes.js";
import orderRoutes from "./routes/user/order.routes.js";
import productRoutes from "./routes/admin/product.routes.js";
import bookingDetails from "./routes/pandit/bookingDetails.routes.js";
import ritual from "./routes/pandit/ritual.routes.js";
import legal from "./routes/admin/legal.routes.js";
import aboutUs from "./routes/admin/aboutUs.routes.js";
import bookingPricingUser from "./routes/user/bookingPricing.routes.js"
import userTemples from "./routes/user/temple.routes.js"
import userRoutes from "./routes/user/user.routes.js"
import userBanners from "./routes/user/banner.routes.js"
import walletRoutes from "./routes/user/wallet.routes.js";
import couponRoutes from "./routes/user/coupon.routes.js";
import offerRoutes from "./routes/user/offer.routes.js";
// video routes (Agora) removed in favor of Zoom meeting integration
import userNotificationRoutes from "./routes/user/notification.routes.js";
import userPanditAvailabilityRoutes from "./routes/user/panditAvailability.routes.js";
import deliveryPriceGet from "./routes/user/vendorDeliveryPricing.routes.js";
import adminComplaintRoutes from "./routes/admin/complaint.routes.js";
import adminSupportSettingRoutes from "./routes/admin/supportSetting.routes.js";
import userComplaintRoutes from "./routes/user/complaint.routes.js";
import userSupportSettingRoutes from "./routes/user/supportSetting.routes.js";


app.use("/api/user/items", userProductRoutes);
// Ensure default admin exists after DB connection is established in server.js
export const ensureAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Temple Ops";

    if (!email || !password) {
      return;
    }

    const existing = await Admin.findOne({ email });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await Admin.create({
        name,
        email,
        password: hashedPassword,
      });

      console.log("Admin created");
    } else {
      console.log("Admin already exists");
    }
  } catch (err) {
    console.log(err.message);
  }
};

let bootstrapPromise;

export const bootstrapApp = async () => {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    await connectDB();
    await ensureAdmin();
  })();

  try {
    await bootstrapPromise;
    return bootstrapPromise;
  } catch (error) {
    bootstrapPromise = undefined;
    throw error;
  }
};


// ############ Admin API ##########################

app.use("/api/admin", adminRoutes);
app.use("/api/admin/auth", adminAuthRoutes);

app.use("/api/admin", adminKitRoutes);
app.use("/api", userKitRoutes);
app.use("/api/admin/pandits", adminPanditRoutes);
app.use("/api/admin/pandit-bookings", adminPanditBookingRoutes);
app.use("/api/admin/rituals", adminRitualRoutes);
app.use("/api/admin/temples", admintempleRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/wishlists", adminWishlistRoutes);
app.use("/api/admin/booking-price", bookingPricingAdmin);
app.use("/api/admin/user", userFromAdmin);
app.use("/api/legal", legal)
app.use("/api/aboutus", aboutUs)
app.use("/api/admin/banners", banner)
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/offers", adminOfferRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin", adminDeliveryBoyRoutes);
app.use("/api/admin", adminVendorRoutes);
app.use("/api/admin", vendorProfileRoutes);
app.use("/api/admin", vendorFinanceRoutes);
app.use("/api/admin", adminPanditPayoutRoutes);
app.use("/api/admin", adminBrandRoutes);
app.use("/api/admin", adminCategoryRoutes);
app.use("/api/admin/sub-categories", adminSubCategoryRoutes);
app.use("/api/admin", adminCategoryCommissionRoutes);
app.use("/api/admin/complaints", adminComplaintRoutes);
app.use("/api/admin/support-settings", adminSupportSettingRoutes);

app.use("/api/vendor/auth", vendorAuthRoutes);
app.use("/api/vendor/items", vendorProductRoutes);
app.use("/api/vendor/delivery-charge", deliveryPricingRoute);

// ############ User Routes ##########################

app.use("/api/auth", authRoutes);
app.use("/api/pandit/auth", panditAuthRoutes);
app.use("/api/pandit/availability", panditAvailabilityRoutes);
app.use("/api/pandit/wallet", panditWalletRoutes);
app.use("/api/pandit/notifications", panditNotificationRoutes);
app.use("/api/delivery/auth", deliveryAuthRoutes);
app.use("/api/delivery", deliveryRoutes);

// user routs for user side
app.use("/api/user", userRoutes);

//cart
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);

// items
app.use("/api/items", productRoutes);

//place order for users
app.use("/api/order", orderRoutes);
app.use("/api/user/wallet", walletRoutes);
app.use("/api/user/coupons", couponRoutes);
app.use("/api/user/offers", offerRoutes);
// app.use("/api/user/video", userVideoRoutes);
app.use("/api/user/notifications", userNotificationRoutes);
app.use("/api/user/complaints", userComplaintRoutes);
app.use("/api/user/support-settings", userSupportSettingRoutes);
app.use("/api/pandit-availability", userPanditAvailabilityRoutes);

// user pandit booking journey
app.use("/api/pandit-bookings", panditBooking);
app.use("/api/booking-details", bookingDetails)
app.use("/api/ritual", ritual)
app.use("/api/booking-price", bookingPricingUser);
app.use("/api/temples", userTemples);
app.use("/api/banners", userBanners);

app.use("/api/category", categories)
app.use("/api/sub-categories", userSubCategoryRoutes);
app.use("/api/brands", brand);
app.use("/api/delivery-charge", deliveryPriceGet)


app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.message === "Not allowed by CORS" ? 403 : err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal Server Error" : err.message,
    ...(isProd ? {} : { error: err.message }),
  });
});


export default app;


