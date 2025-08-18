import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { parseDocxToMarkdown } from "../services/docxParser";

const router = Router();

const uploadRoot = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
fs.ensureDirSync(uploadRoot);

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || ".docx";
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({ storage });

router.post("/upload", upload.fields([
  { name: "spec", maxCount: 1 },
  { name: "plan", maxCount: 1 },
]), async (req, res) => {
  try {
    const specFile = (req.files as any)?.spec?.[0];
    const planFile = (req.files as any)?.plan?.[0];

    if (!specFile && !planFile) {
      return res.status(400).json({ error: "spec 또는 plan 파일이 필요합니다(.docx)" });
    }

    const outputs: any = {};
    if (specFile) {
      const md = await parseDocxToMarkdown(specFile.path);
      outputs.spec = { id: path.basename(specFile.path), markdown: md };
    }
    if (planFile) {
      const md = await parseDocxToMarkdown(planFile.path);
      outputs.plan = { id: path.basename(planFile.path), markdown: md };
    }

    return res.json({ ok: true, files: outputs });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "upload failed" });
  }
});

export default router;


