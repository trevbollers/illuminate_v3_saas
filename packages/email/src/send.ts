import type React from "react";
import { getResendClient } from "./client";

export interface SendEmailOptions {
  /** Recipient email address(es). */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** React Email template component. Either `react`, `html`, or `text` must be provided. */
  react?: React.ReactElement;
  /** Raw HTML body. Use when you don't have a React Email template handy. */
  html?: string;
  /** Plain-text body. */
  text?: string;
  /** Sender address. Defaults to RESEND_FROM_EMAIL env var or a fallback. */
  from?: string;
  /** Reply-to address. */
  replyTo?: string;
  /** BCC recipients. */
  bcc?: string | string[];
  /** CC recipients. */
  cc?: string | string[];
}

export interface SendEmailResult {
  id: string;
}

/**
 * Sends an email using the Resend API with a React Email template.
 *
 * @example
 * ```ts
 * import { sendEmail } from "@goparticipate/email";
 * import { WelcomeEmail } from "@goparticipate/email/templates/welcome";
 *
 * await sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome to Go Participate!",
 *   react: WelcomeEmail({ name: "Jane", verifyUrl: "https://..." }),
 * });
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const resend = getResendClient();

  const from =
    options.from ??
    process.env.RESEND_FROM_EMAIL ??
    "Go Participate <noreply@goparticipate.app>";

  if (!options.react && !options.html && !options.text) {
    throw new Error("sendEmail: one of `react`, `html`, or `text` must be provided");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    react: options.react,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
    bcc: options.bcc,
    cc: options.cc,
  } as any);

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data!.id };
}
