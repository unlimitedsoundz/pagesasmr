/**
 * The Pink Room — Page Turning
 * Server-Side Resend Email Service & Scoped Notification Templates
 */

import {
  BRAND_NAME,
  BRAND_SHORT,
  NOTIFICATION_SENDER,
  REPLY_TO_EMAIL,
  PUBLIC_URL,
  PLATFORM_LOGO_URL,
} from './constants';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  id?: string;
  error?: string;
}

function wrapInEmailLayout(
  content: string,
  options?: { preheader?: string; actionUrl?: string; actionText?: string }
): string {
  const appUrl = PUBLIC_URL;
  const actionButton =
    options?.actionUrl && options?.actionText
      ? `
      <div style="margin: 28px 0 20px 0;">
        <a href="${options.actionUrl}" style="background-color: #1C1520; color: #ffffff; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 9999px; display: inline-block;">
          ${options.actionText} &rarr;
        </a>
      </div>
    `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${BRAND_NAME}</title>
      ${
        options?.preheader
          ? `<span style="display: none; font-size: 1px; color: #ffffff; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${options.preheader}</span>`
          : ''
      }
    </head>
    <body style="margin: 0; padding: 0; background-color: #FDF0F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1520; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FDF0F5; padding: 36px 16px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; padding: 36px 32px; text-align: left;">
              <!-- Header -->
              <tr>
                <td style="padding-bottom: 20px;">
                  <img src="${PLATFORM_LOGO_URL}" alt="${BRAND_NAME}" width="130" style="display: block; max-width: 130px; height: auto; border: 0;" />
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8B7892; margin-top: 6px; font-weight: 700;">Page-Turning Studio</div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding-top: 10px; font-size: 14px; line-height: 1.6; color: #2E2533;">
                  ${content}
                  ${actionButton}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding-top: 24px; font-size: 12px; color: #8B7892; line-height: 1.5; border-top: 1px solid #F3E8EE; margin-top: 24px;">
                  <p style="margin: 0 0 4px 0;">${BRAND_NAME} &bull; <a href="${appUrl}" style="color: #8B7892; text-decoration: none;">pages.pinkroom.online</a></p>
                  <p style="margin: 0;">
                    <a href="${appUrl}/creator" style="color: #1C1520; text-decoration: underline;">Dashboard</a> &bull; 
                    <a href="${appUrl}/guidelines" style="color: #8B7892; text-decoration: underline;">Page-Turning Guidelines</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = options.from || NOTIFICATION_SENDER;
  const replyTo = options.replyTo || REPLY_TO_EMAIL;
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  // 1. If RESEND_API_KEY is set in environment, attempt direct Resend API delivery
  if (apiKey) {
    try {
      const payload = {
        from: fromEmail,
        to: recipients,
        reply_to: replyTo,
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      };

      let res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data = await res.json();

      // If custom domain fails due to domain verification, retry with Resend testing sender
      if (!res.ok && (data?.message?.includes('domain is not verified') || data?.message?.includes('not verified'))) {
        console.warn(`[Resend Email - Pages] Domain for ${fromEmail} not verified, falling back to onboarding@resend.dev...`);
        res = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            from: 'The Pink Room Pages <onboarding@resend.dev>',
          }),
        });
        data = await res.json();
      }

      if (res.ok && data?.id) {
        console.log(`[Resend Email - Pages] Successfully dispatched email to ${recipients.join(', ')} (ID: ${data.id})`);
        return {
          success: true,
          id: data.id,
        };
      }

      console.warn('[Resend Email - Pages] Direct Resend delivery issue, attempting Supabase Edge Function fallback:', data);
    } catch (directErr: any) {
      console.warn('[Resend Email - Pages] Direct network error, attempting Supabase Edge Function fallback:', directErr.message);
    }
  }

  // 2. Fallback: Invoke Supabase Edge Function `send-email`
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydymhzdoptmpblmejcjs.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    let lastEdgeId = '';
    for (const recipient of recipients) {
      const edgeRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipient,
          title: options.subject.replace(/^\[.*?\]\s*/, ''),
          message: options.text || options.subject,
          link: '/admin/submissions',
          platform_id: 'pinkroom_pages',
        }),
      });

      const edgeData = await edgeRes.json();
      if (edgeRes.ok && edgeData?.id) {
        lastEdgeId = edgeData.id;
        console.log(`[Supabase Edge Function - Pages] Dispatched email to ${recipient} (ID: ${edgeData.id})`);
      }
    }

    if (lastEdgeId) {
      return { success: true, id: lastEdgeId };
    }
  } catch (edgeErr: any) {
    console.error('[Supabase Edge Function Delivery Error]:', edgeErr);
  }

  return {
    success: false,
    error: 'All email delivery mechanisms failed.',
  };
}

// Transactional notification dispatch
export async function sendNotificationEmail(options: {
  to: string | string[];
  recipientName: string;
  type: 'REVIEW' | 'PAYOUT' | 'SYSTEM' | 'GENERAL';
  title: string;
  message: string;
  link?: string;
  meta?: {
    amount?: number;
    localFx?: string;
    currencyCode?: string;
    reference?: string;
    videoCount?: number;
    submissionTitle?: string;
  };
}) {
  const appUrl = PUBLIC_URL;
  const fullLink = options.link
    ? options.link.startsWith('http')
      ? options.link
      : `${appUrl}${options.link}`
    : undefined;

  let contentHtml = `
    <h2 style="font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #1C1520; margin: 0 0 16px 0;">
      ${options.title}
    </h2>
    <p style="margin: 0 0 12px 0;">Dear ${options.recipientName || 'Creator'},</p>
    <p style="margin: 0 0 16px 0; line-height: 1.6;">${options.message}</p>
  `;

  if (options.meta?.amount) {
    contentHtml += `
      <div style="background-color: #FFF5F8; border: 1px solid #FED7E2; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 13px; color: #8B7892; font-weight: 600;">AMOUNT</div>
        <div style="font-size: 22px; font-weight: 700; color: #1C1520; margin-top: 4px;">
          $${options.meta.amount.toFixed(2)} USD
          ${options.meta.localFx ? `<span style="font-size: 14px; color: #702459; font-weight: 600; margin-left: 6px;">(${options.meta.localFx})</span>` : ''}
        </div>
        ${options.meta.reference ? `<div style="font-size: 12px; color: #4A5568; margin-top: 6px;"><strong>Payment Reference:</strong> ${options.meta.reference}</div>` : ''}
      </div>
    `;
  }

  const html = wrapInEmailLayout(contentHtml, {
    actionUrl: fullLink,
    actionText: 'View in Dashboard',
  });

  return sendEmail({
    to: options.to,
    subject: `[${BRAND_SHORT}] ${options.title}`,
    html,
  });
}

export async function sendWelcomeEmail(options: {
  to: string;
  recipientName: string;
  role: string;
}) {
  const appUrl = PUBLIC_URL;
  const content = `
    <h2 style="font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #1C1520; margin: 0 0 16px 0;">
      Welcome to ${BRAND_NAME}
    </h2>
    <p style="margin: 0 0 12px 0;">Hello ${options.recipientName},</p>
    <p style="margin: 0 0 12px 0; line-height: 1.6;">
      Your creator account on <strong>The Pink Room — Page Turning</strong> is now active.
    </p>
    <div style="background-color: #FAF5F7; border-left: 4px solid #EC4899; padding: 14px 16px; margin: 18px 0; font-size: 13px; line-height: 1.5; color: #374151;">
      <strong>Recording Standards:</strong><br/>
      &bull; <strong>Faceless Framing:</strong> Focus camera on hands, pages, and reading materials.<br/>
      &bull; <strong>Paper Sounds:</strong> Crisp page-turning acoustics recorded with long press-on nails, flipping from the edges of pages with your 2 middle fingers like the sample.<br/>
      &bull; <strong>Duration:</strong> At least 180 seconds (3 minutes) unbroken per video.<br/>
      &bull; <strong>Payout:</strong> $50 per approved video. Request payout once 8 videos are approved ($400).
    </div>
    <p style="margin: 0 0 16px 0; line-height: 1.6;">
      You can immediately begin uploading your recordings from your creator dashboard.
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    actionUrl: `${appUrl}/creator/upload`,
    actionText: 'Upload Your First Video',
  });

  return sendEmail({
    to: options.to,
    subject: `Welcome to ${BRAND_NAME}`,
    html,
  });
}
