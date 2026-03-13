import { NextRequest } from "next/server";
import resortTrails from "../../../../data/resort-runs.json";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resort = (resortTrails as any[]).find((r) => r.id === id);
  if (!resort) return Response.json([], { status: 404 });
  return Response.json(resort.runs);
}
