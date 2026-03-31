export { getResendClient } from "./client";
export { sendEmail, type SendEmailOptions, type SendEmailResult } from "./send";
export {
  sendSMS,
  detectSMSProvider,
  normalizePhone,
  type SendSMSOptions,
  type SendSMSResult,
} from "./sms";

// Templates
export {
  WelcomeEmail,
  type WelcomeEmailProps,
} from "./templates/welcome";

export {
  VerifyEmail,
  type VerifyEmailProps,
} from "./templates/verify-email";

export {
  InviteEmail,
  type InviteEmailProps,
} from "./templates/invite";

export {
  PasswordResetEmail,
  type PasswordResetEmailProps,
} from "./templates/password-reset";

export {
  PaymentFailedEmail,
  type PaymentFailedEmailProps,
} from "./templates/payment-failed";

export {
  SubscriptionConfirmedEmail,
  type SubscriptionConfirmedEmailProps,
} from "./templates/subscription-confirmed";

export {
  TeamMessageEmail,
  type TeamMessageEmailProps,
} from "./templates/team-message";

export {
  LeagueAnnouncementEmail,
  type LeagueAnnouncementEmailProps,
} from "./templates/league-announcement";

export {
  OrderConfirmationEmail,
  type OrderConfirmationEmailProps,
} from "./templates/order-confirmation";

export {
  TryoutInviteEmail,
  type TryoutInviteEmailProps,
} from "./templates/tryout-invite";
