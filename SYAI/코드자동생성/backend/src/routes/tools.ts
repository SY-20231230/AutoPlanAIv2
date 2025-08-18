import { Router } from "express";
import { proposeTools } from "../services/planner";

const router = Router();

router.post("/propose", async (req, res) => {
  try {
    const { specMarkdown, planMarkdown } = req.body || {};
    if (!specMarkdown && !planMarkdown) {
      return res.status(400).json({ error: "specMarkdown 또는 planMarkdown 필요" });
    }
    const suggestions = await proposeTools({ specMarkdown, planMarkdown });
    res.json({ ok: true, suggestions });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "propose failed" });
  }
});

export default router;









