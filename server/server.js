const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const busRoutes = require("./routes/buses");
const detectionRoutes = require("./routes/detection");
const chatRoutes = require("./routes/chat");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import models
const Bus = require("./models/Bus");
const Message = require("./models/Message");
const User = require("./models/User");

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // User authentication and tracking
  socket.on("authenticate", async (userData) => {
    if (!userData || !userData.userId) {
      console.log("Authentication failed: Missing user data");
      return;
    }

    try {
      // Associate socket with user
      socket.userId = userData.userId;
      socket.userRole = userData.role;

      // Join user's personal room for private messages
      socket.join(`user:${userData.userId}`);

      console.log(
        `User ${userData.userId} authenticated with socket ${socket.id}`
      );

      // Update user's last active status
      await User.findByIdAndUpdate(userData.userId, {
        lastActive: new Date(),
      });
    } catch (err) {
      console.error("Error in socket authentication:", err);
    }
  });

  // Bus monitoring subscription
  socket.on("subscribe", (busId) => {
    if (!busId) return;
    console.log(`Client ${socket.id} subscribed to bus ${busId}`);
    socket.join(`bus:${busId}`);
  });

  socket.on("unsubscribe", (busId) => {
    if (!busId) return;
    console.log(`Client ${socket.id} unsubscribed from bus ${busId}`);
    socket.leave(`bus:${busId}`);
  });

  // Chat functionality
  socket.on("joinChat", async (data) => {
    if (!data || !data.busId) return;

    const { busId, userId, role } = data;
    console.log(`Client ${socket.id} joined chat for bus ${busId}`);

    // Join chat room
    socket.join(`chat:${busId}`);

    try {
      // Get bus details
      const bus = await Bus.findById(busId);

      if (bus) {
        // Send welcome message
        socket.emit("chatMessage", {
          _id: `welcome-${Date.now()}`,
          busId,
          text: `Welcome to the chat for Bus ${bus.busNumber} (Route: ${bus.route})`,
          sender: { name: "System", role: "system" },
          isSystem: true,
          messageType: "notification",
          createdAt: new Date(),
        });

        // Notify others if user is identified
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            // Notify only the bus room, not the joining user
            socket.to(`chat:${busId}`).emit("chatMessage", {
              _id: `join-${Date.now()}`,
              busId,
              text: `${user.name} has joined the chat`,
              sender: { name: "System", role: "system" },
              isSystem: true,
              messageType: "notification",
              createdAt: new Date(),
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in joinChat:", err);
    }
  });

  socket.on("leaveChat", (data) => {
    if (!data || !data.busId) return;

    const { busId, userId } = data;
    console.log(`Client ${socket.id} left chat for bus ${busId}`);
    socket.leave(`chat:${busId}`);

    // Notify others if user is identified (async without waiting)
    if (userId) {
      (async () => {
        try {
          const user = await User.findById(userId);
          if (user) {
            io.to(`chat:${busId}`).emit("chatMessage", {
              _id: `leave-${Date.now()}`,
              busId,
              text: `${user.name} has left the chat`,
              sender: { name: "System", role: "system" },
              isSystem: true,
              messageType: "notification",
              createdAt: new Date(),
            });
          }
        } catch (err) {
          console.error("Error in leaveChat notification:", err);
        }
      })();
    }
  });

  // Handle chat messages from clients
  socket.on("chatMessage", async (data) => {
    try {
      if (!data || !data.busId || !data.text) {
        return socket.emit("error", { message: "Invalid chat message data" });
      }

      // Validate user (socket should be authenticated)
      if (!socket.userId && !data.sender) {
        return socket.emit("error", { message: "Authentication required" });
      }

      const userId = socket.userId || data.sender;

      console.log(
        `Socket message received for bus ${
          data.busId
        } from user ${userId}: ${data.text.substring(0, 30)}...`
      );

      // Create database message
      const newMessage = new Message({
        busId: data.busId,
        sender: userId,
        text: data.text,
        createdAt: new Date(),
      });

      // Handle private messages
      if (data.recipient) {
        newMessage.recipient = data.recipient;
      }

      // Save message to database
      const savedMessage = await newMessage.save();

      // Get sender info for response
      const user = await User.findById(userId).select("name role");

      // Prepare message with sender info
      const messageToSend = {
        ...savedMessage.toObject(),
        sender: {
          _id: userId,
          name: data.senderName || user?.name || "Unknown",
          role: data.senderRole || user?.role || "passenger",
        },
      };

      if (data.recipient) {
        // For private messages, also include recipient info
        const recipient = await User.findById(data.recipient).select(
          "name role"
        );
        if (recipient) {
          messageToSend.recipient = {
            _id: recipient._id,
            name: recipient.name,
            role: recipient.role,
          };

          // Send only to sender and recipient
          io.to(`user:${userId}`)
            .to(`user:${data.recipient}`)
            .emit("chatMessage", messageToSend);
        } else {
          // Recipient not found, just send to sender
          socket.emit("chatMessage", messageToSend);
        }
      } else {
        // Public message - broadcast to everyone in the bus chat room
        io.to(`chat:${data.busId}`).emit("chatMessage", messageToSend);
      }
    } catch (err) {
      console.error("Error handling socket chat message:", err);
      socket.emit("error", { message: "Error processing chat message" });
    }
  });

  // Handle crowd updates from detection system
  socket.on("crowdUpdate", async (data) => {
    if (!data || !data.busId) return;

    try {
      // Update the bus in the database
      await Bus.findByIdAndUpdate(data.busId, {
        currentCrowdLevel: data.crowdLevel,
        currentCount: data.count,
        updatedAt: new Date(),
      });

      // Broadcast to subscribers
      io.to(`bus:${data.busId}`).emit("crowdUpdate", {
        busId: data.busId,
        crowdLevel: data.crowdLevel,
        count: data.count,
        timestamp: new Date(),
      });

      console.log(
        `Crowd update for bus ${data.busId}: Level ${data.crowdLevel}, Count ${data.count}`
      );
    } catch (err) {
      console.error("Error handling crowd update:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(
      `Client disconnected: ${socket.id}, User: ${socket.userId || "unknown"}`
    );

    // If we know the user ID, update their last active status
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date(),
      }).catch((err) => {
        console.error("Error updating user last active status:", err);
      });
    }
  });
});

// Make io available to routes
app.set("io", io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/detection", detectionRoutes);
app.use("/api/chat", chatRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// API Routes test
app.get("/api/routes-test", (req, res) => {
  // Get all registered routes
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Route directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods);
          const basePath = middleware.regexp
            .toString()
            .replace("/^\\", "")
            .replace("\\/?(?=\\/|$)/i", "")
            .replace(/\\\//g, "/");

          // Clean up the base path
          const cleanBasePath = basePath
            .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ":param")
            .replace(/\\/g, "");

          routes.push({
            path: cleanBasePath + path,
            methods: methods,
          });
        }
      });
    }
  });

  res.json({
    status: "success",
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    message: "These are all registered API routes.",
  });
});

// Define port
const PORT = process.env.PORT || 4000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
