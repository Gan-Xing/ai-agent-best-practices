export type ModelCapabilityPreset = {
  key: string;
  label: string;
  providerLabel: string;
  transport: "chat_completions" | "responses";
  apiKeyEnv: string;
  baseUrlEnv: string;
  defaultBaseUrl: string;
  modelId: string;
  transportPolicy: string;
  headers?: Record<string, string>;
};

export const MODEL_CAPABILITY_PRESETS: ModelCapabilityPreset[] = [
  {
    key: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    providerLabel: "DeepSeek",
    transport: "chat_completions",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    defaultBaseUrl: "https://api.deepseek.com",
    modelId: "deepseek-v4-pro",
    transportPolicy:
      "Official DeepSeek API currently exposes chat/completions, not /responses; use official chat/completions plus DeepSeek-native probes.",
  },
  {
    key: "qwen3.6-plus",
    label: "Qwen 3.6 Plus",
    providerLabel: "Qwen",
    transport: "responses",
    apiKeyEnv: "QWEN_API_KEY",
    baseUrlEnv: "QWEN_BASE_URL",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    modelId: "qwen3.6-plus",
    transportPolicy:
      "Official OpenAI-compatible /responses path is available; shared baseline must use /responses.",
  },
  {
    key: "gpt-5.5",
    label: "GPT-5.5",
    providerLabel: "OpenRouter -> OpenAI",
    transport: "responses",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    modelId: "openai/gpt-5.5",
    transportPolicy:
      "OpenRouter /responses path is available; shared baseline must use /responses.",
    headers: {
      "http-referer": "https://github.com/Gan-Xing/ai-agent-best-practices",
      "x-title": "AI Agent Best Practices",
    },
  },
  {
    key: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    providerLabel: "OpenRouter -> Anthropic",
    transport: "responses",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    modelId: "anthropic/claude-opus-4.7",
    transportPolicy:
      "OpenRouter /responses path is available; shared baseline must use /responses.",
    headers: {
      "http-referer": "https://github.com/Gan-Xing/ai-agent-best-practices",
      "x-title": "AI Agent Best Practices",
    },
  },
  {
    key: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    providerLabel: "OpenRouter -> Google",
    transport: "responses",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    modelId: "google/gemini-3.1-pro-preview",
    transportPolicy:
      "OpenRouter /responses path is available; shared baseline must use /responses.",
    headers: {
      "http-referer": "https://github.com/Gan-Xing/ai-agent-best-practices",
      "x-title": "AI Agent Best Practices",
    },
  },
  {
    key: "kimi-k2.6",
    label: "Kimi K2.6",
    providerLabel: "Moonshot / Kimi",
    transport: "chat_completions",
    apiKeyEnv: "MOONSHOT_API_KEY",
    baseUrlEnv: "MOONSHOT_BASE_URL",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    modelId: "kimi-k2.6",
    transportPolicy:
      "Official Moonshot/Kimi API currently exposes chat/completions for native tools, not /responses; use official chat/completions plus Kimi-native probes.",
  },
];

export function getConfiguredPresets(
  selectedKeys: string[] | null,
  env: NodeJS.ProcessEnv = process.env,
) {
  return MODEL_CAPABILITY_PRESETS.filter((preset) => {
    if (selectedKeys && !selectedKeys.includes(preset.key)) {
      return false;
    }

    return Boolean(env[preset.apiKeyEnv]);
  });
}
