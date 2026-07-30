import nodemailer from "nodemailer";

/**
 * Creates a nodemailer transporter using Gmail SMTP.
 * Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS   // Gmail App Password (not your login password)
    }
  });
};

const ensureEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Email not configured: EMAIL_USER and EMAIL_PASS must be set in .env");
  }

  if (pass.includes("@")) {
    throw new Error("EMAIL_PASS must be a Gmail App Password, not an email address");
  }

  return { user, pass };
};

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value = 0) => `Rs. ${Number(value || 0).toFixed(2)}`;

const getOrderDisplayId = (order = {}) =>
  String(order._id || order.id || "").slice(-6).toUpperCase();

const getProductName = (item = {}) => {
  const product = item.product || {};
  return (
    product.title ||
    product.name ||
    product.itemCode ||
    product.slug ||
    "Product"
  );
};

/**
 * Send OTP email to admin
 * @param {string} to        - recipient email
 * @param {string} otp       - 6-digit OTP code
 * @param {string} purpose   - "email_change" | "password_change"
 * @param {string} adminName - admin's display name
 */
export const sendAdminOtpEmail = async (to, otp, purpose, adminName = "Admin") => {
  // Guard: ensure email credentials are properly configured
  ensureEmailConfigured();

  const transporter = createTransporter();

  const purposeLabel =
    purpose === "email_change"
      ? "Email Address Update"
      : purpose === "password_reset"
        ? "Password Reset"
        : "Password Update";

  const text = `Hi ${adminName},\n\nYou requested a ${purposeLabel} for your Samagran admin account.\nUse the OTP below to proceed. It is valid for 10 minutes.\n\nYour OTP Code: ${otp}\n\nNever share this OTP with anyone.\nIf you did not initiate this request, please ignore this email.\n\n© ${new Date().getFullYear()} Samagran.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Admin OTP Verification</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">Samagran Admin Panel</h1>
                  <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">${purposeLabel} Verification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="color:#374151;font-size:16px;margin:0 0 16px;">Hi <strong>${adminName}</strong>,</p>
                  <p style="color:#374151;font-size:15px;margin:0 0 24px;">
                    You requested a <strong>${purposeLabel}</strong> for your admin account.
                    Use the OTP below to proceed. It is valid for <strong>10 minutes</strong>.
                  </p>

                  <!-- OTP Box -->
                  <div style="background:#f0f4ff;border:2px dashed #4f46e5;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Your OTP Code</p>
                    <p style="margin:0;color:#4f46e5;font-size:42px;font-weight:900;letter-spacing:10px;">${otp}</p>
                  </div>

                  <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Never share this OTP with anyone.</p>
                  <p style="color:#6b7280;font-size:13px;margin:0;">If you did not initiate this request, please ignore this email or contact your system administrator.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Samagran &nbsp;|&nbsp; This is an automated message</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Samagran Admin Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Samagran ${purposeLabel} OTP Verification Code: ${otp}`,
    text,
    html
  });

  console.log(`📧 OTP email sent to ${to} for ${purpose}`);
};


/**
 * Send new order email to the registered vendor email address.
 * The caller should pass the order after product population.
 */
export const sendVendorOrderEmail = async ({ vendor, order }) => {
  ensureEmailConfigured();

  const vendorEmail = String(vendor?.email || "").trim().toLowerCase();
  if (!vendorEmail) {
    throw new Error("Vendor email not found");
  }

  const vendorName =
    vendor?.businessName || vendor?.name || vendor?.contactPerson || "Vendor";
  const orderId = getOrderDisplayId(order);
  const address = order?.address || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const vendorId = vendor?._id ? String(vendor._id) : "";
  const visibleItems = items.filter((item) => {
    const productVendorId = item?.product?.vendorId
      ? String(item.product.vendorId)
      : "";
    const orderVendorId = order?.vendorId ? String(order.vendorId) : "";

    if (productVendorId && vendorId) {
      return productVendorId === vendorId;
    }

    return vendorId && orderVendorId === vendorId;
  });

  if (!visibleItems.length) {
    throw new Error("No vendor items found for order email");
  }

  const itemRows = visibleItems
    .map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const lineTotal = quantity * price;
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(getProductName(item))}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(price)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const textItems = visibleItems
    .map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      return `${index + 1}. ${getProductName(item)} - Qty: ${quantity}, Price: ${formatCurrency(price)}, Total: ${formatCurrency(quantity * price)}`;
    })
    .join("\n");

  const customerAddress = [
    address.name,
    address.phone,
    address.fullAddress,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const text = `Hi ${vendorName},

A new order has been placed for your product(s).

Order ID: #${orderId}
Payment Method: ${order?.paymentMethod || "N/A"}
Payment Status: ${order?.paymentStatus || "N/A"}
Order Status: ${order?.orderStatus || "Placed"}

Items:
${textItems}

Delivery Address:
${customerAddress || "N/A"}

Please process this order from your Samagran vendor panel.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>New Vendor Order</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="background:#8B1E3F;padding:24px 32px;color:#ffffff;">
                  <h1 style="margin:0;font-size:22px;">New Order Received</h1>
                  <p style="margin:8px 0 0;font-size:14px;">Order #${escapeHtml(orderId)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <p style="margin:0 0 18px;">Hi <strong>${escapeHtml(vendorName)}</strong>,</p>
                  <p style="margin:0 0 22px;">A new order has been placed for your product(s).</p>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:22px;background:#fafafa;border:1px solid #e5e7eb;">
                    <tr><td style="font-weight:bold;">Payment Method</td><td>${escapeHtml(order?.paymentMethod || "N/A")}</td><td style="font-weight:bold;">Payment Status</td><td>${escapeHtml(order?.paymentStatus || "N/A")}</td></tr>
                    <tr><td style="font-weight:bold;">Order Status</td><td>${escapeHtml(order?.orderStatus || "Placed")}</td><td style="font-weight:bold;">Order Total</td><td>${formatCurrency(order?.totalAmount || 0)}</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;font-size:14px;">
                    <thead><tr style="background:#f9fafb;"><th align="left" style="padding:10px;border-bottom:1px solid #e5e7eb;">#</th><th align="left" style="padding:10px;border-bottom:1px solid #e5e7eb;">Product</th><th align="center" style="padding:10px;border-bottom:1px solid #e5e7eb;">Qty</th><th align="right" style="padding:10px;border-bottom:1px solid #e5e7eb;">Price</th><th align="right" style="padding:10px;border-bottom:1px solid #e5e7eb;">Total</th></tr></thead>
                    <tbody>${itemRows}</tbody>
                  </table>
                  <h2 style="font-size:16px;margin:24px 0 8px;">Delivery Address</h2>
                  <p style="margin:0;line-height:1.5;">${escapeHtml(customerAddress || "N/A")}</p>
                </td>
              </tr>
              <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;"><p style="margin:0;color:#6b7280;font-size:12px;">Samagran Vendor Order Notification</p></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await createTransporter().sendMail({
    from: `"Samagran Orders" <${process.env.EMAIL_USER}>`,
    to: vendorEmail,
    subject: `New Samagran Order #${orderId}`,
    text,
    html,
  });

  console.log(`Vendor order email sent to ${vendorEmail} for order ${orderId}`);
};

/**
 * Send Partner With Us inquiry email to support@samagran.com
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.contactDetails
 * @param {string} data.email
 * @param {string} data.description
 */
export const sendPartnerInquiryEmail = async ({
  name,
  contactDetails,
  email,
  description,
}) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Email not configured: EMAIL_USER and EMAIL_PASS must be set in .env"
    );
  }

  const transporter = createTransporter();
  const recipient = "support@samagran.com";

  const text = `New Partner Request Received:\n\nName: ${name}\nContact Details: ${contactDetails}\nEmail: ${email}\nDescription:\n${description}\n`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Partner With Us Request</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#8B1E3F,#4A001F);padding:28px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.5px;">New "Partner With Us" Request</h1>
                  <p style="margin:6px 0 0;color:#fce7f3;font-size:14px;">Submitted from Website / App</p>
                </td>
              </tr>
              <!-- Details Table -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="color:#374151;font-size:15px;margin:0 0 20px;">A new partner request has been submitted. Details are below:</p>

                  <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#374151;background:#fafafa;border-radius:8px;border:1px solid #e5e7eb;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td width="30%" style="font-weight:bold;color:#111827;">Name:</td>
                      <td>${name}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="font-weight:bold;color:#111827;">Contact Details:</td>
                      <td>${contactDetails}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="font-weight:bold;color:#111827;">Email Address:</td>
                      <td><a href="mailto:${email}" style="color:#8B1E3F;text-decoration:none;font-weight:bold;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="font-weight:bold;color:#111827;vertical-align:top;padding-top:12px;">Description:</td>
                      <td style="padding-top:12px;white-space:pre-wrap;line-height:1.5;">${description}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Samagran | Partner Inquiry Notification</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Samagran Partner Requests" <${process.env.EMAIL_USER}>`,
    to: recipient,
    replyTo: email,
    subject: `New Partner Inquiry: ${name}`,
    text,
    html,
  });

  console.log(`📧 Partner inquiry email sent to ${recipient} for ${name}`);
};
