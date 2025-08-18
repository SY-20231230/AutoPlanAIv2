import { Router } from "express";
import { generateBackend } from "../services/generateBackend";
import { generateFrontend } from "../services/generateFrontend";
import { generateSql } from "../services/generateSql";

const router = Router();

router.post("/backend", async (req, res) => {
  try {
    const { confirmedPlan } = req.body || {};
    if (!confirmedPlan) return res.status(400).json({ error: "confirmedPlan 필요" });
    const result = await generateBackend({ plan: confirmedPlan });
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "backend generation failed" });
  }
});

router.post("/frontend", async (req, res) => {
  try {
    const { confirmedPlan } = req.body || {};
    if (!confirmedPlan) return res.status(400).json({ error: "confirmedPlan 필요" });
    const result = await generateFrontend({ plan: confirmedPlan });
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "frontend generation failed" });
  }
});

router.post("/sql", async (req, res) => {
  try {
    const { confirmedPlan } = req.body || {};
    if (!confirmedPlan) return res.status(400).json({ error: "confirmedPlan 필요" });
    const result = await generateSql({ plan: confirmedPlan });
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "sql generation failed" });
  }
});

export default router;

