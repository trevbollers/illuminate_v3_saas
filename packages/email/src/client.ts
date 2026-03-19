import { Resend } from "resend";

let resendInstance: Resend | null = null;

/**
 * Returns a singleton Resend client instance.
 * Requires the RESEND_API_KEY environment variable to be set.
 */
export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. " +
          "Please set it before sending emails.",
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}
