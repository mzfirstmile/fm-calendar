// supabase/functions/auto-reply/index.ts
// Generates a smart reply to an incoming email using Claude API, then sends via Graph API
// Deploy: supabase functions deploy auto-reply
// Secrets: CLAUDE_API_KEY, AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SB_SERVICE_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILBOX = "aiassistant@firstmilecap.com";
const GRAPH_SEND_URL = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/sendMail`;
const TOKEN_URL = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

const SIGNATURE_HTML = `
<p>Thank you,<br>First Mile AI Assistant</p>
<p>362 Fifth Avenue, 9th Floor<br>New York, NY 10001<br>(201) 549-9232 (text enabled)<br><a href="https://firstmilecap.com">FirstMileCap.com</a></p>
<img src="https://admin.firstmilecap.com/assets/First_Mile_Capital_Logo_RGB.png" alt="First Mile Capital" style="width:200px;margin-top:8px;">
`;

const SYSTEM_PROMPT = `You are the AI assistant for First Mile Capital, a real estate investment firm based at 362 Fifth Avenue, 9th Floor, New York, NY 10001.

Your name is the "First Mile AI Assistant" and you send emails from aiassistant@firstmilecap.com.

## About First Mile Capital
First Mile Capital is a real estate investment firm. The managing partner is Morris Zeitouni (mz@firstmilecap.com).

## Key People
- Morris Zeitouni (mz@firstmilecap.com) — Managing Partner
- Richard "Ricky" Chera (rc@firstmilecap.com) — Executive
- Toby Yedid (ty@firstmilecap.com) — Executive
- Stanley Chera (src@cacq.com) — Executive
- Rasheq Zarif (rz@firstmilecap.com) — Executive

## Your Capabilities
- You have access to property-level financials (actuals vs. budget) across the portfolio
- You have access to executive-level business financials
- A strategic forecasting module is being built
- You can be reached via text at (201) 549-9232, email at aiassistant@firstmilecap.com, or the chat widget at admin.firstmilecap.com

## How to Respond
- Be professional, warm, and concise
- If the email is a question you can answer based on your knowledge of First Mile, answer it
- If you don't know something specific, say you'll check with the team and get back to them
- If the email requires Morris's personal attention (legal, major decisions, sensitive topics), say you'll loop Morris in
- Do NOT make up financial numbers or specific data you don't have
- Do NOT include a signature in your reply — it will be appended automatically
- Write your reply as plain HTML paragraphs (use <p> tags)
- Keep replies brief and helpful — 2-4 paragraphs max
- Match the tone of the sender — if they're casual, be casual; if formal, be formal`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getGraphToken(): Promise<string> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID")!;
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(TOKEN_URL(tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function generateReply(email: any): Promise<string> {
  const claudeKey = Deno.env.get("CLAUDE_API_KEY")!;

  const emailContext = `From: ${email.from_name || email.from_address} <${email.from_address}>
Subject: ${email.subject}
Date: ${email.received_at}

${email.body_text || email.body_preview || "(empty email)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please write a reply to this email. Return ONLY the HTML body of the reply (using <p> tags), no signature, no subject line, just the reply content.\n\n${emailContext}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "<p>Thank you for your email. I'll look into this and get back to you shortly.</p>";
}

async function sendReply(token: string, original: any, replyHtml: string): Promise<void> {
  const replySubject = original.subject.startsWith("Re:")
    ? original.subject
    : `Re: ${original.subject}`;

  const fullBody = `${replyHtml}\n<br>\n${SIGNATURE_HTML}`;

  // Reply-all: send to the original sender, CC everyone else on the thread
  // Collect all recipients from original to/cc, excluding our own mailbox
  const allRecipients = [
    ...(original.to_addresses || []),
    ...(original.cc_addresses || []),
  ].filter((r: any) => r.email && r.email.toLowerCase() !== MAILBOX.toLowerCase());

  // The sender gets the reply as "To"
  const toRecipients = [
    {
      emailAddress: {
        address: original.from_address,
        name: original.from_name || undefined,
      },
    },
  ];

  // Everyone else on the thread goes in CC (deduped, excluding the sender)
  const senderEmail = original.from_address.toLowerCase();
  const seenEmails = new Set([senderEmail, MAILBOX.toLowerCase()]);
  const ccRecipients: any[] = [];
  for (const r of allRecipients) {
    const email = r.email.toLowerCase();
    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      ccRecipients.push({
        emailAddress: { address: r.email, name: r.name || undefined },
      });
    }
  }

  const message: any = {
    subject: replySubject,
    body: { contentType: "HTML", content: fullBody },
    toRecipients,
  };
  if (ccRecipients.length > 0) {
    message.ccRecipients = ccRecipients;
  }

  // If there's a conversation ID, try to reply in-thread
  const payload: any = { message, saveToSentItems: true };

  const res = await fetch(GRAPH_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph send error: ${res.status} ${err}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId } = await req.json();

    if (!emailId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: emailId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SB_SERVICE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch the email
    const { data: email, error: fetchErr } = await sb
      .from("emails")
      .select("*")
      .eq("id", emailId)
      .single();

    if (fetchErr || !email) {
      return new Response(
        JSON.stringify({ error: `Email not found: ${fetchErr?.message || "no data"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already replied
    if (email.replied_at) {
      console.log(`Already replied to email ${emailId}, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "already replied" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atomic lock: claim this email by setting replied_at, but ONLY if still null
    // This prevents duplicate replies when webhook and cron race
    const lockTime = new Date().toISOString();
    const { data: claimed, error: claimErr } = await sb
      .from("emails")
      .update({ replied_at: lockTime })
      .eq("id", emailId)
      .is("replied_at", null)
      .select("id")
      .single();

    if (claimErr || !claimed) {
      console.log(`Email ${emailId} already claimed by another process, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "claimed by another process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating reply for email ${emailId} from ${email.from_address}: "${email.subject}"`);

    // Generate reply via Claude
    let replyHtml: string;
    try {
      replyHtml = await generateReply(email);
    } catch (genErr) {
      // Release the lock if reply generation fails
      await sb.from("emails").update({ replied_at: null }).eq("id", emailId);
      throw genErr;
    }

    // Send via Graph API
    const token = await getGraphToken();
    await sendReply(token, email, replyHtml);

    // replied_at already set by atomic lock above — no need to update again

    // Log the sent reply (including CC recipients from reply-all)
    const logCc = (email.to_addresses || [])
      .concat(email.cc_addresses || [])
      .filter((r: any) => r.email && r.email.toLowerCase() !== MAILBOX.toLowerCase() && r.email.toLowerCase() !== email.from_address.toLowerCase());
    await sb.from("email_sent_log").insert({
      to_addresses: [{ email: email.from_address, name: email.from_name }],
      cc_addresses: logCc,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body_html: replyHtml + SIGNATURE_HTML,
      sent_by: "ai-auto-reply",
    });

    return new Response(
      JSON.stringify({ success: true, replied_to: email.from_address, subject: email.subject }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-reply error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
