import { registerDiceMcpClient } from "@/lib/mcp-dice-sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function encodeSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request) {
  const sessionId = crypto.randomUUID();
  const endpoint = `/api/mcp/dice/messages?sessionId=${sessionId}`;
  let closeConnection = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let cleanedUp = false;
      const client = {
        send(event: string, data: unknown) {
          controller.enqueue(encodeSse(event, data));
        },
        close() {
          try {
            controller.close();
          } catch {
            // The client may have already disconnected.
          }
        },
      };
      const cleanup = registerDiceMcpClient(sessionId, client);
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15_000);
      closeConnection = () => {
        if (cleanedUp) {
          return;
        }

        cleanedUp = true;
        clearInterval(keepAlive);
        cleanup();
      };

      controller.enqueue(encodeSse("endpoint", endpoint));

      request.signal.addEventListener(
        "abort",
        closeConnection,
        { once: true },
      );
    },
    cancel() {
      closeConnection();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
