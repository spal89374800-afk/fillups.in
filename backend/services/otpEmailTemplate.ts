const LOGO_URL = 'https://fillupo.in/apple-touch-icon.png';
const SUPPORT_EMAIL = 'supportfillupo.in@gmail.com';

export function buildOtpEmailHtml(code: string): string {
  const safeCode = String(code).replace(/[^0-9]/g, '');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:24px 20px 8px 20px;">
                <img src="${LOGO_URL}" alt="fillupo.in" width="64" height="64" style="display:block;width:64px;height:64px;border:0;" />
                <div style="margin-top:10px;font-size:22px;font-weight:700;letter-spacing:1px;color:#38bdf8;">fillupo</div>
                <div style="margin-top:2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Online Jan Seva &amp; Cyber Cafe Portal</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 24px 4px 24px;">
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#f8fafc;">Your login OTP</h1>
                <p style="margin:8px 0 0 0;font-size:14px;line-height:20px;color:#94a3b8;">
                  Use this code to complete your login on fillupo.in.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 24px 8px 24px;">
                <div style="display:inline-block;padding:14px 28px;background:#020617;border:1px solid #0ea5e9;border-radius:12px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#67e8f9;">
                  ${safeCode}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 24px 20px 24px;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;">
                  This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>. Never share it with anyone.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 20px;background:#0b1220;border-top:1px solid #1e293b;">
                <p style="margin:0;font-size:11px;line-height:18px;color:#64748b;">
                  Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#38bdf8;text-decoration:none;">${SUPPORT_EMAIL}</a>
                </p>
                <p style="margin:4px 0 0 0;font-size:11px;color:#475569;">© 2026 fillupo.in. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
