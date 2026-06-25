import DeliveryBoy from "../../models/deliveryBoy.model.js";

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

export const getAllDeliveryBoys = async (req, res) => {
  try {
    const { search = "", status = "all", vendorId } = req.query;
    const filter = {};

    if (req.admin?.role === "vendor") {
      filter.vendorId = req.admin.vendorId;
    } else if (req.admin?.role === "super") {
      if (vendorId) {
        filter.vendorId = vendorId;
      }
    }

    if (status !== "all") {
      filter.status = status === "inactive" ? "inactive" : "active";
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [{ fullName: regex }, { phone: regex }];
    }

    const deliveryBoys = await DeliveryBoy.find(filter)
      .populate("vendorId", "name businessName email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { deliveryBoys } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to load delivery boys" });
  }
};

export const createDeliveryBoy = async (req, res) => {
  try {
    const { fullName = "", phone = "", status = "active", notes = "", email = "", address = "", aadhar = "", pan = "" } = req.body || {};

    if (!String(fullName).trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    if (!isValidPhone(String(phone).trim())) {
      return res.status(400).json({ success: false, message: "Valid phone number is required" });
    }

    const existing = await DeliveryBoy.findOne({ phone: String(phone).trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Delivery boy already exists" });
    }

    let vendorId = null;
    if (req.admin?.role === "vendor") {
      vendorId = req.admin.vendorId;
    } else if (req.admin?.role === "super") {
      vendorId = req.body.vendorId || null;
    }

    const deliveryBoy = await DeliveryBoy.create({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      status: status === "inactive" ? "inactive" : "active",
      notes: String(notes || "").trim(),
      email: String(email || "").trim(),
      address: String(address || "").trim(),
      aadhar: String(aadhar || "").trim(),
      pan: String(pan || "").trim(),
      vendorId: vendorId || null,
    });

    return res.status(201).json({ success: true, data: { deliveryBoy } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to create delivery boy" });
  }
};

export const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, status, notes, email, address, aadhar, pan } = req.body || {};

    const deliveryBoy = await DeliveryBoy.findById(id);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    if (req.admin?.role === "vendor" && String(deliveryBoy.vendorId) !== String(req.admin.vendorId)) {
      return res.status(403).json({ success: false, message: "Access denied (vendor mismatch)" });
    }

    if (req.admin?.role === "super" && req.body.vendorId !== undefined) {
      deliveryBoy.vendorId = req.body.vendorId || null;
    }

    if (fullName !== undefined) {
      deliveryBoy.fullName = String(fullName).trim();
    }

    if (phone !== undefined) {
      const nextPhone = String(phone).trim();
      if (!isValidPhone(nextPhone)) {
        return res.status(400).json({ success: false, message: "Valid phone number is required" });
      }
      const existing = await DeliveryBoy.findOne({ phone: nextPhone, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Phone already in use" });
      }
      deliveryBoy.phone = nextPhone;
    }

    if (status !== undefined) {
      deliveryBoy.status = status === "inactive" ? "inactive" : "active";
    }

    if (notes !== undefined) {
      deliveryBoy.notes = String(notes || "").trim();
    }

    if (email !== undefined) {
      deliveryBoy.email = String(email || "").trim();
    }

    if (address !== undefined) {
      deliveryBoy.address = String(address || "").trim();
    }

    if (aadhar !== undefined) {
      deliveryBoy.aadhar = String(aadhar || "").trim();
    }

    if (pan !== undefined) {
      deliveryBoy.pan = String(pan || "").trim();
    }

    await deliveryBoy.save();

    return res.json({ success: true, data: { deliveryBoy } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to update delivery boy" });
  }
};

export const deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryBoy = await DeliveryBoy.findById(id);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    if (req.admin?.role === "vendor" && String(deliveryBoy.vendorId) !== String(req.admin.vendorId)) {
      return res.status(403).json({ success: false, message: "Access denied (vendor mismatch)" });
    }

    await DeliveryBoy.findByIdAndDelete(id);

    return res.json({ success: true, message: "Delivery boy deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to delete delivery boy" });
  }
};
