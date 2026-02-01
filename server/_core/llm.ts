import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") return part;
  if (part.type === "image_url") return part;
  if (part.type === "file_url") return part;

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }

  return { role, name, content: contentParts };
};

/**
 * Invoca Groq Cloud API
 */
async function invokeGroq(params: InvokeParams): Promise<InvokeResult> {
  const { messages, response_format } = params;
  const model = "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const payload: Record<string, unknown> = {
    model: model,
    messages: messages.map(normalizeMessage),
    stream: false,
    temperature: 0.1
  };

  // Se o formato for JSON, a Groq exige que a instrução de JSON esteja no prompt
  if (response_format?.type === "json_object") {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.groqApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Normalizar a resposta da Groq para o formato InvokeResult esperado pelo servidor
  return {
    id: data.id,
    created: data.created,
    model: data.model,
    choices: data.choices.map((c: any) => ({
      index: c.index,
      message: {
        role: c.message.role,
        content: c.message.content,
        tool_calls: c.message.tool_calls
      },
      finish_reason: c.finish_reason
    })),
    usage: data.usage
  } as InvokeResult;
}

/**
 * Invoca Hugging Face
 */
async function invokeHuggingFace(params: InvokeParams): Promise<InvokeResult> {
  const { messages, response_format } = params;
  const model = "Qwen/Qwen2.5-72B-Instruct";
  const url = `https://router.huggingface.co/models/${model}/v1/chat/completions`;

  const payload: Record<string, unknown> = {
    model: model,
    messages: messages.map(normalizeMessage),
    stream: false
  };

  if (response_format) payload.response_format = response_format;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.huggingFaceApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as InvokeResult;
}

/**
 * Fallback Principal: Gemini/Forge
 */
async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  const { messages, tools, toolChoice, tool_choice, response_format } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) payload.tools = tools;
  if (toolChoice || tool_choice) payload.tool_choice = toolChoice || tool_choice;
  if (response_format) payload.response_format = response_format;

  const url = ENV.forgeApiUrl 
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "http://localhost:5000/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini failed: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const errors: string[] = [];

  // 1. Tentar Groq se a chave existir
  if (ENV.groqApiKey && ENV.groqApiKey.startsWith("gsk_")) {
    try {
      return await invokeGroq(params);
    } catch (e: any) {
      console.error("[LLM] Groq failed, falling back...", e.message);
      errors.push(`Groq: ${e.message}`);
    }
  }

  // 2. Tentar Hugging Face se a chave existir
  if (ENV.huggingFaceApiKey && ENV.huggingFaceApiKey.startsWith("hf_")) {
    try {
      return await invokeHuggingFace(params);
    } catch (e: any) {
      console.error("[LLM] Hugging Face failed, falling back...", e.message);
      errors.push(`Hugging Face: ${e.message}`);
    }
  }

  // 3. Fallback Final: Gemini
  try {
    return await invokeGemini(params);
  } catch (e: any) {
    console.error("[LLM] Gemini fallback failed!", e.message);
    errors.push(`Gemini: ${e.message}`);
    throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
  }
}
