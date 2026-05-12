import { toErrorResponse } from "@/lib/errors";
import { listImportJobs, runImportJob } from "@/lib/imports";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runImportJob(body);

    return Response.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
