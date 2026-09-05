import nodemailer from "nodemailer";
import type { Config } from "../config.js";
import type { RenderedEmail } from "@doerai/shared";

export interface SendEmailInput {
  to: string;
  rendered: RenderedEmail;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ messageId: string }>;
}

// ─── SMTP Provider ────────────────────────────────────────────────────────────

function createSmtpProvider(config: Config): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });

  return {
    async send(input: SendEmailInput) {
      const info = await transporter.sendMail({
        from: config.smtpFrom,
        to: input.to,
        subject: input.rendered.subject,
        html: input.rendered.html,
        text: input.rendered.text,
      });
      return { messageId: info.messageId };
    },
  };
}

// ─── SendGrid Provider ─────────────────────────────────────────────────────────

function createSendGridProvider(config: Config): EmailProvider {
  const apiKey = config.sendgridApiKey!;
  return {
    async send(input: SendEmailInput) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: config.smtpFrom },
          subject: input.rendered.subject,
          content: [
            { type: "text/plain", value: input.rendered.text },
            { type: "text/html", value: input.rendered.html },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SendGrid error ${res.status}: ${errText}`);
      }
      const messageId = res.headers.get("x-message-id") ?? "sendgrid-" + Date.now();
      return { messageId };
    },
  };
}

// ─── Resend Provider ───────────────────────────────────────────────────────────

function createResendProvider(config: Config): EmailProvider {
  const apiKey = config.resendApiKey!;
  return {
    async send(input: SendEmailInput) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.smtpFrom,
          to: [input.to],
          subject: input.rendered.subject,
          html: input.rendered.html,
          text: input.rendered.text,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend error ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as { id?: string };
      return { messageId: data.id ?? "resend-" + Date.now() };
    },
  };
}

// ─── Mailgun Provider ───────────────────────────────────────────────────────────

function createMailgunProvider(config: Config): EmailProvider {
  const apiKey = config.mailgunApiKey!;
  const domain = config.mailgunDomain!;
  const region = config.mailgunRegion ?? "us";
  const baseUrl =
    region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  return {
    async send(input: SendEmailInput) {
      const res = await fetch(`${baseUrl}/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        },
        body: new URLSearchParams({
          from: config.smtpFrom,
          to: input.to,
          subject: input.rendered.subject,
          html: input.rendered.html,
          text: input.rendered.text,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Mailgun error ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as { id?: string };
      return { messageId: data.id ?? "mailgun-" + Date.now() };
    },
  };
}

// ─── Console Provider (fallback when no provider configured) ───────────────────

function createConsoleProvider(): EmailProvider {
  return {
    async send(input: SendEmailInput) {
      console.log(
        `\n[DOER EMAIL — no provider configured]\nTo: ${input.to}\nSubject: ${input.rendered.subject}\n${input.rendered.text}\n`,
      );
      return { messageId: "console-" + Date.now() };
    },
  };
}

// ─── Factory ────────────────────────────────────────────────────────────────────

export function createEmailProvider(config: Config): EmailProvider {
  switch (config.emailProvider) {
    case "sendgrid":
      if (!config.sendgridApiKey) {
        console.warn("[DOER] SendGrid provider selected but DOER_SENDGRID_API_KEY not set — falling back to console");
        return createConsoleProvider();
      }
      return createSendGridProvider(config);
    case "resend":
      if (!config.resendApiKey) {
        console.warn("[DOER] Resend provider selected but DOER_RESEND_API_KEY not set — falling back to console");
        return createConsoleProvider();
      }
      return createResendProvider(config);
    case "mailgun":
      if (!config.mailgunApiKey || !config.mailgunDomain) {
        console.warn("[DOER] Mailgun provider selected but DOER_MAILGUN_API_KEY or DOER_MAILGUN_DOMAIN not set — falling back to console");
        return createConsoleProvider();
      }
      return createMailgunProvider(config);
    case "smtp":
    default:
      if (!config.smtpHost) {
        return createConsoleProvider();
      }
      return createSmtpProvider(config);
  }
}
