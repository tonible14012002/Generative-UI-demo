import type { NextApiRequest, NextApiResponse } from "next";

import { Message } from "@prisma/client";

import { getAllMessage } from "@/_backend/chatbot.controller";

export interface ErrorResponse {
  status: number;
  err: string;
  errorCode?: number;
}

type Data = {
  data?: Message[];
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
    case "GET":
      const msgs = await getAllMessage();

      res.status(200).json({
        data: msgs,
      });
      break;
    default:
      res.status(405).end();
  }
}
