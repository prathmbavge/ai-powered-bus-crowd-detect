from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
from ultralytics import YOLO
import os, tempfile, threading, uuid
from dotenv import load_dotenv
from datetime import datetime
from flask_cors import CORS
from threading import Lock

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Lock for thread-safe access
task_lock = Lock()

# Load YOLOv8 model lazily
model_path = os.getenv('MODEL_PATH', 'yolov8n.pt')
model = None

def get_model():
    global model
    if model is None:
        try:
            model = YOLO(model_path)
        except Exception as e:
            print(f"❌ Error loading YOLO model: {e}")
            return None
    return model

# Store video processing status
video_tasks = {}

# Crowd thresholds (configurable)
CROWD_THRESHOLD_LOW = int(os.getenv('CROWD_THRESHOLD_LOW', 15))
CROWD_THRESHOLD_MEDIUM = int(os.getenv('CROWD_THRESHOLD_MEDIUM', 30))
CROWD_THRESHOLD_HIGH = int(os.getenv('CROWD_THRESHOLD_HIGH', 45))

def get_crowd_level(count: int) -> str:
    """Determine crowd level based on thresholds."""
    if count < CROWD_THRESHOLD_LOW:
        return "Low"
    elif count < CROWD_THRESHOLD_MEDIUM:
        return "Medium"
    elif count < CROWD_THRESHOLD_HIGH:
        return "High"
    return "Critical"

# Detection parameters
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.25))  # ⭐ Changed from 0.6 - catches more people
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", 0.7))                 # ⭐ Changed from 0.45 - less aggressive NMS
MIN_BBOX_AREA = int(os.getenv("MIN_BBOX_AREA", 200))                   # ⭐ Changed from 400 - allows smaller detections
TARGET_SIZE = int(os.getenv("TARGET_SIZE", 640))

def preprocess_frame(frame):
    """Resize frame if larger than TARGET_SIZE (while keeping aspect ratio)."""
    if frame is None:
        return None
    h, w = frame.shape[:2]
    if max(h, w) > TARGET_SIZE:
        scale = TARGET_SIZE / max(h, w)
        frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
    return frame

def process_frame(frame):
    """Run YOLOv8 on a single frame and return results."""
    model = get_model()
    if not model:
        return "Error", 0, []

    frame = preprocess_frame(frame)
    if frame is None:
        return "Error", 0, []

    # FIX 1: Improved detection parameters
    # Lower confidence threshold to catch more people
    # Higher IOU threshold to prevent over-suppression of nearby people
    results = model(
        frame, 
        conf=0.25,  # ⭐ LOWERED from 0.6 - catches more people
        iou=0.7,    # ⭐ INCREASED from 0.45 - less aggressive NMS
        verbose=False,
        classes=[0],  # Only detect person class
        max_det=100   # ⭐ Allow up to 100 detections
    )
    
    detections = []
    count = 0

    # FIX 2: Better iteration and filtering
    for result in results:
        boxes = result.boxes
        if boxes is not None and len(boxes) > 0:
            # Debug: Print total boxes before filtering
            print(f"   🔍 Raw detections: {len(boxes)} | After filtering: ", end="")
            
            for box in boxes:
                # Get box coordinates and confidence
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = xyxy.astype(int)
                conf = float(box.conf[0])
                
                # Calculate area
                area = (x2 - x1) * (y2 - y1)
                
                # FIX 3: Lower minimum area threshold and add more filtering
                # Only filter out very small boxes (likely false positives)
                if area >= 200:  # ⭐ LOWERED from 400
                    count += 1
                    detections.append({
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "confidence": round(conf, 3),
                        "area": int(area)
                    })
            
            print(f"{count}")

    return get_crowd_level(count), count, detections

@app.route('/detect', methods=['POST'])
def detect_crowd():
    model = get_model()
    if not model:
        return jsonify({"error": "Model not loaded"}), 500
    try:
        file = request.files.get('image')
        if file:
            npimg = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        else:
            data = request.json or {}
            encoded = data.get("image", "").split(",")[-1]
            if not encoded:
                return jsonify({"error": "No image data provided"}), 400
            img = cv2.imdecode(np.frombuffer(base64.b64decode(encoded), np.uint8), cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        level, count, detections = process_frame(img)
        return jsonify({"count": count, "level": level, "detections": detections})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/detect-video', methods=['POST'])
def detect_video():
    model = get_model()
    if not model:
        return jsonify({"error": "Model not loaded"}), 500

    try:
        video_file = request.files.get('video')
        bus_id = request.form.get('busId')
        if not video_file or not bus_id:
            return jsonify({"error": "Missing video or busId"}), 400

        # Log video details for debugging
        print(f"\n🎬 NEW VIDEO UPLOAD RECEIVED")
        print(f"   Bus ID: {bus_id}")
        print(f"   Filename: {video_file.filename}")
        print(f"   Content Type: {video_file.content_type}")

        # Save temp video
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        video_file.save(temp_video.name)
        file_size = os.path.getsize(temp_video.name)
        print(f"   Saved to: {temp_video.name}")
        print(f"   File Size: {file_size / 1024 / 1024:.2f} MB\n")

        task_id = str(uuid.uuid4())
        with task_lock:
            video_tasks[task_id] = {
                "status": "processing", "bus_id": bus_id,
                "started_at": datetime.now().isoformat(),
                "progress": 0, "results": [],
                "filename": video_file.filename,
                "file_size": file_size
            }

        threading.Thread(target=process_video, args=(task_id, temp_video.name)).start()
        return jsonify({"task_id": task_id, "status": "processing"})
    except Exception as e:
        print(f"❌ Error in detect-video: {e}")
        return jsonify({"error": str(e)}), 500

def process_video(task_id, video_path):
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception("Failed to open video")

        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        interval = 1  # ⭐ Process EVERY frame (no skipping)

        results = []
        max_count, max_level, max_timestamp = 0, "Low", 0
        
        print(f"\n{'='*60}")
        print(f"📹 NEW VIDEO PROCESSING STARTED")
        print(f"{'='*60}")
        print(f"   Task ID: {task_id}")
        print(f"   Video Path: {video_path}")
        print(f"   FPS: {fps} | Total Frames: {total_frames}")
        print(f"   ⭐ Processing Mode: EVERY FRAME - Maximum Count Strategy")
        print(f"{'='*60}\n")

        frame_num = 0
        processed_count = 0
        unique_counts = set()  # Track unique count values to verify variation
        
        while True:
            # Use cap.read() instead of grab/retrieve to ensure fresh frames
            ret, frame = cap.read()
            if not ret:
                break
            
            # ⭐ Process EVERY frame (removed interval check)
            if True:  # Process every frame
                # Verify frame is valid
                if frame is None or frame.size == 0:
                    print(f"   ⚠️  Frame {frame_num}: Invalid frame data")
                    frame_num += 1
                    continue
                
                # Calculate frame hash to verify uniqueness
                frame_hash = hash(frame.tobytes()[:1000])  # Hash first 1000 bytes for speed
                
                level, count, detections = process_frame(frame)
                timestamp = frame_num / fps
                processed_count += 1
                unique_counts.add(count)
                
                # Detailed logging (show every 30th frame + important events to avoid spam)
                if frame_num % 30 == 0 or count > max_count:
                    print(f"   Frame {frame_num:4d} | Time: {timestamp:6.1f}s | Count: {count:2d} | Max So Far: {max_count:2d} | Level: {level:8s}")
                
                results.append({"timestamp": round(timestamp, 2), "count": count, "level": level})
                if count > max_count:
                    max_count, max_level, max_timestamp = count, level, timestamp
                    print(f"   🎯 NEW MAX COUNT: {max_count} people at {timestamp:.1f}s")

                # Update progress
                with task_lock:
                    video_tasks[task_id]["progress"] = int((frame_num / total_frames) * 100)

            frame_num += 1
        cap.release()
        
        print(f"\n{'='*60}")
        print(f"✅ VIDEO PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"   Total Frames: {total_frames}")
        print(f"   Frames Processed: {processed_count}")
        print(f"   Unique Count Values: {sorted(unique_counts)}")
        print(f"   🎯 MAXIMUM COUNT: {max_count} people ({max_level})  ⭐")
        print(f"   Max Count at: {max_timestamp:.1f}s")
        print(f"   Task ID: {task_id[:8]}")
        print(f"{'='*60}\n")
        
        # IMPORTANT: Verify we got variation
        if len(unique_counts) == 1:
            print(f"⚠️  WARNING: All frames had same count ({list(unique_counts)[0]})!")
            print(f"   This might indicate:")
            print(f"   1. Video has static content (no people moving)")
            print(f"   2. All frames look similar")
            print(f"   3. Frame reading issue (unlikely with current fix)")
            print(f"   4. Video legitimately has same number of people\n")

        with task_lock:
            video_tasks[task_id].update({
                "status": "completed", "results": results,
                "max_count": max_count,  # ⭐ Maximum count found in any frame
                "max_level": max_level,  # ⭐ Level at maximum count
                "max_timestamp": round(max_timestamp, 2),
                "completed_at": datetime.now().isoformat(),
                "total_frames_processed": len(results),
                "unique_count_values": len(unique_counts),
                "count_range": {"min": min(unique_counts) if unique_counts else 0, 
                               "max": max(unique_counts) if unique_counts else 0}
            })
        
        print(f"💾 Task {task_id[:8]} results saved to memory\n")
    except Exception as e:
        print(f"\n❌ ERROR PROCESSING VIDEO")
        print(f"   Task ID: {task_id[:8]}")
        print(f"   Error: {e}")
        print(f"   Type: {type(e).__name__}\n")
        with task_lock:
            video_tasks[task_id].update({"status": "error", "error": str(e)})
    finally:
        try: os.unlink(video_path)
        except: pass

@app.route('/video-status/<task_id>', methods=['GET'])
def get_video_status(task_id):
    with task_lock:
        task = video_tasks.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    # Debug log with detailed info
    if task.get("status") == "completed":
        print(f"\n📊 STATUS REQUEST: {task_id[:8]}")
        print(f"   Max Count: {task.get('max_count')}")
        print(f"   Unique Values: {task.get('unique_count_values')}")
        print(f"   Range: {task.get('count_range')}\n")
    
    return jsonify(task)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": get_model() is not None})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    print(f"\n🚀 Starting Flask YOLOv8 Service | Host={host} | Port={port}")
    app.run(host=host, port=port, debug=debug, use_reloader=False)
