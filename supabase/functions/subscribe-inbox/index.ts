// supabase/functions/subscribe-inbox/index.ts
// Creates or renews a Microsoft Graph webhook subscription for new mail
// Graph mail subscriptions expire after max ~3 days (4230 minutes)
// Schedule this via pg_cron to run daily to keep the subscription alive
// Deploy: supabase functions deploy subscribe-inbox
// Secrets: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const MAILBOX = "aiassistant@firstmilecap.com";
const WEBHOOK_URL = "https://qrtleqasnhbnruodlgpt.supabase.co/functions/v1/email-webhook";

const TOKEN_URL = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const SUBSCRIPTIONS_URL = "https://graph.microsoft.com/v1.0/subscriptions";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = await getGraphToken();

    // Check for existing subscriptions
    const listRes = await fetch(SUBSCRIPTIONS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existing = (await listRes.json()).value || [];

    // Find any existing subscription for our mailbox
    const mailSub = existing.find(
      (s: any) =>
        s.resource === `users/${MAILBOX}/mailFolders('inbox')/messages` &&
        s.notificationUrl === WEBHOOK_URL
    );

    // Expiration: max ~3 days from now for mail resources
    const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000).toISOString();

    if (mailSub) {
      // Renew existing subscription
      const renewRes = await fetch(`${SUBSCRIPTIONS_URL}/${mailSub.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expirationDateTime: expiration }),
      });

      if (!renewRes.ok) {
        const err = await renewRes.text();
        throw new Error(`Renew failed: ${renewRes.status} ${err}`);
      }

      const renewed = await renewRes.json();
      return new Response(
        JSON.stringify({
          success: true,
          action: "renewed",
          subscriptionId: renewed.id,
          expirationDateTime: renewed.expirationDateTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new subscription
    const createRes = await fetch(SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changeType: "created",
        notificationUrl: WEBHOOK_URL,
        resource: `users/${MAILBOX}/mailFolders('inbox')/messages`,
        expirationDateTime: expiration,
        clientState: "firstmile-inbox-webhook",
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Create subscription failed: ${createRes.status} ${err}`);
    }

    const created = await createRes.json();
    return new Response(
      JSON.stringify({
        success: true,
        action: "created",
        subscriptionId: created.id,
        expirationDateTime: created.expirationDateTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("subscribe-inbox error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
