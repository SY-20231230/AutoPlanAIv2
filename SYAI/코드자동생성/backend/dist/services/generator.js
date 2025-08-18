"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGeneration = runGeneration;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
async function runGeneration(input) {
    const artifactDir = process.env.ARTIFACT_DIR || path_1.default.resolve(process.cwd(), "artifacts");
    await fs_extra_1.default.ensureDir(artifactDir);
    // 1) 파일맵 먼저 생성
    const filemap = await getFilemap(input.confirmedPlan);
    // 2) 파일별 생성
    for (const f of filemap.files || []) {
        const code = await generateFile({ path: f.path, brief: f.brief, plan: input.confirmedPlan });
        const abs = path_1.default.join(artifactDir, f.path);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(abs));
        await fs_extra_1.default.writeFile(abs, code, "utf8");
    }
    return { files: filemap.files?.length || 0 };
}
async function getFilemap(planText) {
    const sys = "당신은 코드 생성 계획을 파일 단위로 구조화합니다. 반드시 JSON만 출력합니다.";
    const usr = `다음 계획을 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n${planText}`;
    const content = await callGptOss([
        { role: "system", content: sys },
        { role: "user", content: usr },
    ]);
    try {
        const json = JSON.parse(extractJson(content));
        return json;
    }
    catch (e) {
        throw new Error("filemap JSON 파싱 실패");
    }
}
async function generateFile(args) {
    const sys = "오직 코드만 출력합니다. 설명 금지.";
    const usr = `파일 경로: ${args.path}\n요구사항: ${args.brief}\n참고 계획: ${args.plan.slice(0, 4000)}\n완성된 파일 전체를 출력하세요.`;
    const content = await callGptOss([
        { role: "system", content: sys },
        { role: "user", content: usr },
    ]);
    return content;
}
async function callGptOss(messages) {
    const apiBase = process.env.GPT_OSS_API_BASE || "http://localhost:8000/v1";
    const model = process.env.GPT_OSS_MODEL || "gpt-oss-20b";
    const url = `${apiBase}/chat/completions`;
    const res = await axios_1.default.post(url, { model, messages, temperature: 0.1 }, { timeout: 120000 });
    return res.data?.choices?.[0]?.message?.content || "";
}
function extractJson(text) {
    const match = text.match(/\{[\s\S]*\}$/);
    return match ? match[0] : text;
}
