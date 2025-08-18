"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const uuid_1 = require("uuid");
const docxParser_1 = require("../services/docxParser");
const router = (0, express_1.Router)();
const uploadRoot = process.env.UPLOAD_DIR || path_1.default.resolve(process.cwd(), "uploads");
fs_extra_1.default.ensureDirSync(uploadRoot);
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
        const id = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname) || ".docx";
        cb(null, `${id}${ext}`);
    }
});
const upload = (0, multer_1.default)({ storage });
router.post("/upload", upload.fields([
    { name: "spec", maxCount: 1 },
    { name: "plan", maxCount: 1 },
]), async (req, res) => {
    try {
        const specFile = req.files?.spec?.[0];
        const planFile = req.files?.plan?.[0];
        if (!specFile && !planFile) {
            return res.status(400).json({ error: "spec 또는 plan 파일이 필요합니다(.docx)" });
        }
        const outputs = {};
        if (specFile) {
            const md = await (0, docxParser_1.parseDocxToMarkdown)(specFile.path);
            outputs.spec = { id: path_1.default.basename(specFile.path), markdown: md };
        }
        if (planFile) {
            const md = await (0, docxParser_1.parseDocxToMarkdown)(planFile.path);
            outputs.plan = { id: path_1.default.basename(planFile.path), markdown: md };
        }
        return res.json({ ok: true, files: outputs });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "upload failed" });
    }
});
exports.default = router;
