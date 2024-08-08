import type { NextApiRequest, NextApiResponse } from "next";

import Ajv, { JSONSchemaType } from "ajv";
import { Message } from "@prisma/client";

import { sendMessage } from "@/_backend/chatbot.controller";

export interface ErrorResponse {
  status: number;
  err: string;
  errorCode?: number;
}

interface SendMessageRequest {
  message: string;
}

const senMessageSchema: JSONSchemaType<SendMessageRequest> = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
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
      const validator = new Ajv().compile(senMessageSchema);

      if (validator(body)) {
        console.log("\n\n\n", body, "\n\n\n");
        const newMsg = await sendMessage(body.message);

        res.status(200).json({
          data: newMsg,
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
