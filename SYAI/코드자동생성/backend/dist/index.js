"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const upload_1 = __importDefault(require("./routes/upload"));
const tools_1 = __importDefault(require("./routes/tools"));
const generate_1 = __importDefault(require("./routes/generate"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use((0, cors_1.default)({ origin: corsOrigin, credentials: true }));
const uploadDir = process.env.UPLOAD_DIR || path_1.default.resolve(process.cwd(), "uploads");
const artifactDir = process.env.ARTIFACT_DIR || path_1.default.resolve(process.cwd(), "artifacts");
fs_extra_1.default.ensureDirSync(uploadDir);
fs_extra_1.default.ensureDirSync(artifactDir);
app.use("/api/docs", upload_1.default);
app.use("/api/tools", tools_1.default);
app.use("/api/generate", generate_1.default);
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
});
