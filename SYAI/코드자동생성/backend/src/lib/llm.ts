import axios from "axios";

export async function callGptOss(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const apiBase = process.env.GPT_OSS_API_BASE || "http://localhost:8000/v1";
  const model = process.env.GPT_OSS_MODEL || "gpt-oss-20b";
  const url = `${apiBase}/chat/completions`;
  const res = await axios.post(
    url,
    { model, messages, temperature: 0.1 },
    { timeout: 120000 }
  );
  return res.data?.choices?.[0]?.message?.content || "";
}

export function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}$/);
  return match ? match[0] : text;
}









