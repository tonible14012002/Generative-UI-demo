import { NextApiRequest, NextApiResponse } from "next";

import { CustomLLmEvent } from "@/_backend/llm_utils";
import { streamChatBotResults } from "@/_backend/chatbot.controller";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Parse the JSON body
  const question = req.query.message as string;

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Encoding", "none");
  res.flushHeaders(); // Flush the headers to establish SSE connection

  // Function to send a message
  const sendMessage = (data: CustomLLmEvent) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  setTimeout(() => {
    req.destroy();
    res.end();
  }, 10000);

  req.on("close", () => {
    req.destroy();
    res.end();
  });

  await streamChatBotResults(question, sendMessage);
  sendMessage({ type: "close" });
  res.end();
}
