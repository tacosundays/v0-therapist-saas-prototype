interface ClientInviteEmailProps {
  clientName: string
  therapistName: string
  inviteLink: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function getClientFirstName(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean)[0] || "there"
}

export function renderClientInviteEmail({ clientName, therapistName, inviteLink }: ClientInviteEmailProps) {
  const firstName = escapeHtml(getClientFirstName(clientName))
  const safeTherapistName = escapeHtml(therapistName || "Your therapist")
  const safeInviteLink = escapeHtml(inviteLink)

  const subject = `${safeTherapistName} invited you to ShrinkAid`

  const text = [
    `Hi ${firstName},`,
    "",
    `${safeTherapistName} invited you to create your ShrinkAid account.`,
    "",
    "Create your account:",
    inviteLink,
    "",
    "ShrinkAid helps you access homework, worksheets, and reflections shared by your therapist.",
  ].join("\n")

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 16px;">
                <div style="font-size:22px;font-weight:700;color:#172033;">ShrinkAid</div>
                <div style="font-size:13px;color:#647085;margin-top:4px;">Secure therapy homework portal</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 4px;">
                <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#172033;">Create your account</h1>
                <p style="font-size:16px;line-height:1.6;margin:0 0 14px;color:#344054;">Hi ${firstName},</p>
                <p style="font-size:16px;line-height:1.6;margin:0;color:#344054;">
                  ${safeTherapistName} invited you to ShrinkAid so you can access assignments, worksheets, and reflections from your therapist.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px;">
                <a href="${safeInviteLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:10px;">
                  Create Your Account
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="font-size:13px;line-height:1.6;margin:0 0 10px;color:#667085;">If the button does not work, copy and paste this secure invite link into your browser:</p>
                <p style="font-size:13px;line-height:1.6;margin:0;word-break:break-all;color:#2563eb;">${safeInviteLink}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html, text }
}
