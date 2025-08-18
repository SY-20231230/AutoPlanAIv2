"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGptOss = callGptOss;
exports.extractJson = extractJson;
const axios_1 = __importDefault(require("axios"));
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
