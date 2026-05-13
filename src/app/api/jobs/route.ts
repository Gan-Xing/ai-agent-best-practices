import { toErrorResponse } from "@/lib/errors";
import { listImportJobs } from "@/lib/imports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobs = await listImportJobs({
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sourceType: searchParams.get("sourceType") ?? undefined,
    });

    return Response.json({
      ok: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
