import {
  Avatar,
  Card,
  CardBody,
  CardHeader,
  cn,
  Input,
  Image,
} from "@nextui-org/react";
import { Message } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ComponentPropsWithoutRef, useEffect, useState } from "react";
import { RiSendPlane2Fill } from "react-icons/ri";
import rehypeRaw from "rehype-raw";
import Markdown from "react-markdown";

const getMessage = async () => {
  const messages = await fetch("http://localhost:3000/api/get-messages").then(
    (res) => {
      return res.json();
    }
  );

  return messages as {
    data: Message[];
  };
};

const sendMessage = async (msg: string) => {
  const messages = await fetch("http://localhost:3000/api/send", {
    method: "POST",
    body: JSON.stringify({ message: msg }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => {
    return res.json();
  });

  return messages;
};

const askChatbot = async (msg: string) => {
  const messages = await fetch("http://localhost:3000/api/chatbot-non-stream", {
    method: "POST",
    body: JSON.stringify({ question: msg }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => {
    return res.json();
  });

  return messages;
};

export default function IndexPage() {
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ["get-messages"],
    queryFn: getMessage,
    enabled: true,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["send-message"],
    mutationFn: sendMessage,
  });

  const { mutateAsync: ask, isPending: isPendingAsk } = useMutation({
    mutationKey: ["ask-chatbot"],
    mutationFn: askChatbot,
  });

  const onSubmit = async (msg: string) => {
    queryClient.setQueryData(["get-messages"], {
      data: [
        ...(data?.data ?? []),
        {
          id: Math.random().toString(),
          content: msg,
          isChatbot: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    await mutateAsync(msg);

    await ask(msg);

    await refetch();
  };

  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [data]);

  return (
    <div className="max-w-[800px] w-full mx-auto min-h-[100vh] flex flex-col py-8 space-y-4 items-center justify-center">
      <form
        className="w-full py-32"
        onSubmit={async (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!value) return;
          await onSubmit(value);
        }}
      >
        <div className="flex flex-col w-full gap-4 mb-24 flex-1">
          {data?.data.map((m) => {
            return (
              <div
                key={m.id}
                className={cn("flex gap-4 max-w-full", {
                  "flex-row-reverse": !m.isChatbot,
                })}
              >
                <Avatar
                  src={`https://source.boringavatars.com/beam/120/${encodeURI("Chatbot")}?colors=665c52,74b3a7,a3ccaf,E6E1CF,CC5B14`}
                />
                <div className="flex flex-col gap-2">
                  <h1
                    className={cn("text-sm text-zinc-400 font-semibold", {
                      "text-right": !m.isChatbot,
                    })}
                  >
                    {m.isChatbot ? "Chatbot" : "You"}
                  </h1>
                  {m.isChatbot ? (
                    renderMessage(m.content)
                  ) : (
                    <p className="text-zinc-300 max-w-[500px] break-words">
                      {m.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {isPendingAsk && (
            <div className={cn("flex gap-4 max-w-full")}>
              <Avatar
                src={`https://source.boringavatars.com/beam/120/${encodeURI("Chatbot")}?colors=665c52,74b3a7,a3ccaf,E6E1CF,CC5B14`}
              />
              <div className="p-4 rounded-large bg-default-50 flex flex-col gap-2">
                <h1 className={cn("text-sm text-zinc-400 font-semibold")}>
                  {"Chatbot"}
                </h1>
                <p className="text-zinc-300">...</p>
              </div>
            </div>
          )}
        </div>
        {!isPending && !isPending && (
          <Input
            disabled={isPendingAsk || isPending}
            endContent={
              <RiSendPlane2Fill
                className="cursor-pointer"
                style={{
                  marginRight: 4,
                }}
              />
            }
            placeholder="Type your message here..."
            size="lg"
            value={value}
            variant="flat"
            onValueChange={setValue}
          />
        )}
      </form>
    </div>
  );
}

const MarkdownLink = ({
  href,
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) => {
  return (
    <a
      {...props}
      className="text-primary-400 underline"
      href={href ?? ""}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
};

const renderMessage = (raw: string) => {
  const msgs = JSON.parse(raw) as {
    type: "text" | "tool";
    data: any;
  }[];

  return msgs.map((msg, index) => {
    if (msg.type === "text") {
      return (
        <p key={index} className="text-zinc-300 max-w-[500px] break-words">
          <Markdown
            components={{
              a: MarkdownLink,
            }}
            rehypePlugins={[rehypeRaw]}
          >
            {msg.data}
          </Markdown>
        </p>
      );
    }
    if (msg.type === "tool") {
      const { tool, data } = msg.data;

      switch (tool) {
        case "search-movie": {
          return <MovieCard {...data} />;
        }
        default: {
          return null;
        }
      }
    }
  });
};

const MovieCard = (data: {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Poster: string;
}) => {
  return (
    <Card className="py-4">
      <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
        <p className="text-tiny uppercase font-bold">
          {data.Year} - {data.Released}
        </p>
        <small className="text-default-500">{data.Runtime}</small>
        <h4 className="font-bold text-large">{data.Title}</h4>
      </CardHeader>
      <CardBody className="overflow-visible py-2">
        <Image
          alt="Card background"
          className="object-cover rounded-xl"
          src={data.Poster}
          width={270}
        />
      </CardBody>
    </Card>
  );
};
