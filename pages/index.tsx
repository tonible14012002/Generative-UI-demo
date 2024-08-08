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
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [isResponsing, setIsResponsing] = useState(false);
  const [value, setValue] = useState("");

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
    const newMsg = await mutateAsync(msg);
    const chatbotResponse = await ask(msg);

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
        {!isResponsing && (
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
  const msg = JSON.parse(raw);

  if (msg.type === "text") {
    return (
      <p className="text-zinc-300 max-w-[500px] break-words">
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

// "Title": "Deadpool",
// "Year": "2016",
// "Rated": "R",
// "Released": "12 Feb 2016",
// "Runtime": "108 min",
// "Genre": "Action, Comedy",
// "Director": "Tim Miller",
// "Writer": "Rhett Reese, Paul Wernick",
// "Actors": "Ryan Reynolds, Morena Baccarin, T.J. Miller",
// "Plot": "A wisecracking mercenary gets experimented on and becomes immortal yet hideously scarred, and sets out to track down the man who ruined his looks.",
// "Language": "English",
// "Country": "United States",
// "Awards": "29 wins & 78 nominations",
// "Poster": "https://m.media-amazon.com/images/M/MV5BYzE5MjY1ZDgtMTkyNC00MTMyLThhMjAtZGI5OTE1NzFlZGJjXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg",
// "Ratings": [
//   {
//     "Source": "Internet Movie Database",
//     "Value": "8.0/10"
//   },
//   {
//     "Source": "Rotten Tomatoes",
//     "Value": "85%"
//   },
//   {
//     "Source": "Metacritic",
//     "Value": "65/100"
//   }
// ],
// "Metascore": "65",
// "imdbRating": "8.0",
// "imdbVotes": "1,139,579",
// "imdbID": "tt1431045",
// "Type": "movie",
// "DVD": "N/A",
// "BoxOffice": "$363,070,709",
// "Production": "N/A",
// "Website": "N/A",
// "Response": "True"
