---
tags:
  - llm
  - tooling
title: "Generative UI"
description: "Generative UI refers to a dynamic and adaptive user interface that is generated and adjusted in real-time by artificial intelligence (AI) to better meet user needs and preferences. Unlike static interfaces, where the layout and elements are predetermined, generative UIs leverage AI algorithms to create and modify interface components based on user interactions and contextual information."
authors:
  - TheCodister
  - Nam Anh
date: 2024-08-08
---

# What is Generative UI?

- A **generative UI** (genUI) is a user interface that responds to the user with AI-generated elements instead of just text messages.
- It offers a personalized experience based on the user's needs and context. Users can interact with this AI-generated interface and sometimes make requests through it.

### Some example:

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/976acc2c-d82c-45f3-ad19-b922e5d6394b/Untitled.png)

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/d27c9dcb-bede-4663-864b-5428dd3dca18/Untitled.png)

## Why Generative UI?

- Enhances UI/UX when using chatbots.
- Generative UI allows for highly personalized, tailor-made interfaces that suit the needs of each individual.

## General Idea

- [Video Explanation](https://www.youtube.com/watch?v=d3uoLbfBPkw&t=406s)

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/0fef4083-58c6-42af-ba2c-860988620d4f/Untitled.png)

**Goal**

- The chatbot can respond to the user with both text and UI in the correct order.
- The chatbot should understand the responded UI.
- The approach should be implementable on any web technology.

**Idea**

- Langchain-supported tool that allows LLM to detect which agent to take action (given the description, defined parameters)
  ⇒ On each tool, define the corresponding UI component to render when it triggers
- LLM supports streaming responses. There are two approaches:

  ### Approach 1

  - Construct messages based on all events received

  ```tsx
  // Example final message
  [
    {
      type: "text",
      data: "......",
    },
    {
      type: "movie-search-tool",
      data: {
        title: ".....",
        description: "....",
      },
    },
  ];
  ```

  ### Approach 2

  - Directly forward stream events to the frontend to handle using (HTTP Streaming, Server-Sent Events, WebSocket, etc.)
  - After a tool is done, include the tool result data in the chat history to help the chatbot understand the context.

# Example Popular Solution for Generative UI

## Vercel AI SDK

Currently, the most used solution is the Vercel AI SDK, which follows Approach 2.

- Utilizes the `server component` to handle event streaming on the Next.js server instead of on the browser.
- Uses the `createStreamableUI` method to run on the Next.js server, creating a `Suspend-wrapped Component` that can respond to the browser immediately and trigger UI updates without client-side code.
- Here is the pseudo code that simply explains what it does under the hood.

```tsx
// use server
const askGPT = async () => {
  const ui = createStreamableUI()(
    // invoke some task
    async () => {
      workflow = createAgentExecutor();
      // handle stream events from LLM
      for await (const streamEvent of (
        runnable as Runnable<RunInput, RunOutput>
      ).streamEvents(inputs, {
        version: "v2",
      })) {
        // handle event stream from LLM
        ui.update(<UI props={data} />);
      }
    }
  )();

  return ui;
};
```

```tsx
const Chat = () => {
  const [elements, setElements] = useState([]);

  const handleSubmit = (message: string) => {
    const ui = askGPT({
      message: message,
    });
    setElements([...elements, ui]);
  };

  return (
    <form
      onSubmit={() => {
        handleSubmit(inputValue);
      }}
    >
      {elements}
      <input />
    </form>
  );
};
```

## Pros:

- Easy to use; everything is provided, so you only need to import the function or copy the code to use it.

## Cons:

- Library is usable for Next.js with server component support.
- Poorly documented for Next.js’s Page Router; it is recommended for the App Router.

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/2da44def-c61b-4c6b-bdc4-a18656b01dee/Untitled.png)

# Demo

## Approach 1

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/61ca4106-d134-4a6d-ba87-7bcb4b08f66a/Untitled.png)

## Approach 2

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/0593e2ad-b0ad-4ea0-8d83-d267f51aa0d0/Untitled.png)

- Handle event flow

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/af81ef53-8f1d-40ce-9a90-a9f9ee25818f/2da44def-c61b-4c6b-bdc4-a18656b01dee/Untitled.png)

## References

- https://www.nngroup.com/articles/generative-ui/
- https://sdk.vercel.ai/docs/reference/ai-sdk-rsc
- https://sdk.vercel.ai/docs/reference/ai-sdk-rsc/create-streamable-ui
