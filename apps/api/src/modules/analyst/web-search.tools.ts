import { tool } from "ai";
import { z } from "zod";
import { env } from "../../config/env.js";

/**
 * Real web access for the Analyst — Tavily (api.tavily.com), a search API
 * built for LLM agents. Two tools: `webSearch` for open queries ("who are
 * FiscorAI's competitors"), `fetchWebPage` for a specific URL the seller
 * pasted ("look at mykidovate.com"). Without these, the model has no tool to
 * call for that and falls back to its trained "I can't browse the internet"
 * refusal — available in both vat-data and ecommerce-strategy modes, since
 * both can reasonably need current, external information.
 *
 * Plain fetch, no SDK dependency — this repo's Node engine (>=20) has fetch
 * built in, and the request/response shape is simple enough not to need one.
 */

const TAVILY_BASE = "https://api.tavily.com";

type TavilySearchResult = { title: string; url: string; content: string };
type TavilySearchResponse = { results?: TavilySearchResult[]; answer?: string };
type TavilyExtractResult = { url: string; raw_content?: string };
type TavilyExtractResponse = {
  results?: TavilyExtractResult[];
  failed_results?: Array<{ url: string; error: string }>;
};

async function tavilyPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TAVILY_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Tavily ${path} ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Caps how much page/snippet text lands in the model's context per call. */
const MAX_CONTENT_CHARS = 4000;

export function buildWebTools() {
  return {
    webSearch: tool({
      description:
        "Search the live web for current information — competitors, market data, a product category, " +
        "a company or website by name, current events, or anything you don't already know from the " +
        "seller's uploaded data. Do NOT say you cannot browse the internet — call this instead. " +
        "Returns a short list of results (title, url, snippet). Call fetchWebPage on a specific URL " +
        "afterwards if you need more than the snippet.",
      inputSchema: z.object({
        query: z.string().min(1).max(400).describe("A focused search query, not the seller's whole question verbatim."),
      }),
      execute: async ({ query }) => {
        if (!env.TAVILY_API_KEY) {
          return {
            configured: false as const,
            message:
              "Web search isn't configured on this deployment yet (no TAVILY_API_KEY set). " +
              "Say so plainly rather than guessing at search results.",
          };
        }
        try {
          const data = await tavilyPost<TavilySearchResponse>("/search", {
            query,
            search_depth: "basic",
            max_results: 5,
            include_answer: false,
          });
          return {
            configured: true as const,
            query,
            results: (data.results ?? []).map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.content?.slice(0, 500) ?? "",
            })),
          };
        } catch (err) {
          return {
            configured: true as const,
            query,
            results: [],
            error: err instanceof Error ? err.message : "Web search failed",
          };
        }
      },
    }),

    fetchWebPage: tool({
      description:
        "Fetch and read the actual content of ONE specific web page the seller referenced by URL " +
        "(e.g. their own site, a competitor's listing, a news article). Use this instead of " +
        "webSearch when you already have the exact URL. Do NOT say you cannot browse the internet.",
      inputSchema: z.object({
        url: z.string().url().describe("The exact URL to fetch, including https://."),
      }),
      execute: async ({ url }) => {
        if (!env.TAVILY_API_KEY) {
          return {
            configured: false as const,
            message:
              "Web search isn't configured on this deployment yet (no TAVILY_API_KEY set). " +
              "Say so plainly rather than pretending to have read the page.",
          };
        }
        try {
          const data = await tavilyPost<TavilyExtractResponse>("/extract", {
            urls: url,
            extract_depth: "basic",
            format: "markdown",
          });
          const hit = data.results?.[0];
          if (!hit) {
            const failure = data.failed_results?.[0];
            return {
              configured: true as const,
              url,
              found: false as const,
              error: failure?.error || "Could not extract that page",
            };
          }
          return {
            configured: true as const,
            url,
            found: true as const,
            content: (hit.raw_content ?? "").slice(0, MAX_CONTENT_CHARS),
          };
        } catch (err) {
          return {
            configured: true as const,
            url,
            found: false as const,
            error: err instanceof Error ? err.message : "Fetching that page failed",
          };
        }
      },
    }),
  };
}
