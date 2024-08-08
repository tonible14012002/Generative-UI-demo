import type { NextApiRequest, NextApiResponse } from "next";

import Ajv, { JSONSchemaType } from "ajv";
import { Message } from "@prisma/client";

import { askChatbot } from "@/_backend/chatbot.controller";

export interface ErrorResponse {
  status: number;
  err: string;
  errorCode?: number;
}

interface AskChatBotRequest {
  question: string;
}

const askChatBotSchema: JSONSchemaType<AskChatBotRequest> = {
  type: "object",
  properties: {
    question: { type: "string" },
  },
  required: ["question"],
};

type Data = {
  data?: Message;
  err?: ErrorResponse;
};

// This function can run for a maximum of 30 seconds
export const config = {
  maxDuration: 30,
};

export default async function Handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  switch (req.method) {
    case "POST":
      const { body } = req;
      const validator = new Ajv().compile(askChatBotSchema);

      if (validator(body)) {
        const msg = await askChatbot(body.question);

        res.status(200).json({
          data: msg,
        });
      } else {
        return res.status(400).json({
          err: {
            status: 400,
            err: `invalid request body${JSON.stringify(validator.errors)}`,
            errorCode: 400,
          },
        });
      }
      break;
    default:
      res.status(405).end();
  }
}
