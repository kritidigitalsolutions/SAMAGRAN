import bcrypt from "bcryptjs";
import Vendor from "../../models/vendor.model.js";
import Admin from "../../models/admin.model.js";

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const DEFAULT_VENDOR_ACCESS = [
  "dashboard",
  "orders",
  "products",
  "items",
  "kits",
  "pandits",
  "rituals",
  "temples",
  "pandit-bookings",
  "banners",
  "coupons",
  "offers",
  "legal",
  "custom-samagri",
  "notifications",
  "delivery-boys",
  "settings",
  "transactions",
  "earnings",
  "withdrawals",
  "refunds",
];

export const vendorSignup = async (req, res) => {
  try {
    const {
      name,
      businessName = "",
      email,
      phone,
      password,
      address = {},
    } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "name, email, phone and password are required" });
    }

    if (!isValidPhone(String(phone).trim())) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const existingVendor = await Vendor.findOne({ $or: [{ email }, { phone }] });
    if (existingVendor) {
      return res.status(409).json({ success: false, message: "Vendor already exists" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: "Admin email already exists" });
    }

    const vendor = await Vendor.create({
      name: String(name).trim(),
      businessName: String(businessName || "").trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      status: "pending",
      pageAccess: DEFAULT_VENDOR_ACCESS,
      address: {
        line1: String(address?.line1 || "").trim(),
        line2: String(address?.line2 || "").trim(),
        city: String(address?.city || "").trim(),
        state: String(address?.state || "").trim(),
        pincode: String(address?.pincode || "").trim(),
      },
    });

    const hashedPassword = await bcrypt.hash(String(password), 10);

    await Admin.create({
      name: String(name).trim(),
      email: String(email).trim(),
      password: hashedPassword,
      role: "vendor",
      vendorId: vendor._id,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor signup submitted. Await approval.",
      data: { vendorId: vendor._id, status: vendor.status },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to signup vendor" });
  }
};
