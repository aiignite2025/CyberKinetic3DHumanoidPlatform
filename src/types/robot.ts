export type RobotModelType =
  | 'unitree_g1'
  | 'stanford_aloha'
  | 'fourier_gr1'
  | 'inmoov'
  | 'cyberkinetic'
  | 'industrial_6axis'
  | 'scara_4axis'
  | 'custom';

export interface OpenSourceRobotMeta {
  id: RobotModelType;
  name: string;
  alias: string;
  creator: string;
  country: string;
  dof: number;
  openSourceType: string;
  githubUrl: string;
  description: string;
  robotCategory?: 'humanoid' | 'industrial_arm' | 'scara';
  recommendedParams: RobotArmParams;
  colorScheme: {
    darkArmor: number;
    silverJoint: number;
    accent: number;
    glow: number;
  };
}

export type PracticalActionType =
  | 'pick_place'
  | 'peg_in_hole'
  | 'handover'
  | 'wipe_table'
  | 'palletizing_6axis'
  | 'welding_seam_6axis'
  | 'scara_pcb_assembly'
  | 'scara_sorting'
  | 'estop_shield'
  | 'taichi'
  | 'wave'
  | 'box'
  | 'stretch'
  | 'tpose';

export interface PracticalActionMeta {
  id: PracticalActionType;
  name: string;
  category: 'industrial' | 'teleop' | 'service' | 'safety' | 'benchmark';
  description: string;
  keyJoints: string[];
  useCase: string;
}

export interface JointAngle {
  pitch: number; // degrees
  roll: number;  // degrees
  yaw: number;   // degrees
}

export interface MotorConfig {
  id: string;
  name: string;
  joint: string;
  side: 'left' | 'right' | 'center';
  minAngle: number;
  maxAngle: number;
  currentAngle: number;
  targetAngle: number;
  velocity: number;
  torque: number; // Nm
  temperature: number; // Celsius
  voltage: number; // V
  status: 'normal' | 'active' | 'warning' | 'calibrating';
}

export type MotionControlAlgorithm = 'critically_damped' | 's_curve_ruckig' | 'one_euro' | 'virtual_impedance';

export interface RobotArmParams {
  upperArmLength: number; // in meters (e.g. 0.30)
  forearmLength: number;  // in meters (e.g. 0.28)
  handLength: number;     // in meters (e.g. 0.16)
  shoulderWidth: number;  // in meters (e.g. 0.42)
  torsoHeight: number;    // in meters (e.g. 0.55)
  gearRatio: number;      // e.g. 50:1 harmonic drive
  maxAngularSpeed: number;// deg/s
  dampingFactor: number;  // Damping ratio zeta (0.1 - 2.0, default 1.0 for critical damping)
  controlAlgorithm?: MotionControlAlgorithm;
  maxAcceleration?: number; // deg/s^2 (e.g. 320)
  springStiffness?: number; // natural frequency omega_n rad/s (e.g. 9.0)
}

export type TrackingAlgorithm = 'raw' | 'one_euro' | 'poseformer' | 'vibe' | 'yolo_lifting';

export interface PoseLandmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// 17-Keypoint COCO standard for YOLO-Pose (v7/v8/v11)
export interface YoloKeypoint2D {
  id: number;
  name: string;
  u: number; // pixel coordinate x [0, width] or normalized [0, 1]
  v: number; // pixel coordinate y [0, height] or normalized [0, 1]
  confidence: number;
}

export interface YoloPoseDetection {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  keypoints: YoloKeypoint2D[];
}

export interface LiftedJoint3D {
  id: number;
  name: string;
  x: number; // meters in camera space (X right)
  y: number; // meters in camera space (Y down)
  z: number; // meters in camera space (Z forward/depth)
  confidence: number;
  boneLengthMm?: number;
}

export interface YoloLiftingResult {
  rootDepthMeters: number;
  joints3D: Record<string, LiftedJoint3D>;
  processedJoints: ProcessedJoints;
  reprojectionErrorPx: number;
  latencyMs: number;
  method: 'geometric_ray_intersection' | 'dstformer' | 'hybrik' | 'videopose3d';
}

export interface YoloLiftingConfig {
  focalLengthPx: number;
  cameraFovDeg: number;
  userHeightMeters: number;
  shoulderWidthMeters: number;
  upperArmLengthMeters: number;
  forearmLengthMeters: number;
  disambiguationMode: 'temporal_continuity' | 'anatomical_limits' | 'hybrid';
  temporalWindowFrames: number;
  smoothingFactor: number;
}

export interface ProcessedJoints {
  leftShoulder: JointAngle;
  leftElbow: number; // degrees
  leftWrist: JointAngle;
  rightShoulder: JointAngle;
  rightElbow: number;
  rightWrist: JointAngle;
  spineTilt: number; // lateral roll
  spinePitch: number; // forward/backward bend
  spineYaw: number; // torso rotation
  neckPitch: number;
  neckYaw: number;
  neckRoll: number;
  leftHip: JointAngle;
  leftKnee: number;
  leftAnkle: number;
  rightHip: JointAngle;
  rightKnee: number;
  rightAnkle: number;
}

export interface MqttConfig {
  brokerUrl: string;
  port: number;
  clientId: string;
  topicPrefix: string;
  qos: 0 | 1 | 2;
  rateHz: number; // 10, 20, 30, 60
  format: 'json' | 'ros2' | 'compact_hex';
  connected: boolean;
  publishedCount: number;
  lastLatencyMs: number;
}

export interface TelemetryPacket {
  timestamp: number;
  sequenceId: number;
  robotId: string;
  algorithm: TrackingAlgorithm;
  motors: {
    id: string;
    angle: number;
    target: number;
    torque: number;
  }[];
  params: {
    armUpper: number;
    armFore: number;
  };
  metrics: {
    fps: number;
    latencyMs: number;
  };
}
