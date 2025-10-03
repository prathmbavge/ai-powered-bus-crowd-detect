/**
 * Utility functions to handle API errors consistently across the applicatioconsconst errorHandlerUtils = {
  getErrorMessage,
  validateFile
};

export default errorHandlerUtils;rorHandlerUtils = {
  getErrorMessage,
  validateFile
};

export default errorHandlerUtils;*/

/**
 * Extract a user-friendly error message from an API error response
 * @param {Error} error - The error object from an API call
 * @returns {string} A user-friendly error message
 */
export const getErrorMessage = (error) => {
  // Check for network errors
  if (!error.response) {
    return "Network error - please check your connection and try again";
  }

  // Extract message from response if available
  const responseData = error.response?.data;

  if (responseData?.msg) {
    return responseData.msg;
  }

  if (responseData?.error) {
    return typeof responseData.error === "string"
      ? responseData.error
      : "An error occurred";
  }

  // Handle specific HTTP status codes
  switch (error.response.status) {
    case 400:
      return "Invalid request - please check your inputs";
    case 401:
      return "Authentication required - please log in again";
    case 403:
      return "You don't have permission to perform this action";
    case 404:
      return "Resource not found";
    case 413:
      return "File is too large to upload";
    case 415:
      return "Unsupported file type";
    case 429:
      return "Too many requests - please try again later";
    case 500:
    case 502:
    case 503:
      return "Server error - please try again later";
    default:
      return `Error (${error.response.status}): Please try again later`;
  }
};

/**
 * Get a validation message for file uploads
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedTypes - Array of allowed MIME types
 * @param {number} options.maxSizeMB - Maximum file size in MB
 * @returns {string|null} Error message or null if valid
 */
export const validateFile = (
  file,
  { allowedTypes = [], maxSizeMB = 100 } = {}
) => {
  if (!file) return "No file selected";

  // Check file type if specified
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedTypes.join(", ")}`;
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File is too large (max ${maxSizeMB}MB)`;
  }

  return null;
};

export default {
  getErrorMessage,
  validateFile,
};
