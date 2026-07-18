import { NextResponse } from "next/server";

/** Liveness/readiness probe — no secrets, no database dependency. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "proguidance-portal",
    time: new Date().toISOString(),
  });
}
