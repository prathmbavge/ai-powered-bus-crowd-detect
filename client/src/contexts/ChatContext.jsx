import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext";
import { WebSocketContext } from "./WebSocketContext";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBusId, setCurrentBusId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});

  const auth = useContext(AuthContext);
  const websocket = useContext(WebSocketContext);

  // Load messages for a specific bus
  const loadMessages = async (busId) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`Loading messages for bus ${busId}`);
      const response = await api.get(`/api/chat/${busId}`);
      setMessages(response.data);
      setCurrentBusId(busId);

      // Reset unread count for this bus
      setUnreadMessages((prev) => ({
        ...prev,
        [busId]: 0,
      }));

      // Mark messages as read
      if (auth?.user) {
        api.get(`/api/chat/${busId}/mark-read`).catch((err) => {
          console.error("Error marking messages as read:", err);
        });
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to load messages");
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async (busId, text, recipientId = null) => {
    try {
      console.log(`Sending message to bus ${busId}: ${text}`);
      const payload = {
        text,
        ...(recipientId && { recipientId }),
      };

      const response = await api.post(`/api/chat/${busId}`, payload);

      // Update local state if viewing this bus
      if (busId === currentBusId) {
        const newMessage = response.data;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }

      return response.data;
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send message");
      console.error("Error sending message:", err);
      throw err;
    }
  };

  // Handle AI assistant response
  const handleAIResponse = async (busId, userMessage) => {
    try {
      console.log(`Getting AI response for bus ${busId}`);
      const response = await api.post(`/api/chat/${busId}/ai-response`, {
        text: userMessage,
      });

      // Update local state if viewing this bus
      if (busId === currentBusId) {
        setMessages((prevMessages) => [...prevMessages, response.data]);
      }

      return response.data;
    } catch (err) {
      console.error("Error with AI response:", err);
      throw err;
    }
  };

  // Listen for new messages from WebSocket
  useEffect(() => {
    if (websocket?.socket) {
      // Listen for chat messages
      websocket.socket.on("chatMessage", (message) => {
        console.log("Received chat message via socket:", message);

        // If viewing the bus, add to messages
        if (message.busId === currentBusId) {
          setMessages((prevMessages) => {
            // Avoid duplicates (in case the message came from both API and WebSocket)
            if (
              message._id &&
              prevMessages.some((m) => m._id === message._id)
            ) {
              return prevMessages;
            }

            // Replace temporary messages with confirmed ones
            if (
              message.sender &&
              auth?.user &&
              (message.sender._id === auth.user._id ||
                message.sender._id === auth.user.id ||
                message.sender === auth.user._id ||
                message.sender === auth.user.id)
            ) {
              const withoutTemp = prevMessages.filter(
                (m) => !m.pending || !m._id.toString().startsWith("temp-")
              );
              return [...withoutTemp, message];
            }

            return [...prevMessages, message];
          });

          // Mark as read if it's for the current user
          if (
            auth?.user &&
            message.recipient &&
            (message.recipient._id === auth.user._id ||
              message.recipient._id === auth.user.id ||
              message.recipient === auth.user._id ||
              message.recipient === auth.user.id)
          ) {
            api.get(`/api/chat/${message.busId}/mark-read`).catch((err) => {
              console.error("Error marking message as read:", err);
            });
          }
        }
        // If not viewing the bus, increment unread count
        else {
          // Only count if message is for this user or is a public message
          if (
            !message.recipient ||
            (auth?.user &&
              message.recipient &&
              (message.recipient._id === auth.user._id ||
                message.recipient._id === auth.user.id ||
                message.recipient === auth.user._id ||
                message.recipient === auth.user.id))
          ) {
            setUnreadMessages((prev) => ({
              ...prev,
              [message.busId]: (prev[message.busId] || 0) + 1,
            }));
          }
        }
      });
    }

    return () => {
      if (websocket?.socket) {
        websocket.socket.off("chatMessage");
      }
    };
  }, [websocket, currentBusId, auth?.user]);

  // Clear messages when changing buses
  const clearMessages = () => {
    setMessages([]);
    setCurrentBusId(null);
    setError(null);
  };

  // Get unread count for a bus
  const getUnreadCount = (busId) => {
    return unreadMessages[busId] || 0;
  };

  // Clear unread count for a bus
  const clearUnreadCount = (busId) => {
    setUnreadMessages((prev) => ({
      ...prev,
      [busId]: 0,
    }));
  };

  const value = {
    messages,
    loading,
    error,
    currentBusId,
    unreadMessages,
    loadMessages,
    clearMessages,
    sendMessage,
    handleAIResponse,
    getUnreadCount,
    clearUnreadCount,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
