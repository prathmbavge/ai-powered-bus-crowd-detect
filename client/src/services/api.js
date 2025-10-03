import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000",
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["x-auth-token"] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout if 401 response returned from API
      localStorage.removeItem("token");
      window.location = "/login";
    }
    return Promise.reject(error);
  }
);

// Chat API methods
export const chatApi = {
  getMessages: (busId) => api.get(`/api/chat/${busId}`),
  sendMessage: (busId, text) => api.post(`/api/chat/${busId}`, { text }),
};

// Bus API methods
export const busApi = {
  getAll: () => api.get("/api/buses"),
  getUserCreatedBuses: () => api.get("/api/buses/user/created"),
  getById: (id) => api.get(`/api/buses/${id}`),
  getByPublicToken: (token) => api.get(`/api/buses/public/${token}`),
  create: (busData) => api.post("/api/buses", busData),
  update: (id, busData) => api.put(`/api/buses/${id}`, busData),
  delete: (id) => api.delete(`/api/buses/${id}`),
  generatePublicLink: (id) => api.post(`/api/buses/${id}/public-link`),
  processVideo: (id, formData, onProgress) =>
    api.post(`/api/detection/process-video/${id}`, formData, {
      // Let Axios set the multipart boundary automatically
      timeout: 1000 * 60 * 5, // 5 minutes
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) return;
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(percentCompleted);
      },
    }),
  checkVideoStatus: (id) => api.get(`/api/detection/video-status/${id}`),
};

export default api;
