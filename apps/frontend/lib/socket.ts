import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (sessionId?: string): Socket => {
  if (!socket || !socket.connected) {
    const backendUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    socket = io(backendUrl, {
      auth: {
        token: token || undefined,
        sessionId: sessionId || undefined
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected cleanly to server:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected from server:", reason);
    });

    socket.on("connect_error", (error) => {
      console.warn("[Socket.IO] Connection error:", error.message);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
