import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Icons - Mix of MUI and Lucide
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatIcon from "@mui/icons-material/Chat";
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Users, Activity, AlertCircle } from "lucide-react";

// Components
import ChatPopup from "../components/ChatPopup";
import VideoUploadPopup from "../components/VideoUploadPopup";

import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

// Styled Components with Enhanced Design
const ModernCard = styled(motion(Card))(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  borderRadius: "20px",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
  overflow: "hidden",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #2196f3, #64b5f6)",
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: "transform 0.3s ease",
  },
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
    "&::before": {
      transform: "scaleX(1)",
    },
  },
}));

const StatsCard = styled(motion(Paper))(({ theme, gradient }) => ({
  padding: theme.spacing(3),
  borderRadius: "20px",
  background: gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-4px) scale(1.02)",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.2)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    width: "150px",
    height: "150px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    transform: "translate(50%, -50%)",
  },
}));

const CrowdChip = ({ level }) => {
  const config = {
    low: {
      color: "#4caf50",
      bg: "#e8f5e9",
      label: "Low",
      icon: "✓",
    },
    medium: {
      color: "#ff9800",
      bg: "#fff3e0",
      label: "Medium",
      icon: "•",
    },
    high: {
      color: "#f44336",
      bg: "#ffebee",
      label: "High",
      icon: "!",
    },
  };

  const style = config[level] || config.low;

  return (
    <Chip
      label={
        <Box display="flex" alignItems="center" gap={0.5}>
          <span style={{ fontSize: "0.8rem" }}>{style.icon}</span>
          {style.label}
        </Box>
      }
      size="small"
      sx={{
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: 700,
        fontSize: "0.75rem",
        padding: "4px 8px",
        height: "28px",
        borderRadius: "8px",
        border: `1.5px solid ${style.color}20`,
      }}
    />
  );
};

const Dashboard = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [busForm, setBusForm] = useState({
    busNumber: "",
    route: "",
    capacity: "",
  });
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [videoUploadOpen, setVideoUploadOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const { user, isAdmin } = useContext(AuthContext);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await api.get("/api/buses");
        setBuses(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching buses:", error);
        setLoading(false);
      }
    };

    fetchBuses();
  }, []);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setBusForm({ busNumber: "", route: "", capacity: "" });
  };

  const handleFormChange = (e) => {
    setBusForm({
      ...busForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateBus = async () => {
    try {
      const response = await api.post("/api/buses", busForm);
      setBuses([...buses, response.data]);
      handleCloseDialog();
    } catch (error) {
      console.error("Error creating bus:", error);
    }
  };

  const handleOpenChat = (bus) => {
    setSelectedBus(bus);
    setChatPopupOpen(true);
  };

  const handleOpenVideoUpload = (bus) => {
    setSelectedBus(bus);
    setVideoUploadOpen(true);
  };

  const handleVideoUploaded = async () => {
    try {
      const response = await api.get("/api/buses");
      setBuses(response.data);
    } catch (error) {
      console.error("Error refreshing buses:", error);
    }
  };

  const handleDeleteBus = async (id) => {
    if (window.confirm("Are you sure you want to delete this bus?")) {
      try {
        await api.delete(`/api/buses/${id}`);
        setBuses(buses.filter((bus) => bus._id !== id));
      } catch (error) {
        console.error("Error deleting bus:", error);
      }
    }
  };

  const isBusCreator = (busCreatorId) => {
    return user && user._id === busCreatorId;
  };

  const getCrowdLevel = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage < 40) return "low";
    if (percentage < 70) return "medium";
    return "high";
  };

  const getOccupancyPercentage = (current, capacity) => {
    return Math.min(Math.round((current / capacity) * 100), 100);
  };

  // Calculate stats
  const totalBuses = buses.length;
  const activeBuses = buses.filter((bus) => bus.status === "active").length;
  const crowdedBuses = buses.filter(
    (bus) => getCrowdLevel(bus.currentCount || 0, bus.capacity) === "high"
  ).length;
  const totalPassengers = buses.reduce((sum, bus) => sum + (bus.currentCount || 0), 0);

  return (
    <Box className="py-6 px-4 animate-fade-in">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box className="mb-8 flex flex-wrap justify-between items-center">
          <Box>
            <Typography
              variant="h3"
              className="font-bold mb-2"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Dashboard
            </Typography>
            <Typography variant="body1" className="text-gray-600" sx={{ fontSize: "1.05rem" }}>
              {isAdmin()
                ? "Monitor and manage your entire bus fleet in real-time"
                : "View all available buses and their current occupancy status"}
            </Typography>
          </Box>

          {isAdmin() && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
                sx={{
                  mt: { xs: 2, sm: 0 },
                  borderRadius: "12px",
                  padding: "12px 32px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                    boxShadow: "0 12px 32px rgba(102, 126, 234, 0.5)",
                  },
                }}
              >
                Add New Bus
              </Button>
            </motion.div>
          )}
        </Box>
      </motion.div>

      {/* Enhanced Stats Summary */}
      <Grid container spacing={3} className="mb-8">
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.9rem", fontWeight: 500 }}>
                  Total Buses
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {loading ? <Skeleton width={60} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} /> : totalBuses}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Fleet size
                  </Typography>
                </Box>
              </Box>
              <DirectionsBusIcon sx={{ fontSize: 60, opacity: 0.3 }} />
            </Box>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.9rem", fontWeight: 500 }}>
                  Active Buses
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {loading ? <Skeleton width={60} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} /> : activeBuses}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <Activity size={16} style={{ marginRight: 4 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    In operation
                  </Typography>
                </Box>
              </Box>
              <PersonIcon sx={{ fontSize: 60, opacity: 0.3 }} />
            </Box>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.9rem", fontWeight: 500 }}>
                  Total Passengers
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {loading ? <Skeleton width={60} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} /> : totalPassengers}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <Users size={16} style={{ marginRight: 4 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Current count
                  </Typography>
                </Box>
              </Box>
              <GroupIcon sx={{ fontSize: 60, opacity: 0.3 }} />
            </Box>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box sx={{ zIndex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.9rem", fontWeight: 500 }}>
                  High Capacity
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                  {loading ? <Skeleton width={60} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} /> : crowdedBuses}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <AlertCircle size={16} style={{ marginRight: 4 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Needs attention
                  </Typography>
                </Box>
              </Box>
              <GroupIcon sx={{ fontSize: 60, opacity: 0.3 }} />
            </Box>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Bus Cards */}
      <AnimatePresence>
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item}>
                <Card sx={{ borderRadius: "20px" }}>
                  <CardContent>
                    <Skeleton variant="text" height={40} />
                    <Skeleton variant="text" />
                    <Skeleton variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 2 }} />
                  </CardContent>
                  <CardActions>
                    <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 2 }} />
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : buses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Paper
              className="p-16 text-center"
              sx={{
                borderRadius: "24px",
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                border: "2px dashed rgba(0,0,0,0.1)",
              }}
            >
              <DirectionsBusIcon sx={{ fontSize: 80, color: "rgba(0,0,0,0.2)", mb: 2 }} />
              <Typography variant="h5" className="font-bold mb-2">
                No buses available
              </Typography>
              <Typography variant="body1" className="text-gray-600 mb-4">
                Get started by adding your first bus to the fleet
              </Typography>
              {isAdmin() && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                  sx={{
                    borderRadius: "12px",
                    padding: "12px 32px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Add Your First Bus
                </Button>
              )}
            </Paper>
          </motion.div>
        ) : (
          <Grid container spacing={3}>
            {buses.map((bus, index) => {
              const occupancyPercentage = getOccupancyPercentage(bus.currentCount || 0, bus.capacity);
              const crowdLevel = getCrowdLevel(bus.currentCount || 0, bus.capacity);

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={bus._id}>
                  <ModernCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <CardContent className="flex-grow" sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box>
                          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: "#212121" }}>
                            {bus.busNumber}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#9e9e9e", fontWeight: 500 }}>
                            #{bus._id.slice(-6).toUpperCase()}
                          </Typography>
                        </Box>
                        <CrowdChip level={crowdLevel} />
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                          mb: 2,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#1565c0", fontWeight: 600, display: "block", mb: 0.5 }}>
                          ROUTE
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#0d47a1" }}>
                          {bus.route}
                        </Typography>
                      </Box>

                      {/* Occupancy Progress */}
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "#757575" }}>
                            Occupancy
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "#212121" }}>
                            {bus.currentCount || 0} / {bus.capacity}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={occupancyPercentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#e0e0e0",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              background:
                                crowdLevel === "low"
                                  ? "linear-gradient(90deg, #4caf50, #66bb6a)"
                                  : crowdLevel === "medium"
                                  ? "linear-gradient(90deg, #ff9800, #ffb74d)"
                                  : "linear-gradient(90deg, #f44336, #ef5350)",
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#9e9e9e", display: "block", mt: 0.5 }}>
                          {occupancyPercentage}% capacity
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: "8px",
                          background: "#f5f5f5",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 16, color: "#757575" }} />
                        <Typography variant="caption" sx={{ color: "#757575" }}>
                          Managed by {bus.createdBy?.name || "Unknown"}
                        </Typography>
                      </Box>
                    </CardContent>

                    <CardActions
                      sx={{
                        p: 2,
                        pt: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        justifyContent: "space-between",
                      }}
                    >
                      <Link to={`/monitor/${bus._id}`} style={{ textDecoration: "none" }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<VisibilityIcon />}
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontWeight: 600,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                            },
                          }}
                        >
                          Monitor
                        </Button>
                      </Link>

                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Chat with admin" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenChat(bus)}
                            sx={{
                              backgroundColor: "#e3f2fd",
                              color: "#2196f3",
                              "&:hover": { backgroundColor: "#bbdefb" },
                            }}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {isAdmin() && isBusCreator(bus.createdBy?._id) && (
                          <>
                            <Tooltip title="Upload Video" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenVideoUpload(bus)}
                                sx={{
                                  backgroundColor: "#fff3e0",
                                  color: "#ff9800",
                                  "&:hover": { backgroundColor: "#ffe0b2" },
                                }}
                              >
                                <VideoCameraFrontIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit Bus" arrow>
                              <IconButton
                                size="small"
                                sx={{
                                  backgroundColor: "#e8f5e9",
                                  color: "#4caf50",
                                  "&:hover": { backgroundColor: "#c8e6c9" },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete Bus" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteBus(bus._id)}
                                sx={{
                                  backgroundColor: "#ffebee",
                                  color: "#f44336",
                                  "&:hover": { backgroundColor: "#ffcdd2" },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </CardActions>
                  </ModernCard>
                </Grid>
              );
            })}
          </Grid>
        )}
      </AnimatePresence>

      {/* Modern Add Bus Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            padding: 2,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Add New Bus
          </Typography>
          <Typography variant="body2" sx={{ color: "#757575", mt: 0.5 }}>
            Enter the details of your new bus
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              autoFocus
              name="busNumber"
              label="Bus Number"
              type="text"
              fullWidth
              variant="outlined"
              value={busForm.busNumber || ""}
              onChange={handleFormChange}
              placeholder="e.g., BUS-101"
            />
            <TextField
              name="route"
              label="Route"
              type="text"
              fullWidth
              variant="outlined"
              value={busForm.route || ""}
              onChange={handleFormChange}
              placeholder="e.g., Downtown - Airport"
            />
            <TextField
              name="capacity"
              label="Capacity"
              type="number"
              fullWidth
              variant="outlined"
              value={busForm.capacity || ""}
              onChange={handleFormChange}
              placeholder="e.g., 50"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: "10px" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateBus}
            disabled={!busForm.busNumber || !busForm.route || !busForm.capacity}
            sx={{
              borderRadius: "10px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
              },
            }}
          >
            Create Bus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat Popup */}
      <ChatPopup
        open={chatPopupOpen}
        handleClose={() => setChatPopupOpen(false)}
        busId={selectedBus?._id}
        busName={selectedBus?.busNumber}
      />

      {/* Video Upload Popup */}
      <VideoUploadPopup
        open={videoUploadOpen}
        handleClose={() => setVideoUploadOpen(false)}
        busId={selectedBus?._id}
        busName={selectedBus?.busNumber}
        onUploadComplete={handleVideoUploaded}
      />
    </Box>
  );
};

export default Dashboard;
