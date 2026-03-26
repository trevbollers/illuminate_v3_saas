/**
 * Platform-level SMS sending service.
 *
 * Supports Twilio and AWS SNS. The provider is determined by environment
 * variables — no tenant configuration needed. SDKs are lazily imported
 * so the build doesn't break if they're not installed yet.
 *
 * Environment variables:
 *
 * Twilio:
 *   TWILIO_ACCOUNT_SID   — Account SID
 *   TWILIO_AUTH_TOKEN     — Auth token
 *   TWILIO_FROM_NUMBER    — Sender phone number (E.164 format)
 *
 * AWS SNS:
 *   AWS_ACCESS_KEY_ID     — (or use IAM role)
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_SMS_REGION        — e.g. "us-east-1"
 *   AWS_SNS_SENDER_ID     — Optional sender ID (e.g. "GoPart")
 */

export interface SendSMSOptions {
  /** Recipient phone number in E.164 format (e.g., +15551234567). */
  to: string;
  /** Message body (max ~160 chars for a single segment). */
  body: string;
}

export interface SendSMSResult {
  success: boolean;
  provider: "twilio" | "aws_sns";
  messageId?: string;
  error?: string;
}

/**
 * Detect which SMS provider is configured based on environment variables.
 * Returns "twilio", "aws_sns", or null if neither is configured.
 */
export function detectSMSProvider(): "twilio" | "aws_sns" | null {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    return "twilio";
  }

  if (
    process.env.AWS_SMS_REGION &&
    (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN)
  ) {
    return "aws_sns";
  }

  return null;
}

/**
 * Normalize a phone number to E.164 format.
 * Handles common US inputs: (555) 123-4567, 555-123-4567, 5551234567
 */
export function normalizePhone(phone: string): string {
  // Strip everything that isn't a digit or leading +
  const digits = phone.replace(/[^\d+]/g, "");

  // Already E.164
  if (digits.startsWith("+")) return digits;

  // US 10-digit
  if (digits.length === 10) return `+1${digits}`;

  // US 11-digit (starts with 1)
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Return as-is with + prefix
  return `+${digits}`;
}

/**
 * Send an SMS using the configured platform provider.
 * Throws if no provider is configured.
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  const provider = detectSMSProvider();

  if (!provider) {
    return {
      success: false,
      provider: "twilio", // default label
      error: "No SMS provider configured. Set TWILIO_* or AWS_SMS_* environment variables.",
    };
  }

  const to = normalizePhone(options.to);

  if (provider === "twilio") {
    return sendViaTwilio(to, options.body);
  }

  return sendViaAWSSNS(to, options.body);
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

async function sendViaTwilio(to: string, body: string): Promise<SendSMSResult> {
  try {
    // Lazy import — twilio may not be installed in all environments
    const twilio = await import("twilio");
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    const message = await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER!,
      body,
    });

    return {
      success: true,
      provider: "twilio",
      messageId: message.sid,
    };
  } catch (err: any) {
    console.error("[SMS/Twilio] Failed to send:", err);
    return {
      success: false,
      provider: "twilio",
      error: err.message || "Twilio send failed",
    };
  }
}

// ---------------------------------------------------------------------------
// AWS SNS
// ---------------------------------------------------------------------------

async function sendViaAWSSNS(to: string, body: string): Promise<SendSMSResult> {
  try {
    const { SNSClient, PublishCommand } = await import("@aws-sdk/client-sns");

    const client = new SNSClient({
      region: process.env.AWS_SMS_REGION || "us-east-1",
    });

    const params: any = {
      PhoneNumber: to,
      Message: body,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    };

    if (process.env.AWS_SNS_SENDER_ID) {
      params.MessageAttributes["AWS.SNS.SMS.SenderID"] = {
        DataType: "String",
        StringValue: process.env.AWS_SNS_SENDER_ID,
      };
    }

    const result = await client.send(new PublishCommand(params));

    return {
      success: true,
      provider: "aws_sns",
      messageId: result.MessageId,
    };
  } catch (err: any) {
    console.error("[SMS/AWS-SNS] Failed to send:", err);
    return {
      success: false,
      provider: "aws_sns",
      error: err.message || "AWS SNS send failed",
    };
  }
}
