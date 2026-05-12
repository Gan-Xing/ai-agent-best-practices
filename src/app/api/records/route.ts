import { createRecord, listRecords } from "@/lib/records";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const items = await listRecords({
      limit: searchParams.get("limit") ?? undefined,
      categoryCode: searchParams.get("categoryCode") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    return Response.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await createRecord(body);

    return Response.json(
      {
        ok: true,
        record,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
