import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs-extra";
import uploadRouter from "./routes/upload";
import toolsRouter from "./routes/tools";
import generateRouter from "./routes/generate";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin, credentials: true }));

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
const artifactDir = process.env.ARTIFACT_DIR || path.resolve(process.cwd(), "artifacts");

fs.ensureDirSync(uploadDir);
fs.ensureDirSync(artifactDir);

app.use("/api/docs", uploadRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/generate", generateRouter);

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
	console.log(`[server] listening on http://localhost:${port}`);
});


