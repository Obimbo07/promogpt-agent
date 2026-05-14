import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { logApiEvent } from "@/lib/observability/request-context";

/**
 * Stripe webhook — verify signatures and sync `billing_*` tables using the service role.
 * @see https://docs.stripe.com/webhooks/signature
 */

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 501 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logApiEvent({
      event: "stripe.webhook_signature_failed",
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;

        if (!orgId) {
          break;
        }

        if (typeof session.customer === "string" && session.customer) {
          await admin.from("billing_customers").upsert({
            organization_id: orgId,
            stripe_customer_id: session.customer,
          });
        }

        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(admin, orgId, sub);
        }

        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organization_id;

        if (!orgId) {
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const { data: row } = await admin
            .from("billing_customers")
            .select("organization_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (!row?.organization_id) {
            break;
          }

          await upsertSubscription(admin, row.organization_id, sub);
        } else {
          await upsertSubscription(admin, orgId, sub);
        }

        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from("billing_subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logApiEvent({
      event: "stripe.webhook_handler_failed",
      type: event.type,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  sub: Stripe.Subscription
) {
  const priceId = sub.items.data[0]?.price?.id;

  const cpeRaw = subscriptionPeriodEndUnix(sub);

  await admin.from("billing_subscriptions").upsert(
    {
      organization_id: organizationId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId ?? null,
      status: sub.status,
      current_period_end: cpeRaw ? new Date(cpeRaw * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

function subscriptionPeriodEndUnix(sub: Stripe.Subscription) {
  const raw = (
    sub as unknown as {
      current_period_end?: number | null;
    }
  ).current_period_end;

  return typeof raw === "number" ? raw : null;
}
