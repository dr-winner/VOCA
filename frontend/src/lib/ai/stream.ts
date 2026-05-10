// SSE parser for Groq streaming chat completions with tool calls.
export type StreamHandlers = {
  onTextDelta?: (text: string) => void;
  onToolCall?: (call: { id: string; name: string; args: string }) => void;
  onDone?: () => void;
};

type ToolCallAcc = { id: string; name: string; args: string };

export async function streamChat(
  url: string,
  body: unknown,
  handlers: StreamHandlers,
): Promise<{ text: string; toolCalls: ToolCallAcc[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  const tools: Record<number, ToolCallAcc> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        handlers.onDone?.();
        continue;
      }
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) {
          fullText += delta.content;
          handlers.onTextDelta?.(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!tools[idx]) tools[idx] = { id: tc.id ?? "", name: "", args: "" };
            if (tc.id) tools[idx].id = tc.id;
            if (tc.function?.name) tools[idx].name += tc.function.name;
            if (tc.function?.arguments) tools[idx].args += tc.function.arguments;
          }
        }
      } catch {
        /* ignore partial */
      }
    }
  }

  const toolCalls = Object.values(tools).filter((t) => t.name);
  toolCalls.forEach((t) => handlers.onToolCall?.(t));
  return { text: fullText, toolCalls };
}
