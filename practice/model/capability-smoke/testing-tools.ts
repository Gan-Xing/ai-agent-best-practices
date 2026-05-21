export type ToolSchema = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const ECHO_PROBE_TOOL: ToolSchema = {
  name: "echo_probe",
  description: "Returns the marker for model capability smoke tests.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      marker: { type: "string" },
    },
    required: ["marker"],
  },
};

export const ECHO_PROBE_ALPHA_TOOL: ToolSchema = {
  name: "echo_probe_alpha",
  description: "Alpha tool for parallel tool-call probe.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      marker: { type: "string" },
    },
    required: ["marker"],
  },
};

export const ECHO_PROBE_BETA_TOOL: ToolSchema = {
  name: "echo_probe_beta",
  description: "Beta tool for parallel tool-call probe.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      marker: { type: "string" },
    },
    required: ["marker"],
  },
};

export const DECOY_CALCULATOR_TOOL: ToolSchema = {
  name: "decoy_calculator",
  description: "A decoy calculator tool that must not be used for this question.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      expression: { type: "string" },
    },
    required: ["expression"],
  },
};

export const ROUTE_PLAN_TOOL: ToolSchema = {
  name: "route_plan",
  description: "Plans a route with weather hints.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      city: {
        type: "string",
        enum: ["paris", "tokyo", "nairobi"],
      },
      unit: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
      },
      days: {
        type: "integer",
        minimum: 1,
        maximum: 7,
      },
      include_history: {
        type: "boolean",
      },
    },
    required: ["city", "unit", "days", "include_history"],
  },
};

export const PRIMARY_RECORD_LOOKUP_TOOL: ToolSchema = {
  name: "primary_record_lookup",
  description: "Primary lookup that may fail and require fallback.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      record_id: { type: "string" },
    },
    required: ["record_id"],
  },
};

export const FALLBACK_RECORD_LOOKUP_TOOL: ToolSchema = {
  name: "fallback_record_lookup",
  description: "Fallback lookup when the primary lookup fails.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      record_id: { type: "string" },
    },
    required: ["record_id"],
  },
};

export const READ_RECORD_TOOL: ToolSchema = {
  name: "read_record",
  description: "Read a record by id in a safe, read-only way.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      record_id: { type: "string" },
    },
    required: ["record_id"],
  },
};

export const UPDATE_RECORD_TOOL: ToolSchema = {
  name: "update_record",
  description: "Update a record by id. This is a write operation.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      record_id: { type: "string" },
      status: { type: "string" },
    },
    required: ["record_id", "status"],
  },
};

export const DELETE_RECORD_TOOL: ToolSchema = {
  name: "delete_record",
  description: "Delete a record by id. This is a destructive write operation.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      record_id: { type: "string" },
      reason: { type: "string" },
    },
    required: ["record_id"],
  },
};

export function buildLargeToolset(): ToolSchema[] {
  return [
    {
      name: "weather_summary",
      description: "Summarize weather for a city.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
    {
      name: "stock_quote",
      description: "Return stock quote for a ticker.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { ticker: { type: "string" } },
        required: ["ticker"],
      },
    },
    {
      name: "calendar_lookup",
      description: "Find events on a calendar date.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { date: { type: "string" } },
        required: ["date"],
      },
    },
    {
      name: "email_search",
      description: "Search emails by keyword.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "flight_search",
      description: "Search flights by route.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
        },
        required: ["origin", "destination"],
      },
    },
    {
      name: "meeting_notes_lookup",
      description: "Find meeting notes by topic.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { topic: { type: "string" } },
        required: ["topic"],
      },
    },
    {
      name: "budget_lookup",
      description: "Find a budget line by department.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { department: { type: "string" } },
        required: ["department"],
      },
    },
    {
      name: "policy_search",
      description: "Search company policy documents.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { keyword: { type: "string" } },
        required: ["keyword"],
      },
    },
    ROUTE_PLAN_TOOL,
    {
      name: "crm_contact_lookup",
      description: "Lookup CRM contact by company.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { company: { type: "string" } },
        required: ["company"],
      },
    },
    {
      name: "inventory_lookup",
      description: "Lookup inventory by sku.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { sku: { type: "string" } },
        required: ["sku"],
      },
    },
    {
      name: "ticket_status",
      description: "Lookup ticket status by id.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ];
}
