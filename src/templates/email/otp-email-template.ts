interface OtpEmailTemplateOptions {
  otp: string;
  recipientName?: string;
  headline?: string;
  subheading?: string;
  copyUrl?: string;
  supportEmail?: string;
  brandName?: string;
  footerNote?: string;
}

const BASE_STYLES = {
  background: "#f5f5f7",
  cardBackground: "#ffffff",
  accent: "#5035ff",
  accentDark: "#3c2acc",
  textPrimary: "#1f1f24",
  textSecondary: "#555770",
  divider: "#e0e2ec",
  success: "#19c37d",
};

const sanitize = (value?: string) => value?.replace(/[<>]/g, "") ?? "";

export const otpEmailTemplate = (options: OtpEmailTemplateOptions) => {
  const {
    otp,
    recipientName = "there",
    headline = "Welcome to the Harrum Cloth House!",
    subheading = "Use this OTP to verify your email.",
    supportEmail = "muzairyousif.muy@gmail.com",
    brandName = "Harrum Cloth House",
    footerNote = "If you didn’t request this, please ignore this email.",
  } = options;

  const previewText = `Your ${brandName} verification code is ${otp}.`;
  const safeOtp = sanitize(otp);

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${brandName} verification code</title>
      <style>
        @media (max-width: 600px) {
          .card {
            padding: 24px !important;
          }
          .otp-value {
            font-size: 28px !important;
            letter-spacing: 6px !important;
          }
          .btn {
            display: block !important;
            width: 100% !important;
          }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:${BASE_STYLES.background};font-family:'Inter', 'Segoe UI', sans-serif;color:${BASE_STYLES.textPrimary};">
      <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;mso-hide:all;">
        ${previewText}
      </span>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
        <tr>
          <td align="center">
            <table class="card" width="100%" style="max-width:520px;background:${BASE_STYLES.cardBackground};border-radius:24px;padding:40px;box-shadow:0 20px 40px rgba(37,44,97,0.15);">
              <tr>
                <td style="text-align:center;">
                  <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${BASE_STYLES.accent};margin-bottom:12px;">
                    ${brandName}
                  </div>
                  <h1 style="font-size:28px;margin:0 0 12px 0;color:${BASE_STYLES.textPrimary};">
                    ${headline}
                  </h1>
                  <p style="margin:0;color:${BASE_STYLES.textSecondary};font-size:16px;line-height:1.6;">
                    Hey ${sanitize(recipientName)}, ${subheading}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 0;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#fafbff;border:1px solid ${BASE_STYLES.divider};border-radius:20px;padding:32px;text-align:center;">
                    <tr>
                      <td style="font-size:13px;font-weight:600;letter-spacing:2px;color:${BASE_STYLES.textSecondary};text-transform:uppercase;">
                        One-time passcode
                      </td>
                    </tr>
                    <tr>
                      <td class="otp-value" style="font-size:36px;font-weight:700;letter-spacing:10px;color:${BASE_STYLES.textPrimary};padding:18px 0;">
                        ${safeOtp}
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:${BASE_STYLES.textSecondary};">
                        Expires in 10 minutes · Keep this code private
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top:32px;border-top:1px solid ${BASE_STYLES.divider};">
                  <p style="margin:0 0 12px 0;font-size:15px;color:${BASE_STYLES.textPrimary};font-weight:600;">
                    Next up for you
                  </p>
                  <ul style="padding-left:20px;margin:0;color:${BASE_STYLES.textSecondary};line-height:1.7;font-size:14px;">
                    <li>Verify your email with the code above.</li>
                    <li>Reset Password.</li>
                    <li>Login with new Password.</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td style="padding-top:28px;">
                  <div style="background:#eefdf5;border-radius:16px;padding:18px 20px;color:${BASE_STYLES.success};font-size:14px;font-weight:600;">
                    Pro tip: Add ${supportEmail} to your trusted contacts so important updates never land in spam.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-top:28px;font-size:13px;color:${BASE_STYLES.textSecondary};line-height:1.6;">
                  ${footerNote}
                </td>
              </tr>
              <tr>
                <td style="padding-top:12px;font-size:12px;color:${BASE_STYLES.textSecondary};text-align:center;">
                  © ${new Date().getFullYear()} ${brandName}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};
