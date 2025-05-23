import express from "express";
import "dotenv/config";
import cors from "cors";

import conversationRouter from "./routes/chat.js";
import messagesRouter from "./routes/message.js";
import artifactRouter from "./routes/artifact.js"

const PORT = process.env.PORT;

const app = express();
  
app.use(cors())

app.use(express.json());


app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/artifacts",artifactRouter)


app.listen(PORT, () => console.log(`Listening on ${PORT}`));
