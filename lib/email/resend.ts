// Resend email — transactional notifications
// Docs: https://resend.com/docs

import { Resend } from 'resend';

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendApprovalRequest(to: string, campaignName: string, reviewUrl: string) {
  const client = getResend();
  if (!client) return { sent: false, reason: 'RESEND_API_KEY not set' };

  try {
    await client.emails.send({
      from: 'Caleums AI Studio <noreply@caleums.com>',
      to,
      subject: `New campaign ready for review — ${campaignName}`,
      html: `
        <div style="font-family: DM Sans, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0d0c0a; color: #f0ece0;">
          <h1 style="font-family: Cormorant Garamond, serif; font-size: 32px; color: #c9a84c; margin: 0 0 16px;">Campaign Ready</h1>
          <p style="color: #a09880;">A new campaign is ready for your review.</p>
          <p style="font-size: 18px; margin: 24px 0;">${campaignName}</p>
          <a href="${reviewUrl}" style="display: inline-block; background: #c9a84c; color: #0a0802; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 500;">Review Campaign →</a>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Unknown' };
  }
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
