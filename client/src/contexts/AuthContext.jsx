import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize: check if user is logged in
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Set auth token header
          api.defaults.headers.common["x-auth-token"] = token;

          // Get user data
          const res = await api.get("/api/auth/user");
          setUser(res.data);
        } catch (err) {
          console.error("Error loading user", err);
          localStorage.removeItem("token");
          setToken(null);
          delete api.defaults.headers.common["x-auth-token"];
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Login
  const login = async (email, password) => {
    try {
      const res = await api.post("/api/auth/login", { email, password });

      // Set token in local storage and state
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      return true;
    } catch (err) {
      console.error("Login error", err.response?.data || err.message);
      return false;
    }
  };

  // Register
  const register = async (name, email, password, role = "passenger") => {
    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
        role,
      });

      // Set token in local storage and state
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      return true;
    } catch (err) {
      console.error("Register error", err.response?.data || err.message);
      return false;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["x-auth-token"];
    navigate("/login");
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user && user.role === "admin";
  };

  // Check if user is passenger
  const isPassenger = () => {
    return user && user.role === "passenger";
  };

  // Check if user owns a specific resource
  const isOwner = (resourceCreatorId) => {
    return user && resourceCreatorId && (user._id === resourceCreatorId || user.id === resourceCreatorId);
  };

  // Check if user can manage a specific resource (admin or owner)
  const canManage = (resourceCreatorId) => {
    return isAdmin() || isOwner(resourceCreatorId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated,
        isAdmin,
        isPassenger,
        isOwner,
        canManage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
