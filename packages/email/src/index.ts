export { getResendClient } from "./client";
export { sendEmail, type SendEmailOptions, type SendEmailResult } from "./send";

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
