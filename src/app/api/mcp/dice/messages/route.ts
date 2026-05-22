import {
  getDiceMcpClient,
  handleDiceMcpRequest,
} from "@/lib/mcp-dice-sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asJsonRpcRequests(payload: unknown) {
  return Array.isArray(payload) ? payload : [payload];
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const client = getDiceMcpClient(sessionId);

  if (!sessionId || !client) {
    return Response.json(
      {
        ok: false,
        error: "Unknown or expired MCP SSE session.",
      },
      { status: 404 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid JSON-RPC payload.",
      },
      { status: 400 },
    );
  }

  for (const item of asJsonRpcRequests(payload)) {
    const response = handleDiceMcpRequest(item);

    if (response) {
      client.send("message", response);
    }
  }

  return new Response(null, { status: 202 });
}
