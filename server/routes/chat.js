const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");

const Bus = require("../models/Bus");
const Message = require("../models/Message");
const User = require("../models/User");

// @route    GET api/chat/:busId
// @desc     Get chat messages for a specific bus
// @access   Private
router.get("/:busId", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Get messages for this bus with sender and recipient info
    const messages = await Message.find({ busId: req.params.busId })
      .populate("sender", "name role")
      .populate("recipient", "name role")
      .sort({ createdAt: 1 });

    // Filter messages based on user role and recipient
    const userId = req.user.id;
    const userRole = req.user.role;

    const filteredMessages = messages.filter((message) => {
      // Public messages for everyone
      if (!message.recipient) return true;

      // Private messages where user is sender or recipient
      if (
        message.recipient &&
        (message.sender._id.toString() === userId ||
          message.recipient._id.toString() === userId)
      ) {
        return true;
      }

      // Admins can see all messages
      if (userRole === "admin") return true;

      // Bus creator can see all messages for their bus
      if (bus.createdBy.toString() === userId) return true;

      return false;
    });

    res.json(filteredMessages);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    POST api/chat/:busId
// @desc     Send a message in the bus chat
// @access   Private
router.post(
  "/:busId",
  [auth, [check("text", "Message text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const bus = await Bus.findById(req.params.busId);
      if (!bus) {
        return res.status(404).json({ msg: "Bus not found" });
      }

      const user = await User.findById(req.user.id).select("-password");

      // Create new message
      const newMessage = new Message({
        busId: req.params.busId,
        sender: req.user.id,
        text: req.body.text,
        messageType: req.body.messageType || "text",
        isSystem: req.body.isSystem || false,
      });

      // Handle private messages
      if (req.body.recipientId) {
        const recipient = await User.findById(req.body.recipientId);
        if (!recipient) {
          return res.status(404).json({ msg: "Recipient user not found" });
        }
        newMessage.recipient = recipient._id;
      }

      const message = await newMessage.save();

      // Populate sender and recipient info before returning
      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name role")
        .populate("recipient", "name role");

      // If using Socket.io, emit the new message to relevant users
      if (req.app.get("io")) {
        // For public messages, send to the bus chat room
        if (!populatedMessage.recipient) {
          req.app
            .get("io")
            .to(`chat:${req.params.busId}`)
            .emit("chatMessage", populatedMessage);

          console.log(`Public message sent to chat:${req.params.busId}`);
        }
        // For private messages, send to specific users
        else {
          // Send to sender's socket
          req.app
            .get("io")
            .to(`user:${req.user.id}`)
            .emit("chatMessage", populatedMessage);

          // Send to recipient's socket
          req.app
            .get("io")
            .to(`user:${populatedMessage.recipient._id}`)
            .emit("chatMessage", populatedMessage);

          console.log(
            `Private message sent between users ${req.user.id} and ${populatedMessage.recipient._id}`
          );
        }
      }

      res.json(populatedMessage);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    POST api/chat/:busId/ai-response
// @desc     Get AI response for a bus-related question
// @access   Public
router.post(
  "/:busId/ai-response",
  [check("text", "Question text is required").not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const bus = await Bus.findById(req.params.busId);
      if (!bus) {
        return res.status(404).json({ msg: "Bus not found" });
      }

      const question = req.body.text;
      let aiResponse = "";

      // Check for common bus-related questions
      const lowerQuestion = question.toLowerCase();

      if (
        lowerQuestion.includes("schedule") ||
        lowerQuestion.includes("timing") ||
        lowerQuestion.includes("when")
      ) {
        aiResponse = `Bus ${bus.busNumber} runs on route ${bus.route} regularly throughout the day. Please check the schedule board for exact timings.`;
      } else if (
        lowerQuestion.includes("route") ||
        lowerQuestion.includes("stop") ||
        lowerQuestion.includes("destination") ||
        lowerQuestion.includes("where")
      ) {
        aiResponse = `Bus ${bus.busNumber} travels on route ${bus.route}. It makes all regular stops along this route.`;
      } else if (
        lowerQuestion.includes("crowd") ||
        lowerQuestion.includes("busy") ||
        lowerQuestion.includes("full")
      ) {
        aiResponse = `Currently, the crowd level on bus ${bus.busNumber} is ${
          bus.currentCrowdLevel || "Unknown"
        }. ${
          bus.currentCount
            ? `There are approximately ${bus.currentCount} passengers on board.`
            : ""
        }`;
      } else if (lowerQuestion.includes("capacity")) {
        aiResponse = `Bus ${bus.busNumber} has a maximum capacity of ${
          bus.capacity
        } passengers. Currently, the crowd level is ${
          bus.currentCrowdLevel || "Unknown"
        }.`;
      } else if (
        lowerQuestion.includes("hello") ||
        lowerQuestion.includes("hi") ||
        lowerQuestion.includes("hey")
      ) {
        aiResponse = `Hello! How can I help you with bus ${bus.busNumber} today? You can ask about routes, schedules, or crowd levels.`;
      } else if (lowerQuestion.includes("thank")) {
        aiResponse =
          "You're welcome! Let me know if you need any other information about your journey.";
      } else {
        aiResponse = `Thank you for your question about bus ${bus.busNumber}. For specific information about this bus route, schedules, or current status, please contact the bus operator or check the official transit app.`;
      }

      // Create AI response message
      const aiMessage = new Message({
        busId: req.params.busId,
        sender: null, // System message
        text: aiResponse,
        isSystem: true,
        messageType: "ai_response",
      });

      const savedMessage = await aiMessage.save();

      // Add system information to the message for display
      const responseWithMeta = {
        ...savedMessage.toObject(),
        sender: { name: "Bus Assistant" },
      };

      // Send AI response through socket if available
      if (req.app.get("io")) {
        req.app
          .get("io")
          .to(`chat:${req.params.busId}`)
          .emit("chatMessage", responseWithMeta);
      }

      res.json(responseWithMeta);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    GET api/chat/:busId/mark-read
// @desc     Mark all messages as read for a user in a bus chat
// @access   Private
router.get("/:busId/mark-read", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Mark all messages where user is recipient as read
    await Message.updateMany(
      {
        busId: req.params.busId,
        recipient: req.user.id,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.json({ msg: "Messages marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
