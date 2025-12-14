import type { Express } from "express";
import { createServer, type Server } from "http";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

// Prefixes that indicate non-article pages
const NON_ARTICLE_PREFIXES = [
  "File:",
  "Special:",
  "Category:",
  "Help:",
  "Wikipedia:",
  "Template:",
  "Talk:",
  "Portal:",
  "User:",
  "Draft:",
  "Module:",
  "MediaWiki:",
  "TimedText:",
  "Book:",
];

function isArticleLink(href: string): boolean {
  // Check if the link starts with a non-article prefix
  return !NON_ARTICLE_PREFIXES.some(prefix =>
    href.startsWith(prefix) || href.startsWith(prefix.toLowerCase())
  );
}

async function getRandomArticles(count: number = 2): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    list: "random",
    rnnamespace: "0",
    rnlimit: count.toString(),
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params}`);
  const data = await response.json();

  return data.query.random.map((article: { title: string }) =>
    article.title.replace(/ /g, "_")
  );
}

async function getArticleContent(title: string): Promise<{
  title: string;
  content: string;
  links: string[];
}> {
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    page: title,
    prop: "text|links",
    disableeditsection: "true",
    redirects: "true",
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params}`);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.info || "Article not found");
  }

  const parse = data.parse;
  let html = parse.text["*"];

  // Extract internal Wikipedia links for reference
  const links: string[] = (parse.links || [])
    .filter((link: { ns: number }) => link.ns === 0)
    .map((link: { "*": string }) => link["*"].replace(/ /g, "_"));

  // Process all internal Wikipedia links
  // Match <a> tags with href="/wiki/..." regardless of attribute order
  html = html.replace(
    /<a\s+([^>]*?)href="\/wiki\/([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (match: string, beforeHref: string, href: string, afterHref: string, content: string) => {
      // Decode the href and remove fragment
      let articleTitle = decodeURIComponent(href).split("#")[0];

      // Check if this is an article link
      if (!isArticleLink(articleTitle)) {
        return `<span class="text-muted-foreground">${content}</span>`;
      }

      // Replace spaces with underscores for consistency
      articleTitle = articleTitle.replace(/ /g, "_");

      return `<a href="#" data-wiki-link="${encodeURIComponent(articleTitle)}" class="wiki-link">${content}</a>`;
    }
  );

  // Remove external links - convert to plain text
  html = html.replace(
    /<a\s+[^>]*class="[^"]*external[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    '$1'
  );

  // Remove any remaining external links (http/https)
  html = html.replace(
    /<a\s+href="https?:\/\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    '$1'
  );

  // Remove edit sections
  html = html.replace(/<span class="mw-editsection"[\s\S]*?<\/span>/gi, '');

  // Remove reference sections
  html = html.replace(/<div class="reflist[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<sup class="reference"[\s\S]*?<\/sup>/gi, '');

  // Remove category links
  html = html.replace(/<div id="catlinks"[\s\S]*?<\/div>/gi, '');

  // Remove navigation boxes (multi-pass for nested structures)
  html = html.replace(/<div[^>]*class="[^"]*navbox[^"]*"[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<table[^>]*class="[^"]*navbox[^"]*"[\s\S]*?<\/table>/gi, '');

  // Remove authority control
  html = html.replace(/<div[^>]*class="[^"]*mw-authority-control[^"]*"[\s\S]*?<\/div>/gi, '');

  // Remove empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gi, '');

  return {
    title: parse.title.replace(/ /g, "_"),
    content: html,
    links,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start a new game with random start and target articles
  // Start a new game with random start and target articles
  app.post("/api/game/new", async (req, res) => {
    try {
      const { startArticle, targetArticle } = req.body;
      let articles: string[] = [];

      if (startArticle && targetArticle) {
        articles = [startArticle, targetArticle].map(a => a.replace(/ /g, "_"));
      } else {
        articles = await getRandomArticles(2);
      }

      res.json({
        startArticle: articles[0],
        targetArticle: articles[1],
      });
    } catch (error) {
      console.error("Error starting new game:", error);
      res.status(500).json({ error: "Failed to start new game" });
    }
  });

  // Get article content
  app.get("/api/article/:title", async (req, res) => {
    try {
      const title = decodeURIComponent(req.params.title);
      const article = await getArticleContent(title);
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  return httpServer;
}
