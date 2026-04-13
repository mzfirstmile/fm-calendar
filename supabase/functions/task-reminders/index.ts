// supabase/functions/task-reminders/index.ts
// Sends deadline reminder emails to team members.
// Three modes:
//   mode=upcoming    → tasks due TOMORROW (run daily at 8 AM ET)
//   mode=pastdue     → tasks that were due YESTERDAY and NOT marked Done (run daily at 8 AM ET)
//   mode=escalation  → tasks 2+ days past due, NOT marked Done → summary email to Morris (run daily at 8 AM ET)
//
// Deploy: supabase functions deploy task-reminders --no-verify-jwt
// Cron calls this with no auth header, so deploy with --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_SEND_URL = "https://graph.microsoft.com/v1.0/users/aiassistant@firstmilecap.com/sendMail";
const TOKEN_URL = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const CALENDAR_URL = "https://admin.firstmilecap.com/#calendar";

const EMAIL_SIGNATURE = `
<p>Thank you,<br>First Mile AI Assistant</p>
<p>362 Fifth Avenue, 9th Floor<br>New York, NY 10001<br>(201) 549-9232 (text enabled)<br><a href="https://firstmilecap.com">FirstMileCap.com</a></p>
<img src="https://admin.firstmilecap.com/assets/First_Mile_Capital_Logo_RGB.png" alt="First Mile Capital" style="width:200px;margin-top:8px;">
`;

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

async function sendEmail(token: string, to: string, subject: string, htmlBody: string) {
  const message = {
    subject,
    body: { contentType: "HTML", content: htmlBody },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  const res = await fetch(GRAPH_SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) throw new Error(`Graph send error: ${res.status} ${await res.text()}`);
}

// ── Helpers ──

function getETDate(offsetDays = 0): { year: number; month: number; day: number; dateStr: string } {
  // Get current date in US Eastern timezone
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  et.setDate(et.getDate() + offsetDays);
  return {
    year: et.getFullYear(),
    month: et.getMonth() + 1, // 1-indexed
    day: et.getDate(),
    dateStr: et.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isQuarterStart(month: number): boolean {
  // Quarterly tasks show in Jan(1), Apr(4), Jul(7), Oct(10) — first month of each quarter
  return [1, 4, 7, 10].includes(month);
}

interface Task {
  id: string;
  property: string;
  payment_type: string;
  description: string;
  cadence: string;
  day_of_month: number;
  due_month: number | null;
  team: string;
  status: string;
  due_date: string | null;
}

interface TeamMember {
  display_name: string;
  email: string;
  team: string;
}

function taskIsDueOnDate(task: Task, year: number, month: number, day: number): boolean {
  const dim = daysInMonth(year, month);

  if (task.cadence === "One-Time") {
    // One-time tasks: check due_date
    if (!task.due_date) return false;
    const d = new Date(task.due_date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
  }

  // For recurring tasks, the task's day_of_month must match, with overflow logic
  const effectiveDay = task.day_of_month > dim ? dim : task.day_of_month;
  if (effectiveDay !== day) return false;

  if (task.cadence === "Monthly") return true;
  if (task.cadence === "Quarterly") return isQuarterStart(month);
  if (task.cadence === "Annual") return task.due_month ? task.due_month === month : false;

  return false;
}

function buildEmailHtml(
  recipientName: string,
  tasks: Task[],
  mode: "upcoming" | "pastdue",
  targetDateStr: string
): string {
  const isUpcoming = mode === "upcoming";
  const headerColor = isUpcoming ? "#0ea5e9" : "#e53e3e";
  const headerIcon = isUpcoming ? "📋" : "⚠️";
  const headerText = isUpcoming
    ? `Upcoming Deadlines — ${targetDateStr}`
    : `Past Due Tasks — Were Due ${targetDateStr}`;
  const introText = isUpcoming
    ? `You have <strong>${tasks.length}</strong> task${tasks.length > 1 ? "s" : ""} due tomorrow. Please make sure these are completed on time.`
    : `The following <strong>${tasks.length}</strong> task${tasks.length > 1 ? "s" : ""} ${tasks.length > 1 ? "were" : "was"} due and ${tasks.length > 1 ? "have" : "has"} not been marked as completed yet. Please complete ${tasks.length > 1 ? "them" : "it"} ASAP and mark as done.`;

  // Group tasks by property
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    const p = t.property;
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(t);
  }
  const propCount = Object.keys(grouped).length;

  let taskSections = "";
  for (const [prop, propTasks] of Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))) {
    let rows = "";
    for (const t of propTasks) {
      rows += `<tr>
        <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px; color:#6b7280;">${t.payment_type || "—"}</td>
        <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px;">${t.description}</td>
      </tr>`;
    }
    taskSections += `
    <div style="margin-bottom:16px;">
      <div style="padding:8px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-bottom:none; border-radius:8px 8px 0 0; font-weight:700; font-size:14px; color:#1e293b;">
        ${prop === "ALL" ? "🏢 All Properties" : prop}
      </div>
      <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 8px 8px; overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:6px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; width:140px;">Type</th>
            <th style="padding:6px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Task</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto;">
  <div style="background:${headerColor}; color:#fff; padding:16px 20px; border-radius:10px 10px 0 0;">
    <h2 style="margin:0; font-size:18px;">${headerIcon} ${headerText}</h2>
  </div>
  <div style="padding:20px; background:#f9fafb; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 10px 10px;">
    <p style="font-size:14px; color:#374151; margin:0 0 16px 0;">Hi ${recipientName.split(" ")[0]},</p>
    <p style="font-size:14px; color:#374151; margin:0 0 16px 0;">${introText.replace("tomorrow", `tomorrow across <strong>${propCount}</strong> properties`)}</p>

    ${taskSections}

    <div style="margin-top:20px; padding:14px 16px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;">
      <p style="font-size:13px; color:#1e40af; margin:0 0 8px 0; font-weight:600;">✅ How to mark tasks as completed:</p>
      <ul style="margin:0; padding-left:18px; font-size:13px; color:#1e40af;">
        <li style="margin-bottom:4px;"><strong>Reply to this email</strong> — just list which tasks you completed and I'll mark them done for you.</li>
        <li style="margin-bottom:4px;"><strong>Use the dashboard</strong> — <a href="${CALENDAR_URL}" style="color:#2563eb;">Open Calendars & Tasks</a> and check off the completed tasks directly.</li>
      </ul>
    </div>
  </div>
  ${EMAIL_SIGNATURE}
</div>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let mode: "upcoming" | "pastdue" | "escalation" = "upcoming";
    try {
      const body = await req.json();
      if (body.mode === "pastdue") mode = "pastdue";
      if (body.mode === "escalation") mode = "escalation";
    } catch {
      // Default to upcoming if no body
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SB_SERVICE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch all active (non-terminated) tasks
    const { data: tasks, error: taskErr } = await sb
      .from("calendar_tasks")
      .select("id, property, payment_type, description, cadence, day_of_month, due_month, team, status, due_date")
      .neq("status", "Terminated");

    if (taskErr) throw new Error(`Task fetch error: ${taskErr.message}`);

    // Fetch team roster from app_users
    const { data: users, error: userErr } = await sb
      .from("app_users")
      .select("display_name, email, team")
      .not("team", "is", null);

    if (userErr) throw new Error(`User fetch error: ${userErr.message}`);

    // Build team → members map
    const teamRoster: Record<string, TeamMember[]> = {};
    for (const u of users || []) {
      if (!u.team) continue;
      const teams = u.team.split(",").map((t: string) => t.trim()).filter(Boolean);
      for (const t of teams) {
        if (!teamRoster[t]) teamRoster[t] = [];
        teamRoster[t].push({ display_name: u.display_name || u.email.split("@")[0], email: u.email, team: t });
      }
    }

    // ── ESCALATION MODE ──
    // Scans the last 30 days for tasks that are 2+ days past due and NOT Done.
    // Sends a single summary email to Morris (mz@firstmilecap.com) across all teams.
    if (mode === "escalation") {
      const ESCALATION_RECIPIENTS = [
        { email: "mz@firstmilecap.com", name: "Morris Zeitouni" },
        { email: "rz@firstmilecap.com", name: "Rasheq Zarif" },
      ];
      const today = getETDate(0);

      // Check each of the last 30 days (from 2 days ago to 31 days ago)
      interface OverdueItem { task: Task; dueDate: { year: number; month: number; day: number; dateStr: string }; daysLate: number; teamName: string; }
      const overdueItems: OverdueItem[] = [];

      for (let offset = -2; offset >= -31; offset--) {
        const checkDate = getETDate(offset);
        const daysLate = Math.abs(offset);
        for (const t of (tasks || []) as Task[]) {
          if (t.status === "Done") continue;
          if (taskIsDueOnDate(t, checkDate.year, checkDate.month, checkDate.day)) {
            // Avoid duplicates (a recurring task could match multiple days only if it's the same task id)
            if (!overdueItems.some(o => o.task.id === t.id && o.dueDate.dateStr === checkDate.dateStr)) {
              overdueItems.push({ task: t, dueDate: checkDate, daysLate, teamName: t.team || "Unassigned" });
            }
          }
        }
      }

      if (overdueItems.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No escalation items (nothing 2+ days past due).", emailsSent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Group by team, then by property
      const byTeam: Record<string, OverdueItem[]> = {};
      for (const item of overdueItems) {
        const teams = item.teamName.split(",").map(t => t.trim()).filter(Boolean);
        for (const team of teams) {
          if (!byTeam[team]) byTeam[team] = [];
          // Dedupe within team
          if (!byTeam[team].some(o => o.task.id === item.task.id && o.dueDate.dateStr === item.dueDate.dateStr)) {
            byTeam[team].push(item);
          }
        }
      }

      // Build escalation email HTML
      let teamSections = "";
      for (const [team, items] of Object.entries(byTeam).sort((a, b) => a[0].localeCompare(b[0]))) {
        // Group items by property within each team
        const byProp: Record<string, OverdueItem[]> = {};
        for (const item of items) {
          const p = item.task.property;
          if (!byProp[p]) byProp[p] = [];
          byProp[p].push(item);
        }

        let propSections = "";
        for (const [prop, propItems] of Object.entries(byProp).sort((a, b) => a[0].localeCompare(b[0]))) {
          let rows = "";
          for (const item of propItems.sort((a, b) => b.daysLate - a.daysLate)) {
            const urgencyColor = item.daysLate >= 7 ? "#dc2626" : item.daysLate >= 4 ? "#ea580c" : "#d97706";
            rows += `<tr>
              <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px;">${item.task.description}</td>
              <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px; color:#6b7280;">${item.task.payment_type || "—"}</td>
              <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px; white-space:nowrap;">${item.dueDate.dateStr.replace(/,\s*\d{4}$/, "")}</td>
              <td style="padding:8px 14px; border-bottom:1px solid #f0f0f0; font-size:13px; font-weight:700; color:${urgencyColor};">${item.daysLate}d late</td>
            </tr>`;
          }
          propSections += `
          <div style="margin-bottom:10px;">
            <div style="padding:6px 14px; background:#fef2f2; border:1px solid #fecaca; border-bottom:none; border-radius:6px 6px 0 0; font-weight:600; font-size:13px; color:#991b1b;">
              ${prop === "ALL" ? "All Properties" : prop}
            </div>
            <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #fecaca; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;">
              <thead>
                <tr style="background:#fef7f7;">
                  <th style="padding:5px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase;">Task</th>
                  <th style="padding:5px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; width:100px;">Type</th>
                  <th style="padding:5px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; width:100px;">Due Date</th>
                  <th style="padding:5px 14px; text-align:left; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; width:70px;">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        }

        const teamMembers = teamRoster[team] || [];
        const memberNames = teamMembers.map(m => m.display_name.split(" ")[0]).join(", ") || "No members assigned";

        teamSections += `
        <div style="margin-bottom:20px;">
          <div style="padding:10px 14px; background:#1e293b; color:#fff; border-radius:8px 8px 0 0; font-weight:700; font-size:14px;">
            ${team} Team <span style="font-weight:400; font-size:12px; opacity:0.7;">(${memberNames})</span>
            <span style="float:right; font-size:12px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:10px;">${items.length} overdue</span>
          </div>
          <div style="padding:12px; background:#fff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 8px 8px;">
            ${propSections}
          </div>
        </div>`;
      }

      const escalationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background:#991b1b; color:#fff; padding:16px 20px; border-radius:10px 10px 0 0;">
          <h2 style="margin:0; font-size:18px;">🚨 Escalation — ${overdueItems.length} Tasks Past Due (2+ Days)</h2>
        </div>
        <div style="padding:20px; background:#f9fafb; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 10px 10px;">
          <p style="font-size:14px; color:#374151; margin:0 0 4px 0;">Hi Morris,</p>
          <p style="font-size:14px; color:#374151; margin:0 0 16px 0;">The following tasks are <strong>2 or more days past their deadline</strong> and have not been marked as completed. They are grouped by responsible team.</p>
          ${teamSections}
          <div style="margin-top:16px; padding:12px 16px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;">
            <p style="font-size:13px; color:#1e40af; margin:0;">
              <a href="${CALENDAR_URL}" style="color:#2563eb; font-weight:600;">Open Calendars & Tasks</a> to review and follow up with your teams.
            </p>
          </div>
        </div>
        ${EMAIL_SIGNATURE}
      </div>`;

      const token = await getGraphToken();
      const subject = `🚨 ${overdueItems.length} Tasks Past Due — Escalation Summary`;
      let escalationSent = 0;

      for (const recipient of ESCALATION_RECIPIENTS) {
        // Personalize greeting
        const personalizedHtml = escalationHtml.replace("Hi Morris,", `Hi ${recipient.name.split(" ")[0]},`);
        try {
          await sendEmail(token, recipient.email, subject, personalizedHtml);
          escalationSent++;
        } catch (e) {
          console.error(`Escalation send failed for ${recipient.email}: ${e.message}`);
        }
      }

      await sb.from("email_sent_log").insert({
        to_addresses: ESCALATION_RECIPIENTS.map(r => ({ email: r.email, name: r.name })),
        subject,
        body_html: `[escalation] ${overdueItems.length} tasks across ${Object.keys(byTeam).length} teams`,
        sent_by: "task-reminders-cron",
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          mode: "escalation",
          overdueCount: overdueItems.length,
          teamCount: Object.keys(byTeam).length,
          emailsSent: escalationSent,
          sentTo: ESCALATION_RECIPIENTS.map(r => r.email),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPCOMING / PASTDUE MODE ──
    // upcoming: tasks due TOMORROW
    // pastdue: tasks that were due YESTERDAY
    const targetDate = mode === "upcoming" ? getETDate(1) : getETDate(-1);

    // Filter tasks due on target date that are not Done
    const dueTasks = ((tasks || []) as Task[]).filter((t: Task) =>
      t.status !== "Done" && taskIsDueOnDate(t, targetDate.year, targetDate.month, targetDate.day)
    );

    if (dueTasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: `No ${mode} tasks for ${targetDate.dateStr}. No emails sent.`, emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map each task to its team members
    // Then group: email → { member, tasks[] }
    const emailMap: Record<string, { name: string; tasks: Task[] }> = {};

    for (const task of dueTasks) {
      const taskTeams = (task.team || "").split(",").map((t: string) => t.trim()).filter(Boolean);
      const recipients: TeamMember[] = [];

      for (const t of taskTeams) {
        const members = teamRoster[t] || [];
        for (const m of members) {
          if (!recipients.some(r => r.email === m.email)) {
            recipients.push(m);
          }
        }
      }

      // If no team members found, fall back to Executive team
      if (recipients.length === 0) {
        const execs = teamRoster["Executive"] || [];
        for (const m of execs) {
          if (!recipients.some(r => r.email === m.email)) {
            recipients.push(m);
          }
        }
      }

      for (const r of recipients) {
        if (!emailMap[r.email]) {
          emailMap[r.email] = { name: r.display_name, tasks: [] };
        }
        if (!emailMap[r.email].tasks.some(t => t.id === task.id)) {
          emailMap[r.email].tasks.push(task);
        }
      }
    }

    // Send one email per person
    const token = await getGraphToken();
    let emailsSent = 0;
    const results: string[] = [];

    for (const [email, data] of Object.entries(emailMap)) {
      const subject = mode === "upcoming"
        ? `📋 ${data.tasks.length} Task${data.tasks.length > 1 ? "s" : ""} Due Tomorrow — ${targetDate.dateStr}`
        : `⚠️ ${data.tasks.length} Past Due Task${data.tasks.length > 1 ? "s" : ""} — Were Due ${targetDate.dateStr}`;

      const html = buildEmailHtml(data.name, data.tasks, mode, targetDate.dateStr);

      try {
        await sendEmail(token, email, subject, html);
        emailsSent++;
        results.push(`✓ ${email} (${data.tasks.length} tasks)`);
      } catch (e) {
        results.push(`✗ ${email}: ${e.message}`);
      }
    }

    // Log to email_sent_log
    for (const [email, data] of Object.entries(emailMap)) {
      await sb.from("email_sent_log").insert({
        to_addresses: [{ email, name: data.name }],
        subject: mode === "upcoming"
          ? `Task Reminder: ${data.tasks.length} due tomorrow`
          : `Past Due: ${data.tasks.length} tasks overdue`,
        body_html: `[${mode}] ${data.tasks.map(t => t.property + ": " + t.description.substring(0, 50)).join("; ")}`,
        sent_by: "task-reminders-cron",
      }).catch(() => {}); // Don't fail on log errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        targetDate: targetDate.dateStr,
        tasksFound: dueTasks.length,
        emailsSent,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("task-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
