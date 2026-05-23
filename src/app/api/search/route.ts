import { searchRecords } from "@/lib/search";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await searchRecords({
      q: searchParams.get("q") ?? undefined,
      locale: searchParams.get("locale") ?? undefined,
      categoryCode: searchParams.get("categoryCode") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
