import axios from "axios";

type ProposeInput = {
  specMarkdown?: string;
  planMarkdown?: string;
};

export async function proposeTools(input: ProposeInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const prompt = buildProposePrompt(input);
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const result = await callGeminiWithRetry(payload, apiKey, 5);
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let json: unknown;
  try {
    json = JSON.parse(extractJson(text));
  } catch (_err) {
    throw new Error("Invalid JSON from Gemini");
  }
  return json;
}

function buildProposePrompt({ specMarkdown, planMarkdown }: ProposeInput) {
  const intro = `다음 문서를 분석하여 SQL/백엔드/프론트 생성에 유용한 툴 제안 목록을 JSON으로 출력하세요.`;
  const format = `출력 형식(JSON): { "tools": [ { "id": string, "category": "sql"|"backend"|"frontend"|"infra", "name": string, "why": string, "inputs": string[], "outputs": string[], "dependencies": string[] } ] }`;
  return [intro, format, "명세:", specMarkdown || "(없음)", "\n기획:", planMarkdown || "(없음)", "\nJSON만 출력"].join("\n\n");
}

async function callGeminiWithRetry(payload: any, apiKey: string, maxRetries = 5) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.post(url, payload, {
        params: { key: apiKey },
        timeout: 60000,
      });
      return res.data;
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      if (![429, 500, 502, 503, 504].includes(status)) throw err;
      const backoff = Math.min(2 ** i + Math.random() * 500, 5000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}$/);
  return match ? match[0] : text;
}









