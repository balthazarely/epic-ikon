import { NextRequest } from "next/server";
import resortLifts from "../../../../data/resort-lifts.json";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resort = (resortLifts as any[]).find((r) => r.id === id);
  if (!resort) return Response.json([], { status: 404 });
  return Response.json(resort.lifts);
}
