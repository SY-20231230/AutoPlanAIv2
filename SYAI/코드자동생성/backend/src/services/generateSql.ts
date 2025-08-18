import path from "path";
import fs from "fs-extra";
import { callGptOss, extractJson } from "../lib/llm";

type Input = { plan: string };

export async function generateSql({ plan }: Input) {
  const artifactDir = process.env.ARTIFACT_DIR || path.resolve(process.cwd(), "artifacts/sql");
  await fs.ensureDir(artifactDir);

  const filemap = await getFilemap(plan, "sql");
  for (const f of filemap.files || []) {
    const code = await generateFile({ path: f.path, brief: f.brief, plan });
    const abs = path.join(artifactDir, f.path);
    await fs.ensureDir(path.dirname(abs));
    await fs.writeFile(abs, code, "utf8");
  }
  return { files: filemap.files?.length || 0 };
}

async function getFilemap(planText: string, kind: "sql") {
  const sys = "당신은 데이터베이스 스키마/쿼리를 파일 단위로 설계합니다. JSON만 출력하세요.";
  const usr = `다음 계획을 SQL 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n${planText}`;
  const content = await callGptOss([
    { role: "system", content: sys },
    { role: "user", content: usr },
  ]);
  return JSON.parse(extractJson(content));
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









