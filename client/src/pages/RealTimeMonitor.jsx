import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
  Tab,
  Tabs,
  Alert,
  AlertTitle,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Icons
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import GroupIcon from "@mui/icons-material/Group";
import ChatIcon from "@mui/icons-material/Chat";
import VideocamIcon from "@mui/icons-material/Videocam";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningIcon from "@mui/icons-material/Warning";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Activity,
  Users,
  Clock,
  AlertTriangle,
  Video,
  MapPin,
} from "lucide-react";

import api from "../services/api";
import { AuthContext } from "../contexts/AuthContext";
import VideoUploader from "../components/VideoUploader";
import Chatbot from "../components/Chatbot";

const VideoContainer = styled(motion(Box))(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "500px",
  overflow: "hidden",
  borderRadius: "24px",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  backgroundColor: "#000",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
}));

const StyledVideo = styled("video")(({ theme }) => ({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  borderRadius: "24px",
}));

const StatusBadge = styled(motion(Box))(({ status }) => ({
  position: "absolute",
  top: "20px",
  right: "20px",
  padding: "8px 16px",
  borderRadius: "20px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: status === "live" ? "rgba(76, 175, 80, 0.95)" : "rgba(158, 158, 158, 0.95)",
  color: "#fff",
  fontSize: "0.875rem",
  fontWeight: 700,
  zIndex: 10,
  backdropFilter: "blur(10px)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
}));

const LiveDot = styled(Box)({
  width: "10px",
  height: "10px",
  backgroundColor: "#fff",
  borderRadius: "50%",
  animation: "pulse-animation 1.5s ease-in-out infinite",
  "@keyframes pulse-animation": {
    "0%, 100%": {
      transform: "scale(1)",
      opacity: 1,
    },
    "50%": {
      transform: "scale(1.3)",
      opacity: 0.7,
    },
  },
});

const ModernCard = styled(motion(Card))({
  borderRadius: "20px",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.1)",
    transform: "translateY(-2px)",
  },
});

const StatCard = styled(motion(Box))(({ gradient }) => ({
  padding: "24px",
  borderRadius: "20px",
  background: gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    width: "120px",
    height: "120px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    transform: "translate(40%, -40%)",
  },
}));

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitor-tabpanel-${index}`}
      aria-labelledby={`monitor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const RealTimeMonitor = () => {
  const { id } = useParams();
  const videoRef = useRef(null);
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoStatus, setVideoStatus] = useState("offline");
  const [occupancyData, setOccupancyData] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const { user, isAdmin } = useContext(AuthContext);

  // Check if current user is the creator of the bus
  const isBusCreator = () => {
    if (!bus || !user) return false;
    return bus.createdBy?._id === user._id;
  };

  // Can upload videos if admin AND creator of the bus
  const canUploadVideos = () => {
    return isAdmin() && isBusCreator();
  };

  useEffect(() => {
    const fetchBusDetails = async () => {
      try {
        const response = await api.get(`/api/buses/${id}`);
        setBus(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching bus details:", error);
        setLoading(false);
      }
    };

    fetchBusDetails();

    // Mock occupancy data for demonstration
    const mockData = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const time = new Date(now);
      time.setHours(time.getHours() - i);
      mockData.unshift({
        time: time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        occupancy: Math.floor(Math.random() * 100),
      });
    }
    setOccupancyData(mockData);

    // Video feed will be enabled when actual video source is available
    // Remove simulation to prevent 404 errors
    // setVideoStatus("live") should be called when real video source is ready

    return () => {}; // Cleanup if needed
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleUploader = () => {
    setShowUploader(!showUploader);
  };

  const handleUploadComplete = async () => {
    // Close the uploader
    setShowUploader(false);
    // Refresh bus data to get updated video info
    try {
      const response = await api.get(`/api/buses/${id}`);
      setBus(response.data);
    } catch (error) {
      console.error("Error refreshing bus details:", error);
    }
  };

  const getCurrentOccupancyPercentage = () => {
    if (!bus) return 0;
    return Math.round((bus.currentCount / bus.capacity) * 100) || 0;
  };

  const getOccupancyLevel = () => {
    const percentage = getCurrentOccupancyPercentage();
    if (percentage < 40)
      return {
        color: "success",
        text: "Low",
        gradient: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
      };
    if (percentage < 70)
      return {
        color: "warning",
        text: "Medium",
        gradient: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
      };
    return {
      color: "error",
      text: "High",
      gradient: "linear-gradient(135deg, #f44336 0%, #ef5350 100%)",
    };
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="80vh"
        gap={2}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading bus details...
        </Typography>
      </Box>
    );
  }

  if (!bus) {
    return (
      <Box textAlign="center" py={10}>
        <DirectionsBusIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" className="mb-4">
          Bus not found
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          size="large"
          startIcon={<ArrowBackIcon />}
          sx={{ borderRadius: "12px" }}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  const occupancyLevel = getOccupancyLevel();

  return (
    <Box className="py-6 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
          <Button
            component={Link}
            to="/"
            startIcon={<ArrowBackIcon />}
            sx={{
              borderRadius: "12px",
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Back
          </Button>

          <Box flexGrow={1}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {bus.busNumber}
              </Typography>
              <Chip
                icon={<Activity size={16} />}
                label={videoStatus === "live" ? "LIVE" : "OFFLINE"}
                color={videoStatus === "live" ? "success" : "default"}
                sx={{ fontWeight: 700, borderRadius: "8px" }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Route: {bus.route}
            </Typography>
          </Box>

          {canUploadVideos() && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                startIcon={<VideocamIcon />}
                onClick={toggleUploader}
                sx={{
                  borderRadius: "12px",
                  background: showUploader
                    ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  fontWeight: 600,
                  "&:hover": {
                    background: showUploader
                      ? "linear-gradient(135deg, #fee140 0%, #fa709a 100%)"
                      : "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                  },
                }}
              >
                {showUploader ? "Close Uploader" : "Upload Video"}
              </Button>
            </motion.div>
          )}
        </Box>
      </motion.div>

      {/* Video Uploader Section */}
      {showUploader && canUploadVideos() && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ModernCard sx={{ mb: 4, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Upload New Video Feed
            </Typography>
            <VideoUploader busId={id} bus={bus} onUploadComplete={handleUploadComplete} />
          </ModernCard>
        </motion.div>
      )}

      {/* Main Stats Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  CURRENT OCCUPANCY
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {bus.currentCount || 0}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  of {bus.capacity} capacity
                </Typography>
              </Box>
              <Users size={48} style={{ opacity: 0.3 }} />
            </Box>
          </StatCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            gradient={occupancyLevel.gradient}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  OCCUPANCY LEVEL
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {getCurrentOccupancyPercentage()}%
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {occupancyLevel.text} capacity
                </Typography>
              </Box>
              <Activity size={48} style={{ opacity: 0.3 }} />
            </Box>
          </StatCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  BUS CAPACITY
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {bus.capacity}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Total seats
                </Typography>
              </Box>
              <DirectionsBusIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </StatCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  AVAILABLE SEATS
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {bus.capacity - (bus.currentCount || 0)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Seats remaining
                </Typography>
              </Box>
              <GroupIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </StatCard>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Video and Analysis Column */}
        <Grid item xs={12} md={8}>
          {/* Video Feed */}
          <VideoContainer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StatusBadge status={videoStatus}>
              {videoStatus === "live" && <LiveDot />}
              <span>{videoStatus === "live" ? "LIVE" : "OFFLINE"}</span>
            </StatusBadge>

            {videoStatus === "offline" ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                gap={2}
              >
                <Video size={80} style={{ opacity: 0.3, color: "#fff" }} />
                <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Video feed not available
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Upload a video to enable live monitoring
                </Typography>
              </Box>
            ) : (
              <StyledVideo ref={videoRef} controls muted playsInline />
            )}

            {/* Video Controls Overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  backdropFilter: "blur(10px)",
                }}
              >
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
              <Box display="flex" gap={1}>
                <Tooltip title="Refresh" arrow>
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                      backdropFilter: "blur(10px)",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" },
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fullscreen" arrow>
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                      backdropFilter: "blur(10px)",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" },
                    }}
                  >
                    <FullscreenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </VideoContainer>

          {/* Analysis Tabs */}
          <ModernCard sx={{ mt: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                },
              }}
            >
              <Tab icon={<Activity size={18} />} iconPosition="start" label="Live Analysis" />
              <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Occupancy History" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {/* Current Occupancy Details */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      Current Occupancy
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={1} mb={2}>
                      <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {bus.currentCount || 0}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        / {bus.capacity} passengers
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getCurrentOccupancyPercentage()}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        mb: 1,
                        backgroundColor: "rgba(0,0,0,0.1)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 6,
                          background: occupancyLevel.gradient,
                        },
                      }}
                    />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {getCurrentOccupancyPercentage()}% Occupied
                      </Typography>
                      <Chip
                        label={occupancyLevel.text}
                        size="small"
                        color={occupancyLevel.color}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" mb={2}>
                      Bus Information
                    </Typography>
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <MapPin size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Route
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {bus.route}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Users size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Managed by
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {bus.createdBy?.name || "Unknown"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* High Occupancy Alert */}
              {occupancyLevel.color === "error" && (
                <Alert
                  severity="error"
                  icon={<AlertTriangle size={24} />}
                  sx={{ mt: 3, borderRadius: "12px", "& .MuiAlert-message": { width: "100%" } }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>High Occupancy Alert</AlertTitle>
                  This bus is currently operating at {getCurrentOccupancyPercentage()}% capacity, which
                  exceeds the recommended level. Passengers may experience overcrowding. Consider
                  alternative buses or wait for the next available bus.
                </Alert>
              )}

              {/* Detection Info */}
              <Box
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  🤖 AI Detection System
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our advanced computer vision system continuously monitors passenger count in real-time
                  using YOLOv8 technology with approximately 95% accuracy. The system updates every few
                  seconds to provide you with the most current information.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Occupancy Trend (Last 12 Hours)
              </Typography>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={occupancyData}>
                  <defs>
                    <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="time" stroke="#757575" style={{ fontSize: "0.75rem" }} />
                  <YAxis stroke="#757575" style={{ fontSize: "0.75rem" }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#667eea"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOccupancy)"
                  />
                </AreaChart>
              </ResponsiveContainer>

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: "12px",
                  background: "#f5f5f5",
                  display: "flex",
                  justifyContent: "space-around",
                }}
              >
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    Peak Occupancy
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#f44336" }}>
                    {Math.max(...occupancyData.map((d) => d.occupancy))}%
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    Average
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#ff9800" }}>
                    {Math.round(
                      occupancyData.reduce((a, b) => a + b.occupancy, 0) / occupancyData.length
                    )}
                    %
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    Lowest
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#4caf50" }}>
                    {Math.min(...occupancyData.map((d) => d.occupancy))}%
                  </Typography>
                </Box>
              </Box>
            </TabPanel>
          </ModernCard>
        </Grid>

        {/* Chat and Schedule Column */}
        <Grid item xs={12} md={4}>
          {/* Chat Section */}
          <ModernCard sx={{ mb: 3 }}>
            <Box
              sx={{
                p: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <ChatIcon />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Contact Admin
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Chatbot busId={id} busInfo={bus} height="400px" />
            </Box>
          </ModernCard>

          {/* Schedule Section */}
          <ModernCard>
            <Box
              sx={{
                p: 2,
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Clock size={24} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Bus Schedule
              </Typography>
            </Box>
            <CardContent>
              <Box mb={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Route Information
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {bus.route}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Bus Stops
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                {[
                  { name: "Central Station", time: "06:00 AM" },
                  { name: "Downtown Plaza", time: "06:15 AM" },
                  { name: "University Campus", time: "06:30 AM" },
                  { name: "Shopping Mall", time: "06:45 AM" },
                ].map((stop, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      borderRadius: "10px",
                      background: "#f5f5f5",
                      transition: "all 0.2s",
                      "&:hover": {
                        background: "#eeeeee",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {stop.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stop.time}
                      </Typography>
                    </Box>
                    <MapPin size={18} style={{ opacity: 0.5 }} />
                  </Box>
                ))}
              </Box>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<DirectionsBusIcon />}
                sx={{
                  mt: 3,
                  borderRadius: "12px",
                  fontWeight: 600,
                  textTransform: "none",
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 },
                }}
              >
                View Full Schedule
              </Button>
            </CardContent>
          </ModernCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RealTimeMonitor;
