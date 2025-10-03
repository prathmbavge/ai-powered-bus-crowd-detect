const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const auth = require("../middleware/auth");

const Bus = require("../models/Bus");

// ---------------- Multer (File Upload) Configuration ----------------
const MAX_FILE_SIZE_MB = 100;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename (remove spaces & problematic chars)
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("video/")) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only video files are allowed"
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// Helper to run a multer middleware and surface errors cleanly
const runMulterSingle = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      let msg = err.message;
      if (err.code === "LIMIT_FILE_SIZE") {
        msg = `File too large. Max size is ${MAX_FILE_SIZE_MB}MB`;
      } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
        msg = "Invalid file type. Only video files are allowed.";
      }
      return res.status(400).json({ msg });
    }
    return res.status(500).json({ msg: "Upload failed", details: err.message });
  });
};

// @route    POST api/detection/start/:busId
// @desc     Start monitoring for a bus
// @access   Private
router.post("/start/:busId", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Verify that the current user is an admin or the creator of the bus
    if (req.user.role !== "admin" && req.user.id !== bus.createdBy.toString()) {
      return res
        .status(401)
        .json({ msg: "Not authorized to start monitoring for this bus" });
    }

    // Update bus status to monitoring
    bus.isMonitoring = true;
    bus.currentCrowdLevel = "Unknown";
    await bus.save();

    // Notify clients via Socket.IO
    const io = req.app.get("io");
    io.to(`bus:${bus._id}`).emit("monitoring:started", {
      busId: bus._id,
      status: "started",
    });

    res.json({
      msg: "Monitoring started",
      bus,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    POST api/detection/stop/:busId
// @desc     Stop monitoring for a bus
// @access   Private
router.post("/stop/:busId", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Verify that the current user is an admin or the creator of the bus
    if (req.user.role !== "admin" && req.user.id !== bus.createdBy.toString()) {
      return res
        .status(401)
        .json({ msg: "Not authorized to stop monitoring for this bus" });
    }

    // Update bus status
    bus.isMonitoring = false;
    await bus.save();

    // Notify clients via Socket.IO
    const io = req.app.get("io");
    io.to(`bus:${bus._id}`).emit("monitoring:stopped", {
      busId: bus._id,
      status: "stopped",
    });

    res.json({
      msg: "Monitoring stopped",
      bus,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    GET api/detection/video-status/:busId
// @desc     Check video processing status
// @access   Private
router.get("/video-status/:busId", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // If bus has no processing task
    if (!bus.videoProcessingTaskId) {
      return res
        .status(400)
        .json({ msg: "No video processing task found for this bus" });
    }

    // Get status from Python service
    const pythonResponse = await axios.get(
      `${process.env.PYTHON_API_URL}/video-status/${bus.videoProcessingTaskId}`
    );

    const status = pythonResponse.data;

    // If processing completed, update bus data
    if (status.status === "completed") {
      bus.currentCount = status.max_count;
      bus.currentCrowdLevel = status.max_level;
      bus.videoProcessingStatus = "completed";
      bus.updatedAt = Date.now();
      await bus.save();

      // Notify clients via Socket.IO
      const io = req.app.get("io");
      io.to(`bus:${bus._id}`).emit("video:completed", {
        busId: bus._id,
        count: status.max_count,
        level: status.max_level,
        results: status.results,
      });
    } else if (status.status === "error") {
      // Update status if error
      bus.videoProcessingStatus = "error";
      await bus.save();

      // Notify clients
      const io = req.app.get("io");
      io.to(`bus:${bus._id}`).emit("video:error", {
        busId: bus._id,
        error: status.error,
      });
    }

    res.json({
      busId: bus._id,
      taskId: bus.videoProcessingTaskId,
      ...status,
    });
  } catch (err) {
    console.error("Video status check error:", err.message);
    res.status(500).json({
      error: "Server Error",
      details: err.message,
    });
  }
});

// @route    POST api/detection/process-video/:busId
// @desc     Process video for detection
// @access   Private
router.post(
  "/process-video/:busId",
  auth,
  runMulterSingle("video"),
  async (req, res) => {
    try {
      const bus = await Bus.findById(req.params.busId);
      if (!bus) return res.status(404).json({ msg: "Bus not found" });

      if (
        req.user.role !== "admin" &&
        req.user.id !== bus.createdBy.toString()
      ) {
        return res
          .status(401)
          .json({ msg: "Not authorized to process videos for this bus" });
      }

      if (!req.file)
        return res.status(400).json({ msg: "No video file provided" });

      if (!process.env.PYTHON_API_URL) {
        // Clean up file immediately if we cannot proceed
        fs.unlink(req.file.path, () => {});
        return res
          .status(500)
          .json({ msg: "Python service URL not configured" });
      }

      // Stream video to Python service
      const formData = new FormData();
      formData.append("video", fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append("busId", req.params.busId);

      let pythonResponse;
      try {
        pythonResponse = await axios.post(
          `${process.env.PYTHON_API_URL}/detect-video`,
          formData,
          { headers: { ...formData.getHeaders() }, timeout: 1000 * 60 * 5 }
        );
      } catch (pythonErr) {
        console.error("Python service error:", pythonErr.message);
        fs.unlink(req.file.path, () => {});
        return res.status(502).json({
          msg: "Video received but processing service failed",
          details: pythonErr.message,
        });
      }

      // Remove temp file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      const taskId = pythonResponse.data.task_id;
      bus.videoProcessingTaskId = taskId;
      bus.videoProcessingStatus = "processing";
      bus.updatedAt = Date.now();
      await bus.save();

      const io = req.app.get("io");
      io.to(`bus:${bus._id}`).emit("video:processing", {
        busId: bus._id,
        taskId,
        status: "processing",
      });

      return res.json({ busId: bus._id, taskId, status: "processing" });
    } catch (err) {
      console.error("Video detection error:", err.message);
      return res
        .status(500)
        .json({ error: "Server Error", details: err.message });
    }
  }
);

// @route    POST api/detection/process/:busId
// @desc     Process image for detection
// @access   Private
router.post(
  "/process/:busId",
  [auth, upload.single("image")],
  async (req, res) => {
    try {
      const bus = await Bus.findById(req.params.busId);

      if (!bus) {
        return res.status(404).json({ msg: "Bus not found" });
      }

      if (!bus.isMonitoring) {
        return res
          .status(400)
          .json({ msg: "Bus is not currently being monitored" });
      }

      let imageData;

      // Check if file was uploaded or if base64 image was sent
      if (req.file) {
        const fd = new FormData();
        fd.append("image", fs.createReadStream(req.file.path));

        // Send to Python service for processing
        const pythonResponse = await axios.post(
          `${process.env.PYTHON_API_URL}/detect`,
          fd,
          { headers: { ...fd.getHeaders() } }
        );

        // Delete the uploaded file after processing
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });

        imageData = pythonResponse.data;
      } else if (req.body.image) {
        // If base64 image was sent
        const pythonResponse = await axios.post(
          `${process.env.PYTHON_API_URL}/detect`,
          {
            image: req.body.image,
          }
        );

        imageData = pythonResponse.data;
      } else {
        return res.status(400).json({ msg: "No image provided" });
      }

      // Update bus with detection results
      bus.currentCount = imageData.count;
      bus.currentCrowdLevel = imageData.level;
      bus.updatedAt = Date.now();
      await bus.save();

      // Notify clients via Socket.IO
      const io = req.app.get("io");
      io.to(`bus:${bus._id}`).emit("detection:update", {
        busId: bus._id,
        count: imageData.count,
        level: imageData.level,
        timestamp: Date.now(),
      });

      res.json({
        busId: bus._id,
        count: imageData.count,
        level: imageData.level,
      });
    } catch (err) {
      console.error("Detection process error:", err.message);
      res.status(500).json({
        error: "Server Error",
        details: err.message,
      });
    }
  }
);

module.exports = router;
