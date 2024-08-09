import { AIMessage, HumanMessage } from "@langchain/core/messages";

import prisma from "./lib/prisma";
import { agentExecutor } from "./graph";
import { craftMessage, CustomLLmEvent, streamMessage } from "./llm_utils";

export const sendMessage = async (message: string) => {
  const newMsg = prisma.message.create({
    data: {
      content: message,
      isChatbot: false,
    },
  });

  return newMsg;
};

export type ChatHistory = { type: "ai" | "user"; content: string }[];

export const askChatbot = async (message: string) => {
  const msgs = await getAllMessage();

  const inputs = msgs.map((msg) => {
    if (msg.isChatbot) {
      return new AIMessage({
        name: "ai",
        content: msg.content,
      });
    }

    return new HumanMessage({
      name: "human",
      content: msg.content,
    });
  });

  const graph = agentExecutor();

  const chatBotMsg = await craftMessage(graph, {
    input: message,
    chat_history: inputs,
  });

  const newMsg = prisma.message.create({
    data: {
      content: JSON.stringify(chatBotMsg),
      isChatbot: true,
    },
  });

  return newMsg;
};

export const streamChatBotResults = async (
  question: string,
  callback: (event: CustomLLmEvent) => void,
) => {
  const msgs = await getAllMessage();
  const inputs = msgs.map((msg) => {
    if (msg.isChatbot) {
      return new AIMessage({
        name: "ai",
        content: msg.content,
      });
    }

    return new HumanMessage({
      name: "human",
      content: msg.content,
    });
  });

  const graph = agentExecutor();

  const finalMessage = await streamMessage(
    graph,
    {
      input: question,
      chat_history: inputs,
    },
    callback,
  );

  await prisma.message.create({
    data: {
      content: JSON.stringify(finalMessage),
      isChatbot: true,
    },
  });
};

export const getAllMessage = async () => {
  return prisma.message.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
};
