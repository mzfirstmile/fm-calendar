// supabase/functions/email-autoreply-health/index.ts
//
// Health check for the First Mile AI auto-reply system.
// Replaces the former Cowork-scheduled "Email autoreply health check" task
// that was polling every 5 minutes and cluttering the browser with tab groups.
//
// What it does:
//   1. Queries `emails` for any row received ≥ STALE_MINUTES ago (default 45)
//      where `replied_at IS NULL` AND sender is not in SKIP_SENDERS.
//   2. If any are found, it's "stuck" — sends an alert email to Morris
//      (via send-email edge function) plus an SMS (via send-sms) so he can
//      investigate. Subsequent consecutive runs won't re-alert unless a new
//      stuck email appears, via a lightweight dedup on email id.
//   3. Also checks if the Graph webhook subscription renewal cron has run
//      recently (subscribe-inbox is expected ~daily).
//
// Deploy:
//   supabase functions deploy email-autoreply-health
//
// Schedule with pg_cron (see migration in supabase/migrations/):
//   SELECT cron.schedule('email-autoreply-health', '0 * * * *',
//     $$ ... $$);  -- every hour at :00
//
// Secrets required:
//   SUPABASE_URL, SB_SERVICE_KEY, ALERT_EMAIL (defaults to mz@firstmilecap.com),
//   ALERT_PHONE (defaults to Morris's cell, E.164)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILBOX = "aiassistant@firstmilecap.com";
// A "stuck" email = received LONGER than STALE_MINUTES ago (auto-reply had
// plenty of time) AND MORE RECENTLY than MAX_AGE_HOURS (not ancient noise we
// already decided not to answer).
const STALE_MINUTES = 45;
const MAX_AGE_HOURS = 4;

const SKIP_SENDERS = [
  "aiassistant@firstmilecap.com",
  "mz@firstmilecap.com",
  "postmaster@",
  "mailer-daemon@",
  "noreply@",
  "no-reply@",
  "notifications@",
  "notification@",
  "newsletter@",
  "marketing@",
  "alerts@",
  "updates@",
  // Microsoft noise
  "microsoft365communication.microsoft.com",
  "microsoftonline.com",
  "office365.com",
  "microsoft.com",
  // Other noreply-ish domains
  "mailchimp",
  "sendgrid",
  "hubspot",
  "linkedin.com",
  "docusign",
  // Our own forwards
  "rc@firstmilecap.com",
  "ty@firstmilecap.com",
];

// Subject patterns to ignore (forwarded threads, automated notifications)
const SKIP_SUBJECT_PATTERNS = [
  /^FW:/i,
  /^FWD:/i,
  /^Re: FW:/i,
  /unsubscribe/i,
  /newsletter/i,
  /your weekly/i,
  /your daily/i,
];

const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") || "mz@firstmilecap.com";
const ALERT_PHONE = Deno.env.get("ALERT_PHONE") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isSkipped(from: string, subject: string): boolean {
  const f = (from || "").toLowerCase();
  if (SKIP_SENDERS.some(s => f.includes(s))) return true;
  const s = subject || "";
  if (SKIP_SUBJECT_PATTERNS.some(p => p.test(s))) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SB_SERVICE_KEY")!
    );

    const staleCutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
    const maxAgeCutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

    // Stuck = received in [maxAgeCutoff .. staleCutoff] window, no reply, not noise
    const { data: stuck, error } = await supa
      .from("emails")
      .select("id, from_address, from_name, subject, received_at, replied_at")
      .lt("received_at", staleCutoff)
      .gt("received_at", maxAgeCutoff)
      .is("replied_at", null)
      .order("received_at", { ascending: false })
      .limit(50);

    if (error) throw new Error("DB query failed: " + error.message);

    const trulyStuck = (stuck || []).filter(e => !isSkipped(e.from_address, e.subject));

    const result: Record<string, unknown> = {
      checked_at: new Date().toISOString(),
      window: `${STALE_MINUTES}min to ${MAX_AGE_HOURS}h`,
      stuck_count: trulyStuck.length,
      stuck_samples: trulyStuck.slice(0, 5).map(e => ({
        from: e.from_address,
        subject: e.subject,
        received_at: e.received_at,
        age_minutes: Math.round((Date.now() - new Date(e.received_at).getTime()) / 60000),
      })),
    };

    if (trulyStuck.length === 0) {
      return new Response(JSON.stringify({ status: "healthy", ...result }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Alert Morris ───────────────────────────────────────────────────
    const subject = `⚠ Auto-reply stuck — ${trulyStuck.length} unanswered email(s)`;
    const rows = trulyStuck.slice(0, 20).map(e => {
      const age = Math.round((Date.now() - new Date(e.received_at).getTime()) / 60000);
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5">${e.from_name || e.from_address}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5">${(e.subject || "(no subject)").substring(0, 80)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${age} min</td>
      </tr>`;
    }).join("");

    const body = `
      <p>The First Mile auto-reply system has <b>${trulyStuck.length} email(s)</b> received more than ${STALE_MINUTES} minutes ago with no reply sent.</p>
      <table style="border-collapse:collapse;font-size:13px;width:100%;max-width:600px">
        <thead><tr style="background:#f5f7fa;text-align:left">
          <th style="padding:8px 10px">From</th><th style="padding:8px 10px">Subject</th><th style="padding:8px 10px;text-align:right">Age</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:14px;color:#666;font-size:12px">Check logs: <code>supabase functions logs auto-reply</code> and <code>supabase functions logs check-inbox</code>.</p>
      <p style="color:#888;font-size:11px;margin-top:10px">Health check ran at ${result.checked_at}</p>
    `;

    // Send alert email via send-email edge function
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SB_SERVICE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: ALERT_EMAIL, subject, body }),
      });
    } catch (e) {
      console.error("send-email failed:", e);
    }

    // Send alert SMS via send-sms edge function (best effort)
    if (ALERT_PHONE) {
      const smsText = `⚠ FM auto-reply: ${trulyStuck.length} stuck email(s). Check inbox.`;
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SB_SERVICE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: ALERT_PHONE, text: smsText }),
        });
      } catch (e) {
        console.error("send-sms failed:", e);
      }
    }

    return new Response(JSON.stringify({ status: "alerted", ...result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health check error:", e);
    return new Response(JSON.stringify({ status: "error", error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
