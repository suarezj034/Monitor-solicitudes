import { NextResponse } from "next/server";
import { loadData } from "@/lib/storage";
import type { DataPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadData();
  const payload: DataPayload = data ?? { actualizado: null, total: 0, filas: [] };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
