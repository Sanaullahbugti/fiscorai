import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite SPA HTML fallback serves the React app for /blog and /blog/slug/.
 * Public blog pages live at public/blog/.../index.html — serve them first.
 */
function servePublicBlog(): Plugin {
  function resolveBlogFile(urlPath: string): string | null {
    const clean = (urlPath.split("?")[0] ?? "").split("#")[0] ?? "";
    const match = /^\/blog(?:\/([^/]+))?\/?$/.exec(clean);
    if (!match) return null;
    const slug = match[1];
    const file = slug
      ? path.join(rootDir, "public/blog", slug, "index.html")
      : path.join(rootDir, "public/blog/index.html");
    return fs.existsSync(file) ? file : null;
  }

  function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    const file = resolveBlogFile(req.url ?? "");
    if (!file) {
      next();
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  }

  return {
    name: "serve-public-blog",
    configureServer(server) {
      // Push to the front after Vite installs its stack, so we beat SPA fallback.
      return () => {
        server.middlewares.use(middleware);
        const stack = server.middlewares.stack;
        const last = stack.pop();
        if (last) stack.unshift(last);
      };
    },
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use(middleware);
        const stack = server.middlewares.stack;
        const last = stack.pop();
        if (last) stack.unshift(last);
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), servePublicBlog()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
