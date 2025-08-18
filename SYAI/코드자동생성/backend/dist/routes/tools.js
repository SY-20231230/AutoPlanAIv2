"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const planner_1 = require("../services/planner");
const router = (0, express_1.Router)();
router.post("/propose", async (req, res) => {
    try {
        const { specMarkdown, planMarkdown } = req.body || {};
        if (!specMarkdown && !planMarkdown) {
            return res.status(400).json({ error: "specMarkdown 또는 planMarkdown 필요" });
        }
        const suggestions = await (0, planner_1.proposeTools)({ specMarkdown, planMarkdown });
        res.json({ ok: true, suggestions });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "propose failed" });
    }
});
exports.default = router;
