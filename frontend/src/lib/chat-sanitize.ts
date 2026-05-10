/**
 * Some chat models emit pseudo-tool XML in plain text instead of using native tool_calls.
 * Strip it so UI + TTS stay clean.
 */
export function stripLeakedToolXml(text: string): string {
  let s = text.replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, "");
  s = s.replace(/<tool[^>]*>[\s\S]*?<\/tool>/gi, "");
  s = s.replace(/<function[\s\S]*$/gi, "");
  return s.trimEnd();
}
