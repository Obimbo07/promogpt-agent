import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  organizationId: z.string().uuid(),
});

/**
 * Hosted Checkout session for SaaS subscriptions.
 * Mirrors pricing-and-revenue.md intent; Stripe Price IDs supplied via env per environment.
 */

export async function POST(request: Request) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID_PRO;

  if (!secretKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO)." },
      { status: 501 }
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      { error: "Server missing Supabase service role for billing writes." },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: membership, error: memErr } = await session.supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (memErr || !membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = new Stripe(secretKey);

  const { data: existing } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organization_id: parsed.data.organizationId },
    });
    customerId = customer.id;

    const { error: upsertErr } = await admin.from("billing_customers").upsert({
      organization_id: parsed.data.organizationId,
      stripe_customer_id: customerId,
    });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  const origin = new URL(request.url).origin;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancel`,
    metadata: {
      organization_id: parsed.data.organizationId,
    },
    subscription_data: {
      metadata: {
        organization_id: parsed.data.organizationId,
      },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
