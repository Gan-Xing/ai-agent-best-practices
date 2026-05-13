import { toErrorResponse } from "@/lib/errors";
import { getImportJob } from "@/lib/imports";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const job = await getImportJob(jobId);

    return Response.json({
      ok: true,
      job,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
