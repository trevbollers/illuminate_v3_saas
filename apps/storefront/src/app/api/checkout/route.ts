export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import {
  connectTenantDB,
  connectPlatformDB,
  getOrgModels,
  Tenant,
} from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";
import { getTenantSlug } from "@/lib/get-tenant-slug";

// POST /api/checkout — create a Stripe Checkout Session + StorefrontOrder
export async function POST(req: NextRequest): Promise<NextResponse> {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const body = await req.json();
  const { items, customer, fulfillment } = body;

  // Validate customer
  if (!customer?.firstName?.trim() || !customer?.lastName?.trim() || !customer?.email?.trim()) {
    return NextResponse.json(
      { error: "Customer first name, last name, and email are required" },
      { status: 400 }
    );
  }

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Get tenant Stripe config
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug }).select("name settings").lean();
  if (!tenant) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const stripeConfig = getTenantStripeConfig(tenant.settings);
  if (!stripeConfig) {
    return NextResponse.json(
      { error: "This store has not configured payment processing yet" },
      { status: 400 }
    );
  }

  const stripe = getTenantStripe(stripeConfig.secretKey, slug);

  // Connect to org DB and validate products
  const conn = await connectTenantDB(slug, "organization");
  const { Product, StorefrontOrder } = getOrgModels(conn);

  // Resolve products and validate prices server-side
  const productIds = items.map((i: any) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  }).lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const validatedItems: any[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${item.productId}` },
        { status: 400 }
      );
    }

    // Calculate price with option adjustments
    let unitPrice = product.pricing.amount;
    const configOptions = item.configOptions || [];

    for (const opt of configOptions) {
      const productOption = product.options.find((o: any) => o.label === opt.label);
      if (productOption?.priceAdjustments) {
        const adj = productOption.priceAdjustments.find((a: any) => a.value === opt.value);
        if (adj) unitPrice += adj.amount;
      }
    }

    const quantity = Math.max(1, Math.floor(item.quantity || 1));
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    validatedItems.push({
      productId: new Types.ObjectId(item.productId),
      productName: product.name,
      category: product.category,
      quantity,
      unitPrice,
      configOptions,
      lineTotal,
    });
  }

  const taxRate = (tenant.settings as any)?.storefront?.taxRate ?? 0;
  const tax = taxRate > 0 ? Math.round(subtotal * (taxRate / 100)) : 0;
  const total = subtotal + tax;

  // Generate order number
  const orderNumber = `ORD-${slug.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;

  // Create order in DB (pending payment)
  const order = await StorefrontOrder.create({
    orderNumber,
    customer: {
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      email: customer.email.trim(),
      phone: customer.phone?.trim() || undefined,
    },
    items: validatedItems,
    subtotal,
    tax,
    total,
    fulfillment: {
      method: fulfillment?.method || "pickup",
      address: fulfillment?.method === "ship" ? fulfillment.address : undefined,
      status: "pending",
    },
    paymentStatus: "pending",
  });

  // Create Stripe Checkout Session
  const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL
    || `https://${slug}.goparticipate.com`;

  const lineItems = validatedItems.map((item: any) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.productName,
        description: item.configOptions.length
          ? item.configOptions.map((o: any) => `${o.label}: ${o.value}`).join(", ")
          : undefined,
      },
      unit_amount: item.unitPrice, // already in cents
    },
    quantity: item.quantity,
  }));

  // Add tax as a line item
  if (tax > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: (tenant.settings as any)?.storefront?.taxLabel || "Tax",
          description: undefined,
        },
        unit_amount: tax,
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email.trim(),
      success_url: `${baseUrl}/orders/${order._id}?success=true`,
      cancel_url: `${baseUrl}/cart?canceled=true`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber,
        tenantSlug: slug,
      },
    });

    // Store session ID on order
    await StorefrontOrder.findByIdAndUpdate(order._id, {
      stripeSessionId: session.id,
    });

    return NextResponse.json({
      sessionUrl: session.url,
      orderId: order._id.toString(),
      orderNumber,
    });
  } catch (err) {
    // If Stripe fails, mark order as failed
    await StorefrontOrder.findByIdAndUpdate(order._id, {
      paymentStatus: "failed",
    });

    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
