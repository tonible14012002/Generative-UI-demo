import {
  Avatar,
  Card,
  CardBody,
  CardHeader,
  cn,
  Input,
  Image,
  Skeleton,
} from "@nextui-org/react";
import { Message } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ComponentPropsWithoutRef, useEffect, useMemo, useState } from "react";
import { RiSendPlane2Fill } from "react-icons/ri";
import rehypeRaw from "rehype-raw";
import Markdown from "react-markdown";

import { CustomLLmEvent } from "@/_backend/llm_utils";

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

export default function IndexPage() {
  const [isResponsing, setIsResponsing] = useState(false);
  const [value, setValue] = useState("");
  const [streamSrc, setStreamSrc] = useState<EventSource>();

  const [streamValue, setStreamValue] = useState<
    Record<
      string,
      {
        type: "text" | "tool";
        data: any;
      }
    >
  >({});

  const torenderResponse = useMemo(() => {
    return JSON.stringify(
      Object.entries(streamValue).map(([_, value]) => {
        return value;
      })
    );
  }, [streamValue]);

  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ["get-messages"],
    queryFn: getMessage,
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["send-message"],
    mutationFn: sendMessage,
  });

  const onSubmit = async (msg: string) => {
    const newMsg = await mutateAsync(msg);

    setValue("");

    queryClient.setQueryData(["get-messages"], {
      data: [
        ...(data?.data ?? []),
        {
          id: newMsg.id,
          isChatbot: false,
          content: msg,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    setIsResponsing(true);
    const streamSrc = new EventSource(
      `http://localhost:3000/api/chatbot-stream?message=${encodeURI(msg)}`
    );

    streamSrc.onmessage = (e: any) => {
      const data = JSON.parse(e.data) as CustomLLmEvent;

      if (data.type === "close") {
        setStreamSrc(undefined);
        refetch().then(() => {
          setIsResponsing(false);
          setStreamValue({});
        });
      }

      if (data.type === "tool-start") {
        setStreamValue({
          ...streamValue,
          [data.id!]: {
            type: "tool",
            data: {
              tool: data.toolName,
              data: data.toolData,
            },
          },
        });
      }
      if (data.type === "tool-end") {
        setStreamValue({
          ...streamValue,
          [data.id!]: {
            type: "tool",
            data: {
              tool: data.toolName,
              data: data.toolData,
            },
          },
        });
      }

      if (data.type === "text-stream") {
        setStreamValue((prev) => {
          if (!prev[data.id!]) {
            return {
              ...prev,
              [data.id!]: {
                type: "text",
                data: data.data,
              },
            };
          }

          return {
            ...prev,
            [data.id!]: {
              type: "text",
              data: prev[data.id!].data + data.data,
            },
          };
        });
      }
    };

    streamSrc.onerror = function () {
      streamSrc.close();
    };

    setStreamSrc(streamSrc);
  };

  useEffect(() => {
    return () => {
      if (streamSrc) {
        streamSrc.close();
      }
    };
  }, [streamSrc]);

  return (
    <div className="max-w-[800px] w-full mx-auto min-h-[100vh] flex flex-col py-8 space-y-4 items-center justify-center">
      <form
        className="w-full py-32"
        onSubmit={async (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!value || isResponsing) return;
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
          {isResponsing && (
            <div className={cn("flex gap-4 max-w-full")}>
              <Avatar
                src={`https://source.boringavatars.com/beam/120/${encodeURI("Chatbot")}?colors=665c52,74b3a7,a3ccaf,E6E1CF,CC5B14`}
              />
              <div className="flex flex-col gap-2">
                <h1 className={cn("text-sm text-zinc-400 font-semibold")}>
                  Chatbot
                </h1>
                {renderMessage(torenderResponse)}
              </div>
            </div>
          )}
        </div>
        {!isResponsing && (
          <Input
            disabled={isPending}
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
  const msgs = JSON.parse(raw) as any[];

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
  title?: string;
  Error?: any;
}) => {
  if (data.Error) {
    return (
      <Card className="p-4 w-fit">
        <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
          <h4 className="font-bold text-large">No movie found</h4>
        </CardHeader>
      </Card>
    );
  }
  if (!data.Title) {
    return (
      <Card className="py-4 w-fit">
        <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
          <Skeleton className="text-tiny uppercase font-bold h-[16px] w-[200px] rounded-large" />
          <Skeleton className="text-default-500 h-[12px] w-[50px] mt-2 rounded-large">
            {data.Runtime}
          </Skeleton>
          <Skeleton className="font-bold text-large h-[14px] w-[100px] mt-2 rounded-large">
            {data.Title}
          </Skeleton>
        </CardHeader>
        <CardBody className="overflow-visible py-2">
          <Skeleton className="rounded-xl w-[270px] h-[400px]" />
        </CardBody>
      </Card>
    );
  }

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
