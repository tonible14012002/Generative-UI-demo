import { Runnable } from "@langchain/core/runnables";
import { CompiledStateGraph } from "@langchain/langgraph";

type MessageConstructFields = {
  textStream: Record<
    string,
    {
      type: "text" | "tool";
      data: any;
    }
  >;
  order: string[];
};

export const craftMessage = async <RunInput, RunOutput>(
  runnable:
    | Runnable<RunInput, RunOutput>
    | CompiledStateGraph<RunInput, Partial<RunInput>>,
  inputs: RunInput,
) => {
  const texts: MessageConstructFields["textStream"] = {};
  const orders: string[] = [];

  for await (const streamEvent of (
    runnable as Runnable<RunInput, RunOutput>
  ).streamEvents(inputs, {
    version: "v1",
  })) {
    switch (streamEvent.event) {
      case "on_tool_end": {
        const data = streamEvent.data.output;

        orders.push(streamEvent.run_id);
        texts[streamEvent.run_id] = {
          type: "tool",
          data: {
            tool: streamEvent.name,
            data: data,
          },
        };

        break;
      }
      case "on_llm_stream": {
        const content = streamEvent.data?.chunk?.text;

        if (content) {
          // Empty content in the context of OpenAI means
          // that the model is asking for a tool to be invoked via function call.
          // So we only print non-empty content

          if (!texts[streamEvent.run_id]) {
            orders.push(streamEvent.run_id);
            const textStream = content;

            texts[streamEvent.run_id] = {
              type: "text",
              data: textStream,
            };
          } else if (texts[streamEvent.run_id]) {
            texts[streamEvent.run_id].data =
              texts[streamEvent.run_id].data + content;
          }
        }
      }
      default: {
      }
    }
  }

  const finalText = orders.map((order) => texts[order]);

  return finalText;
};

export interface CustomLLmEvent {
  id?: string;
  type: "tool-start" | "tool-end" | "text-stream" | "close";
  toolName?: string;
  toolData?: any;
  data?: string;
}

export const streamMessage = async <RunInput, RunOutput>(
  runnable:
    | Runnable<RunInput, RunOutput>
    | CompiledStateGraph<RunInput, Partial<RunInput>>,
  inputs: RunInput,
  streamCallback: (event: CustomLLmEvent) => void,
) => {
  const texts: MessageConstructFields["textStream"] = {};
  const orders: string[] = [];

  for await (const streamEvent of (
    runnable as Runnable<RunInput, RunOutput>
  ).streamEvents(inputs, {
    version: "v1",
  })) {
    switch (streamEvent.event) {
      case "on_tool_start": {
        const inputStr = JSON.parse(streamEvent.data.input);
        const toolName = streamEvent.name;

        streamCallback({
          id: streamEvent.run_id,
          type: "tool-start",
          toolName: toolName,
          toolData: inputStr,
        });
        break;
      }

      case "on_tool_end": {
        const data = streamEvent.data.output;

        orders.push(streamEvent.run_id);
        texts[streamEvent.run_id] = {
          type: "tool",
          data: {
            tool: streamEvent.name,
            data: data,
          },
        };

        streamCallback({
          id: streamEvent.run_id,
          type: "tool-end",
          toolName: streamEvent.name,
          toolData: data,
        });

        break;
      }
      case "on_llm_stream": {
        const content = streamEvent.data?.chunk?.text;

        if (content) {
          // So we only print non-empty content
          streamCallback({
            id: streamEvent.run_id,
            type: "text-stream",
            data: content,
          });

          if (!texts[streamEvent.run_id]) {
            orders.push(streamEvent.run_id);
            const textStream = content;

            texts[streamEvent.run_id] = {
              type: "text",
              data: textStream,
            };
          } else if (texts[streamEvent.run_id]) {
            texts[streamEvent.run_id].data =
              texts[streamEvent.run_id].data + content;
          }
        }
      }
      default: {
      }
    }
  }

  return orders.map((order) => texts[order]);
};
