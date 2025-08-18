import path from "path";
import fs from "fs-extra";
import axios from "axios";

type RunGenerationInput = {
  confirmedPlan: string; // 사용자 컨펌된 설계 프롬프트(파일맵/섹션 포함 권장)
  selectedTools?: unknown;
};

export async function runGeneration(input: RunGenerationInput) {
  const artifactDir = process.env.ARTIFACT_DIR || path.resolve(process.cwd(), "artifacts");
  await fs.ensureDir(artifactDir);

  // 1) 파일맵 먼저 생성
  const filemap = await getFilemap(input.confirmedPlan);
  // 2) 파일별 생성
  for (const f of filemap.files || []) {
    const code = await generateFile({ path: f.path, brief: f.brief, plan: input.confirmedPlan });
    const abs = path.join(artifactDir, f.path);
    await fs.ensureDir(path.dirname(abs));
    await fs.writeFile(abs, code, "utf8");
  }

  return { files: filemap.files?.length || 0 };
}

async function getFilemap(planText: string): Promise<{ files: { path: string; brief: string }[] }> {
  const sys = "당신은 코드 생성 계획을 파일 단위로 구조화합니다. 반드시 JSON만 출력합니다.";
  const usr = `다음 계획을 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n${planText}`;
  const content = await callGptOss([
    { role: "system", content: sys },
    { role: "user", content: usr },
  ]);
  try {
    const json = JSON.parse(extractJson(content));
    return json;
  } catch (e) {
    throw new Error("filemap JSON 파싱 실패");
  }
}

async function generateFile(args: { path: string; brief: string; plan: string }): Promise<string> {
  const sys = "오직 코드만 출력합니다. 설명 금지.";
  const usr = `파일 경로: ${args.path}\n요구사항: ${args.brief}\n참고 계획: ${args.plan.slice(0, 4000)}\n완성된 파일 전체를 출력하세요.`;
  const content = await callGptOss([
    { role: "system", content: sys },
    { role: "user", content: usr },
  ]);
  return content;
}

async function callGptOss(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
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

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}$/);
  return match ? match[0] : text;
}









