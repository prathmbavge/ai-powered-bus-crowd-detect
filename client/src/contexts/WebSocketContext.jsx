import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionErrors, setConnectionErrors] = useState(0);
  const [busMessages, setBusMessages] = useState({});
  const reconnectTimer = useRef(null);
  const auth = useContext(AuthContext);

  // Initialize socket connection
  const initializeSocket = () => {
    try {
      // Connect to WebSocket - always connect whether authenticated or not (for public chat)
      const wsUrl = process.env.REACT_APP_WS_URL || "http://localhost:4000";
      console.log(`Connecting to WebSocket at ${wsUrl}`);

      // Check if the server is even running before attempting WebSocket connection
      const socketInstance = io(wsUrl, {
        transports: ["websocket", "polling"], // Fallback to polling if websocket fails
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true, // Automatically try to connect
        reconnection: true, // Enable reconnection
      });

      // Socket events
      socketInstance.on("connect", () => {
        console.log("WebSocket connected successfully");
        setIsConnected(true);
        setConnectionErrors(0);

        // Send user info if authenticated
        if (auth?.isAuthenticated() && auth?.user) {
          socketInstance.emit("authenticate", {
            userId: auth.user.id,
            role: auth.user.role,
          });
        }
      });

      socketInstance.on("disconnect", (reason) => {
        console.log(`WebSocket disconnected: ${reason}`);
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        setConnectionErrors((prevErrors) => prevErrors + 1);
      });

      socketInstance.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      // Handle incoming chat messages
      socketInstance.on("chatMessage", (message) => {
        console.log("Received chat message:", message);
        setBusMessages((prevMessages) => {
          const busId = message.busId;
          const updatedMessages = { ...prevMessages };

          if (!updatedMessages[busId]) {
            updatedMessages[busId] = [];
          }

          updatedMessages[busId] = [...updatedMessages[busId], message];
          return updatedMessages;
        });
      });

      // Handle crowd updates
      socketInstance.on("crowdUpdate", (data) => {
        console.log("Received crowd update:", data);
        // This will be handled by the bus components
      });

      // Set the socket state
      setSocket(socketInstance);

      return socketInstance;
    } catch (err) {
      console.error("Failed to initialize socket:", err);
      return null;
    }
  };

  // Connect or reconnect socket
  useEffect(() => {
    // Only try to initialize socket if the server should be available
    let socketInstance;

    // Add a small delay before initializing to ensure other components are mounted
    const initTimeout = setTimeout(() => {
      socketInstance = initializeSocket();
    }, 500);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimeout);

      if (socketInstance) {
        console.log("Cleaning up socket connection");
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle reconnection after auth changes
  useEffect(() => {
    if (socket && auth?.isAuthenticated() && auth?.user) {
      socket.emit("authenticate", {
        userId: auth.user.id,
        role: auth.user.role,
      });
    }
  }, [auth, socket]);

  // Auto-reconnect with exponential backoff if errors persist
  useEffect(() => {
    if (connectionErrors > 0 && !isConnected && !reconnectTimer.current) {
      const delay = Math.min(30000, Math.pow(2, connectionErrors) * 1000); // Exponential backoff with 30s max
      console.log(
        `Scheduling reconnect in ${delay}ms (attempt ${connectionErrors})`
      );

      reconnectTimer.current = setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        if (socket) {
          socket.disconnect();
        }
        initializeSocket();
        reconnectTimer.current = null;
      }, delay);
    }

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionErrors, isConnected]);

  // Subscribe to a bus detection channel
  const subscribeToBus = (busId) => {
    if (socket && busId) {
      console.log(`Subscribing to bus: ${busId}`);
      socket.emit("subscribe", busId);
    }
  };

  // Unsubscribe from a bus detection channel
  const unsubscribeFromBus = (busId) => {
    if (socket && busId) {
      console.log(`Unsubscribing from bus: ${busId}`);
      socket.emit("unsubscribe", busId);
    }
  };

  // Join a chat room
  const joinChatRoom = (busId) => {
    if (socket && busId) {
      console.log(`Joining chat room for bus: ${busId}`);
      socket.emit("joinChat", {
        busId,
        userId: auth?.user?.id,
        role: auth?.user?.role,
      });
    }
  };

  // Leave a chat room
  const leaveChatRoom = (busId) => {
    if (socket && busId) {
      console.log(`Leaving chat room for bus: ${busId}`);
      socket.emit("leaveChat", {
        busId,
        userId: auth?.user?.id,
      });
    }
  };

  // Get messages for a specific bus
  const getMessagesForBus = (busId) => {
    return busMessages[busId] || [];
  };

  // Send a chat message via socket
  const sendChatMessage = (busId, text, recipientId = null) => {
    if (socket && busId && text && auth?.user) {
      console.log(`Sending socket message to bus ${busId}: ${text}`);

      const messageData = {
        busId,
        text,
        sender: auth.user.id,
        senderName: auth.user.name,
        senderRole: auth.user.role,
        recipient: recipientId,
      };

      socket.emit("chatMessage", messageData);

      // Optimistic update for UI
      setBusMessages((prevMessages) => {
        const busId = messageData.busId;
        const updatedMessages = { ...prevMessages };

        if (!updatedMessages[busId]) {
          updatedMessages[busId] = [];
        }

        const clientMessage = {
          ...messageData,
          _id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          pending: true,
        };

        updatedMessages[busId] = [...updatedMessages[busId], clientMessage];
        return updatedMessages;
      });

      return true;
    }
    return false;
  };

  // Clear messages for a bus
  const clearMessagesForBus = (busId) => {
    setBusMessages((prev) => {
      const updated = { ...prev };
      delete updated[busId];
      return updated;
    });
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionErrors,
        subscribeToBus,
        unsubscribeFromBus,
        joinChatRoom,
        leaveChatRoom,
        sendChatMessage,
        getMessagesForBus,
        clearMessagesForBus,
        busMessages,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
