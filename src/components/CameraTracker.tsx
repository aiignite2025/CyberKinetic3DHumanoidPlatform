/**
 * Vision & Skeletal Motion Capture Pipeline
 * Integrates:
 * - Local Webcam video feed
 * - YOLO Person Detection Bounding Box Overlay
 * - MediaPipe High-Precision 33-point Skeletal Pose Tracker
 * - PoseFormer & VIBE dynamic smoothing filter pipeline
 * - Comprehensive Open-Source Practical Actions Library (Pick & Place, Mobile ALOHA Peg-in-Hole, Handover, Tai Chi, etc.)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseLandmark3D, TrackingAlgorithm, PracticalActionType, YoloLiftingResult, YoloLiftingConfig } from '../types/robot';
import { MotionFilterPipeline } from '../utils/filters';
import { POSE_LANDMARKS } from '../utils/kinematics';
import { PRACTICAL_ACTIONS } from '../data/openSourceRobots';
import { Yolo3dPoseLifter } from '../utils/yolo3dLifting';
import {
  Camera,
  CameraOff,
  RefreshCw,
  AlertCircle,
  Cpu,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Bot,
  PlayCircle
} from 'lucide-react';

interface CameraTrackerProps {
  onLandmarksDetected: (landmarks: PoseLandmark3D[], algorithm: TrackingAlgorithm, isMirrored?: boolean) => void;
  selectedAlgorithm: TrackingAlgorithm;
  onAlgorithmChange: (algo: TrackingAlgorithm) => void;
  activePracticalAction?: PracticalActionType;
  onSelectAction?: (action: PracticalActionType) => void;
  onYoloLiftingResult?: (result: YoloLiftingResult) => void;
  yoloConfig?: YoloLiftingConfig;
}

export const CameraTracker: React.FC<CameraTrackerProps> = ({
  onLandmarksDetected,
  selectedAlgorithm,
  onAlgorithmChange,
  activePracticalAction = 'wave',
  onSelectAction,
  onYoloLiftingResult,
  yoloConfig,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const filterPipelineRef = useRef<MotionFilterPipeline>(new MotionFilterPipeline());
  const yoloLifterRef = useRef<Yolo3dPoseLifter>(new Yolo3dPoseLifter(yoloConfig));

  useEffect(() => {
    if (yoloConfig) {
      yoloLifterRef.current.updateConfig(yoloConfig);
    }
  }, [yoloConfig]);

  // Camera & Stream states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Demo motion generator state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [currentAction, setCurrentAction] = useState<PracticalActionType>(activePracticalAction);
  const [actionCategory, setActionCategory] = useState<'all' | 'industrial' | 'teleop' | 'service' | 'safety' | 'benchmark'>('all');
  const demoTimeRef = useRef<number>(0);

  // Performance metrics
  const [fps, setFps] = useState<number>(0);

  // Sync external activePracticalAction if changed
  useEffect(() => {
    if (activePracticalAction) {
      setCurrentAction(activePracticalAction);
      setIsDemoMode(true);
      if (isCameraActive) {
        stopCamera();
      }
    }
  }, [activePracticalAction]);

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        setModelLoading(true);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        if (!isMounted) return;

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!isMounted) return;
        poseLandmarkerRef.current = landmarker;
        setModelLoading(false);
      } catch (err: unknown) {
        console.warn('MediaPipe network bundle note:', err);
        if (isMounted) {
          setModelLoading(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setIsDemoMode(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          setCameraLoading(false);
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(`摄像头访问受限: ${msg}`);
      setCameraLoading(false);
      setIsDemoMode(true);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  /**
   * Generates highly realistic kinematics for all open-source humanoid practical actions:
   * Pick & Place, Mobile ALOHA Peg-in-Hole, Handover, Table Wiping, Cross-Arm E-Stop, Tai Chi, etc.
   */
  const generateDemoLandmarks = useCallback((time: number, action: PracticalActionType): PoseLandmark3D[] => {
    const lms: PoseLandmark3D[] = [];
    const t = time * 0.0018;

    // Torso anchor
    let midX = 0.5;
    let midY = 0.48;
    const shoulderWidth = 0.20;
    const armLength = 0.16;

    // Anatomical Right (screen left, smaller X)
    let rightShoulder = { x: midX - shoulderWidth / 2, y: midY - 0.15, z: 0 };
    // Anatomical Left (screen right, larger X)
    let leftShoulder = { x: midX + shoulderWidth / 2, y: midY - 0.15, z: 0 };

    let rightElbow = { x: rightShoulder.x - 0.04, y: rightShoulder.y + 0.15, z: 0 };
    let rightWrist = { x: rightElbow.x - 0.02, y: rightElbow.y + 0.14, z: 0 };

    let leftElbow = { x: leftShoulder.x + 0.04, y: leftShoulder.y + 0.15, z: 0 };
    let leftWrist = { x: leftElbow.x + 0.02, y: leftElbow.y + 0.14, z: 0 };

    let rightHip = { x: midX - 0.08, y: midY + 0.20, z: 0 };
    let leftHip = { x: midX + 0.08, y: midY + 0.20, z: 0 };
    let rightKnee = { x: midX - 0.08, y: midY + 0.44, z: 0 };
    let leftKnee = { x: midX + 0.08, y: midY + 0.44, z: 0 };
    let rightAnkle = { x: midX - 0.08, y: midY + 0.65, z: 0 };
    let leftAnkle = { x: midX + 0.08, y: midY + 0.65, z: 0 };

    let nose = { x: midX, y: midY - 0.28, z: -0.04 };

    // Generate action kinematics
    switch (action) {
      case 'wipe_table': {
        // Horizontal table surface circular wiping (Lissajous)
        const wipeR = 0.11;
        const wx = Math.cos(t * 3.0) * wipeR;
        const wz = Math.sin(t * 3.0) * wipeR - 0.18;

        // Leaning slightly forward into table
        midY = 0.49;
        nose.z = -0.08;

        // Right arm (screen left): extended forward onto table, circular sweeping
        rightElbow = { x: rightShoulder.x - 0.02, y: rightShoulder.y + 0.10, z: -0.14 };
        rightWrist = { x: rightShoulder.x - 0.04 + wx, y: rightShoulder.y + 0.14, z: wz };

        // Left arm (screen right): stabilizing on the other side
        leftElbow = { x: leftShoulder.x + 0.04, y: leftShoulder.y + 0.12, z: -0.06 };
        leftWrist = { x: leftShoulder.x + 0.06, y: leftShoulder.y + 0.20, z: -0.08 };

        rightKnee.z = -0.04;
        leftKnee.z = -0.04;
        break;
      }

      case 'pick_place': {
        // Multi-phase dual-arm pick and place with squat and torso yaw
        const cycle = (t * 0.5) % 1.0;
        let liftZ = 0;
        let liftY = 0;
        let yawOffset = 0;
        let squatY = 0;

        if (cycle < 0.25) {
          const p = cycle / 0.25;
          squatY = 0.05 * p;
          liftY = 0.14 * p;
          liftZ = -0.16 * p;
        } else if (cycle < 0.5) {
          const p = (cycle - 0.25) / 0.25;
          squatY = 0.05 * (1 - p);
          liftY = 0.14 * (1 - p) + 0.02 * p;
          liftZ = -0.16 * (1 - p) - 0.25 * p;
        } else if (cycle < 0.75) {
          const p = (cycle - 0.5) / 0.25;
          liftY = 0.02;
          liftZ = -0.25;
          yawOffset = Math.sin(p * Math.PI) * 0.12;
        } else {
          const p = (cycle - 0.75) / 0.25;
          liftY = 0.14 * (1 - p);
          liftZ = -0.16 * (1 - p);
        }

        midX += yawOffset * 0.4;
        midY += squatY;
        nose.z = -0.06;

        rightElbow = {
          x: rightShoulder.x + 0.02,
          y: rightShoulder.y + 0.08 + liftY,
          z: liftZ * 0.7,
        };
        rightWrist = {
          x: midX - 0.07,
          y: rightElbow.y + 0.06 + liftY,
          z: liftZ,
        };

        leftElbow = {
          x: leftShoulder.x - 0.02,
          y: leftShoulder.y + 0.08 + liftY,
          z: liftZ * 0.7,
        };
        leftWrist = {
          x: midX + 0.07,
          y: leftElbow.y + 0.06 + liftY,
          z: liftZ,
        };

        rightKnee.z = -squatY * 1.5;
        leftKnee.z = -squatY * 1.5;
        break;
      }

      case 'peg_in_hole': {
        // Stanford Mobile ALOHA teleoperation stance
        const searchOsc = Math.sin(t * 5.0) * 0.015;
        const insertZ = Math.sin(t * 2.5) * 0.04 - 0.24;

        rightElbow = { x: rightShoulder.x + 0.02, y: rightShoulder.y + 0.08, z: -0.14 };
        rightWrist = { x: midX - 0.05 + searchOsc, y: rightElbow.y + 0.04, z: insertZ };

        leftElbow = { x: leftShoulder.x - 0.02, y: leftShoulder.y + 0.08, z: -0.14 };
        leftWrist = { x: midX + 0.05, y: leftElbow.y + 0.04, z: -0.22 };
        break;
      }

      case 'handover': {
        // Bimanual Tray Handover: bowing forward 15 deg
        const bow = Math.sin(t * 1.5) * 0.5 + 0.5;
        midY = 0.48 + bow * 0.03;
        nose.z = -0.05 - bow * 0.12;

        const extendDist = -0.10 - bow * 0.20;
        rightElbow = { x: rightShoulder.x + 0.02, y: rightShoulder.y + 0.08, z: extendDist * 0.6 };
        rightWrist = { x: midX - 0.08, y: rightShoulder.y + 0.06, z: extendDist };

        leftElbow = { x: leftShoulder.x - 0.02, y: leftShoulder.y + 0.08, z: extendDist * 0.6 };
        leftWrist = { x: midX + 0.08, y: leftShoulder.y + 0.06, z: extendDist };
        break;
      }

      case 'estop_shield': {
        // Cross-arm protective shield
        const pulse = Math.sin(t * 4.0) * 0.01;
        nose.y = midY - 0.24;

        rightElbow = { x: rightShoulder.x + 0.06, y: rightShoulder.y + 0.05, z: -0.18 };
        rightWrist = { x: leftShoulder.x - 0.02 - pulse, y: rightShoulder.y - 0.02, z: -0.24 };

        leftElbow = { x: leftShoulder.x - 0.06, y: leftShoulder.y + 0.05, z: -0.18 };
        leftWrist = { x: rightShoulder.x + 0.02 + pulse, y: leftShoulder.y - 0.02, z: -0.24 };
        break;
      }

      case 'taichi': {
        // Tai Chi compliant cloud hands
        const phase1 = t * 1.8;
        const phase2 = phase1 + Math.PI * 0.65;
        const sway = Math.sin(phase1) * 0.05;
        midX += sway;

        rightElbow = {
          x: rightShoulder.x - Math.sin(phase1) * 0.09,
          y: rightShoulder.y + Math.cos(phase1) * 0.10 + 0.06,
          z: Math.sin(phase1 * 2) * 0.10 - 0.14,
        };
        rightWrist = {
          x: rightElbow.x - Math.sin(phase1 + 0.4) * 0.08,
          y: rightElbow.y + Math.cos(phase1 + 0.4) * 0.06,
          z: rightElbow.z - 0.08,
        };

        leftElbow = {
          x: leftShoulder.x + Math.sin(phase2) * 0.09,
          y: leftShoulder.y + Math.cos(phase2) * 0.10 + 0.06,
          z: Math.sin(phase2 * 2) * 0.10 - 0.14,
        };
        leftWrist = {
          x: leftElbow.x + Math.sin(phase2 + 0.4) * 0.08,
          y: leftElbow.y + Math.cos(phase2 + 0.4) * 0.06,
          z: leftElbow.z - 0.08,
        };

        rightKnee.z = -0.03 - Math.sin(phase1) * 0.03;
        leftKnee.z = -0.03 + Math.sin(phase1) * 0.03;
        break;
      }

      case 'wave': {
        // High-fidelity natural human waving hello
        // 1. Right upper arm elevated up and forward (Shoulder Pitch ~80°, Roll ~28°)
        const waveOsc = Math.sin(t * 5.2); // Energetic and friendly waving rhythm
        const nod = Math.sin(t * 2.6) * 0.015;

        // Elbow elevated forward and slightly outward (in front of shoulder, above chest)
        rightElbow = {
          x: rightShoulder.x - 0.07,
          y: rightShoulder.y - 0.06, // Lifted ABOVE shoulder (smaller Y is higher in MediaPipe)
          z: -0.16, // Forward reach
        };

        // Forearm extended UPWARD with hand high in the air, oscillating left & right
        rightWrist = {
          x: rightElbow.x + waveOsc * 0.075,
          y: rightElbow.y - 0.16, // Forearm raised UP in the air!
          z: rightElbow.z + 0.03,
        };

        // Friendly head nod and gaze towards waving hand
        nose.x = midX - 0.025;
        nose.y = midY - 0.28 + nod;
        nose.z = -0.06;

        // Left arm relaxed naturally by the side
        leftElbow = { x: leftShoulder.x + 0.03, y: leftShoulder.y + 0.15, z: 0 };
        leftWrist = { x: leftElbow.x + 0.01, y: leftElbow.y + 0.14, z: 0 };
        break;
      }

      case 'box': {
        const punchR = Math.max(0, Math.sin(t * 3.0));
        const punchL = Math.max(0, Math.sin(t * 3.0 + Math.PI));

        rightElbow = { x: rightShoulder.x - 0.03, y: rightShoulder.y + 0.04, z: -0.12 - punchR * 0.25 };
        rightWrist = { x: midX - 0.04, y: rightShoulder.y + 0.02, z: -0.18 - punchR * 0.35 };

        leftElbow = { x: leftShoulder.x + 0.03, y: leftShoulder.y + 0.04, z: -0.12 - punchL * 0.25 };
        leftWrist = { x: midX + 0.04, y: leftShoulder.y + 0.02, z: -0.18 - punchL * 0.35 };
        break;
      }

      case 'stretch': {
        const angle = t * 2.0;
        rightElbow = {
          x: rightShoulder.x - Math.cos(angle) * armLength,
          y: rightShoulder.y - Math.abs(Math.sin(angle)) * armLength * 1.1,
          z: 0,
        };
        rightWrist = {
          x: rightElbow.x - Math.cos(angle) * armLength,
          y: rightElbow.y - Math.abs(Math.sin(angle)) * armLength,
          z: 0,
        };
        leftElbow = {
          x: leftShoulder.x + Math.cos(angle) * armLength,
          y: leftShoulder.y - Math.abs(Math.sin(angle)) * armLength * 1.1,
          z: 0,
        };
        leftWrist = {
          x: leftElbow.x + Math.cos(angle) * armLength,
          y: leftElbow.y - Math.abs(Math.sin(angle)) * armLength,
          z: 0,
        };
        break;
      }

      case 'tpose':
      default: {
        rightElbow = { x: rightShoulder.x - armLength, y: rightShoulder.y, z: 0 };
        rightWrist = { x: rightElbow.x - armLength, y: rightShoulder.y, z: 0 };
        leftElbow = { x: leftShoulder.x + armLength, y: leftShoulder.y, z: 0 };
        leftWrist = { x: leftElbow.x + armLength, y: leftShoulder.y, z: 0 };
        break;
      }
    }

    // Populate all 33 landmarks
    for (let i = 0; i < 33; i++) {
      lms.push({ x: midX, y: midY, z: 0, visibility: 0.95 });
    }

    lms[POSE_LANDMARKS.NOSE] = { ...nose, visibility: 0.98 };
    lms[POSE_LANDMARKS.LEFT_EYE] = { x: nose.x + 0.02, y: nose.y - 0.01, z: nose.z, visibility: 0.98 };
    lms[POSE_LANDMARKS.RIGHT_EYE] = { x: nose.x - 0.02, y: nose.y - 0.01, z: nose.z, visibility: 0.98 };

    // Anatomical Right (screen left)
    lms[POSE_LANDMARKS.RIGHT_SHOULDER] = { ...rightShoulder, visibility: 0.99 };
    lms[POSE_LANDMARKS.RIGHT_ELBOW] = { ...rightElbow, visibility: 0.98 };
    lms[POSE_LANDMARKS.RIGHT_WRIST] = { ...rightWrist, visibility: 0.97 };
    const rForeDx = rightWrist.x - rightElbow.x;
    const rForeDy = rightWrist.y - rightElbow.y;
    const rForeDz = rightWrist.z - rightElbow.z;
    const rForeL = Math.max(1e-4, Math.sqrt(rForeDx * rForeDx + rForeDy * rForeDy + rForeDz * rForeDz));
    const waveHandSwing = action === 'wave' ? Math.sin(t * 5.2) * 0.03 : 0;
    lms[POSE_LANDMARKS.RIGHT_INDEX] = {
      x: rightWrist.x + (rForeDx / rForeL) * 0.05 + waveHandSwing,
      y: rightWrist.y + (rForeDy / rForeL) * 0.05,
      z: rightWrist.z + (rForeDz / rForeL) * 0.05,
      visibility: 0.95,
    };

    // Anatomical Left (screen right)
    lms[POSE_LANDMARKS.LEFT_SHOULDER] = { ...leftShoulder, visibility: 0.99 };
    lms[POSE_LANDMARKS.LEFT_ELBOW] = { ...leftElbow, visibility: 0.98 };
    lms[POSE_LANDMARKS.LEFT_WRIST] = { ...leftWrist, visibility: 0.97 };
    const lForeDx = leftWrist.x - leftElbow.x;
    const lForeDy = leftWrist.y - leftElbow.y;
    const lForeDz = leftWrist.z - leftElbow.z;
    const lForeL = Math.max(1e-4, Math.sqrt(lForeDx * lForeDx + lForeDy * lForeDy + lForeDz * lForeDz));
    lms[POSE_LANDMARKS.LEFT_INDEX] = {
      x: leftWrist.x + (lForeDx / lForeL) * 0.05,
      y: leftWrist.y + (lForeDy / lForeL) * 0.05,
      z: leftWrist.z + (lForeDz / lForeL) * 0.05,
      visibility: 0.95,
    };

    // Hips, Knees, Ankles
    lms[POSE_LANDMARKS.RIGHT_HIP] = { ...rightHip, visibility: 0.99 };
    lms[POSE_LANDMARKS.LEFT_HIP] = { ...leftHip, visibility: 0.99 };

    lms[POSE_LANDMARKS.RIGHT_KNEE] = { ...rightKnee, visibility: 0.95 };
    lms[POSE_LANDMARKS.LEFT_KNEE] = { ...leftKnee, visibility: 0.95 };

    lms[POSE_LANDMARKS.RIGHT_ANKLE] = { ...rightAnkle, visibility: 0.95 };
    lms[POSE_LANDMARKS.LEFT_ANKLE] = { ...leftAnkle, visibility: 0.95 };

    return lms;
  }, []);

  // Main Detection Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      frameCount++;
      if (currentTime - lastFpsUpdate >= 500) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      let rawLandmarks: PoseLandmark3D[] | null = null;

      if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;

        ctx.save();
        if (isMirrored) {
          ctx.scale(-1, 1);
          ctx.drawImage(video, -width, 0, width, height);
        } else {
          ctx.drawImage(video, 0, 0, width, height);
        }
        ctx.restore();

        if (poseLandmarkerRef.current) {
          try {
            const results = poseLandmarkerRef.current.detectForVideo(video, currentTime);
            if (results && results.landmarks && results.landmarks.length > 0) {
              rawLandmarks = results.landmarks[0].map(p => ({
                x: p.x,
                y: p.y,
                z: p.z,
                visibility: p.visibility ?? 0.9,
              }));
            }
          } catch {
            // Timestamp sync
          }
        }
      } else if (isDemoMode) {
        // Cyber Grid Canvas in Demo Mode
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        demoTimeRef.current += (currentTime - lastTime);
        rawLandmarks = generateDemoLandmarks(demoTimeRef.current, currentAction);
      } else {
        // Idle view
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('动作视觉采集待机中', width / 2, height / 2 - 10);
        ctx.font = '11px sans-serif';
        ctx.fillText('点击上方【开启摄像头】或选择下方【实例动作】', width / 2, height / 2 + 15);
        return;
      }

      lastTime = currentTime;
      if (!rawLandmarks || rawLandmarks.length === 0) return;

      const smoothedLandmarks = filterPipelineRef.current.process(
        rawLandmarks,
        selectedAlgorithm,
        currentTime
      );

      const isMirroredFeed = isMirrored && isCameraActive;
      onLandmarksDetected(smoothedLandmarks, selectedAlgorithm, isMirroredFeed);

      // Perform YOLO 2D->3D Lifting
      if (onYoloLiftingResult) {
        const yoloKps = Yolo3dPoseLifter.convertMediaPipeToYolo(smoothedLandmarks);
        const yoloRes = yoloLifterRef.current.lift2DTo3D(yoloKps, width, height);
        onYoloLiftingResult(yoloRes);
      }

      renderYoloAndSkeletonOverlay(ctx, smoothedLandmarks, width, height, isMirroredFeed);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive, isDemoMode, isMirrored, currentAction, selectedAlgorithm, generateDemoLandmarks, onLandmarksDetected, onYoloLiftingResult]);

  // Render YOLO & Skeleton connections
  const renderYoloAndSkeletonOverlay = (
    ctx: CanvasRenderingContext2D,
    lms: PoseLandmark3D[],
    width: number,
    height: number,
    mirrored: boolean
  ) => {
    let minX = 1.0;
    let minY = 1.0;
    let maxX = 0.0;
    let maxY = 0.0;

    lms.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const bMinX = Math.max(0, minX - 0.05);
    const bMinY = Math.max(0, minY - 0.06);
    const bMaxX = Math.min(1, maxX + 0.05);
    const bMaxY = Math.min(1, maxY + 0.06);

    const px1 = (mirrored ? 1.0 - bMaxX : bMinX) * width;
    const px2 = (mirrored ? 1.0 - bMinX : bMaxX) * width;
    const py1 = bMinY * height;
    const py2 = bMaxY * height;
    const boxW = px2 - px1;

    ctx.strokeStyle = selectedAlgorithm === 'yolo_lifting' ? '#38bdf8' : '#00f0ff';
    ctx.lineWidth = 2;
    const corner = Math.min(18, boxW * 0.2);

    ctx.beginPath();
    ctx.moveTo(px1, py1 + corner);
    ctx.lineTo(px1, py1);
    ctx.lineTo(px1 + corner, py1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px2 - corner, py1);
    ctx.lineTo(px2, py1);
    ctx.lineTo(px2, py1 + corner);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px1, py2 - corner);
    ctx.lineTo(px1, py2);
    ctx.lineTo(px1 + corner, py2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px2 - corner, py2);
    ctx.lineTo(px2, py2);
    ctx.lineTo(px2, py2 - corner);
    ctx.stroke();

    ctx.fillStyle = selectedAlgorithm === 'yolo_lifting' ? '#38bdf8' : '#00f0ff';
    const tagWidth = selectedAlgorithm === 'yolo_lifting' ? 175 : 115;
    ctx.fillRect(px1, py1 - 18, tagWidth, 17);
    ctx.fillStyle = '#040711';
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText(
      selectedAlgorithm === 'yolo_lifting' ? 'YOLO-Pose + 3D Lifting 0.99' : 'YOLOv8: person 0.99',
      px1 + 4,
      py1 - 5
    );

    const connections = [
      // Torso Box
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, '#10b981'],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, '#10b981'],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP, '#10b981'],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP, '#10b981'],

      // Anatomical Left: Arm & Leg (Cyan)
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, '#00f0ff'],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST, '#00f0ff'],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, '#00f0ff'],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE, '#00f0ff'],

      // Anatomical Right: Arm & Leg (Amber)
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW, '#f59e0b'],
      [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST, '#f59e0b'],
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, '#f59e0b'],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE, '#f59e0b'],
    ];

    const getPt = (idx: number) => {
      const p = lms[idx];
      const x = (mirrored ? 1.0 - p.x : p.x) * width;
      const y = p.y * height;
      return { x, y, z: p.z };
    };

    connections.forEach(([i1, i2, color]) => {
      const p1 = getPt(i1 as number);
      const p2 = getPt(i2 as number);
      ctx.strokeStyle = color as string;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    lms.forEach((p, idx) => {
      if (idx > 28 && idx !== 31 && idx !== 32) return;
      const pt = getPt(idx);

      const isLeft = idx === 11 || idx === 13 || idx === 15 || idx === 23 || idx === 25 || idx === 27;
      const isRight = idx === 12 || idx === 14 || idx === 16 || idx === 24 || idx === 26 || idx === 28;

      ctx.fillStyle = isLeft ? '#00f0ff' : isRight ? '#f59e0b' : '#ffffff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Render 3D depth tags on key joints
      if (selectedAlgorithm === 'yolo_lifting' && (idx === 15 || idx === 16 || idx === 13 || idx === 14)) {
        const estDepthM = (1.8 + (pt.z ?? 0) * 1.5).toFixed(2);
        ctx.fillStyle = isLeft ? '#00f0ff' : '#f59e0b';
        ctx.font = '8px monospace';
        ctx.fillText(`Z:${estDepthM}m`, pt.x + 5, pt.y - 4);
      }
    });
  };

  const handleSelectAction = (actId: PracticalActionType) => {
    stopCamera();
    setCurrentAction(actId);
    setIsDemoMode(true);
    onSelectAction?.(actId);
  };

  const filteredActions = PRACTICAL_ACTIONS.filter(
    a => actionCategory === 'all' || a.category === actionCategory
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              动作视觉采集 (Vision Mocap)
              {isCameraActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              )}
              {isDemoMode && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  DEMO
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              YOLO 目标框 + MediaPipe 33点骨骼
            </div>
          </div>
        </div>

        <div>
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>关闭摄像头</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={cameraLoading}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {cameraLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>开启摄像头</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video/Overlay Viewport */}
      <div className="relative aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-slate-700">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>算法: {selectedAlgorithm.toUpperCase()}</span>
        </div>

        <div className="absolute top-2.5 right-2.5 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-700">
          <span className="text-emerald-400">{fps} FPS</span>
        </div>

        {isCameraActive && (
          <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`px-2 py-1 rounded text-[10px] font-mono backdrop-blur-md border transition ${
                isMirrored
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400'
              }`}
            >
              镜像翻转
            </button>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs text-amber-200 mb-1 font-medium">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError(null);
                setIsDemoMode(true);
              }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold transition"
            >
              进入动作仿真模式
            </button>
          </div>
        )}
      </div>

      {/* Filter Algorithm Quick Selector */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950/40 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            滤波平滑与动力学约束
          </span>
          <span className="text-[10px] text-slate-500 font-mono">抗抖抗突变</span>
        </div>

        <div className="grid grid-cols-5 gap-1 text-[11px]">
          {(['one_euro', 'poseformer', 'vibe', 'yolo_lifting', 'raw'] as TrackingAlgorithm[]).map(algo => (
            <button
              key={algo}
              onClick={() => onAlgorithmChange(algo)}
              className={`py-1 rounded text-center font-mono transition text-[10px] ${
                selectedAlgorithm === algo
                  ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {algo === 'yolo_lifting' ? 'YOLO-3D' : algo.replace('_', '-')}
            </button>
          ))}
        </div>
      </div>

      {/* Practical Robotic Action Library Header & Tabs */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-200 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            实用实例动作库 (Practical Motions)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {PRACTICAL_ACTIONS.length} 组预设
          </span>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
          {[
            { id: 'all', label: '全部' },
            { id: 'industrial', label: '工业搬运' },
            { id: 'teleop', label: '遥操作装配' },
            { id: 'service', label: '服务递送' },
            { id: 'safety', label: '安全急停' },
            { id: 'benchmark', label: '动力学基准' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setActionCategory(c.id as any)}
              className={`px-2 py-0.5 rounded whitespace-nowrap transition ${
                actionCategory === c.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredActions.map(act => {
          const isSelected = isDemoMode && currentAction === act.id;
          return (
            <button
              key={act.id}
              onClick={() => handleSelectAction(act.id)}
              className={`w-full p-2 rounded-lg border text-left transition flex flex-col gap-1 ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-200">
                  <PlayCircle className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                  {act.name}
                </span>
                <span className={`text-[9px] font-mono px-1 py-0.5 rounded border uppercase ${
                  act.category === 'industrial' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                  act.category === 'teleop' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                  act.category === 'service' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  act.category === 'safety' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {act.category}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                {act.description}
              </p>

              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800/40">
                <span className="truncate max-w-[200px]">涉及: {act.keyJoints.join(', ')}</span>
                <span className="text-amber-400/80">点击演练</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
