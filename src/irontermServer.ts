import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type IronTermServerOptions = {
  port: number;
  ironTermPublicDir: string;
};

/** Serve IronTerm static files (external, GPL-3.0 — not bundled into host code). */
export function startIronTermStaticServer(options: IronTermServerOptions): http.Server {
  const root = path.resolve(options.ironTermPublicDir);

  const server = http.createServer((req, res) => {
    const url = req.url?.split("?")[0] ?? "/";
    let filePath = path.join(root, url === "/" ? "index.html" : url);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const types: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".xml": "application/xml",
    };
    res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
    res.end(fs.readFileSync(filePath));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[IronTerm] Port ${options.port} is already in use. Stop the other lab process or set HTTP_PORT in .env.`);
    } else {
      console.error(`[IronTerm] Failed to listen on port ${options.port}:`, err.message);
    }
    process.exit(1);
  });

  server.listen(options.port, () => {
    console.log(`[IronTerm] Static files at http://localhost:${options.port}/tn5250/`);
    console.log(`[IronTerm] GPL-3.0 client — source: external/IronTerm-main/`);
  });

  return server;
}

export function resolveIronTermPublicDir(): string {
  return path.join(__dirname, "..", "external", "IronTerm-main", "public");
}
