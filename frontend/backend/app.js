import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "./models/admin.model.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

import authRoutes from "./routes/user/auth.routes.js";
app.use("/api/auth", authRoutes);

import userRoutes from "./routes/user/user.routes.js";
app.use("/api/user", userRoutes);

import festivalKitRoutes from "./routes/admin/festivalKit.routes.js";

app.use("/api/kits", festivalKitRoutes);

//for user festival kits
import userFestivalKitRoutes from "./routes/user/festivalKit.routes.js";
app.use('/api/user/kits',userFestivalKitRoutes)

import userKitRoutes from "./routes/user/userKit.routes.js";

app.use("/api/user-kits", userKitRoutes);

import userItemRoutes from "./routes/user/item.routes.js";

app.use("/api/user/items", userItemRoutes);

// ✅ SINGLE DB CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // ✅ ADMIN CREATION (INLINE)
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Temple Ops";

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

  })
  .catch((err) => console.log(err));

import adminAuthRoutes from "./routes/admin/auth.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";

app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminRoutes);


import itemRoutes from "./routes/admin/item.routes.js";

app.use("/api/items", itemRoutes);

import adminUserKitRoutes from "./routes/admin/userKit.routes.js";

app.use("/api/admin/user-kits", adminUserKitRoutes);

export default app;

//cart
import cartRoutes from "./routes/user/cart.routes.js";
app.use("/api/cart", cartRoutes);

//place order for users 
import orderRoutes from "./routes/user/order.routes.js";
app.use("/api/order", orderRoutes);