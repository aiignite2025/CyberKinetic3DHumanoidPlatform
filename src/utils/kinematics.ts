import { MotorConfig, PoseLandmark3D, ProcessedJoints, RobotArmParams } from '../types/robot';

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
 * Creates default list of robotic servo motors.
 */
export function createDefaultMotors(): MotorConfig[] {
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
    leftWristYaw: joints.leftWrist.yaw,
    leftGripper: Math.abs(joints.leftWrist.yaw) * 1.5,

    rightShoulderPitch: joints.rightShoulder.pitch,
    rightShoulderRoll: joints.rightShoulder.roll,
    rightShoulderYaw: joints.rightShoulder.yaw,
    rightElbow: joints.rightElbow,
    rightWristPitch: joints.rightWrist.pitch,
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
