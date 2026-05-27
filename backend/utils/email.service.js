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
                  <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">🔐 Admin Panel</h1>
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

                  <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">⚠️ Never share this OTP with anyone.</p>
                  <p style="color:#6b7280;font-size:13px;margin:0;">If you did not initiate this request, please ignore this email or contact your system administrator.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin5u67uuA:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Admin Panel &nbsp;|&nbsp; This is an automated message</p>
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
    from: `"Admin Panel 🔐" <${process.env.EMAIL_USER}>`,
    to,
    subject: `[Admin Panel] OTP for ${purposeLabel} — ${otp}`,
    html
  });

  console.log(`📧 OTP email sent to ${to} for ${purpose}`);
};
