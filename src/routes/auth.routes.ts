import { Router } from "express";
import { callbackController } from "@/controllers/callback.controller.js";
import { webhookController } from "@/controllers/webhook.controller.js";

const router = Router();

router.get("/callback", (req, res) => callbackController.handle(req, res));

router.post("/webhook", (req, res) => webhookController.handle(req, res));

export default router;