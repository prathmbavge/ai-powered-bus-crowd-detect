const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  busId: {
    type: Schema.Types.ObjectId,
    ref: "Bus",
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
    // null means the message is for everyone in the bus chat
  },
  text: {
    type: String,
    required: true,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  messageType: {
    type: String,
    enum: ["text", "notification", "ai_response"],
    default: "text",
  },
});

module.exports = mongoose.model("Message", MessageSchema);
