import net from "node:net";
import { WebSocketServer, WebSocket } from "ws";
import {
  createSessionAdapter,
  getInitialNegotiationFrames,
} from "./sessionAdapter.js";

export type HostServerOptions = {
  tn5250Port: number;
  wsPort: number;
  systemName: string;
  devFrameLog: boolean;
  tn5250BindHost?: string;
  wsBindHost?: string;
};

export type HostServers = {
  close: () => Promise<void>;
};

function createTn5250ConnectionHandler(options: Omit<HostServerOptions, "tn5250Port" | "wsPort">) {
  return (socket: net.Socket) => {
    console.log(`[TN5250] TCP client connected from ${socket.remoteAddress ?? "unknown"}`);

    const adapter = createSessionAdapter({
      systemName: options.systemName,
      devFrameLog: options.devFrameLog,
    });

    for (const frame of getInitialNegotiationFrames()) {
      socket.write(frame);
    }

    socket.on("data", (chunk: Buffer) => {
      const responses = adapter.handleData(chunk);
      for (const response of responses) {
        socket.write(response);
      }
    });

    socket.on("close", () => {
      console.log("[TN5250] TCP client disconnected");
      adapter.dispose();
    });

    socket.on("error", (err) => {
      console.error("[TN5250] TCP socket error:", err.message);
    });
  };
}

function createWebSocketConnectionHandler(options: Omit<HostServerOptions, "tn5250Port" | "wsPort">) {
  return (ws: WebSocket) => {
    console.log("[TN5250] WebSocket client connected");

    const adapter = createSessionAdapter({
      systemName: options.systemName,
      devFrameLog: options.devFrameLog,
    });

    for (const frame of getInitialNegotiationFrames()) {
      ws.send(frame);
    }

    ws.on("message", (message: Buffer) => {
      const responses = adapter.handleData(message);
      for (const response of responses) {
        ws.send(response);
      }
    });

    ws.on("close", () => {
      console.log("[TN5250] WebSocket client disconnected");
      adapter.dispose();
    });

    ws.on("error", (err) => {
      console.error("[TN5250] WebSocket error:", err.message);
    });
  };
}

function reportListenError(label: string, port: number, err: NodeJS.ErrnoException): never {
  if (err.code === "EADDRINUSE") {
    console.error(`[${label}] Port ${port} is already in use. Stop the other lab process or change the port in .env.`);
  } else {
    console.error(`[${label}] Failed to listen on port ${port}:`, err.message);
  }
  process.exit(1);
}

export function startHostServers(options: HostServerOptions): HostServers {
  const shared = {
    systemName: options.systemName,
    devFrameLog: options.devFrameLog,
  };

  const tnHost = options.tn5250BindHost ?? "127.0.0.1";
  const wsHost = options.wsBindHost ?? "127.0.0.1";

  const tcpServer = net.createServer(createTn5250ConnectionHandler(shared));
  tcpServer.on("error", (err) => reportListenError("TN5250", options.tn5250Port, err));
  tcpServer.listen(options.tn5250Port, tnHost, () => {
    console.log(`[TN5250] TCP host listening on ${tnHost}:${options.tn5250Port}`);
  });

  const wss = new WebSocketServer({ port: options.wsPort, host: wsHost });
  wss.on("error", (err) => reportListenError("TN5250-WS", options.wsPort, err));
  wss.on("connection", createWebSocketConnectionHandler(shared));
  console.log(`[TN5250] WebSocket host listening on ${wsHost}:${options.wsPort}`);

  return {
    close: async () => {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => tcpServer.close(() => resolve()));
    },
  };
}
