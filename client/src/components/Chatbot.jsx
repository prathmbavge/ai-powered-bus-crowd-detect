import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { WebSocketContext } from "../contexts/WebSocketContext";

// Icons - We'll keep the MUI icons for now
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const Chatbot = ({ busId, busInfo, isPublic = false }) => {
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessageLengthRef = useRef(0);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { socket, joinChatRoom, leaveChatRoom, getMessagesForBus } =
    useContext(WebSocketContext);
  const { messages, loading, error, sendMessage, loadMessages, currentBusId } =
    useChat();

  // Simulate AI response handler if not provided by context
  const handleAIResponse = (busId, userMessage) => {
    // Simple AI response logic
    let aiResponse = "I'm sorry, I don't understand that question.";

    if (
      userMessage.toLowerCase().includes("crowd") ||
      userMessage.toLowerCase().includes("busy") ||
      userMessage.toLowerCase().includes("full")
    ) {
      aiResponse = `Currently the bus ${busInfo?.busNumber || ""} has a ${
        busInfo?.currentCrowdLevel?.toLowerCase() || "moderate"
      } crowd level.`;
    } else if (
      userMessage.toLowerCase().includes("schedule") ||
      userMessage.toLowerCase().includes("arrival") ||
      userMessage.toLowerCase().includes("when")
    ) {
      aiResponse =
        "The bus is operating on its regular schedule. Please check the app for real-time updates.";
    } else if (
      userMessage.toLowerCase().includes("route") ||
      userMessage.toLowerCase().includes("stop") ||
      userMessage.toLowerCase().includes("where")
    ) {
      aiResponse = `This bus runs on the ${
        busInfo?.route || "standard"
      } route. It makes all regular stops.`;
    } else if (
      userMessage.toLowerCase().includes("hello") ||
      userMessage.toLowerCase().includes("hi") ||
      userMessage.toLowerCase().includes("hey")
    ) {
      aiResponse = "Hello! How can I assist you with your bus journey today?";
    }

    // Send the AI response after a short delay
    setTimeout(() => {
      // Simulate server response by emitting through socket
      if (socket) {
        socket.emit("newMessage", {
          busId: busId,
          text: aiResponse,
          messageType: "ai_response",
          sender: {
            _id: "bus-assistant",
            name: "Bus Assistant",
          },
        });
      }
    }, 500);
  };

  // Combined messages from API and WebSocket
  const wsMessages = getMessagesForBus(busId);
  const allMessages = [
    ...messages,
    ...wsMessages.filter(
      (m) => !messages.some((existingMsg) => existingMsg._id === m._id)
    ),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Load messages when bus changes
  useEffect(() => {
    if (busId && chatOpen && currentBusId !== busId) {
      loadMessages(busId);
      joinChatRoom(busId);
    }

    // Cleanup
    return () => {
      if (chatOpen && busId) {
        leaveChatRoom(busId);
      }
    };
  }, [
    busId,
    chatOpen,
    currentBusId,
    loadMessages,
    joinChatRoom,
    leaveChatRoom,
  ]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }

    // If there are new messages and the chat isn't open, show notification
    if (allMessages.length > prevMessageLengthRef.current && !chatOpen) {
      setNewMessage(true);
    }

    prevMessageLengthRef.current = allMessages.length;
  }, [allMessages, chatOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    try {
      // Send user message
      await sendMessage(busId, input);
      setInput("");

      // If public view, trigger AI response
      if (isPublic) {
        setTyping(true);
        // Simulate AI thinking time (1-3 seconds)
        setTimeout(() => {
          handleAIResponse(busId, input);
          setTyping(false);
        }, Math.random() * 2000 + 1000);
      }

      // Focus back on input
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      setTyping(false);
    }
  };

  const toggleChat = () => {
    setChatOpen((prevState) => !prevState);
    if (!chatOpen && busId && currentBusId !== busId) {
      loadMessages(busId);
      joinChatRoom(busId);
    }

    // Clear notification when opening chat
    if (!chatOpen) {
      setNewMessage(false);
    }
  };

  return (
    <>
      {/* Chat toggle button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={toggleChat}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 ${
            chatOpen
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={chatOpen ? "Close chat" : "Open chat"}
        >
          {newMessage && !chatOpen && (
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
          )}

          {chatOpen ? (
            <CloseIcon className="text-white" />
          ) : isPublic ? (
            <SmartToyIcon className="text-white" />
          ) : (
            <ChatIcon className="text-white" />
          )}
        </button>
      </div>

      {/* Chat interface */}
      {chatOpen && (
        <div className="fixed bottom-24 right-5 w-[350px] max-w-[90vw] h-[500px] max-h-[80vh] flex flex-col z-50 rounded-xl overflow-hidden shadow-2xl bg-white animate-slideUp">
          {/* Header */}
          <div
            className={`p-4 flex flex-col ${
              isPublic
                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                : "bg-gradient-to-r from-blue-600 to-blue-400"
            } text-white`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white bg-opacity-20 mr-2">
                  {isPublic ? (
                    <SmartToyIcon className="text-white text-sm" />
                  ) : (
                    <ChatIcon className="text-white text-sm" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-base">
                    {isPublic ? "Bus Assistant" : "Bus Chat"}
                  </h2>
                  {busInfo && (
                    <p className="text-xs opacity-90">
                      {busInfo.busNumber} · {busInfo.route}
                    </p>
                  )}
                </div>
              </div>

              {!isPublic && busInfo?.currentCrowdLevel && (
                <div className="mr-1">
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      busInfo.currentCrowdLevel === "Low"
                        ? "bg-green-500"
                        : busInfo.currentCrowdLevel === "Medium"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    } text-white`}
                  >
                    {busInfo.currentCrowdLevel}
                    {busInfo.currentCount > 0 && ` (${busInfo.currentCount})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 bg-gray-50 bg-opacity-80"
            style={{
              backgroundImage:
                "url('https://www.transparenttextures.com/patterns/cubes.png')",
            }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center mt-10">
                <p className="text-red-500">{error}</p>
                <button
                  className="mt-2 px-3 py-1 text-sm border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
                  onClick={() => loadMessages(busId)}
                >
                  Try Again
                </button>
              </div>
            ) : allMessages.length > 0 ? (
              <div className="space-y-3">
                {allMessages.map((msg, index) => {
                  const isSelf =
                    user &&
                    (msg.sender?._id === user._id || msg.sender?._id === user.id || msg.sender === user._id || msg.sender === user.id);
                  const isSystemOrBot =
                    msg.isSystem ||
                    msg.messageType === "ai_response" ||
                    msg.sender?.name === "Bus Assistant" ||
                    msg.senderName === "Bus Assistant";
                  const isAdmin =
                    msg.sender?.role === "admin" || msg.senderRole === "admin";
                  const senderName =
                    msg.sender?.name || msg.senderName || "Anonymous";

                  return (
                    <div
                      key={msg._id || `temp-${index}`}
                      className={`flex ${
                        isSelf ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      {(isSystemOrBot || !isSelf) && (
                        <div
                          className={`flex-shrink-0 ${
                            isSelf ? "ml-2" : "mr-2"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${
                              isSystemOrBot
                                ? "bg-amber-500"
                                : isAdmin
                                ? "bg-purple-500"
                                : "bg-gray-500"
                            }`}
                          >
                            {isSystemOrBot ? (
                              <SmartToyIcon className="text-white text-sm" />
                            ) : isAdmin ? (
                              <AdminPanelSettingsIcon className="text-white text-sm" />
                            ) : (
                              <PersonIcon className="text-white text-sm" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={`flex flex-col max-w-[85%] ${
                          isSelf ? "items-end" : "items-start"
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            isSelf ? "text-right" : "text-left"
                          }`}
                        >
                          {isSystemOrBot ? "Bus Assistant" : senderName}
                          {isAdmin && !isSystemOrBot && " (Admin)"}
                        </span>

                        <div
                          className={`mt-1 p-3 rounded-2xl ${
                            isSystemOrBot
                              ? "bg-amber-50 rounded-tl-none"
                              : isSelf
                              ? "bg-blue-50 rounded-tr-none"
                              : isAdmin
                              ? "bg-purple-50 rounded-tl-none"
                              : "bg-white rounded-tl-none"
                          } shadow-sm ${msg.pending ? "opacity-70" : ""}`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>

                        <span
                          className={`text-xs text-gray-500 mt-1 ${
                            isSelf ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <div className="flex">
                    <div className="flex-shrink-0 mr-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 shadow-sm">
                        <SmartToyIcon className="text-white text-sm" />
                      </div>
                    </div>

                    <div className="flex flex-col max-w-[85%]">
                      <div className="mt-1 p-3 rounded-2xl bg-amber-50 rounded-tl-none shadow-sm">
                        <div className="flex items-center">
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                              style={{ animationDelay: "200ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                              style={{ animationDelay: "400ms" }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-500">
                            Typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div
                  className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    isPublic
                      ? "bg-amber-100 text-amber-500"
                      : "bg-blue-100 text-blue-500"
                  }`}
                >
                  {isPublic ? (
                    <SmartToyIcon className="text-3xl" />
                  ) : (
                    <ChatIcon className="text-3xl" />
                  )}
                </div>

                <h3 className="font-medium mb-2">
                  {isPublic
                    ? "Welcome to Bus Assistant!"
                    : "Welcome to Bus Chat!"}
                </h3>

                <p className="text-gray-600 text-sm">
                  {isPublic
                    ? "Ask questions about schedule, stops, or capacity"
                    : "Connect with other passengers and bus staff"}
                </p>

                {busInfo && (
                  <div className="mt-4 mb-2">
                    <p className="text-blue-600 font-medium mb-2">
                      {busInfo.busNumber} - {busInfo.route}
                    </p>

                    {busInfo.currentCrowdLevel &&
                      busInfo.currentCrowdLevel !== "Unknown" && (
                        <div className="flex items-center justify-center mt-2">
                          <span className="text-gray-600 text-sm">
                            Current Crowd:
                          </span>
                          <span
                            className={`ml-1 text-sm font-bold ${
                              busInfo.currentCrowdLevel === "Low"
                                ? "text-green-500"
                                : busInfo.currentCrowdLevel === "Medium"
                                ? "text-yellow-600"
                                : "text-red-500"
                            }`}
                          >
                            {busInfo.currentCrowdLevel}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                <button
                  className={`mt-4 px-4 py-1 text-sm rounded-full border flex items-center ${
                    isPublic
                      ? "border-amber-500 text-amber-500 hover:bg-amber-50"
                      : "border-blue-500 text-blue-500 hover:bg-blue-50"
                  }`}
                  onClick={() => inputRef.current?.focus()}
                >
                  Start Chatting
                  <ArrowForwardIcon className="ml-1 text-sm" />
                </button>
              </div>
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-gray-100"
          >
            <div className="flex items-center">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder={
                  isPublic
                    ? "Ask about bus schedules, stops..."
                    : "Type your message..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                ref={inputRef}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={!input.trim() || typing}
                className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center shadow transition-all duration-200 ${
                  !input.trim() || typing
                    ? "bg-gray-300 cursor-not-allowed"
                    : isPublic
                    ? "bg-amber-500 hover:bg-amber-600 hover:scale-105"
                    : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                } text-white`}
              >
                <SendIcon className="text-sm" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
