import bcrypt from "bcryptjs";
import Vendor from "../../models/vendor.model.js";
import Admin from "../../models/admin.model.js";
import Item from "../../models/product.model.js";
import { buildVendorFinance, buildVendorMetricsMap } from "../../utils/vendorFinance.js";

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

const normalizePageAccess = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  return [];
};

export const listVendors = async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const filter = {};

    if (status !== "all") {
      filter.status = status === "inactive" ? "inactive" : status === "pending" ? "pending" : "active";
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [{ name: regex }, { businessName: regex }, { email: regex }, { phone: regex }];
    }

    const totalItems = await Vendor.countDocuments(filter);
    const vendors = await Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();
    const metricsByVendor = await buildVendorMetricsMap(vendors);
    const vendorsWithMetrics = vendors.map((vendor) => ({
      ...vendor,
      metrics: metricsByVendor.get(String(vendor._id)) || {
        products: 0,
        totalOrders: 0,
        revenue: 0,
        vendorEarning: 0,
        superAdminEarning: 0,
        pendingPayout: 0,
      },
    }));

    const totalPages = Math.max(Math.ceil(totalItems / limitNumber), 1);

    return res.json({
      success: true,
      data: {
        vendors: vendorsWithMetrics,
        totalPages,
        totalItems,
        page: pageNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to load vendors" });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const [finance, products, productCount] = await Promise.all([
      buildVendorFinance({ vendorId: vendor._id }),
      Item.find({ vendorId: vendor._id })
        .select("title itemCode pricing status media category categoryId compliance createdAt")
        .populate("categoryId", "name subCategory superAdminCommissionPercent")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Item.countDocuments({ vendorId: vendor._id }),
    ]);

    return res.json({
      success: true,
      data: {
        vendor: {
          ...vendor,
          metrics: {
            products: productCount,
            totalOrders: finance.totalOrders,
            revenue: finance.totalRevenue,
            vendorEarning: finance.vendorNetEarning,
            superAdminEarning: finance.superAdminCommission,
            pendingPayout: finance.withdrawals.totalPending,
            pendingEarning: finance.pendingNetEarning,
            availableBalance: finance.availableBalance,
          },
        },
        finance,
        products,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to load vendor" });
  }
};

export const createVendor = async (req, res) => {
  try {
    const {
      name,
      businessName = "",
      image = "",
      contactPerson = "",
      email,
      phone,
      password,
      status = "active",
      address = {},
      pageAccess = [],
      notes = "",
      role, // Extract role from request body
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
      image: String(image || "").trim(),
      contactPerson: String(contactPerson || name || "").trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      status: status === "inactive" ? "inactive" : status === "pending" ? "pending" : "active",
      address: {
        line1: String(address?.line1 || "").trim(),
        line2: String(address?.line2 || "").trim(),
        city: String(address?.city || "").trim(),
        state: String(address?.state || "").trim(),
        pincode: String(address?.pincode || "").trim(),
      },
      pageAccess: normalizePageAccess(pageAccess).length
        ? normalizePageAccess(pageAccess)
        : DEFAULT_VENDOR_ACCESS,
      notes: String(notes || "").trim(),
      createdBy: req.admin?._id || null,
      approvedBy: status === "active" ? req.admin?._id || null : null,
      approvedAt: status === "active" ? new Date() : null,
    });

    const hashedPassword = await bcrypt.hash(String(password), 10);

    await Admin.create({
      name: String(name).trim(),
      email: String(email).trim(),
      password: hashedPassword,
      role: role || "vendor", // Use provided role or default to "vendor"
      vendorId: vendor._id,
    });

    return res.status(201).json({ success: true, data: { vendor } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to create vendor" });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const payload = req.body || {};

    if (payload.name !== undefined) vendor.name = String(payload.name || "").trim();
    if (payload.businessName !== undefined) vendor.businessName = String(payload.businessName || "").trim();
    if (payload.image !== undefined) vendor.image = String(payload.image || "").trim();
    if (payload.contactPerson !== undefined) vendor.contactPerson = String(payload.contactPerson || "").trim();
    if (payload.email !== undefined) vendor.email = String(payload.email || "").trim();
    if (payload.phone !== undefined) vendor.phone = String(payload.phone || "").trim();
    if (payload.notes !== undefined) vendor.notes = String(payload.notes || "").trim();

    if (payload.status !== undefined) {
      vendor.status = payload.status === "inactive" ? "inactive" : payload.status === "pending" ? "pending" : "active";
      if (vendor.status === "active" && !vendor.approvedAt) {
        vendor.approvedAt = new Date();
        vendor.approvedBy = req.admin?._id || null;
      }
    }

    if (payload.address !== undefined) {
      vendor.address = {
        line1: String(payload.address?.line1 || "").trim(),
        line2: String(payload.address?.line2 || "").trim(),
        city: String(payload.address?.city || "").trim(),
        state: String(payload.address?.state || "").trim(),
        pincode: String(payload.address?.pincode || "").trim(),
      };
    }

    if (payload.pageAccess !== undefined) {
      vendor.pageAccess = normalizePageAccess(payload.pageAccess);
    }

    await vendor.save();

    return res.json({ success: true, data: { vendor } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update vendor" });
  }
};



export const approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    vendor.status = "active";
    vendor.approvedAt = new Date();
    vendor.approvedBy = req.admin?._id || null;
    if (!Array.isArray(vendor.pageAccess) || vendor.pageAccess.length === 0) {
      vendor.pageAccess = DEFAULT_VENDOR_ACCESS;
    }

    await vendor.save();

    return res.json({ success: true, message: "Vendor approved", data: { vendor } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to approve vendor" });
  }
};

export const updateVendorPageAccess = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    vendor.pageAccess = normalizePageAccess(req.body?.pageAccess);
    await vendor.save();

    return res.json({ success: true, data: { vendor } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to update vendor access" });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Delete corresponding Admin credentials
    await Admin.deleteOne({ vendorId: id });

    // Delete associated products/items
    await Item.deleteMany({ vendorId: id });

    return res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to delete vendor" });
  }
};
