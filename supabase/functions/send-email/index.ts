/// <reference path="../deno.d.ts" />
// Supabase Edge Function: send-email
// Multi-Platform Scoped Email Service for:
// 1) The Pink Room (pinkroom_main) -> https://pinkroom.online
// 2) The Pink Room — Page Turning (pinkroom_pages) -> https://pages.pinkroom.online

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_9i61Yu7S_8ZiMTGsUwVQM3ahwJFWAnNRk";
const RESEND_FROM_EMAIL_MAIN = Deno.env.get("RESEND_FROM_EMAIL_MAIN") || Deno.env.get("RESEND_FROM_EMAIL") || "The Pink Room <notifications@pinkroom.online>";
const RESEND_FROM_EMAIL_PAGES = Deno.env.get("RESEND_FROM_EMAIL_PAGES") || "The Pink Room Pages <notifications@pages.pinkroom.online>";
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "unlymitedsoundz@gmail.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const PLATFORM_LOGO_URL = "https://ydymhzdoptmpblmejcjs.supabase.co/storage/v1/object/public/avatars/brand/logo.png";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();

    let to = body.to;
    let title = body.title;
    let message = body.message;
    let link = body.link;
    let platformId = body.platform_id || "pinkroom_main";

    // Handle Supabase Database Webhook trigger on `notifications` table insert
    if (body.record && body.type === "INSERT") {
      const record = body.record;
      title = record.title;
      message = record.message;
      link = record.link;
      platformId = record.platform_id || "pinkroom_main";

      const isAdminTarget = record.user_id === "694d15ea-ff2c-43ff-967d-80b7817534a8" || record.user_id === "admin-001";

      if (isAdminTarget) {
        to = ADMIN_NOTIFICATION_EMAIL;
      } else if (record.user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${record.user_id}&select=email,display_name`, {
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });
          const profiles = await profileRes.json();
          if (profiles && profiles.length > 0) {
            to = profiles[0].email;
          }
        } catch (e) {
          console.error("Error looking up profile:", e);
        }
      }
    }

    // Determine platform scope safely
    const isPages = platformId === "pinkroom_pages" || (link && link.includes("pages.pinkroom.online"));
    const brandName = isPages ? "The Pink Room — Page Turning" : "The Pink Room";
    const brandSubtitle = isPages ? "Page-Turning Studio" : "Sound Relaxation & ASMR";
    const platformUrl = isPages ? "https://pages.pinkroom.online" : "https://pinkroom.online";
    const fromEmail = isPages ? RESEND_FROM_EMAIL_PAGES : RESEND_FROM_EMAIL_MAIN;
    const fallbackFromEmail = isPages ? "The Pink Room Pages <onboarding@resend.dev>" : "The Pink Room <onboarding@resend.dev>";
    const subjectPrefix = isPages ? "[Pink Room Pages]" : "[The Pink Room]";
    const footerDisplay = isPages ? "pages.pinkroom.online" : "pinkroom.online";

    if (!to) {
      return new Response(JSON.stringify({ error: "Missing recipient email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set in Supabase Edge Function secrets.");
      return new Response(JSON.stringify({ success: true, message: "Mocked (no API key)" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve full destination link
    const actionUrl = link
      ? link.startsWith("http")
        ? link
        : `${platformUrl}${link.startsWith("/") ? "" : "/"}${link}`
      : undefined;

    const isPayout = (title || "").toLowerCase().includes("payout") || (message || "").toLowerCase().includes("payout");
    let payoutCardHtml = "";

    if (isPayout) {
      const amountMatch = (message || "").match(/\$([0-9]+(?:\.[0-9]{2})?)/);
      const usdAmount = amountMatch ? `$${amountMatch[1]} USD` : "";
      const fxMatch = (message || "").match(/\(([^)]*(?:NGN|EUR|GBP|GHS|KES|ZAR|CAD|AUD|INR|PHP|BRL|MXN|JPY)[^)]*)\)/i);
      const localFx = fxMatch ? fxMatch[1] : "";

      payoutCardHtml = `
        <div style="background-color: #FFF5F8; border-radius: 16px; padding: 20px; margin: 18px 0; border: 1px solid #FED7E2;">
          ${usdAmount ? `
            <p style="margin: 0 0 8px 0; font-size: 15px; color: #1C1520;">
              <strong>Payout Amount:</strong> ${usdAmount} ${localFx ? `&bull; <strong>${localFx}</strong>` : ""}
            </p>
          ` : ""}
          <p style="margin: 0; font-size: 13px; color: #702459; line-height: 1.5;">
            <strong>Bank Processing Timeframe:</strong> Please allow up to <strong>3 working days</strong> for local bank processing and settlement to your account.
          </p>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${brandName}</title>
      </head>
      <body style="margin: 0; padding: 36px 16px; background-color: #FDF0F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1C1520; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
          <div style="padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid #F3E8EE;">
            <img src="${PLATFORM_LOGO_URL}" alt="${brandName}" width="130" style="display: block; max-width: 130px; height: auto; border: 0;" />
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8B7892; margin-top: 6px; font-weight: 700;">${brandSubtitle}</div>
          </div>
          <h3 style="margin-top: 0; font-size: 18px; color: #1C1520; font-family: Georgia, serif;">${title || "Notification"}</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #2E2533;">${message || ""}</p>
          ${payoutCardHtml}
          ${actionUrl ? `
            <div style="margin-top: 28px; margin-bottom: 12px;">
              <a href="${actionUrl}" style="display: inline-block; background: #1C1520; color: #ffffff; padding: 12px 26px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 9999px;">
                View in Dashboard &rarr;
              </a>
            </div>
          ` : ""}
          <div style="margin-top: 32px; padding-top: 16px; font-size: 11px; color: #8B7892; border-top: 1px solid #F3E8EE;">
            ${brandName} &bull; <a href="${platformUrl}" style="color: #8B7892; text-decoration: none;">${footerDisplay}</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const fullSubject = (title || "ASMR Creator Alert").startsWith("[")
      ? title || "ASMR Creator Alert"
      : `${subjectPrefix} ${title || "ASMR Creator Alert"}`;

    let resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: fullSubject,
        html,
      }),
    });

    let resendData = await resendRes.json();

    // If custom domain is not yet verified in Resend, gracefully fallback to Resend onboarding address
    if (!resendRes.ok && (resendData?.message?.includes("domain is not verified") || resendData?.message?.includes("not verified"))) {
      console.warn(`Resend domain for ${fromEmail} not verified, falling back to ${fallbackFromEmail}...`);
      resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fallbackFromEmail,
          to: [to],
          subject: fullSubject,
          html,
        }),
      });
      resendData = await resendRes.json();
    }

    return new Response(JSON.stringify(resendData), {
      status: resendRes.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
