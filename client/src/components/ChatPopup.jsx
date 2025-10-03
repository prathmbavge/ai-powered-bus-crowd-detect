import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Paper,
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { WebSocketContext } from "../contexts/WebSocketContext";
import { chatApi } from "../services/api";

const ChatPopup = ({ open, handleClose, busId, busName }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const { socket } = useContext(WebSocketContext);
  const { user } = useContext(AuthContext);

  // Fetch previous messages when component mounts
  useEffect(() => {
    if (!busId || !open) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getMessages(busId);
        setMessages(response.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to the chat room when opening
    if (socket && busId) {
      socket.emit("joinChat", {
        busId,
        userId: user?._id,
        role: user?.role,
      });

      // Listen for new messages
      socket.on("chatMessage", (message) => {
        setMessages((prev) => [...prev, message]);
      });
    }

    // Cleanup when component unmounts
    return () => {
      if (socket && busId) {
        socket.emit("leaveChat", { busId, userId: user?._id });
        socket.off("chatMessage");
      }
    };
  }, [busId, open, socket, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim()) return;

    try {
      await chatApi.sendMessage(busId, messageText);
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 2, height: "80vh", maxHeight: 600 },
      }}
    >
      <DialogTitle
        className="flex justify-between items-center bg-blue-50 border-b"
        sx={{ padding: 2 }}
      >
        <Box className="flex items-center">
          <Avatar className="bg-blue-500 mr-2" sx={{ width: 32, height: 32 }}>
            {busName ? busName[0].toUpperCase() : "B"}
          </Avatar>
          <Typography variant="h6" component="div" className="font-semibold">
            {busName || "Bus Chat"}
            <Typography
              variant="caption"
              component="div"
              className="text-gray-600"
            >
              Real-time communication
            </Typography>
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers className="flex-1 p-0 flex flex-col">
        {loading ? (
          <Box className="flex-1 flex justify-center items-center">
            <CircularProgress size={40} />
          </Box>
        ) : messages.length === 0 ? (
          <Box className="flex-1 flex justify-center items-center flex-col p-4">
            <Typography
              variant="body1"
              className="text-gray-500 mb-2 text-center"
            >
              No messages yet
            </Typography>
            <Typography variant="body2" className="text-gray-400 text-center">
              Start the conversation by sending a message
            </Typography>
          </Box>
        ) : (
          <Box className="flex-1 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <Box
                key={message._id || index}
                className={`mb-3 ${
                  message.sender?._id === user?._id
                    ? "flex justify-end"
                    : "flex justify-start"
                }`}
              >
                {message.isSystem ? (
                  <Box className="w-full text-center my-2">
                    <Chip
                      label={message.text}
                      size="small"
                      color="default"
                      variant="outlined"
                      className="bg-gray-50"
                    />
                  </Box>
                ) : (
                  <Box className="flex max-w-[80%]">
                    {message.sender?._id !== user?._id && (
                      <Avatar
                        className="mr-2 mt-1"
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor:
                            message.sender?.role === "admin"
                              ? "primary.main"
                              : "secondary.main",
                        }}
                      >
                        {message.sender?.name
                          ? message.sender.name[0].toUpperCase()
                          : "U"}
                      </Avatar>
                    )}

                    <Box>
                      <Paper
                        elevation={1}
                        className={`p-2 px-3 ${
                          message.sender?._id === user?._id
                            ? "bg-blue-100 text-blue-900"
                            : "bg-gray-100"
                        }`}
                        sx={{ borderRadius: 2 }}
                      >
                        {message.sender?._id !== user?._id && (
                          <Typography
                            variant="caption"
                            className="font-semibold block mb-1"
                          >
                            {message.sender?.name || "Unknown"}
                            {message.sender?.role === "admin" && (
                              <Chip
                                label="Admin"
                                size="small"
                                color="primary"
                                variant="outlined"
                                className="ml-1"
                                sx={{ height: 16, fontSize: "0.6rem" }}
                              />
                            )}
                          </Typography>
                        )}
                        <Typography variant="body2">{message.text}</Typography>
                      </Paper>
                      <Typography
                        variant="caption"
                        className="text-gray-500 block mt-1 text-xs"
                      >
                        {formatTime(message.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </DialogContent>

      <DialogActions className="p-2 bg-gray-50">
        <form
          className="flex w-full items-center gap-2"
          onSubmit={handleSendMessage}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            variant="outlined"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage(e)}
            disabled={loading}
          />
          <IconButton
            color="primary"
            type="submit"
            disabled={!messageText.trim() || loading}
          >
            <SendIcon />
          </IconButton>
        </form>
      </DialogActions>
    </Dialog>
  );
};

export default ChatPopup;
