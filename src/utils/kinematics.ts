import { MotorConfig, PoseLandmark3D, ProcessedJoints, RobotArmParams, RobotModelType, PracticalActionType } from '../types/robot';

// MediaPipe Pose Landmark Indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Helper: Vector subtraction
function sub(a: PoseLandmark3D, b: PoseLandmark3D) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

// Helper: Vector magnitude
function norm(v: { x: number; y: number; z: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

// Helper: Dot product
function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Helper: Cross product
function cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// Helper: Angle between two vectors in degrees [0, 180]
function angleBetween(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  const nA = norm(a);
  const nB = norm(b);
  if (nA < 1e-6 || nB < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot(a, b) / (nA * nB)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Clamp helper
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates robotic arm joint angles from 3D MediaPipe pose landmarks.
 * In MediaPipe:
 * - X goes right (+X is person's left from camera view, unless mirrored)
 * - Y goes down (+Y is downward toward floor)
 * - Z goes away/toward camera (depth, negative is closer to camera)
 */
export function calculateJointAngles(
  landmarks: PoseLandmark3D[],
  mirrored: boolean = false
): ProcessedJoints {
  const defaultJoints: ProcessedJoints = {
    leftShoulder: { pitch: 0, roll: 0, yaw: 0 },
    leftElbow: 0,
    leftWrist: { pitch: 0, roll: 0, yaw: 0 },
    rightShoulder: { pitch: 0, roll: 0, yaw: 0 },
    rightElbow: 0,
    rightWrist: { pitch: 0, roll: 0, yaw: 0 },
    spineTilt: 0,
    spinePitch: 0,
    spineYaw: 0,
    neckPitch: 0,
    neckYaw: 0,
    neckRoll: 0,
    leftHip: { pitch: 0, roll: 0, yaw: 0 },
    leftKnee: 0,
    leftAnkle: 0,
    rightHip: { pitch: 0, roll: 0, yaw: 0 },
    rightKnee: 0,
    rightAnkle: 0,
  };

  if (!landmarks || landmarks.length < 33) {
    return defaultJoints;
  }

  // Handle camera mirroring if active: flip X and swap left/right anatomical pairs
  const lms = mirrored
    ? landmarks.map((lm, idx) => {
        const swapMap: Record<number, number> = {
          [POSE_LANDMARKS.LEFT_SHOULDER]: POSE_LANDMARKS.RIGHT_SHOULDER,
          [POSE_LANDMARKS.RIGHT_SHOULDER]: POSE_LANDMARKS.LEFT_SHOULDER,
          [POSE_LANDMARKS.LEFT_ELBOW]: POSE_LANDMARKS.RIGHT_ELBOW,
          [POSE_LANDMARKS.RIGHT_ELBOW]: POSE_LANDMARKS.LEFT_ELBOW,
          [POSE_LANDMARKS.LEFT_WRIST]: POSE_LANDMARKS.RIGHT_WRIST,
          [POSE_LANDMARKS.RIGHT_WRIST]: POSE_LANDMARKS.LEFT_WRIST,
          [POSE_LANDMARKS.LEFT_INDEX]: POSE_LANDMARKS.RIGHT_INDEX,
          [POSE_LANDMARKS.RIGHT_INDEX]: POSE_LANDMARKS.LEFT_INDEX,
          [POSE_LANDMARKS.LEFT_HIP]: POSE_LANDMARKS.RIGHT_HIP,
          [POSE_LANDMARKS.RIGHT_HIP]: POSE_LANDMARKS.LEFT_HIP,
          [POSE_LANDMARKS.LEFT_KNEE]: POSE_LANDMARKS.RIGHT_KNEE,
          [POSE_LANDMARKS.RIGHT_KNEE]: POSE_LANDMARKS.LEFT_KNEE,
          [POSE_LANDMARKS.LEFT_ANKLE]: POSE_LANDMARKS.RIGHT_ANKLE,
          [POSE_LANDMARKS.RIGHT_ANKLE]: POSE_LANDMARKS.LEFT_ANKLE,
          [POSE_LANDMARKS.LEFT_EYE]: POSE_LANDMARKS.RIGHT_EYE,
          [POSE_LANDMARKS.RIGHT_EYE]: POSE_LANDMARKS.LEFT_EYE,
        };
        const targetIdx = swapMap[idx] ?? idx;
        const src = landmarks[targetIdx] ?? lm;
        return {
          x: 1.0 - src.x,
          y: src.y,
          z: src.z,
          visibility: src.visibility,
        };
      })
    : landmarks;

  const ls = lms[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = lms[POSE_LANDMARKS.RIGHT_SHOULDER];
  const le = lms[POSE_LANDMARKS.LEFT_ELBOW];
  const re = lms[POSE_LANDMARKS.RIGHT_ELBOW];
  const lw = lms[POSE_LANDMARKS.LEFT_WRIST];
  const rw = lms[POSE_LANDMARKS.RIGHT_WRIST];
  const lh = lms[POSE_LANDMARKS.LEFT_HIP];
  const rh = lms[POSE_LANDMARKS.RIGHT_HIP];
  const lk = lms[POSE_LANDMARKS.LEFT_KNEE];
  const rk = lms[POSE_LANDMARKS.RIGHT_KNEE];
  const la = lms[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = lms[POSE_LANDMARKS.RIGHT_ANKLE];
  const lf = lms[POSE_LANDMARKS.LEFT_FOOT_INDEX];
  const rf = lms[POSE_LANDMARKS.RIGHT_FOOT_INDEX];
  const nose = lms[POSE_LANDMARKS.NOSE];
  const leye = lms[POSE_LANDMARKS.LEFT_EYE];
  const reye = lms[POSE_LANDMARKS.RIGHT_EYE];

  // Mid shoulder and Mid hip (Torso axis)
  const midShoulder = {
    x: (ls.x + rs.x) / 2,
    y: (ls.y + rs.y) / 2,
    z: (ls.z + rs.z) / 2,
  };
  const midHip = {
    x: (lh.x + rh.x) / 2,
    y: (lh.y + rh.y) / 2,
    z: (lh.z + rh.z) / 2,
  };

  const spineVec = sub(midShoulder, midHip); // Upwards along spine (hip to shoulder)
  const shoulderAxis = sub(rs, ls); // Left to Right shoulder vector

  // Helper: Robust elbow swivel & shoulder yaw (internal/external rotation)
  const computeArmYaw = (
    upperArm: { x: number; y: number; z: number },
    forearm: { x: number; y: number; z: number },
    flexDeg: number,
    isLeft: boolean
  ): number => {
    if (flexDeg < 15) return 0; // In straight arm, rotation plane is singular; keep neutral
    const ux = upperArm.x;
    const uy = -upperArm.y;
    const uz = -upperArm.z;
    const fx = forearm.x;
    const fy = -forearm.y;
    const fz = -forearm.z;

    const u = { x: ux, y: uy, z: uz };
    const f = { x: fx, y: fy, z: fz };
    const bendNormal = cross(u, f);
    const bLen = norm(bendNormal);
    if (bLen < 1e-4) return 0;
    const bNorm = { x: bendNormal.x / bLen, y: bendNormal.y / bLen, z: bendNormal.z / bLen };

    const rawDeg = (Math.asin(clamp(bNorm.z, -1, 1)) * 180) / Math.PI;
    const blend = clamp((flexDeg - 15) / 20, 0, 1);
    return clamp((isLeft ? rawDeg : -rawDeg) * blend * 0.6, -45, 45);
  };

  // 1. Left Arm Calculation
  const leftUpperArm = sub(le, ls);
  const leftForearm = sub(lw, le);
  const rawLeftElbowAngle = angleBetween(leftUpperArm, leftForearm);
  const leftElbow = clamp(rawLeftElbowAngle, 0, 150);

  // Convert to robot 3D space (+X left, +Y up, +Z forward)
  const l_ux = leftUpperArm.x;
  const l_uy = -leftUpperArm.y;
  const l_uz = -leftUpperArm.z;
  const lLen = Math.max(1e-4, Math.sqrt(l_ux * l_ux + l_uy * l_uy + l_uz * l_uz));
  const l_nx = l_ux / lLen;
  const l_ny = l_uy / lLen;
  const l_nz = l_uz / lLen;

  // Left Shoulder Pitch: sagittal forward-upward reach (0 = hanging down, 90 = horizontal forward, >90 = elevated)
  const leftShoulderPitch = clamp(
    (Math.atan2(l_nz, -l_ny) * 180) / Math.PI,
    -45,
    135
  );

  // Left Shoulder Roll: lateral abduction in frontal plane
  const leftShoulderRoll = clamp(
    (Math.atan2(l_nx, Math.max(0.01, Math.sqrt(l_ny * l_ny + l_nz * l_nz))) * 180) / Math.PI,
    -40,
    150
  );
  const leftShoulderYaw = computeArmYaw(leftUpperArm, leftForearm, leftElbow, true);

  // 2. Right Arm Calculation
  const rightUpperArm = sub(re, rs);
  const rightForearm = sub(rw, re);
  const rawRightElbowAngle = angleBetween(rightUpperArm, rightForearm);
  const rightElbow = clamp(rawRightElbowAngle, 0, 150);

  // Convert to robot 3D space (+X left, +Y up, +Z forward; right arm is on -X side)
  const r_ux = rightUpperArm.x;
  const r_uy = -rightUpperArm.y;
  const r_uz = -rightUpperArm.z;
  const rLen = Math.max(1e-4, Math.sqrt(r_ux * r_ux + r_uy * r_uy + r_uz * r_uz));
  const r_nx = r_ux / rLen;
  const r_ny = r_uy / rLen;
  const r_nz = r_uz / rLen;

  // Right Shoulder Pitch: sagittal forward-upward reach (0 = hanging down, 90 = horizontal forward, >90 = elevated)
  const rightShoulderPitch = clamp(
    (Math.atan2(r_nz, -r_ny) * 180) / Math.PI,
    -45,
    135
  );

  // Right Shoulder Roll: lateral abduction in frontal plane (-r_nx is positive when spreading right)
  const rightShoulderRoll = clamp(
    (Math.atan2(-r_nx, Math.max(0.01, Math.sqrt(r_ny * r_ny + r_nz * r_nz))) * 180) / Math.PI,
    -40,
    150
  );
  const rightShoulderYaw = computeArmYaw(rightUpperArm, rightForearm, rightElbow, false);

  // 3. Wrist Hand Orientations
  const leftHandTip = lms[POSE_LANDMARKS.LEFT_INDEX];
  const leftHandVec = sub(leftHandTip, lw);
  const leftWristPitch = clamp(angleBetween(leftForearm, leftHandVec) - 10, -60, 60);
  const leftWristYaw = clamp(
    (((leftHandTip.x - lw.x) / 0.05) * 35),
    -45,
    45
  );

  const rightHandTip = lms[POSE_LANDMARKS.RIGHT_INDEX];
  const rightHandVec = sub(rightHandTip, rw);
  const rightWristPitch = clamp(angleBetween(rightForearm, rightHandVec) - 10, -60, 60);
  const rightWristYaw = clamp(
    (((rightHandTip.x - rw.x) / 0.05) * 35),
    -45,
    45
  );

  // 4. Spine / Waist (Tilt, Pitch, Yaw)
  const spineTilt = clamp(
    (Math.atan2(spineVec.x, -spineVec.y) * 180) / Math.PI,
    -35,
    35
  );
  const spinePitch = clamp(
    (Math.atan2(-spineVec.z, -spineVec.y) * 180) / Math.PI,
    -30,
    45
  );
  const spineYaw = clamp(
    (Math.atan2(shoulderAxis.z, shoulderAxis.x) * 180) / Math.PI,
    -45,
    45
  );

  // 5. Neck & Head (Pitch, Yaw, Roll)
  const neckVec = sub(nose, midShoulder);
  const neckPitch = clamp(
    (Math.atan2(-neckVec.z, -neckVec.y) * 180) / Math.PI,
    -40,
    40
  );
  const neckYaw = clamp(
    (Math.atan2(neckVec.x, -neckVec.y) * 180) / Math.PI,
    -50,
    50
  );
  const eyeVec = sub(leye, reye);
  const neckRoll = clamp(
    (Math.atan2(eyeVec.y, eyeVec.x) * 180) / Math.PI,
    -30,
    30
  );

  // 6. Legs / Hips / Knees / Ankles
  const leftThigh = sub(lk, lh);
  const leftShin = sub(la, lk);
  const leftFootVec = sub(lf, la);

  const leftHipPitch = clamp(
    (Math.atan2(-leftThigh.z, leftThigh.y) * 180) / Math.PI,
    -30,
    90
  );
  const leftHipRoll = clamp(
    (Math.atan2(leftThigh.x, leftThigh.y) * 180) / Math.PI,
    -25,
    45
  );
  const leftKnee = clamp(angleBetween(leftThigh, leftShin), 0, 140);
  const leftAnkle = clamp(angleBetween(leftShin, leftFootVec) - 90, -45, 45);

  const rightThigh = sub(rk, rh);
  const rightShin = sub(ra, rk);
  const rightFootVec = sub(rf, ra);

  const rightHipPitch = clamp(
    (Math.atan2(-rightThigh.z, rightThigh.y) * 180) / Math.PI,
    -30,
    90
  );
  const rightHipRoll = clamp(
    (-Math.atan2(rightThigh.x, rightThigh.y) * 180) / Math.PI,
    -25,
    45
  );
  const rightKnee = clamp(angleBetween(rightThigh, rightShin), 0, 140);
  const rightAnkle = clamp(angleBetween(rightShin, rightFootVec) - 90, -45, 45);

  return {
    leftShoulder: {
      pitch: leftShoulderPitch,
      roll: leftShoulderRoll,
      yaw: leftShoulderYaw,
    },
    leftElbow,
    leftWrist: {
      pitch: leftWristPitch,
      roll: 0,
      yaw: leftWristYaw,
    },
    rightShoulder: {
      pitch: rightShoulderPitch,
      roll: rightShoulderRoll,
      yaw: rightShoulderYaw,
    },
    rightElbow,
    rightWrist: {
      pitch: rightWristPitch,
      roll: 0,
      yaw: rightWristYaw,
    },
    spineTilt,
    spinePitch,
    spineYaw,
    neckPitch,
    neckYaw,
    neckRoll,
    leftHip: { pitch: leftHipPitch, roll: leftHipRoll, yaw: 0 },
    leftKnee,
    leftAnkle,
    rightHip: { pitch: rightHipPitch, roll: rightHipRoll, yaw: 0 },
    rightKnee,
    rightAnkle,
  };
}

/**
 * Computes physically accurate, kinematically smooth joint trajectories for
 * all built-in practical robotic actions:
 * - 6-Axis Palletizing (J1~J6 multi-phase pick, lift, swing, place, retract)
 * - 6-Axis Saddle Arc Welding (J1~J6 continuous coordinate tracking with weave)
 * - 4-Axis SCARA PCB SMT IC Assembly (J1/J2 planar swing, J3 quill plunge, J4 theta)
 * - 4-Axis SCARA Conveyor High-Cadence Sorting
 * - Humanoid Dual-Arm Pick & Place, Peg-in-Hole, Tai Chi, Wave, etc.
 */
export function getPracticalActionJoints(
  action: PracticalActionType,
  timeMs: number
): ProcessedJoints {
  const t = timeMs * 0.0018;

  const defaultJoints: ProcessedJoints = {
    leftShoulder: { pitch: 0, roll: 15, yaw: 0 },
    leftElbow: 15,
    leftWrist: { pitch: 0, roll: 0, yaw: 0 },
    rightShoulder: { pitch: 0, roll: 15, yaw: 0 },
    rightElbow: 15,
    rightWrist: { pitch: 0, roll: 0, yaw: 0 },
    spineTilt: 0,
    spinePitch: 0,
    spineYaw: 0,
    neckPitch: 0,
    neckYaw: 0,
    neckRoll: 0,
    leftHip: { pitch: 0, roll: 0, yaw: 0 },
    leftKnee: 0,
    leftAnkle: 0,
    rightHip: { pitch: 0, roll: 0, yaw: 0 },
    rightKnee: 0,
    rightAnkle: 0,
  };

  switch (action) {
    case 'palletizing_6axis': {
      // Standard 180° Opposing Industrial Palletizing Cell (~4.5s cycle)
      // Material Infeed Station at J1 = -90° (Left conveyor, R = 0.72m)
      // Pallet Stacking Station at J1 = +90° (Right pallet, R = 0.72m)
      // Total swing across workspace = 180.0°!
      // Kinematic constraint: Sum(J2 + J3 + J4) === 180° always maintains
      // the pneumatic gripper pointing vertically downward towards the boxes.
      const pCycle = (t * 0.42) % 1.0;
      let j1 = -90; // Base Yaw (-90° = Left Infeed Conveyor, +90° = Right Pallet Stack)
      let j2 = 62;  // Shoulder Pitch (forward-downward reach)
      let j3 = 70;  // Elbow Pitch (elbow flexed down toward box)
      let j4 = 48;  // Wrist 1 Pitch (keeps gripper pointing straight down: 180 - j2 - j3)
      let j5 = 0;   // Wrist 2 Yaw
      let j6 = 0;   // Flange Roll

      if (pCycle < 0.20) {
        // Phase 1: Descending to pick up box at left conveyor (J1 = -90° fixed)
        const p = pCycle / 0.20;
        j1 = -90;
        j2 = 42 + 20 * p;
        j3 = 50 + 20 * p;
        j4 = 180 - j2 - j3;
        j5 = 0;
        j6 = 0;
      } else if (pCycle < 0.32) {
        // Phase 2: Clamping box & lifting up to safe transfer height (J1 = -90°)
        const p = (pCycle - 0.20) / 0.12;
        j1 = -90;
        j2 = 62 - 24 * p;
        j3 = 70 - 22 * p;
        j4 = 180 - j2 - j3;
        j5 = 0;
        j6 = 0;
      } else if (pCycle < 0.65) {
        // Phase 3: Smooth 180° S-curve transfer swing across from Left Conveyor (-90°) to Right Pallet (+90°)
        const p = (pCycle - 0.32) / 0.33;
        const smoothP = 0.5 * (1 - Math.cos(p * Math.PI)); // 5th-order bell-shaped S-curve
        j1 = -90 + 180 * smoothP; // Full 180-degree sweep from -90° to +90°
        j2 = 38 + 5 * Math.sin(p * Math.PI);
        j3 = 48 - 4 * Math.sin(p * Math.PI);
        j4 = 180 - j2 - j3;
        j5 = Math.sin(p * Math.PI) * 4;
        j6 = 0;
      } else if (pCycle < 0.82) {
        // Phase 4: Lowering onto pallet stack & placing box (J1 = +90° fixed)
        const p = (pCycle - 0.65) / 0.17;
        j1 = 90;
        j2 = 38 + 22 * p;
        j3 = 48 + 20 * p;
        j4 = 180 - j2 - j3;
        j5 = 0;
        j6 = 0;
      } else {
        // Phase 5: Releasing box, lifting arm & sweeping 180° back to conveyor
        const p = (pCycle - 0.82) / 0.18;
        const smoothP = 0.5 * (1 - Math.cos(p * Math.PI));
        j1 = 90 - 180 * smoothP; // Full 180-degree return sweep back to -90°
        j2 = 60 - 22 * Math.sin(smoothP * Math.PI * 0.5);
        j3 = 68 - 20 * Math.sin(smoothP * Math.PI * 0.5);
        j4 = 180 - j2 - j3;
        j5 = 0;
        j6 = 0;
      }

      return {
        ...defaultJoints,
        rightShoulder: { pitch: j2, roll: 0, yaw: j1 },
        rightElbow: j3,
        rightWrist: { pitch: j4, roll: j6, yaw: j5 },
        leftShoulder: { pitch: -10, roll: 20, yaw: 0 },
        leftElbow: 30,
        leftWrist: { pitch: 0, roll: 0, yaw: 0 },
      };
    }

    case 'welding_seam_6axis': {
      // 6-Axis Continuous 3D Saddle Seam Arc Welding with torch weave
      // Shoulder (J2) and Elbow (J3) reach forward-down to workpiece table; Wrist (J4) holds 45° torch angle.
      const w = t * 2.2;
      const j1 = Math.sin(w) * 45;            // Turntable sweeps along curved seam
      const j2 = 52 + Math.cos(w) * 12;       // Reaches forward-down (40° to 64°)
      const j3 = 58 + Math.sin(w * 2) * 10;   // Elbow flexes down (48° to 68°)
      const j4 = 42 + Math.cos(w) * 8;        // Wrist holds 45° angle to weld seam
      const j5 = Math.sin(w) * 22;            // Wrist lateral seam tracking
      const j6 = Math.sin(w * 6) * 24;        // High-frequency torch weave oscillation

      return {
        ...defaultJoints,
        rightShoulder: { pitch: j2, roll: 0, yaw: j1 },
        rightElbow: j3,
        rightWrist: { pitch: j4, roll: j6, yaw: j5 },
        leftShoulder: { pitch: -15, roll: 25, yaw: 0 },
        leftElbow: 40,
        leftWrist: { pitch: 0, roll: 0, yaw: 0 },
      };
    }

    case 'scara_pcb_assembly': {
      // 4-Axis SCARA Ultra High-Speed SMT Pick & Place (~0.9s period)
      // J1: Arm 1 Yaw, J2: Arm 2 Yaw, J3: Z Quill (pitch), J4: Theta (rightWrist.yaw)
      const scaraCycle = (t * 1.8) % 1.0;
      let j1 = 0;
      let j2 = 0;
      let j3Z = 0;
      let j4Theta = 0;

      if (scaraCycle < 0.25) {
        // Feeder pick up: plunge Z
        const p = Math.sin((scaraCycle / 0.25) * Math.PI);
        j1 = -45;
        j2 = 65;
        j3Z = 68 * p;
        j4Theta = 0;
      } else if (scaraCycle < 0.50) {
        // Planar high-speed sweep to PCB
        const p = (scaraCycle - 0.25) / 0.25;
        const smoothP = 0.5 * (1 - Math.cos(p * Math.PI));
        j1 = -45 + 85 * smoothP;
        j2 = 65 - 115 * smoothP;
        j3Z = 0;
        j4Theta = 0;
      } else if (scaraCycle < 0.75) {
        // Over PCB solder pad: plunge Z & rotate Theta to align pin 1
        const p = (scaraCycle - 0.50) / 0.25;
        const pZ = Math.sin(p * Math.PI);
        j1 = 40;
        j2 = -50;
        j3Z = 65 * pZ;
        j4Theta = 45 * pZ;
      } else {
        // High-speed return sweep
        const p = (scaraCycle - 0.75) / 0.25;
        const smoothP = 0.5 * (1 - Math.cos(p * Math.PI));
        j1 = 40 - 85 * smoothP;
        j2 = -50 + 115 * smoothP;
        j3Z = 0;
        j4Theta = 0;
      }

      return {
        ...defaultJoints,
        rightShoulder: { pitch: j3Z, roll: 0, yaw: j1 },
        rightElbow: j2,
        rightWrist: { pitch: 0, roll: 0, yaw: j4Theta },
      };
    }

    case 'scara_sorting': {
      // 4-Axis SCARA Conveyor High-Cadence Sorting (~1.2s period)
      const sortPhase = Math.sin(t * 3.5);
      const sortZ = Math.max(0, Math.sin(t * 7.0)) * 65;
      const j1 = sortPhase * 55;
      const j2 = 25 + Math.abs(sortPhase) * 30;
      const j4 = sortPhase * 35;

      return {
        ...defaultJoints,
        rightShoulder: { pitch: sortZ, roll: 0, yaw: j1 },
        rightElbow: j2,
        rightWrist: { pitch: 0, roll: 0, yaw: j4 },
      };
    }

    case 'pick_place': {
      const cycle = (t * 0.5) % 1.0;
      let reachP = 0;
      let liftP = 0;
      let spineRot = 0;
      if (cycle < 0.3) {
        reachP = Math.sin((cycle / 0.3) * Math.PI);
      } else if (cycle < 0.6) {
        liftP = Math.sin(((cycle - 0.3) / 0.3) * Math.PI);
        spineRot = 25 * ((cycle - 0.3) / 0.3);
      } else {
        spineRot = 25 * (1 - (cycle - 0.6) / 0.4);
      }
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 40 + reachP * 30 + liftP * 20, roll: 20, yaw: reachP * 15 },
        leftElbow: 45 + reachP * 35,
        leftWrist: { pitch: -15, roll: 0, yaw: 10 },
        rightShoulder: { pitch: 40 + reachP * 30 + liftP * 20, roll: 20, yaw: -reachP * 15 },
        rightElbow: 45 + reachP * 35,
        rightWrist: { pitch: -15, roll: 0, yaw: -10 },
        spinePitch: reachP * 18,
        spineYaw: spineRot,
        leftHip: { pitch: reachP * 15, roll: 0, yaw: 0 },
        leftKnee: reachP * 25,
        rightHip: { pitch: reachP * 15, roll: 0, yaw: 0 },
        rightKnee: reachP * 25,
      };
    }

    case 'peg_in_hole': {
      const phase = Math.sin(t * 2.5);
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 55, roll: 18, yaw: 10 },
        leftElbow: 70,
        leftWrist: { pitch: -10, roll: 0, yaw: 5 },
        rightShoulder: { pitch: 55 + phase * 4, roll: 18 + phase * 2, yaw: -10 },
        rightElbow: 70 + phase * 6,
        rightWrist: { pitch: -10 + phase * 8, roll: phase * 10, yaw: -5 },
        spinePitch: 8,
      };
    }

    case 'handover': {
      const p = 0.5 * (1 + Math.sin(t * 1.8));
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 50 + p * 25, roll: 15, yaw: 10 },
        leftElbow: 30 + p * 30,
        leftWrist: { pitch: 20, roll: 0, yaw: 0 },
        rightShoulder: { pitch: 20 + p * 15, roll: 20, yaw: -10 },
        rightElbow: 40,
        rightWrist: { pitch: -10, roll: 0, yaw: 0 },
        spineYaw: -15 * p,
      };
    }

    case 'wipe_table': {
      const wR = Math.sin(t * 3.0);
      const wC = Math.cos(t * 3.0);
      return {
        ...defaultJoints,
        rightShoulder: { pitch: 45 + wR * 15, roll: 20 + wC * 12, yaw: -10 },
        rightElbow: 55 + wC * 18,
        rightWrist: { pitch: -20, roll: wR * 15, yaw: wC * 10 },
        leftShoulder: { pitch: 20, roll: 25, yaw: 0 },
        leftElbow: 35,
        spinePitch: 12,
        spineYaw: wR * 8,
      };
    }

    case 'estop_shield': {
      const p = 0.5 * (1 + Math.sin(t * 1.2));
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 75 + p * 15, roll: -15, yaw: 20 },
        leftElbow: 110 + p * 10,
        leftWrist: { pitch: 0, roll: 0, yaw: 0 },
        rightShoulder: { pitch: 75 + p * 15, roll: -15, yaw: -20 },
        rightElbow: 110 + p * 10,
        rightWrist: { pitch: 0, roll: 0, yaw: 0 },
        spinePitch: 10 * p,
      };
    }

    case 'taichi': {
      const tc = t * 1.2;
      const s1 = Math.sin(tc);
      const c1 = Math.cos(tc);
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 35 + s1 * 25, roll: 30 + c1 * 15, yaw: s1 * 18 },
        leftElbow: 45 + c1 * 25,
        leftWrist: { pitch: -15 * s1, roll: c1 * 20, yaw: 0 },
        rightShoulder: { pitch: 35 - s1 * 25, roll: 30 - c1 * 15, yaw: -s1 * 18 },
        rightElbow: 45 - c1 * 25,
        rightWrist: { pitch: 15 * s1, roll: -c1 * 20, yaw: 0 },
        spinePitch: 5 + c1 * 8,
        spineTilt: s1 * 10,
        spineYaw: s1 * 22,
        leftHip: { pitch: 10 + c1 * 8, roll: 5, yaw: 0 },
        leftKnee: 20 + c1 * 15,
        rightHip: { pitch: 10 - c1 * 8, roll: 5, yaw: 0 },
        rightKnee: 20 - c1 * 15,
      };
    }

    case 'wave': {
      const waveAngle = Math.sin(t * 5.5) * 35;
      return {
        ...defaultJoints,
        rightShoulder: { pitch: 90, roll: 45, yaw: -15 },
        rightElbow: 95,
        rightWrist: { pitch: 0, roll: 0, yaw: waveAngle },
        leftShoulder: { pitch: 0, roll: 15, yaw: 0 },
        leftElbow: 15,
      };
    }

    case 'box': {
      const bCycle = (t * 2.5) % 1.0;
      let lPunch = 0;
      let rPunch = 0;
      if (bCycle < 0.5) {
        lPunch = Math.sin((bCycle / 0.5) * Math.PI);
      } else {
        rPunch = Math.sin(((bCycle - 0.5) / 0.5) * Math.PI);
      }
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 65 + lPunch * 25, roll: 10, yaw: 15 },
        leftElbow: 85 - lPunch * 65,
        rightShoulder: { pitch: 65 + rPunch * 25, roll: 10, yaw: -15 },
        rightElbow: 85 - rPunch * 65,
        spineYaw: (lPunch - rPunch) * 20,
      };
    }

    case 'stretch': {
      const str = 0.5 * (1 + Math.sin(t * 1.5));
      return {
        ...defaultJoints,
        leftShoulder: { pitch: 140 * str, roll: 30 * str, yaw: 0 },
        leftElbow: 10 + 20 * (1 - str),
        rightShoulder: { pitch: 140 * str, roll: 30 * str, yaw: 0 },
        rightElbow: 10 + 20 * (1 - str),
        spinePitch: -15 * str,
      };
    }

    case 'tpose':
    default:
      return defaultJoints;
  }
}

/**
 * Creates 33 realistic MediaPipe 3D pose landmarks corresponding to a ProcessedJoints pose,
 * ensuring the 2D mocap viewer canvas draws crisp, accurately matching skeletal motion.
 */
export function getPracticalActionLandmarks(
  action: PracticalActionType,
  timeMs: number,
  joints: ProcessedJoints
): PoseLandmark3D[] {
  const lms: PoseLandmark3D[] = [];
  const midX = 0.5;
  const midY = 0.48;

  // Initialize 33 points
  for (let i = 0; i < 33; i++) {
    lms.push({ x: midX, y: midY, z: 0, visibility: 0.95 });
  }

  // Nose and Eyes
  const nose = { x: midX, y: midY - 0.28, z: -0.04 };
  lms[POSE_LANDMARKS.NOSE] = { ...nose, visibility: 0.98 };
  lms[POSE_LANDMARKS.LEFT_EYE] = { x: nose.x + 0.02, y: nose.y - 0.01, z: nose.z, visibility: 0.98 };
  lms[POSE_LANDMARKS.RIGHT_EYE] = { x: nose.x - 0.02, y: nose.y - 0.01, z: nose.z, visibility: 0.98 };

  // Torso & Shoulders
  const toRad = Math.PI / 180;
  const shoulderWidth = 0.20;
  const rShoulder = { x: midX - shoulderWidth / 2, y: midY - 0.15, z: 0 };
  const lShoulder = { x: midX + shoulderWidth / 2, y: midY - 0.15, z: 0 };
  lms[POSE_LANDMARKS.RIGHT_SHOULDER] = { ...rShoulder, visibility: 0.99 };
  lms[POSE_LANDMARKS.LEFT_SHOULDER] = { ...lShoulder, visibility: 0.99 };

  // Right Arm Kinematic Chain (from joints)
  const rUpperLen = 0.15;
  const rForeLen = 0.14;
  const rPitch = (joints.rightShoulder?.pitch ?? 0) * toRad;
  const rYaw = (joints.rightShoulder?.yaw ?? 0) * toRad;
  const rRoll = (joints.rightShoulder?.roll ?? 0) * toRad;
  const rElbowDeg = (joints.rightElbow ?? 0) * toRad;

  // Compute right elbow position
  const rElbow = {
    x: rShoulder.x - Math.sin(rRoll + rYaw * 0.5) * rUpperLen - 0.02,
    y: rShoulder.y + Math.cos(rPitch) * rUpperLen,
    z: -Math.sin(rPitch) * rUpperLen + Math.sin(rYaw) * 0.08,
  };
  lms[POSE_LANDMARKS.RIGHT_ELBOW] = { ...rElbow, visibility: 0.98 };

  // Compute right wrist position
  const rWrist = {
    x: rElbow.x - Math.sin(rRoll + rYaw * 0.8) * rForeLen,
    y: rElbow.y + Math.cos(rPitch + rElbowDeg * 0.6) * rForeLen,
    z: rElbow.z - Math.sin(rPitch + rElbowDeg * 0.6) * rForeLen,
  };
  lms[POSE_LANDMARKS.RIGHT_WRIST] = { ...rWrist, visibility: 0.98 };

  // Right Index Finger
  lms[POSE_LANDMARKS.RIGHT_INDEX] = {
    x: rWrist.x - 0.02 + Math.sin(rYaw) * 0.02,
    y: rWrist.y + 0.04,
    z: rWrist.z,
    visibility: 0.95,
  };

  // Left Arm Kinematic Chain (from joints)
  const lUpperLen = 0.15;
  const lForeLen = 0.14;
  const lPitch = (joints.leftShoulder?.pitch ?? 0) * toRad;
  const lElbowDeg = (joints.leftElbow ?? 0) * toRad;

  const lElbow = {
    x: lShoulder.x + 0.04,
    y: lShoulder.y + Math.cos(lPitch) * lUpperLen,
    z: -Math.sin(lPitch) * lUpperLen,
  };
  lms[POSE_LANDMARKS.LEFT_ELBOW] = { ...lElbow, visibility: 0.98 };

  const lWrist = {
    x: lElbow.x + 0.02,
    y: lElbow.y + Math.cos(lPitch + lElbowDeg * 0.6) * lForeLen,
    z: lElbow.z - Math.sin(lPitch + lElbowDeg * 0.6) * lForeLen,
  };
  lms[POSE_LANDMARKS.LEFT_WRIST] = { ...lWrist, visibility: 0.98 };
  lms[POSE_LANDMARKS.LEFT_INDEX] = { x: lWrist.x + 0.02, y: lWrist.y + 0.04, z: lWrist.z, visibility: 0.95 };

  // Hips & Legs
  const hipY = midY + 0.20;
  lms[POSE_LANDMARKS.RIGHT_HIP] = { x: midX - 0.08, y: hipY, z: 0, visibility: 0.99 };
  lms[POSE_LANDMARKS.LEFT_HIP] = { x: midX + 0.08, y: hipY, z: 0, visibility: 0.99 };

  const kneeY = hipY + 0.24;
  lms[POSE_LANDMARKS.RIGHT_KNEE] = { x: midX - 0.08, y: kneeY, z: 0, visibility: 0.95 };
  lms[POSE_LANDMARKS.LEFT_KNEE] = { x: midX + 0.08, y: kneeY, z: 0, visibility: 0.95 };

  const ankleY = kneeY + 0.21;
  lms[POSE_LANDMARKS.RIGHT_ANKLE] = { x: midX - 0.08, y: ankleY, z: 0, visibility: 0.95 };
  lms[POSE_LANDMARKS.LEFT_ANKLE] = { x: midX + 0.08, y: ankleY, z: 0, visibility: 0.95 };

  return lms;
}

/**
 * Creates default list of robotic servo motors.
 */
export function createDefaultMotors(modelType?: RobotModelType): MotorConfig[] {
  if (modelType === 'industrial_6axis') {
    return [
      {
        id: 'J1_BASE',
        name: 'J1 Base Turntable (基座回转轴 180°跨度)',
        joint: 'rightShoulderYaw',
        side: 'center',
        minAngle: -180,
        maxAngle: 180,
        currentAngle: -90,
        targetAngle: -90,
        velocity: 0,
        torque: 8.5,
        temperature: 35.0,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'J2_SHOULDER',
        name: 'J2 Shoulder Pitch (大臂俯仰轴 下倾姿态)',
        joint: 'rightShoulderPitch',
        side: 'right',
        minAngle: -120,
        maxAngle: 120,
        currentAngle: 45,
        targetAngle: 45,
        velocity: 0,
        torque: 14.2,
        temperature: 38.5,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'J3_ELBOW',
        name: 'J3 Elbow Pitch (小臂俯仰轴 下探姿态)',
        joint: 'rightElbow',
        side: 'right',
        minAngle: -150,
        maxAngle: 150,
        currentAngle: 50,
        targetAngle: 50,
        velocity: 0,
        torque: 11.8,
        temperature: 37.2,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'J4_WRIST1',
        name: 'J4 Wrist Pitch (腕部俯仰轴 垂直下指)',
        joint: 'rightWristPitch',
        side: 'right',
        minAngle: -180,
        maxAngle: 180,
        currentAngle: 85,
        targetAngle: 85,
        velocity: 0,
        torque: 4.5,
        temperature: 34.0,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'J5_WRIST2',
        name: 'J5 Wrist Yaw (手腕偏航轴)',
        joint: 'rightWristYaw',
        side: 'right',
        minAngle: -180,
        maxAngle: 180,
        currentAngle: 0,
        targetAngle: 0,
        velocity: 0,
        torque: 3.2,
        temperature: 33.5,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'J6_TOOL',
        name: 'J6 Tool Flange (末端法兰旋转)',
        joint: 'rightWristRoll',
        side: 'right',
        minAngle: -360,
        maxAngle: 360,
        currentAngle: 0,
        targetAngle: 0,
        velocity: 0,
        torque: 2.1,
        temperature: 32.0,
        voltage: 48.0,
        status: 'normal',
      },
    ];
  }

  if (modelType === 'scara_4axis') {
    return [
      {
        id: 'SCARA_J1',
        name: 'J1 Arm 1 Yaw (大臂水平回转)',
        joint: 'rightShoulderYaw',
        side: 'center',
        minAngle: -135,
        maxAngle: 135,
        currentAngle: 0,
        targetAngle: 0,
        velocity: 0,
        torque: 6.8,
        temperature: 34.5,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'SCARA_J2',
        name: 'J2 Arm 2 Yaw (小臂水平回转)',
        joint: 'rightElbow',
        side: 'right',
        minAngle: -150,
        maxAngle: 150,
        currentAngle: 15,
        targetAngle: 15,
        velocity: 0,
        torque: 5.2,
        temperature: 33.8,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'SCARA_J3_Z',
        name: 'J3 Z-Axis Quill (Z轴精密升降丝杠)',
        joint: 'rightShoulderPitch',
        side: 'right',
        minAngle: -100,
        maxAngle: 100,
        currentAngle: 0,
        targetAngle: 0,
        velocity: 0,
        torque: 4.8,
        temperature: 32.5,
        voltage: 48.0,
        status: 'normal',
      },
      {
        id: 'SCARA_J4_R',
        name: 'J4 Theta Tool (末端高速旋转轴)',
        joint: 'rightWristYaw',
        side: 'right',
        minAngle: -360,
        maxAngle: 360,
        currentAngle: 0,
        targetAngle: 0,
        velocity: 0,
        torque: 1.8,
        temperature: 31.0,
        voltage: 48.0,
        status: 'normal',
      },
    ];
  }

  return [
    // Left Arm Motors
    {
      id: 'L_M01',
      name: 'Left Shoulder Pitch (俯仰)',
      joint: 'leftShoulderPitch',
      side: 'left',
      minAngle: -90,
      maxAngle: 180,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 1.8,
      temperature: 34.2,
      voltage: 24.1,
      status: 'normal',
    },
    {
      id: 'L_M02',
      name: 'Left Shoulder Roll (横滚/展角)',
      joint: 'leftShoulderRoll',
      side: 'left',
      minAngle: -40,
      maxAngle: 180,
      currentAngle: 15,
      targetAngle: 15,
      velocity: 0,
      torque: 2.3,
      temperature: 35.8,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'L_M03',
      name: 'Left Shoulder Yaw (旋向)',
      joint: 'leftShoulderYaw',
      side: 'left',
      minAngle: -90,
      maxAngle: 90,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 1.1,
      temperature: 33.1,
      voltage: 24.1,
      status: 'normal',
    },
    {
      id: 'L_M04',
      name: 'Left Elbow Flex (肘关节屈伸)',
      joint: 'leftElbow',
      side: 'left',
      minAngle: 0,
      maxAngle: 150,
      currentAngle: 20,
      targetAngle: 20,
      velocity: 0,
      torque: 1.9,
      temperature: 36.4,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'L_M05',
      name: 'Left Wrist Pitch (腕关节俯仰)',
      joint: 'leftWristPitch',
      side: 'left',
      minAngle: -60,
      maxAngle: 60,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.6,
      temperature: 31.9,
      voltage: 24.2,
      status: 'normal',
    },
    {
      id: 'L_M06',
      name: 'Left Wrist Yaw / Gripper (左腕偏航与手爪)',
      joint: 'leftWristYaw',
      side: 'left',
      minAngle: -45,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.4,
      temperature: 30.5,
      voltage: 24.2,
      status: 'normal',
    },

    // Right Arm Motors
    {
      id: 'R_M01',
      name: 'Right Shoulder Pitch (俯仰)',
      joint: 'rightShoulderPitch',
      side: 'right',
      minAngle: -90,
      maxAngle: 180,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 1.7,
      temperature: 34.0,
      voltage: 24.1,
      status: 'normal',
    },
    {
      id: 'R_M02',
      name: 'Right Shoulder Roll (横滚/展角)',
      joint: 'rightShoulderRoll',
      side: 'right',
      minAngle: -40,
      maxAngle: 180,
      currentAngle: 15,
      targetAngle: 15,
      velocity: 0,
      torque: 2.2,
      temperature: 35.5,
      voltage: 24.1,
      status: 'normal',
    },
    {
      id: 'R_M03',
      name: 'Right Shoulder Yaw (旋向)',
      joint: 'rightShoulderYaw',
      side: 'right',
      minAngle: -90,
      maxAngle: 90,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 1.0,
      temperature: 32.8,
      voltage: 24.2,
      status: 'normal',
    },
    {
      id: 'R_M04',
      name: 'Right Elbow Flex (肘关节屈伸)',
      joint: 'rightElbow',
      side: 'right',
      minAngle: 0,
      maxAngle: 150,
      currentAngle: 20,
      targetAngle: 20,
      velocity: 0,
      torque: 1.8,
      temperature: 36.1,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'R_M05',
      name: 'Right Wrist Pitch (腕关节俯仰)',
      joint: 'rightWristPitch',
      side: 'right',
      minAngle: -60,
      maxAngle: 60,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.5,
      temperature: 31.7,
      voltage: 24.2,
      status: 'normal',
    },
    {
      id: 'R_M06',
      name: 'Right Wrist Yaw / Wave (右腕侧摆与挥手)',
      joint: 'rightWristYaw',
      side: 'right',
      minAngle: -45,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.4,
      temperature: 30.6,
      voltage: 24.2,
      status: 'normal',
    },

    // Torso & Neck Motors
    {
      id: 'C_M01',
      name: 'Spine Lateral Tilt (脊柱侧倾)',
      joint: 'spineTilt',
      side: 'center',
      minAngle: -35,
      maxAngle: 35,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 3.5,
      temperature: 38.0,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'C_M02',
      name: 'Spine Pitch Bend (脊柱俯仰)',
      joint: 'spinePitch',
      side: 'center',
      minAngle: -30,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 3.8,
      temperature: 38.5,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'C_M03',
      name: 'Spine Yaw Rotation (脊柱旋转)',
      joint: 'spineYaw',
      side: 'center',
      minAngle: -45,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 3.1,
      temperature: 37.4,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'C_M04',
      name: 'Neck Pitch (头部俯仰)',
      joint: 'neckPitch',
      side: 'center',
      minAngle: -40,
      maxAngle: 40,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.8,
      temperature: 32.2,
      voltage: 24.2,
      status: 'normal',
    },
    {
      id: 'C_M05',
      name: 'Neck Yaw (头部偏航)',
      joint: 'neckYaw',
      side: 'center',
      minAngle: -50,
      maxAngle: 50,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.7,
      temperature: 31.8,
      voltage: 24.2,
      status: 'normal',
    },
    {
      id: 'C_M06',
      name: 'Neck Roll (头部侧偏)',
      joint: 'neckRoll',
      side: 'center',
      minAngle: -30,
      maxAngle: 30,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 0.5,
      temperature: 31.2,
      voltage: 24.2,
      status: 'normal',
    },

    // Legs / Lower Body Motors
    {
      id: 'L_L01',
      name: 'Left Hip Pitch (左髋俯仰)',
      joint: 'leftHipPitch',
      side: 'left',
      minAngle: -30,
      maxAngle: 90,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 4.2,
      temperature: 37.0,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'L_L02',
      name: 'Left Hip Roll (左髋横滚)',
      joint: 'leftHipRoll',
      side: 'left',
      minAngle: -25,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 3.8,
      temperature: 36.5,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'L_L03',
      name: 'Left Knee Flex (左膝屈伸)',
      joint: 'leftKnee',
      side: 'left',
      minAngle: 0,
      maxAngle: 140,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 5.5,
      temperature: 38.5,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'L_L04',
      name: 'Left Ankle Pitch (左踝俯仰)',
      joint: 'leftAnkle',
      side: 'left',
      minAngle: -45,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 2.1,
      temperature: 33.2,
      voltage: 24.1,
      status: 'normal',
    },

    {
      id: 'R_L01',
      name: 'Right Hip Pitch (右髋俯仰)',
      joint: 'rightHipPitch',
      side: 'right',
      minAngle: -30,
      maxAngle: 90,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 4.2,
      temperature: 37.0,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'R_L02',
      name: 'Right Hip Roll (右髋横滚)',
      joint: 'rightHipRoll',
      side: 'right',
      minAngle: -25,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 3.8,
      temperature: 36.5,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'R_L03',
      name: 'Right Knee Flex (右膝屈伸)',
      joint: 'rightKnee',
      side: 'right',
      minAngle: 0,
      maxAngle: 140,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 5.5,
      temperature: 38.5,
      voltage: 24.0,
      status: 'normal',
    },
    {
      id: 'R_L04',
      name: 'Right Ankle Pitch (右踝俯仰)',
      joint: 'rightAnkle',
      side: 'right',
      minAngle: -45,
      maxAngle: 45,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
      torque: 2.1,
      temperature: 33.2,
      voltage: 24.1,
      status: 'normal',
    },
  ];
}

/**
 * Updates motor array with target joint angles and simulates PID servo response,
 * angular velocity, estimated torque load based on lever arm physics.
 */
export function updateMotorsWithJoints(
  motors: MotorConfig[],
  joints: ProcessedJoints,
  params: RobotArmParams,
  dtSeconds: number = 0.033
): MotorConfig[] {
  const jointMap: Record<string, number> = {
    leftShoulderPitch: joints.leftShoulder.pitch,
    leftShoulderRoll: joints.leftShoulder.roll,
    leftShoulderYaw: joints.leftShoulder.yaw,
    leftElbow: joints.leftElbow,
    leftWristPitch: joints.leftWrist.pitch,
    leftWristRoll: joints.leftWrist.roll,
    leftWristYaw: joints.leftWrist.yaw,
    leftGripper: Math.abs(joints.leftWrist.yaw) * 1.5,

    rightShoulderPitch: joints.rightShoulder.pitch,
    rightShoulderRoll: joints.rightShoulder.roll,
    rightShoulderYaw: joints.rightShoulder.yaw,
    rightElbow: joints.rightElbow,
    rightWristPitch: joints.rightWrist.pitch,
    rightWristRoll: joints.rightWrist.roll,
    rightWristYaw: joints.rightWrist.yaw,
    rightGripper: Math.abs(joints.rightWrist.yaw) * 1.5,

    spineTilt: joints.spineTilt,
    spinePitch: joints.spinePitch,
    spineYaw: joints.spineYaw,
    neckPitch: joints.neckPitch,
    neckYaw: joints.neckYaw,
    neckRoll: joints.neckRoll,

    leftHipPitch: joints.leftHip.pitch,
    leftHipRoll: joints.leftHip.roll,
    leftKnee: joints.leftKnee,
    leftAnkle: joints.leftAnkle,

    rightHipPitch: joints.rightHip.pitch,
    rightHipRoll: joints.rightHip.roll,
    rightKnee: joints.rightKnee,
    rightAnkle: joints.rightAnkle,
  };

  return motors.map(motor => {
    const rawTarget = jointMap[motor.joint] ?? motor.targetAngle;
    const clampedTarget = clamp(rawTarget, motor.minAngle, motor.maxAngle);

    // Physical second-order spring damper servo step (zeta = dampingFactor, default 1.0 critical damping)
    const dampingRatio = Math.max(0.2, params.dampingFactor ?? 1.0);
    const naturalFreq = params.springStiffness ?? 9.0;
    const maxSpeed = params.maxAngularSpeed ?? 180;

    const f = 1.0 + 2.0 * dtSeconds * dampingRatio * naturalFreq;
    const hoo = dtSeconds * naturalFreq * naturalFreq;
    const hhoo = dtSeconds * hoo;
    const detInv = 1.0 / (f + hhoo);

    let newAngle = (f * motor.currentAngle + dtSeconds * motor.velocity + hhoo * clampedTarget) * detInv;
    let velocity = (motor.velocity + hoo * (clampedTarget - motor.currentAngle)) * detInv;

    // Physical angular velocity limiter
    if (Math.abs(velocity) > maxSpeed) {
      velocity = Math.sign(velocity) * maxSpeed;
      newAngle = motor.currentAngle + velocity * dtSeconds;
    }

    // Estimate gravity & dynamic inertial torque load (Nm)
    // T = mass * g * armLength * sin(angle) + I * alpha + friction
    const armFactor = motor.joint.includes('Shoulder') ? (params.upperArmLength ?? 0.30) : (params.forearmLength ?? 0.28);
    const angleRad = (newAngle * Math.PI) / 180;
    const baseTorque = Math.abs(Math.sin(angleRad)) * 2.5 * armFactor * 9.81;
    const dynamicTorque = Math.abs(velocity) * 0.018;
    const totalTorque = Number((baseTorque + dynamicTorque + 0.3).toFixed(2));

    let status: MotorConfig['status'] = 'normal';
    if (Math.abs(velocity) > 15) {
      status = 'active';
    }
    if (totalTorque > 7.0 || motor.temperature > 55) {
      status = 'warning';
    }

    return {
      ...motor,
      targetAngle: Number(clampedTarget.toFixed(1)),
      currentAngle: Number(newAngle.toFixed(1)),
      velocity: Number(velocity.toFixed(1)),
      torque: totalTorque,
      temperature: Number((32 + (totalTorque * 0.8) + (Math.abs(velocity) * 0.02)).toFixed(1)),
      status,
    };
  });
}
