type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type SseClient = {
  send: (event: string, data: unknown) => void;
  close: () => void;
};

const globalForMcp = globalThis as typeof globalThis & {
  __aiAgentDiceMcpClients?: Map<string, SseClient>;
};

const clients =
  globalForMcp.__aiAgentDiceMcpClients ?? new Map<string, SseClient>();

globalForMcp.__aiAgentDiceMcpClients = clients;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function toInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function buildRollResult(args: Record<string, unknown> | null) {
  const expression =
    typeof args?.expression === "string" ? args.expression.trim() : "";
  const parsed = expression.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  const parsedDice = parsed ? Number(parsed[1]) : undefined;
  const parsedSides = parsed ? Number(parsed[2]) : undefined;
  const parsedModifier = parsed?.[3] ? Number(parsed[3]) : undefined;
  const dice = Math.min(toPositiveInteger(args?.dice ?? parsedDice, 2), 20);
  const sides = Math.min(toPositiveInteger(args?.sides ?? parsedSides, 4), 100);
  const modifier = toInteger(args?.modifier ?? parsedModifier, 1);
  const rolls = Array.from({ length: dice }, (_, index) => {
    return Math.min(sides, Math.floor((sides + 1) / 2) + index);
  });
  const total = rolls.reduce((sum, value) => sum + value, modifier);

  return {
    dice,
    sides,
    modifier,
    rolls,
    total,
    expression: `${dice}d${sides}${modifier >= 0 ? "+" : ""}${modifier}`,
  };
}

function buildSuccess(id: JsonRpcRequest["id"], result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function buildError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function handleToolsCall(request: JsonRpcRequest) {
  const params = asRecord(request.params);
  const name = typeof params?.name === "string" ? params.name : "";

  if (name !== "roll_dice") {
    return buildError(request.id, -32602, `Unknown tool: ${name || "(empty)"}`);
  }

  const args = asRecord(params?.arguments);
  const result = buildRollResult(args);

  return buildSuccess(request.id, {
    content: [
      {
        type: "text",
        text: JSON.stringify(result),
      },
    ],
    structuredContent: result,
    isError: false,
  });
}

export function registerDiceMcpClient(sessionId: string, client: SseClient) {
  clients.set(sessionId, client);

  return () => {
    clients.delete(sessionId);
    client.close();
  };
}

export function getDiceMcpClient(sessionId: string) {
  return clients.get(sessionId) ?? null;
}

export function handleDiceMcpRequest(payload: unknown) {
  const request = asRecord(payload) as JsonRpcRequest | null;

  if (!request) {
    return buildError(null, -32600, "Invalid JSON-RPC request.");
  }

  if (!request.method) {
    return buildError(request.id, -32600, "Missing JSON-RPC method.");
  }

  if (request.method.startsWith("notifications/")) {
    return null;
  }

  switch (request.method) {
    case "initialize": {
      const params = asRecord(request.params);
      return buildSuccess(request.id, {
        protocolVersion:
          typeof params?.protocolVersion === "string"
            ? params.protocolVersion
            : "2024-11-05",
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "ai-agent-best-practices-dice-mcp",
          version: "0.1.0",
        },
      });
    }
    case "ping":
      return buildSuccess(request.id, {});
    case "tools/list":
      return buildSuccess(request.id, {
        tools: [
          {
            name: "roll_dice",
            description:
              "Deterministically roll dice for AI Agent MCP verification. Use this when the user asks to roll dice.",
            inputSchema: {
              type: "object",
              properties: {
                dice: {
                  type: "integer",
                  minimum: 1,
                  maximum: 20,
                  description: "Number of dice to roll.",
                },
                sides: {
                  type: "integer",
                  minimum: 2,
                  maximum: 100,
                  description: "Number of sides on each die.",
                },
                modifier: {
                  type: "integer",
                  description: "Integer modifier added to the total.",
                },
                expression: {
                  type: "string",
                  description:
                    "Optional dice expression such as 2d4+1. If provided, it is parsed into dice, sides, and modifier.",
                },
              },
              additionalProperties: false,
            },
          },
        ],
      });
    case "tools/call":
      return handleToolsCall(request);
    default:
      return buildError(request.id, -32601, `Unsupported method: ${request.method}`);
  }
}
