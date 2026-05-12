import { toErrorResponse } from "@/lib/errors";
import { getRecordBySlug } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const record = await getRecordBySlug(slug);

    return Response.json({
      ok: true,
      record,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
