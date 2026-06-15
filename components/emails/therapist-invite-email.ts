interface TherapistInviteEmailProps {
  inviterName: string
  practiceName: string
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

export function renderTherapistInviteEmail({ inviterName, practiceName, inviteLink }: TherapistInviteEmailProps) {
  const safeInviterName = escapeHtml(inviterName || "A practice owner")
  const safePracticeName = escapeHtml(practiceName || "their practice")
  const safeInviteLink = escapeHtml(inviteLink)
  const subject = `${safeInviterName} invited you to join ${safePracticeName} on ShrinkAid`

  const text = [
    `You have been invited to join ${safePracticeName} on ShrinkAid.`,
    "",
    `${safeInviterName} added you as a therapist seat on their Group Practice account.`,
    "",
    "Create your account:",
    inviteLink,
    "",
    "You will only be able to access your own clients, assignments, notes, reflections, and clinical workspace.",
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
                <div style="font-size:13px;color:#647085;margin-top:4px;">Group Practice team invitation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 4px;">
                <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#172033;">Join ${safePracticeName}</h1>
                <p style="font-size:16px;line-height:1.6;margin:0 0 14px;color:#344054;">
                  ${safeInviterName} invited you to join their Group Practice workspace in ShrinkAid.
                </p>
                <p style="font-size:16px;line-height:1.6;margin:0;color:#344054;">
                  Your account will have its own private therapist workspace. Other therapists in the practice cannot access your clients by default.
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
