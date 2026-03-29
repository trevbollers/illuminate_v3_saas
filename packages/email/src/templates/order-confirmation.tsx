import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  /** Pre-formatted items list: [{name, quantity, unitPrice, lineTotal}] — prices in dollars. */
  items: {
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    options?: string;
  }[];
  subtotal: string;
  tax: string;
  total: string;
  fulfillmentMethod: "ship" | "pickup";
  /** URL to view the order status page. */
  orderUrl: string;
  storeName: string;
}

export function OrderConfirmationEmail({
  customerName,
  orderNumber,
  items,
  subtotal,
  tax,
  total,
  fulfillmentMethod,
  orderUrl,
  storeName,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Img
            src="https://goparticipate.app/logo.png"
            width="140"
            height="40"
            alt="Go Participate"
            style={logo}
          />

          <Text style={heading}>Order Confirmed!</Text>

          <Text style={paragraph}>Hi {customerName},</Text>

          <Text style={paragraph}>
            Thank you for your order from <strong>{storeName}</strong>. Your
            payment has been received and your order is being processed.
          </Text>

          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Order Number:</strong> {orderNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Fulfillment:</strong>{" "}
              {fulfillmentMethod === "ship"
                ? "Shipping to your address"
                : "Pick up at practice"}
            </Text>
          </Section>

          <Text style={sectionHeading}>Items</Text>

          {items.map((item, idx) => (
            <Section key={idx} style={itemRow}>
              <Text style={itemName}>
                {item.name} × {item.quantity}
              </Text>
              {item.options && (
                <Text style={itemOptions}>{item.options}</Text>
              )}
              <Text style={itemPrice}>{item.lineTotal}</Text>
            </Section>
          ))}

          <Hr style={hr} />

          <Section style={totalsBox}>
            <Text style={totalRow}>
              Subtotal: <strong>{subtotal}</strong>
            </Text>
            {tax !== "$0.00" && (
              <Text style={totalRow}>
                Tax: <strong>{tax}</strong>
              </Text>
            )}
            <Text style={grandTotal}>
              Total: <strong>{total}</strong>
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Link href={orderUrl} style={button}>
              View Order Status
            </Link>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions about your order, please contact{" "}
            <strong>{storeName}</strong> directly. This email was sent by{" "}
            <Link href="https://goparticipate.com" style={link}>
              Go Participate
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmationEmail;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const body: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "560px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const logo: React.CSSProperties = {
  margin: "0 auto 24px",
  display: "block",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const sectionHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "24px 0 12px",
};

const detailBox: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0 24px",
  border: "1px solid #bbf7d0",
};

const detailRow: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "4px 0",
};

const itemRow: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #f3f4f6",
};

const itemName: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  margin: "0",
};

const itemOptions: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "2px 0 0",
};

const itemPrice: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "2px 0 0",
  textAlign: "right" as const,
};

const totalsBox: React.CSSProperties = {
  textAlign: "right" as const,
  padding: "8px 0",
};

const totalRow: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  margin: "4px 0",
};

const grandTotal: React.CSSProperties = {
  fontSize: "16px",
  color: "#111827",
  margin: "8px 0 0",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

const link: React.CSSProperties = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#9ca3af",
};
