import type { NotificationType } from "@doerai/shared";
import type { EmailTemplateData, RenderedEmail, DigestPayload, DigestEntry } from "@doerai/shared";

// ─── HTML Email Wrapper ────────────────────────────────────────────────────────

function emailShell(opts: {
  title: string;
  bodyHtml: string;
  actionUrl?: string;
  actionLabel?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; }
  .container { max-width: 560px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; margin-bottom: 16px; }
  .header { text-align: center; padding: 24px 0 8px; }
  .header img { height: 32px; }
  .header h2 { font-size: 18px; color: #71717a; font-weight: 500; margin: 8px 0 0; }
  .title { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #18181b; }
  .body { font-size: 15px; line-height: 1.6; color: #3f3f46; }
  .btn { display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 20px 0; }
  .footer { text-align: center; padding: 16px 0; font-size: 12px; color: #a1a1aa; }
  .footer a { color: #a1a1aa; text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h2>Doer</h2>
  </div>
  <div class="card">
    <div class="title">${opts.title}</div>
    <div class="body">${opts.bodyHtml}</div>
    ${opts.actionUrl ? `<a href="${opts.actionUrl}" class="btn">${opts.actionLabel ?? "View in Doer"}</a>` : ""}
  </div>
  <div class="footer">
    <p>You're receiving this email because you have notifications enabled in Doer.</p>
    ${opts.preferencesUrl ? `<p><a href="${opts.preferencesUrl}">Notification Preferences</a>` : ""}
    ${opts.unsubscribeUrl ? ` &middot; <a href="${opts.unsubscribeUrl}">Unsubscribe</a></p>` : ""}
  </div>
</div>
</body>
</html>`;
}

function plainTextBody(body: string, actionUrl?: string): string {
  let text = body.replace(/<[^>]+>/g, "");
  if (actionUrl) text += `\n\nView in Doer: ${actionUrl}`;
  text += "\n\n---\nYou're receiving this email because you have notifications enabled in Doer.";
  return text;
}

// ─── Per-Type Templates ───────────────────────────────────────────────────────

const templateConfig: Record<
  NotificationType,
  { subject: (d: EmailTemplateData) => string; bodyHtml: (d: EmailTemplateData) => string; actionLabel: string }
> = {
  task_assigned: {
    subject: (d) => `New task assigned: ${d.title}`,
    bodyHtml: (d) => `
      <p>Hi ${d.recipientName},</p>
      <p>You've been assigned a new task:</p>
      <p><strong>${d.title}</strong></p>
      <p>${d.body}</p>
      ${d.companyName ? `<p><em>Workspace: ${d.companyName}</em></p>` : ""}
    `,
    actionLabel: "View Task",
  },
  task_completed: {
    subject: (d) => `Task completed: ${d.title}`,
    bodyHtml: (d) => `
      <p>Hi ${d.recipientName},</p>
      <p>A task has been marked as completed:</p>
      <p><strong>${d.title}</strong></p>
      <p>${d.body}</p>
      ${d.companyName ? `<p><em>Workspace: ${d.companyName}</em></p>` : ""}
    `,
    actionLabel: "Review Task",
  },
  comment_mention: {
    subject: (d) => `You were mentioned: ${d.title}`,
    bodyHtml: (d) => `
      <p>Hi ${d.recipientName},</p>
      <p>You were mentioned in a comment:</p>
      <p><strong>${d.title}</strong></p>
      <blockquote style="border-left: 3px solid #e4e4e7; padding-left: 12px; margin: 12px 0; color: #71717a;">${d.body}</blockquote>
    `,
    actionLabel: "View Comment",
  },
  blocker_flagged: {
    subject: (d) => `Blocker flagged: ${d.title}`,
    bodyHtml: (d) => `
      <p>Hi ${d.recipientName},</p>
      <p>A blocker has been flagged on a task:</p>
      <p><strong>${d.title}</strong></p>
      <p>${d.body}</p>
      <p style="color: #dc2626; font-weight: 600;">This task cannot proceed until the blocker is resolved.</p>
    `,
    actionLabel: "View Blocker",
  },
  deadline_approaching: {
    subject: (d) => `Deadline approaching: ${d.title}`,
    bodyHtml: (d) => `
      <p>Hi ${d.recipientName},</p>
      <p>A task deadline is approaching:</p>
      <p><strong>${d.title}</strong></p>
      <p>${d.body}</p>
      <p style="color: #ea580c; font-weight: 600;">Please review and take action if needed.</p>
    `,
    actionLabel: "View Task",
  },
};

// ─── Render Functions ──────────────────────────────────────────────────────────

export function renderNotificationEmail(
  type: NotificationType,
  data: EmailTemplateData,
): RenderedEmail {
  const config = templateConfig[type];
  const subject = config.subject(data);
  const bodyHtml = config.bodyHtml(data);
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml,
      actionUrl: data.actionUrl,
      actionLabel: config.actionLabel,
      unsubscribeUrl: data.unsubscribeUrl,
      preferencesUrl: data.preferencesUrl,
    }),
    text: plainTextBody(bodyHtml, data.actionUrl),
  };
}

export function renderDigestEmail(payload: DigestPayload): RenderedEmail {
  const subject = `${payload.digestType === "daily" ? "Daily" : "Weekly"} digest — ${payload.entries.length} notification${payload.entries.length === 1 ? "" : "s"}`;
  const entriesHtml = payload.entries
    .map(
      (e: DigestEntry) => `
      <div style="border-bottom: 1px solid #e4e4e7; padding: 12px 0;">
        <div style="font-weight: 600; font-size: 14px; color: #18181b;">${e.title}</div>
        <div style="font-size: 13px; color: #71717a; margin-top: 4px;">${e.body}</div>
      </div>`,
    )
    .join("");
  const bodyHtml = `
    <p>Hi ${payload.recipientName},</p>
    <p>Here's your ${payload.digestType} digest for <strong>${payload.companyName}</strong>:</p>
    ${entriesHtml}
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml,
      unsubscribeUrl: payload.unsubscribeUrl,
      preferencesUrl: payload.preferencesUrl,
    }),
    text: plainTextBody(bodyHtml),
  };
}

export function renderTestEmail(to: string): RenderedEmail {
  return {
    subject: "Doer email test — notifications are working!",
    html: emailShell({
      title: "Test Email",
      bodyHtml: `<p>This is a test email from Doer. If you're reading this, your email notification configuration is working correctly.</p><p>Recipient: ${to}</p>`,
    }),
    text: "This is a test email from Doer. If you're reading this, your email notification configuration is working correctly.",
  };
}
