import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Divider,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MovieIcon from "@mui/icons-material/Movie";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { busApi } from "../services/api";
import { getErrorMessage, validateFile } from "../utils/errorHandler";

const VideoUploadPopup = ({
  open,
  handleClose,
  busId,
  busName,
  onUploadComplete,
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const resetForm = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleCloseDialog = () => {
    if (!uploading) {
      resetForm();
      handleClose();
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    // Reset states
    setUploadError(null);
    setUploadSuccess(false);

    // Check if there's at least one file
    if (acceptedFiles?.length) {
      const videoFile = acceptedFiles[0];

      // Validate file
      const validationError = validateFile(videoFile, {
        allowedTypes: [
          "video/mp4",
          "video/quicktime",
          "video/x-msvideo",
          "video/x-matroska",
        ],
        maxSizeMB: 100,
      });

      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setFile(videoFile);
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!file || !busId) return;

    try {
      setUploading(true);
      setUploadError(null);

      // Create form data
      const formData = new FormData();
      formData.append("video", file);

      // Upload video
      await busApi.processVideo(busId, formData, (progress) => {
        setUploadProgress(progress);
      });

      // Upload successful
      setUploadSuccess(true);
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Close after success timeout
      setTimeout(() => {
        handleCloseDialog();
      }, 2000);
    } catch (error) {
      console.error("Error uploading video:", error);
      setUploadError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle className="flex justify-between items-center bg-blue-50">
        <Typography variant="h6" component="div" className="flex items-center">
          <MovieIcon className="mr-2" />
          Upload Video for Analysis
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleCloseDialog}
          disabled={uploading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent className="p-6">
        {uploadSuccess ? (
          <Box className="text-center p-4">
            <CheckCircleIcon
              color="success"
              sx={{ fontSize: 60 }}
              className="mb-2"
            />
            <Typography variant="h6">Upload Successful!</Typography>
            <Typography variant="body2" className="mt-2 text-gray-600">
              Your video is now being processed. You can check the results on
              the bus monitoring page.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body1" className="mb-4">
              Upload a video of the bus interior to analyze crowd levels for
              <span className="font-bold"> {busName || "this bus"}</span>.
            </Typography>

            {uploadError && (
              <Alert severity="error" className="mb-4">
                {uploadError}
              </Alert>
            )}

            {/* File drop zone */}
            <Box
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 ${
                !file
                  ? "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                  : "border-green-400 bg-green-50"
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <Box className="py-4">
                  <CheckCircleIcon
                    color="success"
                    sx={{ fontSize: 40 }}
                    className="mb-2"
                  />
                  <Typography variant="h6" className="mb-1">
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              ) : (
                <Box className="py-8">
                  <CloudUploadIcon
                    sx={{ fontSize: 48 }}
                    className="text-gray-400 mb-2"
                  />
                  <Typography variant="h6">Drag & drop video here</Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    className="mb-3"
                  >
                    or click to select file
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={uploading}
                  >
                    Select Video
                    <input
                      type="file"
                      hidden
                      accept="video/*"
                      onChange={handleFileSelect}
                    />
                  </Button>
                </Box>
              )}
            </Box>

            {uploading && (
              <Box className="my-4">
                <Typography variant="body2" className="mb-1">
                  Uploading: {uploadProgress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  className="rounded-full"
                />
                <Typography
                  variant="caption"
                  className="mt-2 text-gray-500 block"
                >
                  Please keep this window open during upload
                </Typography>
              </Box>
            )}

            <Typography variant="caption" className="text-gray-500 block mt-2">
              Maximum file size: 100MB. Supported formats: MP4, MOV, AVI, MKV
            </Typography>
          </>
        )}
      </DialogContent>

      {!uploadSuccess && (
        <DialogActions className="p-4 bg-gray-50">
          <Button onClick={handleCloseDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={<CloudUploadIcon />}
          >
            {uploading ? "Uploading..." : "Upload Video"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default VideoUploadPopup;
