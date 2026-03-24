import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/stripe/success
 * Stripe redirects here after successful checkout.
 * The webhook handles the actual subscription activation.
 * We just redirect to the inbox with a success flag.
 */
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${base}/inbox?subscribed=1`);
}
