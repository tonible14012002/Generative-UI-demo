import { StreamEvent } from "@langchain/core/dist/tracers/event_stream";
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
  const texts: Record<
    string,
    {
      type: "text" | "tool";
      data: string;
    }
  > = {};
  const orders: string[] = [];

  for await (const streamEvent of (
    runnable as Runnable<RunInput, RunOutput>
  ).streamEvents(inputs, {
    version: "v1",
  })) {
    handleChatModelStreamEvent(streamEvent, {
      order: orders,
      textStream: texts,
    });
    handleInvokeToolsEvent(streamEvent, {
      order: orders,
      textStream: texts,
    });
  }

  const finalText = orders
    .map((order) => JSON.stringify(texts[order]))
    .join("");

  return finalText;
};

const handleInvokeModel = async (event: StreamEvent) => {
  const [type] = event.event.split("_").slice(2);

  if (type !== "on_tool_start") {
    return;
  }
  const inputStr = JSON.parse(event.data.input);
  const toolName = event.name;

  // FIXME: IF conduct message on BE, no need handle tool start event
};

const handleInvokeToolsEvent = (
  event: StreamEvent,
  fields: MessageConstructFields,
) => {
  if (event.event !== "on_tool_end") {
    return;
  }

  const data = event.data.output;

  fields.order.push(event.run_id);
  fields.textStream[event.run_id] = {
    type: "tool",
    data: {
      tool: event.name,
      data: data,
    },
  };
};

const handleChatModelStreamEvent = (
  event: StreamEvent,
  fields: MessageConstructFields,
) => {
  if (event.event !== "on_llm_stream") return;

  const content = event.data?.chunk?.text;

  if (!content) {
    return;
  }
  // Empty content in the context of OpenAI means
  // that the model is asking for a tool to be invoked via function call.
  // So we only print non-empty content

  if (!fields.textStream[event.run_id]) {
    fields.order.push(event.run_id);
    const textStream = content;

    fields.textStream[event.run_id] = {
      type: "text",
      data: textStream,
    };

    return;
  }

  if (fields.textStream[event.run_id]) {
    fields.textStream[event.run_id].data =
      fields.textStream[event.run_id].data + content;
  }
};
