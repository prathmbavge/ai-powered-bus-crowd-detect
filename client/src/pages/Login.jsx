import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Alert,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
  styled,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, Shield, Bus, CheckCircle, AlertCircle } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";

const GradientButton = styled(motion(Button))(({ theme }) => ({
  borderRadius: '12px',
  padding: '14px 32px',
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

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await auth?.login(email, password, role);
      if (success) {
        // Navigate to appropriate page based on role
        navigate("/");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: 6,
        px: 2,
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 480, zIndex: 1 }}
      >
        <Paper
          sx={{
            p: 5,
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
              }}
            >
              <Lock size={36} color="white" />
            </Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}
            >
              Welcome Back
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#64748b', mb: 3, textAlign: 'center' }}
            >
              Sign in to your account to continue
            </Typography>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  <Alert
                    severity="error"
                    icon={<AlertCircle size={20} />}
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      '& .MuiAlert-icon': { alignItems: 'center' },
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{ width: '100%' }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#667eea',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <Mail size={20} color="#64748b" style={{ marginRight: 8 }} />
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#667eea',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <Lock size={20} color="#64748b" style={{ marginRight: 8 }} />
                  ),
                }}
              />

              <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                <FormLabel
                  component="legend"
                  sx={{
                    fontWeight: 600,
                    color: '#1e293b',
                    '&.Mui-focused': { color: '#667eea' },
                    mb: 1,
                  }}
                >
                  Login As
                </FormLabel>
                <RadioGroup
                  row
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  sx={{ gap: 2 }}
                >
                  <FormControlLabel
                    value="passenger"
                    control={
                      <Radio
                        sx={{
                          '&.Mui-checked': { color: '#667eea' },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <User size={16} />
                        Passenger
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="admin"
                    control={
                      <Radio
                        sx={{
                          '&.Mui-checked': { color: '#667eea' },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Shield size={16} />
                        Administrator
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              <GradientButton
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                sx={{ mb: 3 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </GradientButton>
              <Grid container justifyContent="center">
                <Grid item>
                  <Link
                    href="/register"
                    variant="body2"
                    sx={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Don't have an account? Sign Up
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </motion.div>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default Login;
