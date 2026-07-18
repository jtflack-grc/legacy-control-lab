import net from "node:net";
import { WebSocketServer } from "ws";

export type WebsockifyOptions = {
  listenPort: number;
  listenHost?: string;
  targetHost: string;
  targetPort: number;
};

export function startWebsockifyBridge(options: WebsockifyOptions): WebSocketServer {
  const listenHost = options.listenHost ?? "127.0.0.1";
  const wss = new WebSocketServer({
    port: options.listenPort,
    host: listenHost,
    path: "/",
    handleProtocols: (protocols) => {
      if (protocols.has("binary")) return "binary";
      if (protocols.size > 0) {
        const first = protocols.values().next().value;
        return first ?? false;
      }
      return false;
    },
  });

  wss.on("connection", (ws) => {
    const tcp = net.createConnection({ host: options.targetHost, port: options.targetPort });

    tcp.on("connect", () => {
      console.log(`[websockify] IronTerm connected → ${options.targetHost}:${options.targetPort}`);
    });

    tcp.on("data", (chunk: Buffer) => {
      if (ws.readyState === ws.OPEN) ws.send(chunk);
    });

    tcp.on("close", () => {
      if (ws.readyState === ws.OPEN) ws.close();
    });

    tcp.on("error", (err) => {
      console.error("[websockify] TCP error:", err.message);
      ws.close();
    });

    ws.on("message", (message: Buffer) => {
      if (!tcp.destroyed) tcp.write(message);
    });

    ws.on("close", () => tcp.end());
    ws.on("error", (err) => {
      console.error("[websockify] WebSocket error:", err.message);
      tcp.end();
    });
  });

  wss.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[websockify] Port ${options.listenPort} is already in use. Stop the other lab process or set WEBSOCKIFY_PORT in .env.`,
      );
      process.exit(1);
    }
    console.error("[websockify] server error:", err.message);
  });

  console.log(
    `[websockify] ws://localhost:${options.listenPort}/ → tcp://${options.targetHost}:${options.targetPort}`,
  );

  return wss;
}

const isBridgeMain =
  process.argv[1]?.includes("websockifyBridge") ||
  process.argv[1]?.endsWith("websockifyBridge.ts");

if (isBridgeMain) {
  startWebsockifyBridge({
    listenPort: Number(process.env.WEBSOCKIFY_PORT ?? 6080),
    targetHost: process.env.WEBSOCKIFY_TARGET_HOST ?? "127.0.0.1",
    targetPort: Number(process.env.TN5250_PORT ?? 8023),
  });
}
