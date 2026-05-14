/** Shared message shape (OpenAI-style; gateway normalizes per vendor internally). */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProviderKey =
  | "groq"
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "openai_compat";

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type EmbeddingInput = {
  model?: string;
  text: string;
};

export type GenerateTextInput = {
  messages: ChatMessage[];
  /** Logical product model (alias) or raw vendor id when no alias matches. */
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type GenerateTextResult = {
  text: string;
  provider: ProviderKey;
  /** Vendor model id actually invoked. */
  resolvedModel: string;
  usage: TokenUsage;
  raw?: unknown;
};

export type GatewayEnv = {
  groqApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  deepseekApiKey?: string;
  /** Any OpenAI-compatible proxy (legacy LiteLLM, OpenRouter `/v1`, etc.). */
  openaiCompatBaseUrl?: string;
  openaiCompatApiKey?: string;
  openaiBaseUrl?: string;
};
