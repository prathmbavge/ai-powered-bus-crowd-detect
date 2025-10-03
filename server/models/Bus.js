const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BusSchema = new Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
  },
  route: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "maintenance"],
    default: "inactive",
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lastLocation: {
    type: {
      lat: Number,
      lng: Number,
    },
    default: null,
  },
  streamUrl: {
    type: String,
    default: null,
  },
  videoUrl: {
    type: String,
    default: null,
  },
  publicAccessToken: {
    type: String,
    default: null,
  },
  videoProcessingTaskId: {
    type: String,
    default: null,
  },
  videoProcessingStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "error", null],
    default: null,
  },
  currentCrowdLevel: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical", "Unknown"],
    default: "Unknown",
  },
  currentCount: {
    type: Number,
    default: 0,
  },
  isMonitoring: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

BusSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Bus", BusSchema);
