import PartnerInquiry from "../models/partnerInquiry.model.js";
import { sendPartnerInquiryEmail } from "../utils/email.service.js";

export const submitPartnerInquiry = async (req, res) => {
  try {
    const { name, contactDetails, phone, email, description, message } = req.body || {};

    const resolvedName = String(name || "").trim();
    const resolvedContact = String(contactDetails || phone || "").trim();
    const resolvedEmail = String(email || "").trim().toLowerCase();
    const resolvedDescription = String(description || message || "").trim();

    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!resolvedContact) {
      return res.status(400).json({
        success: false,
        message: "Contact details are required",
      });
    }

    if (!resolvedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!resolvedDescription) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    let emailSent = false;
    let emailError = null;

    try {
      await sendPartnerInquiryEmail({
        name: resolvedName,
        contactDetails: resolvedContact,
        email: resolvedEmail,
        description: resolvedDescription,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("📧 Partner Email Error:", mailErr.message);
      emailError = mailErr.message;
    }

    const partnerInquiry = await PartnerInquiry.create({
      name: resolvedName,
      contactDetails: resolvedContact,
      email: resolvedEmail,
      description: resolvedDescription,
      emailSent,
      emailError,
    });

    return res.status(201).json({
      success: true,
      message: "Partner request submitted successfully",
      data: partnerInquiry,
    });
  } catch (error) {
    console.error("Partner Inquiry Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit partner request",
    });
  }
};
