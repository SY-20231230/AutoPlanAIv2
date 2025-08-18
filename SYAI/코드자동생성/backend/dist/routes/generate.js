"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generateBackend_1 = require("../services/generateBackend");
const generateFrontend_1 = require("../services/generateFrontend");
const generateSql_1 = require("../services/generateSql");
const router = (0, express_1.Router)();
router.post("/backend", async (req, res) => {
    try {
        const { confirmedPlan } = req.body || {};
        if (!confirmedPlan)
            return res.status(400).json({ error: "confirmedPlan 필요" });
        const result = await (0, generateBackend_1.generateBackend)({ plan: confirmedPlan });
        res.json({ ok: true, result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "backend generation failed" });
    }
});
router.post("/frontend", async (req, res) => {
    try {
        const { confirmedPlan } = req.body || {};
        if (!confirmedPlan)
            return res.status(400).json({ error: "confirmedPlan 필요" });
        const result = await (0, generateFrontend_1.generateFrontend)({ plan: confirmedPlan });
        res.json({ ok: true, result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "frontend generation failed" });
    }
});
router.post("/sql", async (req, res) => {
    try {
        const { confirmedPlan } = req.body || {};
        if (!confirmedPlan)
            return res.status(400).json({ error: "confirmedPlan 필요" });
        const result = await (0, generateSql_1.generateSql)({ plan: confirmedPlan });
        res.json({ ok: true, result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "sql generation failed" });
    }
});
exports.default = router;
