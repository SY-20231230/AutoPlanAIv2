"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFrontend = generateFrontend;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const llm_1 = require("../lib/llm");
async function generateFrontend({ plan }) {
    const artifactDir = process.env.ARTIFACT_DIR || path_1.default.resolve(process.cwd(), "artifacts/frontend");
    await fs_extra_1.default.ensureDir(artifactDir);
    const filemap = await getFilemap(plan, "frontend");
    for (const f of filemap.files || []) {
        const code = await generateFile({ path: f.path, brief: f.brief, plan });
        const abs = path_1.default.join(artifactDir, f.path);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(abs));
        await fs_extra_1.default.writeFile(abs, code, "utf8");
    }
    return { files: filemap.files?.length || 0 };
}
async function getFilemap(planText, kind) {
    const sys = "당신은 프론트엔드 코드 구조를 파일 단위로 설계합니다. JSON만 출력하세요.";
    const usr = `다음 계획을 프론트엔드 파일맵(JSON: {\n  \"files\": [ { \"path\": string, \"brief\": string } ]\n})으로 변환:\n\n${planText}`;
    const content = await (0, llm_1.callGptOss)([
        { role: "system", content: sys },
        { role: "user", content: usr },
    ]);
    return JSON.parse((0, llm_1.extractJson)(content));
}
async function generateFile(args) {
    const sys = "오직 코드만 출력합니다. 설명 금지.";
    const usr = `파일 경로: ${args.path}\n요구사항: ${args.brief}\n참고 계획: ${args.plan.slice(0, 4000)}\n완성된 파일 전체를 출력하세요.`;
    const content = await (0, llm_1.callGptOss)([
        { role: "system", content: sys },
        { role: "user", content: usr },
    ]);
    return content;
}
