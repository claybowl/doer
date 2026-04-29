import nodemailer from "nodemailer";
import type { Config } from "../config.js";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export function createMailer(config: Config) {
  const hasSmtp = Boolean(config.smtpHost);

  async function sendMail(opts: MailOptions): Promise<void> {
    if (!hasSmtp) {
      console.log(
        `\n[DOER EMAIL - no SMTP configured]\nTo: ${opts.to}\nSubject: ${opts.subject}\n${opts.html.replace(/<[^>]+>/g, "")}\n`,
      );
      return;
    }
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    });
    await transporter.sendMail({
      from: config.smtpFrom,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }

  return { sendMail };
}

export type Mailer = ReturnType<typeof createMailer>;
