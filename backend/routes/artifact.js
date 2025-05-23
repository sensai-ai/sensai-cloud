import express from "express";
import { getConversationArtifacts } from "../controllers/artifact.js";

const router = express.Router()


router.get("/:conversationId",getConversationArtifacts)

export default router


