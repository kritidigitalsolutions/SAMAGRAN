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

/**
 * Send OTP email to admin
 * @param {string} to        - recipient email
 * @param {string} otp       - 6-digit OTP code
 * @param {string} purpose   - "email_change" | "password_change"
 * @param {string} adminName - admin's display name
 */
export const sendAdminOtpEmail = async (to, otp, purpose, adminName = "Admin") => {
  // Guard: ensure email credentials are properly configured
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Email not configured: EMAIL_USER and EMAIL_PASS must be set in .env");
  }
  // Detect common mistake: EMAIL_PASS set to an email address instead of App Password
  if (pass.includes("@")) {
    throw new Error(
      "EMAIL_PASS looks like an email address. It must be a Gmail App Password (16-char code). " +
      "Go to: Google Account → Security → 2-Step Verification → App Passwords"
    );
  }

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
