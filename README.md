# AI-Powered Bus Crowd Detection System

A modern web application to monitor bus occupancy and crowd levels in real time using AI and computer vision. Built with React, Node.js, Express, MongoDB, and a Python service powered by YOLOv8.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Guide](#setup-guide)
- [How to Run](#how-to-run)
- [Main Pages & UI](#main-pages--ui)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Troubleshooting](#troubleshooting)

---

## Features
- **User Authentication**: Secure login and registration for admins and passengers
- **Bus Management**: Add, edit, and delete buses with route and capacity info
- **Real-Time Crowd Detection**: Live video analysis using YOLOv8 to estimate bus occupancy
- **Dashboard**: Overview of all buses, occupancy stats, and quick actions
- **Live Monitoring**: View crowd analytics and video feeds for each bus
- **Video Upload**: Upload and process bus surveillance videos
- **Chatbot**: Get help and information via integrated chatbot
- **Modern UI/UX**: Beautiful gradients, glassmorphism, smooth animations, and responsive design

---

## Tech Stack
- **Frontend**: React 18, Material-UI 5, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express, MongoDB
- **AI Service**: Python 3, YOLOv8, Flask
- **WebSocket**: Real-time updates via Socket.IO

---

## Project Structure
```
client/         # React frontend (UI/UX)
server/         # Node.js/Express backend (API, DB)
python-service/ # Python AI service (YOLOv8)
```

---

## Setup Guide

### 1. Python AI Service
- Install Python 3.8+
- Create and activate a virtual environment
- Install dependencies: `pip install -r requirements.txt`
- Download YOLOv8 model (`yolov8n.pt`) and place in `python-service/`

### 2. Backend
- Install Node.js 14+
- Run `npm install` in `server/`
- Create `.env` file (see below)

### 3. Frontend
- Run `npm install` in `client/`
- Create `.env` file (see below)

---

## How to Run

1. **Start Python Service**
   - Activate venv, run: `python app.py`
2. **Start Backend**
   - Run: `npm start` in `server/`
3. **Start Frontend**
   - Run: `npm start` in `client/`

---

## Main Pages & UI
- **Dashboard**: See all buses, occupancy, and quick actions
- **Real-Time Monitor**: Live video, crowd analytics, charts
- **Bus Management**: Add/edit/delete buses
- **Public Bus View**: Passenger-friendly bus info
- **Video Uploader**: Upload and process videos
- **Login/Register**: Modern authentication with gradients and glassmorphism
- **Layout**: Sidebar navigation, animated transitions

### UI Highlights
- Gradient backgrounds (`#667eea → #764ba2`)
- Glassmorphism cards and dialogs
- Lucide icons for clarity
- Framer Motion for smooth animations
- Responsive design for desktop and mobile

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/user` - Get current user

### Bus Management
- `GET /api/buses` - List buses
- `GET /api/buses/:id` - Bus details
- `POST /api/buses` - Add bus
- `PUT /api/buses/:id` - Edit bus
- `DELETE /api/buses/:id` - Delete bus

### Crowd Detection
- `POST /api/detection/start/:busId` - Start monitoring
- `POST /api/detection/stop/:busId` - Stop monitoring
- `POST /api/detection/process/:busId` - Process frame

### Python Service
- `POST /detect` - Detect people in image
- `GET /health` - Health check

---

## WebSocket Events
- `detection:update` - Crowd detection updates
- `monitoring:started` - Monitoring started
- `monitoring:stopped` - Monitoring stopped

---

## Troubleshooting
- If you see errors, clear cache and restart servers
- Make sure `.env` files are set up in both `client/` and `server/`
- Python service must be running before backend
- MongoDB should be running locally or update `MONGO_URI` in `.env`

---

## License
MIT

---

## Credits
- YOLOv8 by Ultralytics
- Material-UI, Framer Motion, Lucide React
- All contributors
