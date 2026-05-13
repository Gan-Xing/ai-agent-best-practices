import { toErrorResponse } from "@/lib/errors";
import { runImportJob } from "@/lib/imports";
import { listRecords } from "@/lib/records";

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
    const result = await runImportJob(body);
    const ok = result.job.status === "DONE";

    return Response.json(
      {
        ok,
        ...result,
      },
      { status: ok ? 200 : 422 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
