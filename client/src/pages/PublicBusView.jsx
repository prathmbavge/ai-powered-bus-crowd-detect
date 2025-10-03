import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  Alert,
  styled,
} from "@mui/material";
import {
  DirectionsBus as BusIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import {
  Bus,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { busApi } from "../services/api";
import Chatbot from "../components/Chatbot";

// Modern styled components
const ModernCard = styled(motion(Card))(({ theme }) => ({
  borderRadius: '20px',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-4px)',
  },
}));

const GradientHeader = styled(motion(Paper))(({ theme }) => ({
  borderRadius: '20px',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: theme.spacing(4),
  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '200px',
    height: '200px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
}));

const OccupancyGauge = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  '& .gauge-circle': {
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
  },
  '& .gauge-center': {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
}));

const InfoItem = styled(motion(Box))(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
  border: '1px solid rgba(102, 126, 234, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateX(4px)',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
  },
}));

const ChatButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontWeight: 600,
  fontSize: '1rem',
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  '&:hover': {
    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
    transform: 'translateY(-2px)',
  },
}));

const PublicBusView = () => {
  const { token } = useParams();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if token exists
        if (!token) {
          setError("Invalid or missing public link. Please use a valid public bus link.");
          setLoading(false);
          return;
        }

        const response = await busApi.getByPublicToken(token);
        setBus(response.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching bus data:", err);
        setError(err.response?.data?.msg || "Failed to load bus data. The link may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchBusData();

    // Set up refresh interval (every 30 seconds)
    const intervalId = setInterval(fetchBusData, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [token]);

  // Get color and gradient based on crowd level
  const getCrowdLevelColor = (level) => {
    switch (level) {
      case "Low":
        return "#4caf50"; // green
      case "Medium":
        return "#ff9800"; // orange
      case "High":
        return "#f44336"; // red
      case "Critical":
        return "#d32f2f"; // dark red
      default:
        return "#757575"; // grey
    }
  };

  const getCrowdLevelGradient = (level) => {
    switch (level) {
      case "Low":
        return "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)";
      case "Medium":
        return "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)";
      case "High":
        return "linear-gradient(135deg, #f44336 0%, #ef5350 100%)";
      case "Critical":
        return "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)";
      default:
        return "linear-gradient(135deg, #757575 0%, #9e9e9e 100%)";
    }
  };

  // Get tailwind color class based on crowd level
  const getCrowdLevelClass = (level) => {
    switch (level) {
      case "Low":
        return "text-green-600";
      case "Medium":
        return "text-amber-600";
      case "High":
        return "text-red-600";
      case "Critical":
        return "text-red-800";
      default:
        return "text-gray-600";
    }
  };

  // Get icon based on crowd level
  const getCrowdLevelIcon = (level) => {
    const iconSize = 24;
    const iconStyle = { width: iconSize, height: iconSize };
    
    switch (level) {
      case "Low":
        return <CheckCircle2 style={iconStyle} className={getCrowdLevelClass(level)} />;
      case "Medium":
        return <Users style={iconStyle} className={getCrowdLevelClass(level)} />;
      case "High":
      case "Critical":
        return <AlertCircle style={iconStyle} className={getCrowdLevelClass(level)} />;
      default:
        return <Clock style={iconStyle} className={getCrowdLevelClass(level)} />;
    }
  };

  // Calculate percentage of bus capacity filled
  const getOccupancyPercentage = (count, capacity) => {
    if (!count || !capacity) return 0;
    return Math.min(Math.round((count / capacity) * 100), 100);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 10, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CircularProgress size={60} thickness={4} sx={{ color: '#667eea' }} />
          <Typography variant="h6" sx={{ mt: 3, color: '#666' }}>
            Loading bus information...
          </Typography>
        </motion.div>
      </Container>
    );
  }

  if (error || !bus) {
    return (
      <Container maxWidth="md" sx={{ mt: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              borderRadius: '12px',
              '& .MuiAlert-icon': { fontSize: 28 }
            }}
          >
            {error || "Invalid or expired public link"}
          </Alert>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              component={Link} 
              to="/login"
              sx={{
                borderRadius: '12px',
                padding: '10px 32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Go to Login
            </Button>
          </Box>
        </motion.div>
      </Container>
    );
  }

  const occupancyPercentage = getOccupancyPercentage(
    bus.currentCount,
    bus.capacity
  );

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Header */}
      <GradientHeader
        elevation={0}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Grid container spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid item>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bus size={36} />
            </Box>
          </Grid>
          <Grid item xs>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2.5rem' },
                mb: 0.5,
              }}
            >
              Bus #{bus.busNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapPin size={18} />
              <Typography variant="h6" sx={{ opacity: 0.95 }}>
                Route: {bus.route}
              </Typography>
            </Box>
          </Grid>
          <Grid item>
            <Chip
              label={bus.status.toUpperCase()}
              sx={{
                backgroundColor: bus.status === "active" ? 'rgba(76, 175, 80, 0.9)' : 'rgba(158, 158, 158, 0.9)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '8px 4px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          </Grid>
        </Grid>
      </GradientHeader>

      {/* Main content */}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Current Occupancy Card */}
        <Grid item xs={12} md={7}>
          <ModernCard
            elevation={0}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TrendingUp size={28} style={{ color: '#667eea' }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Current Occupancy
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
                <OccupancyGauge>
                  <CircularProgress
                    variant="determinate"
                    value={occupancyPercentage}
                    size={140}
                    thickness={6}
                    className="gauge-circle"
                    sx={{
                      color: getCrowdLevelColor(bus.currentCrowdLevel),
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                    }}
                  />
                  <Box className="gauge-center">
                    <Typography
                      variant="h3"
                      component="div"
                      sx={{
                        fontWeight: 800,
                        fontSize: '2.5rem',
                        background: getCrowdLevelGradient(bus.currentCrowdLevel),
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {`${occupancyPercentage}%`}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        mt: 0.5,
                      }}
                    >
                      FILLED
                    </Typography>
                  </Box>
                </OccupancyGauge>

                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      background: getCrowdLevelGradient(bus.currentCrowdLevel),
                      borderRadius: '16px',
                      padding: '20px',
                      color: 'white',
                      mb: 2,
                    }}
                  >
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                      }}
                    >
                      {bus.currentCount} / {bus.capacity}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                      passengers on board
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {getCrowdLevelIcon(bus.currentCrowdLevel)}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: getCrowdLevelColor(bus.currentCrowdLevel),
                      }}
                    >
                      {bus.currentCrowdLevel} Occupancy
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {bus.currentCrowdLevel === "High" ||
              bus.currentCrowdLevel === "Critical" ? (
                <Alert 
                  severity="warning" 
                  icon={<AlertCircle size={24} />}
                  sx={{ 
                    mb: 3,
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    '& .MuiAlert-icon': { fontSize: 28 }
                  }}
                >
                  This bus is currently experiencing high occupancy. You may
                  want to consider waiting for the next bus.
                </Alert>
              ) : (
                <Alert 
                  severity="success" 
                  icon={<CheckCircle2 size={24} />}
                  sx={{ 
                    mb: 3,
                    borderRadius: '12px',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    '& .MuiAlert-icon': { fontSize: 28 }
                  }}
                >
                  This bus has available space. Good time to board!
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Clock size={18} style={{ color: '#666' }} />
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                    Last updated:{" "}
                    {lastUpdated
                      ? new Date(lastUpdated).toLocaleTimeString()
                      : "Unknown"}
                  </Typography>
                </Box>
                <Button
                  size="medium"
                  onClick={() => window.location.reload()}
                  startIcon={<RefreshCw size={18} />}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    color: '#667eea',
                    border: '2px solid #667eea',
                    padding: '6px 16px',
                    '&:hover': {
                      background: 'rgba(102, 126, 234, 0.05)',
                      borderColor: '#764ba2',
                    },
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </CardContent>
          </ModernCard>
        </Grid>

        {/* Bus Information Card */}
        <Grid item xs={12} md={5}>
          <ModernCard
            elevation={0}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {bus.videoUrl && (
              <CardMedia
                component="img"
                height="200"
                image={bus.videoUrl}
                alt={`Bus ${bus.busNumber}`}
                sx={{
                  objectFit: 'cover',
                  borderRadius: '20px 20px 0 0',
                }}
              />
            )}
            <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Bus size={28} style={{ color: '#667eea' }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Bus Information
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <InfoItem
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <Bus size={20} style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                      Bus Number
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#333' }}>
                      {bus.busNumber}
                    </Typography>
                  </Box>
                </InfoItem>

                <InfoItem
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <MapPin size={20} style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                      Route
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#333' }}>
                      {bus.route}
                    </Typography>
                  </Box>
                </InfoItem>

                <InfoItem
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <Users size={20} style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                      Total Capacity
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#333' }}>
                      {bus.capacity} passengers
                    </Typography>
                  </Box>
                </InfoItem>

                <InfoItem
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: bus.status === "active" 
                        ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                        : 'linear-gradient(135deg, #757575 0%, #9e9e9e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <CheckCircle2 size={20} style={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                      Current Status
                    </Typography>
                    <Chip
                      label={bus.status.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: bus.status === "active" ? 'rgba(76, 175, 80, 0.1)' : 'rgba(158, 158, 158, 0.1)',
                        color: bus.status === "active" ? '#4caf50' : '#757575',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        border: `2px solid ${bus.status === "active" ? '#4caf50' : '#757575'}`,
                      }}
                    />
                  </Box>
                </InfoItem>
              </Box>

              <Box sx={{ mt: 'auto' }}>
                <ChatButton
                  variant="contained"
                  fullWidth
                  startIcon={<MessageCircle size={20} />}
                  onClick={toggleChat}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {showChat ? "Hide Chat" : "Chat with Admin"}
                </ChatButton>
              </Box>
            </CardContent>
          </ModernCard>
        </Grid>
      </Grid>

      {/* Chat widget for public users */}
      {showChat && bus._id && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ModernCard sx={{ mt: 4 }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px 24px',
                borderRadius: '20px 20px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={24} style={{ color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                Chat with Bus Administrator
              </Typography>
            </Box>
            <Box sx={{ p: 0 }}>
              <Chatbot busId={bus._id} isPublic={true} height="400px" />
            </Box>
          </ModernCard>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Box 
          sx={{ 
            mt: 6, 
            textAlign: 'center',
            padding: '24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
          }}
        >
          <Typography variant="body1" sx={{ color: '#666', mb: 1, fontWeight: 500 }}>
            This is a public view of the bus information.
          </Typography>
          <Typography variant="body1">
            <Link 
              to="/login" 
              style={{ 
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 700,
                borderBottom: '2px solid transparent',
                transition: 'border-color 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.borderBottomColor = '#667eea'}
              onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}
            >
              Login
            </Link>
            {" "}for more features and full access.
          </Typography>
        </Box>
      </motion.div>
    </Container>
  );
};

export default PublicBusView;
