import DeliveryBoy from "../../models/deliveryBoy.model.js";

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

export const getAllDeliveryBoys = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const filter = {};

    if (status !== "all") {
      filter.status = status === "inactive" ? "inactive" : "active";
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [{ fullName: regex }, { phone: regex }];
    }

    const deliveryBoys = await DeliveryBoy.find(filter).sort({ createdAt: -1 }).lean();

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

    const deliveryBoy = await DeliveryBoy.create({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      status: status === "inactive" ? "inactive" : "active",
      notes: String(notes || "").trim(),
      email: String(email || "").trim(),
      address: String(address || "").trim(),
      aadhar: String(aadhar || "").trim(),
      pan: String(pan || "").trim(),
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

    const deliveryBoy = await DeliveryBoy.findByIdAndDelete(id);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    return res.json({ success: true, message: "Delivery boy deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to delete delivery boy" });
  }
};
