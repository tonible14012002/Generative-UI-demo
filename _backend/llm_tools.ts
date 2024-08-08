import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const searchMovie = tool(
  async (
    input: {
      title: string;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config?: RunnableConfig,
  ) => {
    const searchUrl = `http://www.omdbapi.com?apikey=${
      process.env.NEXT_PUBLIC_OMDB_API_KEY
    }&t=${encodeURIComponent(input.title)}`;

    const results = await fetch(searchUrl).then((res) => res.json());

    return results;
  },
  {
    name: "search-movie",
    description: `Given movie's name of the movie. Try search for similar movie.\n`,
    schema: z.object({
      title: z.string().describe("given task title"),
    }),
  },
);
