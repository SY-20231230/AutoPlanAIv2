"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocxToMarkdown = parseDocxToMarkdown;
const mammoth_1 = __importDefault(require("mammoth"));
const fs_extra_1 = __importDefault(require("fs-extra"));
async function parseDocxToMarkdown(filePath) {
    const fileExists = await fs_extra_1.default.pathExists(filePath);
    if (!fileExists)
        throw new Error(`file not found: ${filePath}`);
    const { value } = await mammoth_1.default.convertToMarkdown({ path: filePath });
    return value;
}
