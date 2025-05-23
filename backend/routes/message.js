import express from "express";
import { getConversationMessages, sendPromptToAi } from "../controllers/message.js";

const router = express.Router()


router.post("/:conversationId/send",sendPromptToAi);
router.get("/:conversationId",getConversationMessages)

export default router


