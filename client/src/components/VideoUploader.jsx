import React, { useState, useRef, useEffect, useContext } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  styled,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VideocamIcon from "@mui/icons-material/Videocam";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  FileVideo,
} from "lucide-react";
import { busApi } from "../services/api";
import { AuthContext } from "../contexts/AuthContext";

const ModalBackdrop = styled(motion.div)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(8px)',
  zIndex: 1300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const ModalPaper = styled(motion(Paper))(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '680px',
  borderRadius: '24px',
  padding: theme.spacing(4),
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
}));

const DropZone = styled(motion(Box))(({ theme, isDragging, isDisabled }) => ({
  border: `3px dashed ${isDragging ? '#667eea' : '#d0d0d0'}`,
  borderRadius: '20px',
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: isDragging 
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
  opacity: isDisabled ? 0.5 : 1,
  '&:hover': !isDisabled && {
    borderColor: '#667eea',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)',
  },
}));

const GradientButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px 32px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontWeight: 600,
  fontSize: '1rem',
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  '&:hover': {
    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
  },
  '&:disabled': {
    background: 'linear-gradient(135deg, #ccc 0%, #aaa 100%)',
    boxShadow: 'none',
  },
}));

const VideoUploader = ({ busId, bus, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoType, setVideoType] = useState("real-time");
  const fileInputRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const { user, isAdmin } = useContext(AuthContext);

  // Check if user is allowed to upload videos - only admin who created the bus can upload videos
  const canUpload =
    isAdmin() &&
    user &&
    bus &&
    (bus.createdBy && (bus.createdBy._id === user._id || bus.createdBy.toString() === user._id));

  // Clean up status check interval
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  // Check video processing status
  const checkVideoStatus = async () => {
    try {
      const response = await busApi.checkVideoStatus(busId);
      const {
        status,
        progress,
        error: statusError,
        max_count,
        max_level,
        key_frame,
        key_frames,
      } = response.data;

      setProgress(progress || 0);

      if (status === "completed") {
        setProcessing(false);
        setSuccess(true);
        if (onUploadComplete) {
          // Pass the complete task data to the parent component including key frames
          onUploadComplete({
            ...response.data,
            // Make sure we include key_frame for backward compatibility
            key_frame:
              key_frame ||
              (key_frames && key_frames.length > 0
                ? key_frames[0].image
                : null),
          });
        }
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
      } else if (status === "error") {
        setProcessing(false);
        setError(statusError || "Error processing video");
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
      }
    } catch (err) {
      console.error("Error checking video status:", err);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    setVideoFile(file);
    setError("");
    setSuccess(false);
    setUploadProgress(0);
  };

  // Handle file upload for processing
  const handleFileUpload = async () => {
    if (!videoFile) {
      setError("Please select a video file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("videoType", videoType);

      const response = await busApi.processVideo(
        busId,
        formData,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      const { taskId } = response.data;
      setTaskId(taskId);

      // Set status to processing
      setUploading(false);
      setProcessing(true);
      setProgress(0);

      // Start polling for status updates
      statusCheckInterval.current = setInterval(checkVideoStatus, 2000);

      setVideoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploading(false);
      setError(error.response?.data?.msg || "Error uploading video");
    }
  };

  if (!canUpload) {
    return (
      <ModalBackdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onUploadComplete()}
      >
        <Paper
          sx={{
            p: 4,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxWidth: 500,
            mx: 2,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Video Upload Restricted
            </Typography>
          </Box>
          <Alert
            severity="info"
            sx={{
              borderRadius: '12px',
              '& .MuiAlert-icon': { alignItems: 'center' },
            }}
          >
            Only administrators who created this bus can upload crowd detection videos.
          </Alert>
        </Paper>
      </ModalBackdrop>
    );
  }

  return (
    <ModalBackdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => onUploadComplete()}
    >
      <ModalPaper
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              <Video size={24} color="white" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Upload Video
            </Typography>
          </Box>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => onUploadComplete()}
              sx={{
                minWidth: 0,
                width: 40,
                height: 40,
                borderRadius: '10px',
                '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.1)' },
              }}
            >
              <X size={20} color="#64748b" />
            </Button>
          </motion.div>
        </Box>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Alert
                severity="error"
                icon={<AlertCircle size={20} />}
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  '& .MuiAlert-icon': { alignItems: 'center' },
                }}
              >
                {error}
              </Alert>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Alert
                severity="success"
                icon={<CheckCircle2 size={20} />}
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  '& .MuiAlert-icon': { alignItems: 'center' },
                }}
              >
                Video processed successfully! Detected crowd level has been updated.
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginBottom: 24 }}
          >
            <Alert
              severity="info"
              icon={<Upload size={20} />}
              sx={{
                mb: 2,
                borderRadius: '12px',
                '& .MuiAlert-icon': { alignItems: 'center' },
              }}
            >
              Uploading video file...
            </Alert>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 8,
                borderRadius: '8px',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                },
              }}
            />
            <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', mt: 1, color: '#64748b', fontWeight: 600 }}
            >
              {uploadProgress}% uploaded
            </Typography>
          </motion.div>
        )}

        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginBottom: 24 }}
          >
            <Alert
              severity="info"
              icon={<Play size={20} />}
              sx={{
                mb: 2,
                borderRadius: '12px',
                '& .MuiAlert-icon': { alignItems: 'center' },
              }}
            >
              Processing video for crowd detection...
            </Alert>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: '8px',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                },
              }}
            />
            <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', mt: 1, color: '#64748b', fontWeight: 600 }}
            >
              {progress}% complete
            </Typography>
          </motion.div>
        )}

        {/* Video Type Selection */}
        <FormControl
          variant="outlined"
          fullWidth
          disabled={uploading || processing}
          sx={{ mb: 3 }}
        >
          <InputLabel sx={{ '&.Mui-focused': { color: '#667eea' } }}>
            Video Type
          </InputLabel>
          <Select
            value={videoType}
            onChange={(e) => setVideoType(e.target.value)}
            label="Video Type"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.15)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#667eea',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#667eea',
                borderWidth: 2,
              },
            }}
          >
            <MenuItem value="real-time">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Play size={16} />
                Real-time Feed
              </Box>
            </MenuItem>
            <MenuItem value="recorded">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Video size={16} />
                Recorded Video
              </Box>
            </MenuItem>
            <MenuItem value="test">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileVideo size={16} />
                Test Footage
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* File upload option */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}
          >
            Upload video file for crowd detection
          </Typography>
          <DropZone
            isDragging={false}
            isDisabled={processing || uploading}
            onClick={() =>
              !processing && !uploading && fileInputRef.current?.click()
            }
            whileHover={
              !processing && !uploading ? { scale: 1.01, y: -2 } : {}
            }
            whileTap={
              !processing && !uploading ? { scale: 0.99 } : {}
            }
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              ref={fileInputRef}
              disabled={processing || uploading}
            />

            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                mx: 'auto',
              }}
            >
              <Upload size={40} color="#667eea" />
            </Box>

            <Typography
              variant="body1"
              sx={{ color: '#64748b', mb: 1, fontWeight: 500 }}
            >
              Click to select or drag and drop video file
            </Typography>

            {videoFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <FileVideo size={18} color="#667eea" style={{ marginRight: 8 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: '#667eea', fontWeight: 600 }}
                    >
                      Selected: {videoFile.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              </motion.div>
            )}
          </DropZone>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <GradientButton
              variant="contained"
              onClick={handleFileUpload}
              disabled={uploading || processing || !videoFile}
              whileHover={{ scale: !videoFile || uploading || processing ? 1 : 1.05 }}
              whileTap={{ scale: !videoFile || uploading || processing ? 1 : 0.98 }}
              startIcon={
                uploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Video size={20} />
                )
              }
            >
              {uploading ? `Uploading... ${uploadProgress}%` : "Process Video"}
            </GradientButton>
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 4,
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          * Video will be processed to detect crowd levels in the bus. This may take a few minutes depending on video length.
        </Typography>
      </ModalPaper>
    </ModalBackdrop>
  );
};

export default VideoUploader;
