import { NextResponse } from "next/server";
import { processDue } from "@/lib/game";

/** Scheduled job: process every round whose deadline has passed. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const done = await processDue();
  return NextResponse.json({ processed: done });
}
