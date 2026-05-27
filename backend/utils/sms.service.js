import axios from "axios";

/**
 * SMS Gateway Service - Send OTP via SMS Gateway Hub
 * Configuration: Uses environment variables for SMS_GH credentials
 */

const SMS_GH_BASE_URL = process.env.SMS_GH_BASE_URL || "https://www.smsgatewayhub.com/api/mt/SendSMS";

const SMS_GH_CONFIG = {
  apiKey: process.env.SMS_GH_API_KEY,
  senderId: process.env.SMS_GH_SENDER_ID,
  entityId: process.env.SMS_GH_ENTITY_ID,
  templateId: process.env.SMS_GH_DLT_TEMPLATE_ID,
  route: process.env.SMS_GH_ROUTE,
  otpText: process.env.SMS_GH_OTP_TEXT,
};

// Log configuration on startup
console.log("📋 SMS Gateway Configuration:");
console.log("   API Key:", SMS_GH_CONFIG.apiKey ? "✓ Set" : "✗ Missing");
console.log("   Sender ID:", SMS_GH_CONFIG.senderId);
console.log("   Entity ID:", SMS_GH_CONFIG.entityId);
console.log("   Template ID:", SMS_GH_CONFIG.templateId);
console.log("   Base URL:", SMS_GH_BASE_URL);

/**
 * Normalize Indian phone number to 91XXXXXXXXXX format
 */
const normalizeIndianPhone = (phone) => {
  let cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
  if (!cleanPhone.startsWith("91")) {
    cleanPhone = `91${cleanPhone}`;
  }
  return cleanPhone;
};

/**
 * Build OTP text from template, supporting multiple placeholder formats
 */
const buildOtpText = (otp) => {
  const defaultTemplate = process.env.SMS_GH_OTP_TEXT || 
    "Dear Customer, your OTP is {{otp}}. Please do not share this OTP with anyone.";
  
  const template = String(defaultTemplate);

  // Support multiple common placeholder formats used in SMS templates
  const replaced = template
    .replaceAll("{#var#}", String(otp))
    .replaceAll("{{otp}}", String(otp))
    .replaceAll("{otp}", String(otp))
    .replaceAll("<otp>", String(otp))
    .replaceAll("%OTP%", String(otp))
    .replaceAll("%otp%", String(otp));

  if (replaced === template) {
    console.warn(
      "⚠️ SMS_GH_OTP_TEXT has no OTP placeholder token; sending text as-is. Add {#var#} or {{otp}} for dynamic OTP insertion."
    );
  }

  return replaced;
};

/**
 * Send OTP via SMS Gateway
 * @param {string} phone - 10-digit phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} userType - 'user' or 'pandit' (for logging)
 * @returns {Promise<Object>} - API response
 */
export const sendOtpSms = async (phone, otp, userType = "user") => {
  try {
    // Validate phone number
    if (!phone || !/^\d{10}$/.test(String(phone).replace(/\D/g, ""))) {
      throw new Error("Invalid phone number format");
    }

    // Validate OTP
    if (!otp || !/^\d{6}$/.test(String(otp))) {
      throw new Error("Invalid OTP format");
    }

    // Validate SMS config
    if (!SMS_GH_CONFIG.apiKey) {
      throw new Error("SMS_GH_API_KEY not configured");
    }

    const number = normalizeIndianPhone(phone);
    const text = buildOtpText(otp);

    console.log(`\n📤 Sending OTP to ${phone} for ${userType}`);
    console.log(`   Phone: ${number}`);
    console.log(`   Message: ${text}`);

    const params = {
      APIKey: SMS_GH_CONFIG.apiKey,
      senderid: SMS_GH_CONFIG.senderId,
      channel: "Trans",
      DCS: 0,
      flashsms: 0,
      number,
      text,
      route: SMS_GH_CONFIG.route,
      EntityId: SMS_GH_CONFIG.entityId,
      dlttemplateid: SMS_GH_CONFIG.templateId,
    };

    const url = new URL(SMS_GH_BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    console.log(`   🔗 URL: ${url.toString().replace(SMS_GH_CONFIG.apiKey, "***")}`);

    const response = await axios.get(url.toString(), {
      timeout: 15000,
    });

    console.log(`   📡 Raw Response:`, JSON.stringify(response.data));

    // Check for errors in response
    if (response?.data?.ErrorCode && response.data.ErrorCode !== "000") {
      const apiMessage =
        response?.data?.ErrorMessage || response?.data?.message || JSON.stringify(response.data);
      throw new Error(
        `SMS Gateway rejected request: ${apiMessage}. Verify DLT template ID: ${SMS_GH_CONFIG.templateId}`
      );
    }

    const firstMessage = Array.isArray(response?.data?.MessageData)
      ? response.data.MessageData[0]
      : null;
    const jobId = response?.data?.JobId || null;
    const messageId = firstMessage?.MessageId || null;

    if (!jobId && !messageId) {
      throw new Error(
        `SMS submitted but response missing JobId/MessageId: ${JSON.stringify(response.data)}`
      );
    }

    console.log(`✅ OTP sent successfully!`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Message ID: ${messageId}`);

    return {
      success: true,
      phone,
      userType,
      provider: "SMSGatewayHub",
      submitted: true,
      errorCode: response?.data?.ErrorCode || "000",
      errorMessage: response?.data?.ErrorMessage || "Success",
      jobId,
      messageId,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`❌ SMS Error for ${phone}:`, error.message);
    console.error(`   Full Error:`, error.response?.data || error.message);

    return {
      success: false,
      phone,
      userType,
      error: error.message,
      timestamp: new Date(),
      fallbackMode: true,
    };
  }
};

/**
 * Send generic SMS message
 * @param {string} phone - 10-digit phone number
 * @param {string} message - SMS message text
 * @returns {Promise<Object>} - API response
 */
export const sendSms = async (phone, message) => {
  try {
    if (!phone || !/^\d{10}$/.test(String(phone).replace(/\D/g, ""))) {
      throw new Error("Invalid phone number format");
    }

    if (!message || message.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const number = normalizeIndianPhone(phone);

    const params = {
      APIKey: SMS_GH_CONFIG.apiKey,
      senderid: SMS_GH_CONFIG.senderId,
      channel: "Trans",
      DCS: 0,
      flashsms: 0,
      number,
      text: message,
      route: SMS_GH_CONFIG.route,
    };

    const url = new URL(SMS_GH_BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const response = await axios.get(url.toString(), {
      timeout: 15000,
    });

    if (response?.data?.ErrorCode && response.data.ErrorCode !== "000") {
      throw new Error(response?.data?.ErrorMessage || "SMS failed");
    }

    console.log(`✅ SMS sent successfully to ${phone}`);

    return {
      success: true,
      phone,
      jobId: response?.data?.JobId || null,
      messageId: response?.data?.MessageData?.[0]?.MessageId || null,
    };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${phone}:`, error.message);

    return {
      success: false,
      phone,
      error: error.message,
    };
  }
};

export default {
  sendOtpSms,
  sendSms,
};
 