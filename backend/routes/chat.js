import express from "express";
import { createConversation, getLatestConversationId, getUserConversations } from "../controllers/chat.js";

const router = express.Router()


router.post("/",createConversation);
router.get("/",getUserConversations);
router.get("/latest-id",getLatestConversationId);
export default router;
