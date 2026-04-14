import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import Admin from "./models/admin.model.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Admin ROUTES
import festivalKitRoutes from "./routes/admin/festivalKit.routes.js";
//for user festival kits
import adminUserKitRoutes from "./routes/admin/userKit.routes.js";
import adminAuthRoutes from "./routes/admin/auth.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";

import userRoutes from "./routes/user/user.routes.js";
import authRoutes from "./routes/user/auth.routes.js";


// User Routs
import userFestivalKitRoutes from "./routes/user/festivalKit.routes.js";
import userKitRoutes from "./routes/user/userKit.routes.js";
import userProductRoutes from "./routes/user/product.routes.js";
import cartRoutes from "./routes/user/cart.routes.js";
import orderRoutes from "./routes/user/order.routes.js";
import productRoutes from "./routes/admin/product.routes.js";

app.use("/api/user/items", userProductRoutes);

// Ensure default admin exists after DB connection is established in server.js
const ensureAdmin = async () => {
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

ensureAdmin();


// ############ Admin API ##########################

app.use("/api/admin", adminRoutes);
app.use("/api/admin/auth", adminAuthRoutes);

app.use("/api/admin/kits", festivalKitRoutes);
app.use("/api/admin/user-kits", adminUserKitRoutes);



// ############ User Routes ##########################

app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);

// user festive kit for user
app.use("/api/user/kits", userFestivalKitRoutes);

//cart
app.use("/api/cart", cartRoutes);

// items
app.use("/api/items", productRoutes);

//place order for users
app.use("/api/order", orderRoutes);

// user get all kit for user
app.use("/api/user-kits", userKitRoutes);


export default app;


