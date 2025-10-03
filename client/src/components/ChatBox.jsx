import React, { useState, useEffect, useRef, useContext } from "react";
import { WebSocketContext } from "../contexts/WebSocketContext";
import { AuthContext } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

// Icons
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const ChatBox = ({ bus, onClose }) => {
  const [newMessage, setNewMessage] = useState("");
  const [privateMode, setPrivateMode] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const { user } = useContext(AuthContext);
  const {
    socket,
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    getMessagesForBus,
  } = useContext(WebSocketContext);
  const { messages, loading, error, loadMessages, sendMessage, currentBusId } =
    useChat();

  const busId = bus?._id;
  const busCreatorId = bus?.createdBy;
  const messagesEndRef = useRef(null);
  const busMessages = getMessagesForBus(busId);

  // Fetch chat messages when component mounts
  useEffect(() => {
    if (busId && currentBusId !== busId) {
      loadMessages(busId);
      joinChatRoom(busId);
    }

    // Cleanup on unmount
    return () => {
      if (busId) {
        leaveChatRoom(busId);
      }
    };
  }, [busId, currentBusId, loadMessages, joinChatRoom, leaveChatRoom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, busMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Merge messages from context and websocket
  const allMessages = [
    ...messages,
    ...busMessages.filter(
      (m) => !messages.some((existingMsg) => existingMsg._id === m._id)
    ),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const messageContainer = messagesEndRef.current?.parentElement;
    if (messageContainer) {
      const isScrolledToBottom =
        messageContainer.scrollHeight - messageContainer.clientHeight <=
        messageContainer.scrollTop + 100; // Within 100px of bottom

      if (isScrolledToBottom) {
        scrollToBottom();
      }
    }
  }, [allMessages.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // First try the WebSocket direct method
      const recipientId =
        privateMode && selectedRecipient ? selectedRecipient._id : null;
      const sent = sendChatMessage(busId, newMessage, recipientId);

      if (!sent) {
        // Fallback to API method
        await sendMessage(busId, newMessage, recipientId);
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Toggle private messaging mode
  const togglePrivateMode = (recipient = null) => {
    if (recipient) {
      setSelectedRecipient(recipient);
      setPrivateMode(true);
    } else {
      setPrivateMode(!privateMode);
      if (!privateMode) {
        setSelectedRecipient(null);
      }
    }
  };

  // Determine if current user is bus creator/admin
  const isAdmin = user && user.role === "admin";
  const isCreator = user && busCreatorId && (user._id === busCreatorId || user.id === busCreatorId);
  const canManageBus = isAdmin || isCreator;

  // Removed the duplicate allMessages definition

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${bus?.busNumber || "Bus"} Chat Window`}
    >
      <div
        className={`w-full max-w-[640px] h-[80vh] max-h-[640px] flex flex-col rounded-2xl overflow-hidden shadow-[0_10px_40px_-5px_rgba(0,0,0,0.35)] bg-white relative
        ${
          socket && !socket.connected
            ? "border border-red-200"
            : "border border-transparent"
        }`}
      >
        {/* Decorative gradient border ring */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
        {/* Chat header */}
        <div className="p-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center mr-2 font-semibold text-lg">
              <span
                className={`w-2 h-2 rounded-full bg-green-500 mr-2 inline-block ${
                  allMessages.length > 0 ? "animate-pulse" : ""
                }`}
              />
              {bus?.busNumber} Chat
              {busMessages.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {busMessages.length > 99 ? "99+" : busMessages.length}
                </span>
              )}
            </div>

            {canManageBus && (
              <span className="inline-flex items-center px-2 py-1 bg-opacity-20 bg-white text-xs rounded border border-white border-opacity-25">
                <AdminPanelSettingsIcon
                  className="text-white mr-1"
                  style={{ fontSize: 16 }}
                />
                {isCreator ? "Owner" : "Admin"}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center"
            aria-label="Close chat"
          >
            <CloseIcon className="text-white" />
          </button>
        </div>

        {privateMode && selectedRecipient && (
          <div className="p-2 bg-blue-50 flex justify-between items-center">
            <p className="text-sm">
              Private chat with:{" "}
              <span className="font-bold">{selectedRecipient.name}</span>
            </p>
            <button
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-full"
              onClick={() => togglePrivateMode(null)}
            >
              Back to Public Chat
            </button>
          </div>
        )}

        {/* Messages area */}
        <div
          className="flex-grow overflow-auto p-4 bg-gray-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), url('https://www.transparenttextures.com/patterns/cubes.png')",
          }}
        >
          {loading ? (
            <div className="flex justify-center mt-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center mt-10">
              <p className="text-red-600">{error}</p>
              <button
                className="mt-4 px-4 py-1 text-sm border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
                onClick={() => loadMessages(busId)}
              >
                Try Again
              </button>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center mt-10">
              <p className="text-gray-500">
                No messages yet. Start the conversation!
              </p>
              {canManageBus && (
                <p className="text-gray-500 mt-2 text-sm">
                  As {isCreator ? "the bus owner" : "an admin"}, you can help
                  passengers with their queries.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {allMessages.map((msg, index) => {
                const isSelf =
                  user &&
                  (msg.sender?._id === user.id || msg.sender === user.id);

                const isPrivate =
                  msg.recipient &&
                  (msg.recipient === user?.id ||
                    msg.recipient?._id === user?.id ||
                    msg.sender === user?.id ||
                    msg.sender?._id === user?.id);

                const senderName =
                  msg.sender?.name || msg.senderName || "Unknown";
                const isAdmin =
                  msg.sender?.role === "admin" || msg.senderRole === "admin";

                return (
                  <div
                    key={msg._id || `temp-${index}`}
                    className={`flex flex-col py-1 animate-fadeIn ${
                      isSelf ? "items-end text-right" : "items-start text-left"
                    }`}
                  >
                    <div
                      className={`flex items-center mb-1 w-full ${
                        isSelf ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shadow mr-2
                        ${
                          isAdmin
                            ? "bg-purple-600"
                            : isSelf
                            ? "bg-blue-600"
                            : "bg-gray-600"
                        }`}
                      >
                        {senderName?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="text-xs text-gray-500">
                        {senderName} {isAdmin && "👑"} •{" "}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isPrivate && (
                        <span className="ml-2 px-1.5 py-0.5 text-[0.6rem] border border-blue-400 text-blue-500 rounded-full">
                          Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-3 max-w-[80%] shadow-sm relative transition-colors duration-200
                        ${
                          isPrivate
                            ? isSelf
                              ? "bg-blue-50 hover:bg-blue-100 border border-blue-200"
                              : "bg-green-50 hover:bg-green-100 border border-green-200"
                            : isSelf
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "bg-white hover:bg-gray-50"
                        }
                        ${
                          isSelf
                            ? "rounded-[20px] rounded-br-none"
                            : "rounded-[20px] rounded-bl-none"
                        }
                        ${msg.pending ? "opacity-70" : "opacity-100"}
                      `}
                      >
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>

                      {!isSelf && !isPrivate && canManageBus && (
                        <button
                          className="p-1 text-blue-500 opacity-50 hover:opacity-100 rounded-full hover:bg-blue-50"
                          onClick={() =>
                            togglePrivateMode({
                              _id: msg.sender?._id || msg.sender,
                              name: senderName,
                            })
                          }
                        >
                          <PersonIcon style={{ fontSize: "1rem" }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="p-3 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex flex-col">
            {privateMode && selectedRecipient && (
              <span className="text-xs text-blue-600 mb-2">
                Sending private message to: {selectedRecipient.name}
              </span>
            )}

            <div className="flex">
              <input
                type="text"
                placeholder={
                  privateMode && selectedRecipient
                    ? `Private message to ${selectedRecipient.name}...`
                    : "Type a message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={`flex-1 mr-2 px-4 py-2 rounded-full border ${
                  privateMode && selectedRecipient
                    ? "bg-blue-50 border-blue-200"
                    : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-400`}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className={`rounded-full min-w-[42px] w-[42px] h-[42px] flex items-center justify-center shadow transition-all duration-200 ${
                  !newMessage.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : privateMode
                    ? "bg-purple-600 hover:bg-purple-700 hover:scale-105"
                    : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                } text-white`}
              >
                <SendIcon style={{ fontSize: "1.2rem" }} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
