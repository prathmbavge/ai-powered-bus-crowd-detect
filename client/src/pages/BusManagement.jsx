import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Skeleton,
  styled,
} from "@mui/material";

// Icons
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  Users,
  Activity,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Filter,
} from "lucide-react";

import { Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

// Modern styled components
const ModernPaper = styled(motion(Paper))(({ theme }) => ({
  borderRadius: '20px',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#333',
  borderBottom: '2px solid #f5f5f5',
  padding: '16px',
}));

const StyledTableRow = styled(motion(TableRow))(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(102, 126, 234, 0.04)',
    transform: 'scale(1.001)',
  },
  '& td': {
    borderBottom: '1px solid #f5f5f5',
    padding: '16px',
  },
}));

const GradientButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: '12px',
  padding: '10px 24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  '&:hover': {
    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
  },
}));

const ModernIconButton = styled(IconButton)(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

const BusManagement = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentBus, setCurrentBus] = useState(null);
  const [formData, setFormData] = useState({
    busNumber: "",
    route: "",
    capacity: "",
    status: "active",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [filter, setFilter] = useState("all");

  const auth = useContext(AuthContext);

  useEffect(() => {
    // Redirect if not admin
    if (!auth?.isAdmin()) {
      navigate("/");
      return;
    }

    fetchBuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/buses");
      setBuses(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching buses:", error);
      setLoading(false);
      showSnackbar("Failed to fetch buses", "error");
    }
  };

  const handleOpenDialog = (bus = null) => {
    if (bus) {
      setIsEdit(true);
      setCurrentBus(bus);
      setFormData({
        busNumber: bus.busNumber,
        route: bus.route,
        capacity: bus.capacity,
        status: bus.status || "active",
      });
    } else {
      setIsEdit(false);
      setCurrentBus(null);
      setFormData({
        busNumber: "",
        route: "",
        capacity: "",
        status: "active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (isEdit && currentBus) {
        await api.put(`/api/buses/${currentBus._id}`, formData);
        setBuses(
          buses.map((bus) =>
            bus._id === currentBus._id ? { ...bus, ...formData } : bus
          )
        );
        showSnackbar("Bus updated successfully");
      } else {
        const response = await api.post("/api/buses", formData);
        setBuses([...buses, response.data]);
        showSnackbar("Bus created successfully");
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving bus:", error);
      showSnackbar("Failed to save bus", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bus?")) {
      try {
        await api.delete(`/api/buses/${id}`);
        setBuses(buses.filter((bus) => bus._id !== id));
        showSnackbar("Bus deleted successfully");
      } catch (error) {
        console.error("Error deleting bus:", error);
        showSnackbar("Failed to delete bus", "error");
      }
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const filteredBuses =
    filter === "all" ? buses : buses.filter((bus) => bus.status === filter);

  // Check if current user is the creator of a bus
  const isBusCreator = (busCreatorId) => {
    return auth?.user && auth.user._id === busCreatorId;
  };

  // Get crowd level based on occupancy percentage
  const getCrowdLevel = (current, capacity) => {
    if (!current || !capacity) return { color: "default", label: "Unknown" };

    const percentage = (current / capacity) * 100;
    if (percentage < 40) return { color: "success", label: "Low" };
    if (percentage < 70) return { color: "warning", label: "Medium" };
    return { color: "error", label: "High" };
  };

  if (!auth?.isAdmin()) {
    return (
      <Box className="p-8 text-center">
        <Typography variant="h5" color="error" className="mb-4">
          Access Denied
        </Typography>
        <Typography variant="body1" className="mb-4">
          You do not have permission to access this page.
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              <Bus size={28} style={{ color: 'white' }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Bus Management
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <FormControl
              variant="outlined"
              size="small"
              sx={{ 
                minWidth: 140,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            >
              <InputLabel id="filter-label">Filter</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                onChange={handleFilterChange}
                label="Filter"
                startAdornment={
                  <Filter size={18} style={{ marginRight: 8, color: '#667eea' }} />
                }
              >
                <MenuItem value="all">All Buses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
            <GradientButton
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => handleOpenDialog()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Add Bus
            </GradientButton>
          </Box>
        </Box>
      </motion.div>

      {/* Bus Table */}
      <ModernPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={60} thickness={4} sx={{ color: '#667eea', mb: 3 }} />
            <Typography variant="h6" sx={{ color: '#666', fontWeight: 500 }}>
              Loading buses...
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '12px', mb: 2 }} />
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '12px', mb: 2 }} />
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '12px' }} />
            </Box>
          </Box>
        ) : filteredBuses.length === 0 ? (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Bus size={40} style={{ color: '#667eea' }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#666', mb: 2, fontWeight: 600 }}>
              No buses found
            </Typography>
            <Typography variant="body1" sx={{ color: '#999', mb: 4 }}>
              Start by adding your first bus to the fleet
            </Typography>
            <GradientButton
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => handleOpenDialog()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Add Your First Bus
            </GradientButton>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)' }}>
                <TableRow>
                  <StyledTableCell>Bus Number</StyledTableCell>
                  <StyledTableCell>Route</StyledTableCell>
                  <StyledTableCell>Capacity</StyledTableCell>
                  <StyledTableCell>Current Occupancy</StyledTableCell>
                  <StyledTableCell>Status</StyledTableCell>
                  <StyledTableCell>Created By</StyledTableCell>
                  <StyledTableCell align="center">Actions</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {filteredBuses.map((bus, index) => {
                  const crowdLevel = getCrowdLevel(
                    bus.currentCount,
                    bus.capacity
                  );
                  const canEdit = isBusCreator(bus.createdBy?._id);

                  return (
                    <StyledTableRow 
                      key={bus._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Bus size={20} style={{ color: 'white' }} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#333' }}>
                            {bus.busNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#666' }}>
                          {bus.route}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Users size={18} style={{ color: '#667eea' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                            {bus.capacity}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                            {bus.currentCount || 0}
                          </Typography>
                          <Chip
                            size="small"
                            label={crowdLevel.label}
                            color={crowdLevel.color}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            bus.status?.charAt(0).toUpperCase() +
                              bus.status?.slice(1) || "Active"
                          }
                          color={
                            bus.status === "active"
                              ? "success"
                              : bus.status === "maintenance"
                              ? "warning"
                              : "default"
                          }
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {bus.createdBy?.name || "Unknown"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="View Details" arrow>
                            <ModernIconButton
                              component={Link}
                              to={`/monitor/${bus._id}`}
                              size="small"
                              sx={{ 
                                color: '#667eea',
                                '&:hover': { 
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                },
                              }}
                            >
                              <Eye size={18} />
                            </ModernIconButton>
                          </Tooltip>

                          {canEdit && (
                            <>
                              <Tooltip title="Edit Bus" arrow>
                                <ModernIconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(bus)}
                                  sx={{ 
                                    color: '#4caf50',
                                    '&:hover': { 
                                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    },
                                  }}
                                >
                                  <Edit3 size={18} />
                                </ModernIconButton>
                              </Tooltip>
                              <Tooltip title="Delete Bus" arrow>
                                <ModernIconButton
                                  size="small"
                                  onClick={() => handleDelete(bus._id)}
                                  sx={{ 
                                    color: '#f44336',
                                    '&:hover': { 
                                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    },
                                  }}
                                >
                                  <Trash2 size={18} />
                                </ModernIconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </StyledTableRow>
                  );
                })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ModernPaper>

      {/* Add/Edit Bus Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '24px',
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
            {isEdit ? <Edit3 size={24} /> : <Plus size={24} />}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isEdit ? "Edit Bus" : "Add New Bus"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              name="busNumber"
              label="Bus Number"
              fullWidth
              variant="outlined"
              value={formData.busNumber}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                    borderWidth: 2,
                  },
                },
              }}
            />
            <TextField
              name="route"
              label="Route"
              fullWidth
              variant="outlined"
              value={formData.route}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                    borderWidth: 2,
                  },
                },
              }}
            />
            <TextField
              name="capacity"
              label="Capacity"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.capacity}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                    borderWidth: 2,
                  },
                },
              }}
            />
            <FormControl 
              fullWidth 
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                    borderWidth: 2,
                  },
                },
              }}
            >
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{
              borderRadius: '12px',
              padding: '10px 24px',
              textTransform: 'none',
              fontWeight: 600,
              color: '#666',
              border: '2px solid #e0e0e0',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#d0d0d0',
              },
            }}
          >
            Cancel
          </Button>
          <GradientButton
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.busNumber || !formData.route || !formData.capacity}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isEdit ? "Update Bus" : "Create Bus"}
          </GradientButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BusManagement;
