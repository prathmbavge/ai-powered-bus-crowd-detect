import React, { useState, useContext } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { styled, alpha } from "@mui/material/styles";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  useTheme,
  Chip,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu as MenuLucide,
  LayoutDashboard,
  Bus,
  LogOut,
  User,
  Bell,
  Settings,
  Shield,
} from "lucide-react";

// Context
import { AuthContext } from "../contexts/AuthContext";

const drawerWidth = 260;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: 0,
    backgroundColor: alpha(theme.palette.background.default, 0.98),
    minHeight: "100vh",
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: "100%",
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(["margin", "width"], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  })
);

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.1)",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  backdropFilter: "blur(10px)",
  zIndex: theme.zIndex.drawer + 1,
}));

const Layout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle avatar menu open
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  // Handle avatar menu close
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  // Handle notification menu
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };

  // Navigation items based on user role
  const navItems = [
    {
      text: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/",
      description: "Overview of all buses",
      adminOnly: false,
    },
    {
      text: "Bus Management",
      icon: <Bus size={20} />,
      path: "/buses",
      description: "Manage your bus fleet",
      adminOnly: true,
    },
  ];

  // Check if path is active
  const isActivePath = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || auth?.isAdmin()
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
      <StyledAppBar position="fixed">
        <Toolbar sx={{ px: 2 }}>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuLucide size={24} />
            </IconButton>
          </motion.div>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}
            >
              <Bus size={20} color="white" />
            </Box>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontWeight: 700, letterSpacing: 0.5 }}
            >
              Bus Crowd Detection
            </Typography>
          </Box>

          {/* Notifications */}
          <Box sx={{ mr: 2 }}>
            <Tooltip title="Notifications">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <IconButton color="inherit" onClick={handleOpenNotificationsMenu}>
                  <Badge badgeContent={2} color="error">
                    <Bell size={20} />
                  </Badge>
                </IconButton>
              </motion.div>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorElNotifications}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
              PaperProps={{
                sx: {
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  minWidth: 280,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Notifications
                </Typography>
              </Box>
              <MenuItem sx={{ py: 1.5, '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' } }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Bus #345 is now critically crowded
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    2 minutes ago
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem sx={{ py: 1.5, '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' } }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    New message from passenger
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    15 minutes ago
                  </Typography>
                </Box>
              </MenuItem>
            </Menu>
          </Box>

          {/* User Role Indicator */}
          <Chip
            icon={auth?.user?.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
            label={auth?.user?.role === 'admin' ? 'Admin' : 'Passenger'}
            size="small"
            sx={{
              mr: 2,
              borderRadius: '20px',
              background: auth?.user?.role === 'admin' 
                ? 'rgba(255, 255, 255, 0.25)' 
                : 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          />

          {/* User Menu */}
          <Box>
            <Tooltip title="Account settings">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar
                    alt={auth?.user?.name || 'User'}
                    sx={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(10px)',
                      fontWeight: 700,
                    }}
                  >
                    {auth?.user?.name?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
              </motion.div>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                sx: {
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  minWidth: 240,
                },
              }}
            >
              <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                  }}
                >
                  {auth?.user?.name?.charAt(0) || 'U'}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {auth?.user?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  {auth?.user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={auth?.logout}
                sx={{
                  py: 1.5,
                  mx: 1,
                  my: 0.5,
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                  },
                }}
              >
                <ListItemIcon>
                  <LogOut size={18} />
                </ListItemIcon>
                <Typography>Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </StyledAppBar>

      {/* Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: '2px 0 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            minHeight: '64px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              <Bus size={20} color="white" />
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Bus Monitor
            </Typography>
          </Box>
        </Toolbar>
        <Box sx={{ overflow: 'auto', height: '100%' }}>
          <Box sx={{ p: 2, pt: 3 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: 1.5,
                fontSize: '0.75rem',
              }}
            >
              MAIN NAVIGATION
            </Typography>
          </Box>

          <List sx={{ px: 2 }}>
            <AnimatePresence>
              {filteredNavItems.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <ListItem
                    disablePadding
                    sx={{
                      mb: 1,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: isActivePath(item.path)
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                        : 'transparent',
                    }}
                  >
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: '12px',
                        py: 1.5,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: isActivePath(item.path)
                            ? 'rgba(102, 126, 234, 0.15)'
                            : 'rgba(102, 126, 234, 0.08)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isActivePath(item.path) ? '#667eea' : '#64748b',
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActivePath(item.path) ? 700 : 500,
                              color: isActivePath(item.path) ? '#667eea' : '#1e293b',
                            }}
                          >
                            {item.text}
                          </Typography>
                        }
                        secondary={item.description}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: {
                            display: 'block',
                            color: '#64748b',
                            opacity: 0.8,
                            fontSize: '0.75rem',
                          },
                        }}
                      />
                      {isActivePath(item.path) && (
                        <motion.div
                          layoutId="activeIndicator"
                          style={{
                            position: 'absolute',
                            right: 0,
                            width: 4,
                            height: 32,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>

          <Divider sx={{ my: 3, opacity: 0.6 }} />

          <Box sx={{ p: 3, mt: 'auto' }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: '#64748b',
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              © {new Date().getFullYear()} Bus Monitor System
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: '#94a3b8',
                opacity: 0.7,
              }}
            >
              v1.0.0
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Main
        open={drawerOpen}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }} />
        <Container maxWidth="xl" sx={{ p: 0, flex: 1, width: '100%' }}>
          <Outlet />
        </Container>
      </Main>
    </Box>
  );
};

export default Layout;
