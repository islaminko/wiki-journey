import { z } from "zod";

export const articleSchema = z.object({
  title: z.string(),
  content: z.string(),
  links: z.array(z.string()),
});

export type Article = z.infer<typeof articleSchema>;

export const gameStateSchema = z.object({
  startArticle: z.string(),
  targetArticle: z.string(),
  currentArticle: z.string(),
  path: z.array(z.string()),
  clicks: z.number(),
  startTime: z.number(),
  isComplete: z.boolean(),
});

export type GameState = z.infer<typeof gameStateSchema>;

export const newGameResponseSchema = z.object({
  startArticle: z.string(),
  targetArticle: z.string(),
});

export type NewGameResponse = z.infer<typeof newGameResponseSchema>;
