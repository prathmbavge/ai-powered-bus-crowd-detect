const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");

const Bus = require("../models/Bus");

// @route    GET api/buses
// @desc     Get all buses
// @access   Private
router.get("/", auth, async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });
    res.json(buses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    GET api/buses/user/created
// @desc     Get buses created by the current user
// @access   Private
router.get("/user/created", auth, async (req, res) => {
  try {
    const buses = await Bus.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email')
      .sort({
      updatedAt: -1,
    });
    res.json(buses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    GET api/buses/:id
// @desc     Get bus by ID
// @access   Private
router.get("/:id", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    res.json(bus);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    POST api/buses
// @desc     Create a bus
// @access   Private
router.post(
  "/",
  [
    auth,
    [
      check("busNumber", "Bus number is required").not().isEmpty(),
      check("route", "Route is required").not().isEmpty(),
      check(
        "capacity",
        "Capacity is required and must be a number"
      ).isNumeric(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if bus number already exists
      const existingBus = await Bus.findOne({ busNumber: req.body.busNumber });
      if (existingBus) {
        return res
          .status(400)
          .json({ msg: "Bus with this number already exists" });
      }

      const { busNumber, route, capacity, status, streamUrl } = req.body;

      const newBus = new Bus({
        busNumber,
        route,
        capacity,
        status: status || "inactive",
        streamUrl: streamUrl || null,
        createdBy: req.user.id, // Add the user ID as creator
      });

      const bus = await newBus.save();
      res.json(bus);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    PUT api/buses/:id
// @desc     Update a bus
// @access   Private
router.put("/:id", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Verify that the current user is either an admin or the creator of the bus
    if (req.user.role !== "admin" && bus.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to update this bus" });
    }

    // Check if updating to an existing bus number
    if (req.body.busNumber && req.body.busNumber !== bus.busNumber) {
      const existingBus = await Bus.findOne({ busNumber: req.body.busNumber });
      if (existingBus) {
        return res
          .status(400)
          .json({ msg: "Bus with this number already exists" });
      }
    }

    // Update fields
    const updateFields = {};
    if (req.body.busNumber) updateFields.busNumber = req.body.busNumber;
    if (req.body.route) updateFields.route = req.body.route;
    if (req.body.capacity) updateFields.capacity = req.body.capacity;
    if (req.body.status) updateFields.status = req.body.status;
    if (req.body.streamUrl !== undefined)
      updateFields.streamUrl = req.body.streamUrl;
    if (req.body.lastLocation)
      updateFields.lastLocation = req.body.lastLocation;
    if (req.body.currentCrowdLevel)
      updateFields.currentCrowdLevel = req.body.currentCrowdLevel;
    if (req.body.currentCount !== undefined)
      updateFields.currentCount = req.body.currentCount;
    if (req.body.isMonitoring !== undefined)
      updateFields.isMonitoring = req.body.isMonitoring;

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json(updatedBus);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    DELETE api/buses/:id
// @desc     Delete a bus
// @access   Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Check if the user is an admin or the creator of the bus
    if (req.user.role !== "admin" && bus.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to delete this bus" });
    }

    // Also delete any messages associated with this bus
    const Message = require("../models/Message");
    await Message.deleteMany({ busId: req.params.id });

    await bus.deleteOne();
    res.json({ msg: "Bus removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    POST api/buses/:id/upload-video
// @desc     Upload a video for bus crowd detection
// @access   Private (only creator)
router.post("/:id/upload-video", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Verify that the current user is the creator of the bus
    if (bus.createdBy.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "Not authorized to upload videos for this bus" });
    }

    // In a real application, you'd handle the video upload here
    // For now, we'll just update the videoUrl field with the URL passed in the request
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ msg: "Video URL is required" });
    }

    bus.videoUrl = videoUrl;
    await bus.save();

    // Trigger crowd detection processing
    // This would normally call your Python ML service
    // For now, we'll just update with a placeholder response
    bus.currentCount = Math.floor(Math.random() * 30) + 5;
    bus.currentCrowdLevel =
      bus.currentCount > 30 ? "High" : bus.currentCount > 15 ? "Medium" : "Low";
    await bus.save();

    res.json(bus);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// This route has been moved above the /:id route

// @route    POST api/buses/:id/public-link
// @desc     Generate or refresh public access token for a bus
// @access   Private (only creator)
router.post("/:id/public-link", auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({ msg: "Bus not found" });
    }

    // Verify that the current user is the creator of the bus
    if (bus.createdBy.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "Not authorized to generate public link for this bus" });
    }

    // Generate a random token using crypto
    const crypto = require("crypto");
    const publicAccessToken = crypto.randomBytes(32).toString("hex");

    // Update the bus with the new token
    bus.publicAccessToken = publicAccessToken;
    await bus.save();

    res.json({
      busId: bus._id,
      publicAccessToken,
      publicLink: `${req.protocol}://${req.get(
        "host"
      )}/bus/${publicAccessToken}`,
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Bus not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    GET api/buses/public/:token
// @desc     Get bus by public access token
// @access   Public
router.get("/public/:token", async (req, res) => {
  try {
    const bus = await Bus.findOne({ publicAccessToken: req.params.token });

    if (!bus) {
      return res.status(404).json({ msg: "Invalid or expired public link" });
    }

    res.json(bus);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
