import express from "express";
import { createConversation, getUserConversations } from "../controllers/chat.js";

const router = express.Router()


router.post("/",createConversation);
router.get("/",getUserConversations);

export default router;
