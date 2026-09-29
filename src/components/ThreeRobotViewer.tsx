/**
 * High-Precision 3D Humanoid Robot Teleoperation Viewport
 * Professional Studio Lighting Rig, Multi-Angle Fill Lights, Rim Highlights,
 * Open-Source Robot Models (Unitree G1, Mobile ALOHA, Fourier GR-1, InMoov),
 * and Dynamic Kinematics Synchronization.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ProcessedJoints, RobotArmParams, MotorConfig, RobotModelType } from '../types/robot';
import { OPEN_SOURCE_ROBOTS } from '../data/openSourceRobots';
import { RobotJointMotionSmoother } from '../utils/motionController';
import {
  RotateCcw,
  Box,
  Compass,
  Layers,
  Sparkles,
  Activity,
  Bot,
  Sun,
  SunMedium,
  SunDim,
  Lightbulb,
  Maximize2
} from 'lucide-react';

interface ThreeRobotViewerProps {
  joints: ProcessedJoints;
  motors: MotorConfig[];
  armParams: RobotArmParams;
  fps: number;
  isTracking: boolean;
  modelType?: RobotModelType;
  onModelTypeChange?: (model: RobotModelType) => void;
  customFile?: File | null;
}

export type LightingPreset = 'studio_bright' | 'cyberpunk' | 'natural_daylight';

export const ThreeRobotViewer: React.FC<ThreeRobotViewerProps> = ({
  joints,
  motors,
  armParams,
  fps,
  isTracking,
  modelType = 'unitree_g1',
  onModelTypeChange,
  customFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Lights references for dynamic lighting mode switching
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const mainKeyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const frontFillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const backRimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const overheadLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Robot Bone Hierarchies
  const robotRootRef = useRef<THREE.Group | null>(null);
  const spineGroupRef = useRef<THREE.Group | null>(null);
  const chestGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);

  // Left Arm (6-DOF Nested Kinematic Chain)
  const leftShoulderPitchGroupRef = useRef<THREE.Group | null>(null);
  const leftShoulderRollGroupRef = useRef<THREE.Group | null>(null);
  const leftShoulderYawGroupRef = useRef<THREE.Group | null>(null);
  const leftShoulderGroupRef = useRef<THREE.Group | null>(null);
  const leftUpperArmMeshRef = useRef<THREE.Group | null>(null);
  const leftElbowGroupRef = useRef<THREE.Group | null>(null);
  const leftForearmMeshRef = useRef<THREE.Group | null>(null);
  const leftWristPitchGroupRef = useRef<THREE.Group | null>(null);
  const leftWristYawGroupRef = useRef<THREE.Group | null>(null);
  const leftWristGroupRef = useRef<THREE.Group | null>(null);

  // Right Arm (6-DOF Nested Kinematic Chain)
  const rightShoulderPitchGroupRef = useRef<THREE.Group | null>(null);
  const rightShoulderRollGroupRef = useRef<THREE.Group | null>(null);
  const rightShoulderYawGroupRef = useRef<THREE.Group | null>(null);
  const rightShoulderGroupRef = useRef<THREE.Group | null>(null);
  const rightUpperArmMeshRef = useRef<THREE.Group | null>(null);
  const rightElbowGroupRef = useRef<THREE.Group | null>(null);
  const rightForearmMeshRef = useRef<THREE.Group | null>(null);
  const rightWristPitchGroupRef = useRef<THREE.Group | null>(null);
  const rightWristYawGroupRef = useRef<THREE.Group | null>(null);
  const rightWristGroupRef = useRef<THREE.Group | null>(null);

  // Pelvis & Legs
  const pelvisGroupRef = useRef<THREE.Group | null>(null);
  const leftHipGroupRef = useRef<THREE.Group | null>(null);
  const leftKneeGroupRef = useRef<THREE.Group | null>(null);
  const leftAnkleGroupRef = useRef<THREE.Group | null>(null);

  const rightHipGroupRef = useRef<THREE.Group | null>(null);
  const rightKneeGroupRef = useRef<THREE.Group | null>(null);
  const rightAnkleGroupRef = useRef<THREE.Group | null>(null);

  // Custom External Model Group
  const customModelGroupRef = useRef<THREE.Group | null>(null);

  // Humanoid Wrapper Group Reference
  const humanoidGroupRef = useRef<THREE.Group | null>(null);

  // Industrial 6-Axis Robot Arm Hierarchy References
  const industrial6AxisRootRef = useRef<THREE.Group | null>(null);
  const ind6J1GroupRef = useRef<THREE.Group | null>(null); // Base Yaw
  const ind6J2GroupRef = useRef<THREE.Group | null>(null); // Shoulder Pitch
  const ind6J3GroupRef = useRef<THREE.Group | null>(null); // Elbow Pitch
  const ind6J4GroupRef = useRef<THREE.Group | null>(null); // Wrist 1 Pitch
  const ind6J5GroupRef = useRef<THREE.Group | null>(null); // Wrist 2 Yaw
  const ind6J6GroupRef = useRef<THREE.Group | null>(null); // Tool Flange Roll
  const ind6GripperLRef = useRef<THREE.Mesh | null>(null);
  const ind6GripperRRef = useRef<THREE.Mesh | null>(null);
  const ind6HeldBoxRef = useRef<THREE.Mesh | null>(null);
  const ind6FeedBoxRef = useRef<THREE.Mesh | null>(null);
  const ind6PalletBoxRef = useRef<THREE.Mesh | null>(null);

  // SCARA 4-Axis Industrial Robot Hierarchy References
  const scara4AxisRootRef = useRef<THREE.Group | null>(null);
  const scaraJ1GroupRef = useRef<THREE.Group | null>(null); // Arm 1 Yaw
  const scaraJ2GroupRef = useRef<THREE.Group | null>(null); // Arm 2 Yaw
  const scaraJ3GroupRef = useRef<THREE.Group | null>(null); // Z Linear Quill
  const scaraJ4GroupRef = useRef<THREE.Group | null>(null); // Theta Tool Roll
  const scaraGlowRef = useRef<THREE.Mesh | null>(null);

  // Materials References
  const darkArmorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const silverJointMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const accentMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const glowMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const allMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Visual Overlays
  const axesHelpersRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // UI States
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showAngleLabels, setShowAngleLabels] = useState<boolean>(true);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio_bright');
  const [exposureLevel, setExposureLevel] = useState<number>(1.4); // Enhanced default exposure
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'front' | 'leftArm' | 'rightArm' | 'top'>('perspective');

  const activeMeta = OPEN_SOURCE_ROBOTS.find(r => r.id === modelType) || OPEN_SOURCE_ROBOTS[0];

  // Motion Controller Smoother Engine (Critically Damped Spring / S-Curve)
  const jointSmootherRef = useRef<RobotJointMotionSmoother | null>(null);
  if (!jointSmootherRef.current) {
    jointSmootherRef.current = new RobotJointMotionSmoother(joints);
  }

  // Update target joints in smoother whenever target changes
  useEffect(() => {
    jointSmootherRef.current?.setTargetJoints(joints);
  }, [joints]);

  const paramsRef = useRef<RobotArmParams>(armParams);
  useEffect(() => {
    paramsRef.current = armParams;
  }, [armParams]);

  const modelTypeRef = useRef<RobotModelType>(modelType);
  useEffect(() => {
    modelTypeRef.current = modelType;
  }, [modelType]);

  // Initialize Three.js Scene with Studio-Grade Lighting
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene with clear gradient background & soft distant fog only
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b111e); // Elegant deep slate studio background
    // Soft distant linear fog: only kicks in beyond 6.5 meters, keeping robot 100% crystal clear!
    scene.fog = new THREE.Fog(0x0b111e, 6.0, 18.0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 2.7);
    cameraRef.current = camera;

    // High-Dynamic-Range Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4; // Crisper, brighter robot rendering
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 0.6;
    controls.maxDistance = 5.5;
    controls.target.set(0, 0.95, 0);
    controlsRef.current = controls;

    // ==========================================
    // STUDIO MULTI-ANGLE LIGHTING RIG
    // ==========================================
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 1. Hemisphere Ambient Light (Sky / Ground balance)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.8);
    hemiLight.position.set(0, 20, 0);
    lightsGroup.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // 2. Base Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    lightsGroup.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 3. Front Key Light (Strong front-right directional with soft shadows)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(2.8, 3.8, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.bias = -0.0005;
    lightsGroup.add(keyLight);
    mainKeyLightRef.current = keyLight;

    // 4. Front Fill Light (Cool daylight front-left, eliminates dark shadows on chest/shoulders)
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 2.4);
    fillLight.position.set(-2.8, 2.5, 3.0);
    lightsGroup.add(fillLight);
    frontFillLightRef.current = fillLight;

    // 5. Overhead Downward Studio Light (Highlights head visor, shoulders, arm contours)
    const overheadLight = new THREE.DirectionalLight(0xffffff, 2.0);
    overheadLight.position.set(0, 4.5, 0.5);
    lightsGroup.add(overheadLight);
    overheadLightRef.current = overheadLight;

    // 6. Back Rim Light (Sharp edge contour definition)
    const backRimLight = new THREE.DirectionalLight(0x38bdf8, 3.8);
    backRimLight.position.set(0, 3.2, -3.5);
    lightsGroup.add(backRimLight);
    backRimLightRef.current = backRimLight;

    // 7. Ground Bounce Light (Soft warm bounce from floor onto underside of arms/pelvis)
    const bounceLight = new THREE.PointLight(0xffedd5, 1.6, 5);
    bounceLight.position.set(0, 0.15, 1.0);
    lightsGroup.add(bounceLight);

    // ==========================================
    // STUDIO STAGE & PEDESTAL
    // ==========================================
    // Main Studio Floor
    const floorGeo = new THREE.PlaneGeometry(14, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Rich slate floor
      roughness: 0.45,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Circular Stage Platform for Humanoid Robot
    const stageGeo = new THREE.CylinderGeometry(1.3, 1.35, 0.03, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x182234,
      roughness: 0.35,
      metalness: 0.6,
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 0.015;
    stage.receiveShadow = true;
    scene.add(stage);

    // Stage Glowing Perimeter Ring
    const stageRingGeo = new THREE.RingGeometry(1.28, 1.32, 64);
    const stageRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const stageRing = new THREE.Mesh(stageRingGeo, stageRingMat);
    stageRing.rotation.x = -Math.PI / 2;
    stageRing.position.y = 0.032;
    scene.add(stageRing);

    // Grid Overlay
    const grid = new THREE.GridHelper(10, 32, 0x00f0ff, 0x1e3a5f);
    grid.position.y = 0.003;
    scene.add(grid);
    gridHelperRef.current = grid;

    // ==========================================
    // ROBOT MESH HIERARCHY
    // ==========================================
    const robotRoot = new THREE.Group();
    scene.add(robotRoot);
    robotRootRef.current = robotRoot;

    // PBR Materials tuned for crisp visual visibility
    const initialScheme = activeMeta.colorScheme;

    // Dark Armor Material with high diffuse readability (metalness 0.45, roughness 0.35)
    const darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d, // High-contrast slate charcoal instead of pure black!
      metalness: 0.45,
      roughness: 0.35,
    });
    darkArmorMatRef.current = darkArmorMat;

    // Silver Joint Material with bright specular chrome finish
    const silverJointMat = new THREE.MeshStandardMaterial({
      color: 0xdde5ed, // Bright crisp titanium silver
      metalness: 0.85,
      roughness: 0.20,
    });
    silverJointMatRef.current = silverJointMat;

    // Glowing Sensor & Optical Core Material
    const glowMat = new THREE.MeshStandardMaterial({
      color: initialScheme.glow,
      emissive: initialScheme.glow,
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });
    glowMatRef.current = glowMat;

    // Accent Plates
    const accentMat = new THREE.MeshStandardMaterial({
      color: initialScheme.accent,
      metalness: 0.6,
      roughness: 0.3,
    });
    accentMatRef.current = accentMat;

    allMaterialsRef.current = [darkArmorMat, silverJointMat, glowMat, accentMat];

    // Humanoid Model Group Wrapper
    const humanoidGroup = new THREE.Group();
    robotRoot.add(humanoidGroup);
    humanoidGroupRef.current = humanoidGroup;
    humanoidGroup.visible = modelType !== 'industrial_6axis' && modelType !== 'scara_4axis';

    // Pelvis
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.92, 0);
    humanoidGroup.add(pelvis);
    pelvisGroupRef.current = pelvis;

    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), darkArmorMat);
    pelvisMesh.castShadow = true;
    pelvis.add(pelvisMesh);

    // Spine Vertebrae
    const spine = new THREE.Group();
    spine.position.set(0, 0.07, 0);
    pelvis.add(spine);
    spineGroupRef.current = spine;

    for (let i = 0; i < 3; i++) {
      const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16), silverJointMat);
      vert.position.set(0, 0.04 + i * 0.045, 0);
      vert.castShadow = true;
      spine.add(vert);
    }

    // Chest & Torso
    const chest = new THREE.Group();
    chest.position.set(0, 0.16, 0);
    spine.add(chest);
    chestGroupRef.current = chest;

    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 0.20), darkArmorMat);
    chestMesh.position.set(0, 0.15, 0);
    chestMesh.castShadow = true;
    chest.add(chestMesh);

    // Front Chest Armor Bevel Plate (Improves 3D depth perception)
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.03), accentMat);
    chestPlate.position.set(0, 0.15, 0.105);
    chestPlate.castShadow = true;
    chest.add(chestPlate);

    // Glowing Arc Core
    const arcCore = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 32), glowMat);
    arcCore.rotation.x = Math.PI / 2;
    arcCore.position.set(0, 0.17, 0.12);
    chest.add(arcCore);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 16), silverJointMat);
    neck.position.set(0, 0.32, 0);
    chest.add(neck);

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.38, 0);
    chest.add(head);
    headGroupRef.current = head;

    const headSkull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.18), darkArmorMat);
    headSkull.castShadow = true;
    head.add(headSkull);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.05), glowMat);
    visor.position.set(0, 0.03, 0.08);
    head.add(visor);

    // Ears / Sensor Array
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16), silverJointMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(0.10, 0.03, 0);
    head.add(earL);
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16), silverJointMat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(-0.10, 0.03, 0);
    head.add(earR);

    // Arms Builder - True 6-DOF Nested Kinematic Chain
    const buildArm = (isLeft: boolean) => {
      const sign = isLeft ? 1 : -1;
      const shoulderX = sign * (armParams.shoulderWidth / 2);

      // J1: Shoulder Pitch (transverse rotation around X)
      const shoulderPitch = new THREE.Group();
      shoulderPitch.position.set(shoulderX, 0.26, 0);
      chest.add(shoulderPitch);

      const pitchServo = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 24), silverJointMat);
      pitchServo.rotation.z = Math.PI / 2;
      shoulderPitch.add(pitchServo);

      // J2: Shoulder Roll (sagittal rotation around Z)
      const shoulderRoll = new THREE.Group();
      shoulderPitch.add(shoulderRoll);

      const rollServo = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.075, 20), silverJointMat);
      shoulderRoll.add(rollServo);

      // J3: Shoulder Yaw (longitudinal swivel around Y)
      const shoulderYaw = new THREE.Group();
      shoulderRoll.add(shoulderYaw);

      // Upper arm link
      const upperArm = new THREE.Group();
      shoulderYaw.add(upperArm);

      const upperArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, armParams.upperArmLength, 0.075), darkArmorMat);
      upperArmMesh.position.set(0, -armParams.upperArmLength / 2, 0);
      upperArmMesh.castShadow = true;
      upperArm.add(upperArmMesh);

      const upperPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, armParams.upperArmLength * 0.7, 0.02), accentMat);
      upperPlate.position.set(0, -armParams.upperArmLength / 2, 0.04);
      upperArm.add(upperPlate);

      // J4: Elbow Flex (hinge flexion around local X)
      const elbowJoint = new THREE.Group();
      elbowJoint.position.set(0, -armParams.upperArmLength, 0);
      upperArm.add(elbowJoint);

      const elbowHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.075, 20), silverJointMat);
      elbowHinge.rotation.z = Math.PI / 2;
      elbowJoint.add(elbowHinge);

      // Forearm link
      const forearm = new THREE.Group();
      elbowJoint.add(forearm);

      const forearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, armParams.forearmLength, 0.065), darkArmorMat);
      forearmMesh.position.set(0, -armParams.forearmLength / 2, 0);
      forearmMesh.castShadow = true;
      forearm.add(forearmMesh);

      // J5: Wrist Pitch (elevation up/down around local X)
      const wristPitch = new THREE.Group();
      wristPitch.position.set(0, -armParams.forearmLength, 0);
      forearm.add(wristPitch);

      const wristBall = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), silverJointMat);
      wristPitch.add(wristBall);

      // J6: Wrist Yaw / Roll (lateral waving & gripper sweep around Z/Y)
      const wristYaw = new THREE.Group();
      wristPitch.add(wristYaw);

      const hand = new THREE.Group();
      hand.position.set(0, -0.04, 0);
      wristYaw.add(hand);

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.07, 0.025), darkArmorMat);
      palm.castShadow = true;
      hand.add(palm);

      // Fingers
      for (let f = -2; f <= 2; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0065, 0.05, 8), silverJointMat);
        finger.position.set(f * 0.012, -0.05, 0);
        hand.add(finger);
      }

      const shoulderAxis = new THREE.AxesHelper(0.12);
      shoulderPitch.add(shoulderAxis);
      const elbowAxis = new THREE.AxesHelper(0.1);
      elbowJoint.add(elbowAxis);

      return {
        shoulderPitch,
        shoulderRoll,
        shoulderYaw,
        upperArm,
        upperArmMesh,
        elbowJoint,
        forearm,
        forearmMesh,
        wristPitch,
        wristYaw,
      };
    };

    const leftArm = buildArm(true);
    leftShoulderPitchGroupRef.current = leftArm.shoulderPitch;
    leftShoulderRollGroupRef.current = leftArm.shoulderRoll;
    leftShoulderYawGroupRef.current = leftArm.shoulderYaw;
    leftShoulderGroupRef.current = leftArm.shoulderPitch;
    leftUpperArmMeshRef.current = leftArm.upperArm;
    leftElbowGroupRef.current = leftArm.elbowJoint;
    leftForearmMeshRef.current = leftArm.forearm;
    leftWristPitchGroupRef.current = leftArm.wristPitch;
    leftWristYawGroupRef.current = leftArm.wristYaw;
    leftWristGroupRef.current = leftArm.wristPitch;

    const rightArm = buildArm(false);
    rightShoulderPitchGroupRef.current = rightArm.shoulderPitch;
    rightShoulderRollGroupRef.current = rightArm.shoulderRoll;
    rightShoulderYawGroupRef.current = rightArm.shoulderYaw;
    rightShoulderGroupRef.current = rightArm.shoulderPitch;
    rightUpperArmMeshRef.current = rightArm.upperArm;
    rightElbowGroupRef.current = rightArm.elbowJoint;
    rightForearmMeshRef.current = rightArm.forearm;
    rightWristPitchGroupRef.current = rightArm.wristPitch;
    rightWristYawGroupRef.current = rightArm.wristYaw;
    rightWristGroupRef.current = rightArm.wristPitch;

    // Legs
    const buildLeg = (isLeft: boolean) => {
      const sign = isLeft ? 1 : -1;
      const hipJoint = new THREE.Group();
      hipJoint.position.set(sign * 0.1, -0.08, 0);
      pelvis.add(hipJoint);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.09), darkArmorMat);
      thigh.position.set(0, -0.22, 0);
      thigh.castShadow = true;
      hipJoint.add(thigh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.set(0, -0.44, 0);
      hipJoint.add(kneeJoint);

      const kneeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16), silverJointMat);
      kneeCap.rotation.z = Math.PI / 2;
      kneeJoint.add(kneeCap);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.08), darkArmorMat);
      shin.position.set(0, -0.2, 0);
      shin.castShadow = true;
      kneeJoint.add(shin);

      const ankleJoint = new THREE.Group();
      ankleJoint.position.set(0, -0.40, 0);
      kneeJoint.add(ankleJoint);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.18), darkArmorMat);
      foot.position.set(0, -0.025, 0.04);
      foot.castShadow = true;
      ankleJoint.add(foot);

      if (isLeft) {
        leftHipGroupRef.current = hipJoint;
        leftKneeGroupRef.current = kneeJoint;
        leftAnkleGroupRef.current = ankleJoint;
      } else {
        rightHipGroupRef.current = hipJoint;
        rightKneeGroupRef.current = kneeJoint;
        rightAnkleGroupRef.current = ankleJoint;
      }
    };

    buildLeg(true);
    buildLeg(false);

    // ==========================================
    // INDUSTRIAL 6-AXIS ARTICULATED ROBOT ARM
    // ==========================================
    const industrial6AxisGroup = new THREE.Group();
    robotRoot.add(industrial6AxisGroup);
    industrial6AxisRootRef.current = industrial6AxisGroup;
    industrial6AxisGroup.visible = modelType === 'industrial_6axis';

    // 1. Industrial Steel Pedestal & Workstation Base
    const indBaseStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.40, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 })
    );
    indBaseStand.position.set(0, 0.20, 0);
    indBaseStand.castShadow = true;
    indBaseStand.receiveShadow = true;
    industrial6AxisGroup.add(indBaseStand);

    // Hazard Safety Ring around Base
    const hazardRing = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.33, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, side: THREE.DoubleSide })
    );
    hazardRing.rotation.x = -Math.PI / 2;
    hazardRing.position.y = 0.035;
    industrial6AxisGroup.add(hazardRing);

    // ==========================================
    // 180° OPPOSING WORKSTATIONS: INFEED & PALLET
    // Left Infeed Conveyor at J1 = -90° (X = -0.72, Z = 0)
    // Right Stacking Pallet at J1 = +90° (X = +0.72, Z = 0)
    // Total coordinate swing across materials = EXACTLY 180.0°!
    // ==========================================

    // 180° Workspace Semicircular Floor Guide Arc (R = 0.72m)
    const arcGuideGroup = new THREE.Group();
    industrial6AxisGroup.add(arcGuideGroup);

    const arcLineGeo = new THREE.RingGeometry(0.712, 0.728, 64, 1, 0, Math.PI);
    const arcLineMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const arcLineMesh = new THREE.Mesh(arcLineGeo, arcLineMat);
    arcLineMesh.rotation.x = -Math.PI / 2;
    arcLineMesh.position.y = 0.008;
    arcGuideGroup.add(arcLineMesh);

    // Degree Ticks along 180° Arc (-90°, -45°, 0°, +45°, +90°)
    [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2].forEach(angle => {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.006, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6 })
      );
      // In Three.js with base angle: angle from front (+Z)
      // angle = -PI/2 -> -X (left), angle = 0 -> +Z (front), angle = +PI/2 -> +X (right)
      tick.position.set(Math.sin(angle) * 0.72, 0.01, Math.cos(angle) * 0.72);
      tick.rotation.y = angle;
      arcGuideGroup.add(tick);
    });

    // 1. Right Pallet Stacking Workstation (180° End Station, J1 = +90°, X = +0.72, Z = 0)
    const palletGroup = new THREE.Group();
    palletGroup.position.set(0.72, 0.04, 0.0);
    industrial6AxisGroup.add(palletGroup);

    // European Standard Wooden Pallet (EUR-1 1200x800 industrial style)
    const palletWood = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.44),
      new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85, metalness: 0.1 })
    );
    palletWood.castShadow = true;
    palletWood.receiveShadow = true;
    palletGroup.add(palletWood);

    // Pallet Base Layer Boxes
    const boxGeo = new THREE.BoxGeometry(0.16, 0.13, 0.16);
    const boxMat1 = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7, metalness: 0.1 });
    const box1 = new THREE.Mesh(boxGeo, boxMat1);
    box1.position.set(-0.085, 0.095, -0.085);
    box1.castShadow = true;
    palletGroup.add(box1);

    const box2 = new THREE.Mesh(boxGeo, boxMat1);
    box2.position.set(0.085, 0.095, 0.085);
    box2.castShadow = true;
    palletGroup.add(box2);

    // Placed Box (Upper Stack Layer, placed at J1 = +90°)
    const palletPlacedBox = new THREE.Mesh(boxGeo, boxMat1);
    palletPlacedBox.position.set(0.0, 0.165, 0.0);
    palletPlacedBox.castShadow = true;
    palletGroup.add(palletPlacedBox);
    ind6PalletBoxRef.current = palletPlacedBox;

    // Pallet Corner Safety Brackets (Industrial Yellow)
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 });
    [[-0.23, -0.23], [0.23, -0.23], [-0.23, 0.23], [0.23, 0.23]].forEach(([bx, bz]) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.03), bracketMat);
      bracket.position.set(bx, 0.05, bz);
      palletGroup.add(bracket);
    });

    // 2. Left Incoming Infeed Conveyor (180° Start Station, J1 = -90°, X = -0.72, Z = 0)
    const infeedGroup = new THREE.Group();
    infeedGroup.position.set(-0.72, 0.04, 0.0);
    industrial6AxisGroup.add(infeedGroup);

    const infeedTable = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.08, 0.54),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 })
    );
    infeedTable.castShadow = true;
    infeedTable.receiveShadow = true;
    infeedGroup.add(infeedTable);

    // Infeed Roller Conveyor Belt (runs along Z, delivering box to Z = 0)
    const rollerBelt = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.02, 0.50),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.6 })
    );
    rollerBelt.position.y = 0.05;
    infeedGroup.add(rollerBelt);

    // Conveyor Side Rails (Safety Yellow)
    [-0.18, 0.18].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.52), bracketMat);
      rail.position.set(rx, 0.08, 0);
      infeedGroup.add(rail);
    });

    // Feed Box ready for pickup at Station Start (X = -0.72, Z = 0)
    const feedBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.13, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, metalness: 0.1 })
    );
    feedBox.position.set(0, 0.125, 0);
    feedBox.castShadow = true;
    infeedGroup.add(feedBox);
    ind6FeedBoxRef.current = feedBox;

    // J1: Base Turntable (Rotates around Y)
    const indJ1 = new THREE.Group();
    indJ1.position.set(0, 0.40, 0);
    industrial6AxisGroup.add(indJ1);
    ind6J1GroupRef.current = indJ1;

    const indJ1Turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.20, 0.14, 32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 })
    );
    indJ1Turret.position.y = 0.07;
    indJ1Turret.castShadow = true;
    indJ1.add(indJ1Turret);

    // J2: Shoulder (Rotates around X)
    const indJ2 = new THREE.Group();
    indJ2.position.set(0, 0.14, 0);
    indJ1.add(indJ2);
    ind6J2GroupRef.current = indJ2;

    const indJ2Housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.24, 24),
      new THREE.MeshStandardMaterial({ color: 0xdde5ed, roughness: 0.2, metalness: 0.85 })
    );
    indJ2Housing.rotation.z = Math.PI / 2;
    indJ2.add(indJ2Housing);

    // Upper Arm Link (Length 0.42m)
    const indUpperLink = new THREE.Group();
    indJ2.add(indUpperLink);

    const indUpperMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.42, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x242d3d, roughness: 0.35, metalness: 0.5 })
    );
    indUpperMesh.position.set(0, 0.21, 0);
    indUpperMesh.castShadow = true;
    indUpperLink.add(indUpperMesh);

    // UR / KUKA Style Blue Accent Plate
    const indUpperAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.126, 0.32, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 })
    );
    indUpperAccent.position.set(0, 0.21, 0.05);
    indUpperLink.add(indUpperAccent);

    // J3: Elbow (Rotates around X)
    const indJ3 = new THREE.Group();
    indJ3.position.set(0, 0.42, 0);
    indUpperLink.add(indJ3);
    ind6J3GroupRef.current = indJ3;

    const indJ3Hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.20, 24),
      new THREE.MeshStandardMaterial({ color: 0xdde5ed, roughness: 0.2, metalness: 0.85 })
    );
    indJ3Hinge.rotation.z = Math.PI / 2;
    indJ3.add(indJ3Hinge);

    // Forearm Link (Length 0.38m)
    const indForeLink = new THREE.Group();
    indJ3.add(indForeLink);

    const indForeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.38, 0.095),
      new THREE.MeshStandardMaterial({ color: 0x242d3d, roughness: 0.35, metalness: 0.5 })
    );
    indForeMesh.position.set(0, 0.19, 0);
    indForeMesh.castShadow = true;
    indForeLink.add(indForeMesh);

    // J4: Wrist 1 Pitch (Rotates around X)
    const indJ4 = new THREE.Group();
    indJ4.position.set(0, 0.38, 0);
    indForeLink.add(indJ4);
    ind6J4GroupRef.current = indJ4;

    const indJ4Motor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 })
    );
    indJ4Motor.rotation.z = Math.PI / 2;
    indJ4.add(indJ4Motor);

    // J5: Wrist 2 Yaw (Rotates around Y)
    const indJ5 = new THREE.Group();
    indJ5.position.set(0, 0.08, 0);
    indJ4.add(indJ5);
    ind6J5GroupRef.current = indJ5;

    const indJ5Swivel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0xdde5ed, roughness: 0.2, metalness: 0.85 })
    );
    indJ5Swivel.position.y = 0.04;
    indJ5.add(indJ5Swivel);

    // J6: Tool Flange Roll (Rotates around Z)
    const indJ6 = new THREE.Group();
    indJ6.position.set(0, 0.08, 0);
    indJ5.add(indJ6);
    ind6J6GroupRef.current = indJ6;

    // Flange Disk
    const indFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.8 })
    );
    indFlange.position.y = 0.015;
    indJ6.add(indFlange);

    // Industrial Pneumatic Gripper Tool
    const gripperBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })
    );
    gripperBody.position.set(0, 0.045, 0);
    gripperBody.castShadow = true;
    indJ6.add(gripperBody);

    // Optical Tool Laser Pointer
    const toolLaser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0 })
    );
    toolLaser.position.set(0, 0.075, 0);
    indJ6.add(toolLaser);

    // Dual Parallel Fingers
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 });
    const indFingerL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.02), fingerMat);
    indFingerL.position.set(-0.022, 0.085, 0);
    indFingerL.castShadow = true;
    indJ6.add(indFingerL);
    ind6GripperLRef.current = indFingerL;

    const indFingerR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.02), fingerMat);
    indFingerR.position.set(0.022, 0.085, 0);
    indFingerR.castShadow = true;
    indJ6.add(indFingerR);
    ind6GripperRRef.current = indFingerR;

    // Carried Box held in pneumatic gripper
    const heldBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, metalness: 0.2 })
    );
    heldBox.position.set(0, 0.14, 0);
    heldBox.castShadow = true;
    heldBox.visible = false;
    indJ6.add(heldBox);
    ind6HeldBoxRef.current = heldBox;

    // ==========================================
    // SCARA 4-AXIS INDUSTRIAL ROBOT
    // ==========================================
    const scara4AxisGroup = new THREE.Group();
    robotRoot.add(scara4AxisGroup);
    scara4AxisRootRef.current = scara4AxisGroup;
    scara4AxisGroup.visible = modelType === 'scara_4axis';

    // 1. SCARA Heavy Pedestal Stand (Cleanroom White & Slate Base)
    const scaraStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.24, 0.60, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.5 })
    );
    scaraStand.position.set(0, 0.30, 0);
    scaraStand.castShadow = true;
    scaraStand.receiveShadow = true;
    scara4AxisGroup.add(scaraStand);

    // Cleanroom Green Operating Indicator Ring
    const scaraStatusRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, side: THREE.DoubleSide })
    );
    scaraStatusRing.rotation.x = -Math.PI / 2;
    scaraStatusRing.position.y = 0.035;
    scara4AxisGroup.add(scaraStatusRing);

    // SCARA Workstation: Miniature Conveyor & PCB Fixture Tray
    const pcbFixture = new THREE.Group();
    pcbFixture.position.set(0.32, 0.04, 0.28);
    scara4AxisGroup.add(pcbFixture);

    const conveyorBelt = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.05, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.3 })
    );
    conveyorBelt.castShadow = true;
    conveyorBelt.receiveShadow = true;
    pcbFixture.add(conveyorBelt);

    // Green PCB Board
    const pcbBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.015, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3, metalness: 0.4 })
    );
    pcbBoard.position.set(0, 0.032, 0);
    pcbFixture.add(pcbBoard);

    // IC Chips on board
    for (let c = -1; c <= 1; c++) {
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.01, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
      );
      chip.position.set(c * 0.05, 0.042, 0);
      pcbFixture.add(chip);
    }

    // SCARA J1: Base Arm 1 Horizontal Yaw (Rotates around Y)
    const scaraJ1 = new THREE.Group();
    scaraJ1.position.set(0, 0.60, 0);
    scara4AxisGroup.add(scaraJ1);
    scaraJ1GroupRef.current = scaraJ1;

    // Base Motor Hub
    const scaraJ1Hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25, metalness: 0.6 })
    );
    scaraJ1Hub.position.y = 0.06;
    scaraJ1Hub.castShadow = true;
    scaraJ1.add(scaraJ1Hub);

    // Arm 1 (Length 0.35m extending along Z)
    const scaraArm1 = new THREE.Group();
    scaraJ1.add(scaraArm1);

    const scaraArm1Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.11, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.15 })
    );
    scaraArm1Mesh.position.set(0, 0.10, 0.175);
    scaraArm1Mesh.castShadow = true;
    scaraArm1.add(scaraArm1Mesh);

    // Arm 1 Cyan Side Stripe
    const arm1Stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.154, 0.02, 0.30),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, metalness: 0.5 })
    );
    arm1Stripe.position.set(0, 0.10, 0.175);
    scaraArm1.add(arm1Stripe);

    // SCARA J2: Arm 2 Horizontal Yaw (Rotates around Y at end of Arm 1)
    const scaraJ2 = new THREE.Group();
    scaraJ2.position.set(0, 0, 0.35);
    scaraArm1.add(scaraJ2);
    scaraJ2GroupRef.current = scaraJ2;

    const scaraJ2ElbowHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.15, 24),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25, metalness: 0.6 })
    );
    scaraJ2ElbowHub.position.y = 0.10;
    scaraJ2ElbowHub.castShadow = true;
    scaraJ2.add(scaraJ2ElbowHub);

    // Arm 2 (Length 0.26m extending along Z)
    const scaraArm2 = new THREE.Group();
    scaraJ2.add(scaraArm2);

    const scaraArm2Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.10, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.15 })
    );
    scaraArm2Mesh.position.set(0, 0.10, 0.13);
    scaraArm2Mesh.castShadow = true;
    scaraArm2.add(scaraArm2Mesh);

    // SCARA J3: Z-Axis Precision Spline Quill Housing
    const quillHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.20, 20),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 })
    );
    quillHousing.position.set(0, 0.10, 0.26);
    scaraArm2.add(quillHousing);

    // J3 Linear Quill Shaft (Translates vertically along Y)
    const scaraJ3 = new THREE.Group();
    scaraJ3.position.set(0, 0.05, 0.26);
    scaraArm2.add(scaraJ3);
    scaraJ3GroupRef.current = scaraJ3;

    // Precision Chrome Spline Shaft (Length 0.36m)
    const splineShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.36, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.95 })
    );
    splineShaft.castShadow = true;
    scaraJ3.add(splineShaft);

    // SCARA J4: Theta Tool Roll (Rotates around Y at bottom of spline shaft)
    const scaraJ4 = new THREE.Group();
    scaraJ4.position.set(0, -0.18, 0);
    scaraJ3.add(scaraJ4);
    scaraJ4GroupRef.current = scaraJ4;

    // Vacuum Pick Head / Micro-Gripper
    const suctionHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.018, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, metalness: 0.7 })
    );
    suctionHead.position.y = -0.02;
    scaraJ4.add(suctionHead);

    const suctionTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.004, 0.025, 12),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.2 })
    );
    suctionTip.position.y = -0.045;
    scaraJ4.add(suctionTip);
    scaraGlowRef.current = suctionTip;

    // Animation Loop with Continuous Physical Spring-Damper / S-Curve Simulation
    let animationFrameId: number;
    const clock = new THREE.Clock();
    const toRad = Math.PI / 180;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.08);
      if (jointSmootherRef.current) {
        const smoothed = jointSmootherRef.current.update(dt, paramsRef.current);
        const activeModel = modelTypeRef.current;

        // 7. Industrial 6-Axis Robot Kinematic Drive
        if (activeModel === 'industrial_6axis') {
          if (ind6J1GroupRef.current) {
            ind6J1GroupRef.current.rotation.y = (smoothed.rightShoulder?.yaw ?? 0) * toRad;
          }
          if (ind6J2GroupRef.current) {
            ind6J2GroupRef.current.rotation.x = (smoothed.rightShoulder?.pitch ?? 0) * toRad;
          }
          if (ind6J3GroupRef.current) {
            ind6J3GroupRef.current.rotation.x = (smoothed.rightElbow ?? 0) * toRad;
          }
          if (ind6J4GroupRef.current) {
            ind6J4GroupRef.current.rotation.x = (smoothed.rightWrist?.pitch ?? 0) * toRad;
          }
          if (ind6J5GroupRef.current) {
            ind6J5GroupRef.current.rotation.z = (smoothed.rightWrist?.yaw ?? 0) * toRad;
          }
          if (ind6J6GroupRef.current) {
            ind6J6GroupRef.current.rotation.y = (smoothed.rightWrist?.roll ?? 0) * toRad;
          }
          if (ind6GripperLRef.current && ind6GripperRRef.current) {
            const yaw = smoothed.rightShoulder?.yaw ?? 0;
            const pitch = smoothed.rightShoulder?.pitch ?? 0;
            // Carried box is held when arm lifts and swings across between -88° and +88° (180° swing span)
            const isCarrying = pitch < 55 && yaw > -88 && yaw < 88;
            const gripGap = isCarrying ? 0.012 : 0.026;
            ind6GripperLRef.current.position.x = -gripGap;
            ind6GripperRRef.current.position.x = gripGap;
            if (ind6HeldBoxRef.current) {
              ind6HeldBoxRef.current.visible = isCarrying;
            }
            if (ind6FeedBoxRef.current) {
              // Feed box at conveyor is visible before pick and after return
              ind6FeedBoxRef.current.visible = yaw <= -88 || yaw >= 35;
            }
            if (ind6PalletBoxRef.current) {
              // Placed box appears on pallet when placed
              ind6PalletBoxRef.current.visible = yaw >= 85 || yaw < -35;
            }
          }
        } else if (activeModel === 'scara_4axis') {
          // 8. SCARA 4-Axis Industrial Robot Drive
          if (scaraJ1GroupRef.current) {
            scaraJ1GroupRef.current.rotation.y = (smoothed.rightShoulder?.yaw ?? 0) * toRad;
          }
          if (scaraJ2GroupRef.current) {
            scaraJ2GroupRef.current.rotation.y = (smoothed.rightElbow ?? 0) * toRad;
          }
          if (scaraJ3GroupRef.current) {
            const pNorm = Math.max(0, Math.min(1, Math.abs(smoothed.rightShoulder?.pitch ?? 0) / 70));
            scaraJ3GroupRef.current.position.y = 0.05 - pNorm * 0.18;
          }
          if (scaraJ4GroupRef.current) {
            scaraJ4GroupRef.current.rotation.y = (smoothed.rightWrist?.yaw ?? 0) * toRad;
          }
        } else {
          // Humanoid Robot Kinematic Drive
          // 1. Left Arm (6-DOF Kinematic Chain)
          if (leftShoulderPitchGroupRef.current) {
            leftShoulderPitchGroupRef.current.rotation.x = -(smoothed.leftShoulder?.pitch ?? 0) * toRad;
          }
          if (leftShoulderRollGroupRef.current) {
            leftShoulderRollGroupRef.current.rotation.z = (smoothed.leftShoulder?.roll ?? 0) * toRad;
          }
          if (leftShoulderYawGroupRef.current) {
            leftShoulderYawGroupRef.current.rotation.y = -(smoothed.leftShoulder?.yaw ?? 0) * toRad;
          }
          if (leftElbowGroupRef.current) {
            leftElbowGroupRef.current.rotation.x = -(smoothed.leftElbow ?? 0) * toRad;
          }
          if (leftWristPitchGroupRef.current) {
            leftWristPitchGroupRef.current.rotation.x = -(smoothed.leftWrist?.pitch ?? 0) * toRad;
          }
          if (leftWristYawGroupRef.current) {
            leftWristYawGroupRef.current.rotation.z = (smoothed.leftWrist?.yaw ?? 0) * toRad;
          }

          // 2. Right Arm (6-DOF Kinematic Chain)
          if (rightShoulderPitchGroupRef.current) {
            rightShoulderPitchGroupRef.current.rotation.x = -(smoothed.rightShoulder?.pitch ?? 0) * toRad;
          }
          if (rightShoulderRollGroupRef.current) {
            rightShoulderRollGroupRef.current.rotation.z = -(smoothed.rightShoulder?.roll ?? 0) * toRad;
          }
          if (rightShoulderYawGroupRef.current) {
            rightShoulderYawGroupRef.current.rotation.y = (smoothed.rightShoulder?.yaw ?? 0) * toRad;
          }
          if (rightElbowGroupRef.current) {
            rightElbowGroupRef.current.rotation.x = -(smoothed.rightElbow ?? 0) * toRad;
          }
          if (rightWristPitchGroupRef.current) {
            rightWristPitchGroupRef.current.rotation.x = -(smoothed.rightWrist?.pitch ?? 0) * toRad;
          }
          if (rightWristYawGroupRef.current) {
            rightWristYawGroupRef.current.rotation.z = -(smoothed.rightWrist?.yaw ?? 0) * toRad;
          }

          // 3. Spine / Waist (Tilt, Pitch, Yaw)
          if (spineGroupRef.current) {
            spineGroupRef.current.rotation.x = -(smoothed.spinePitch ?? 0) * toRad;
            spineGroupRef.current.rotation.z = (smoothed.spineTilt ?? 0) * toRad;
            spineGroupRef.current.rotation.y = -(smoothed.spineYaw ?? 0) * toRad;
          }

          // 4. Head & Neck (Pitch, Yaw, Roll)
          if (headGroupRef.current) {
            headGroupRef.current.rotation.x = -(smoothed.neckPitch ?? 0) * toRad;
            headGroupRef.current.rotation.y = -(smoothed.neckYaw ?? 0) * toRad;
            headGroupRef.current.rotation.z = (smoothed.neckRoll ?? 0) * toRad;
          }

          // 5. Left Leg (Hip Pitch/Roll, Knee Flex, Ankle Pitch)
          if (leftHipGroupRef.current) {
            leftHipGroupRef.current.rotation.x = -(smoothed.leftHip?.pitch ?? 0) * toRad;
            leftHipGroupRef.current.rotation.z = (smoothed.leftHip?.roll ?? 0) * toRad;
          }
          if (leftKneeGroupRef.current) {
            leftKneeGroupRef.current.rotation.x = (smoothed.leftKnee ?? 0) * toRad;
          }
          if (leftAnkleGroupRef.current) {
            leftAnkleGroupRef.current.rotation.x = -(smoothed.leftAnkle ?? 0) * toRad;
          }

          // 6. Right Leg (Hip Pitch/Roll, Knee Flex, Ankle Pitch)
          if (rightHipGroupRef.current) {
            rightHipGroupRef.current.rotation.x = -(smoothed.rightHip?.pitch ?? 0) * toRad;
            rightHipGroupRef.current.rotation.z = -(smoothed.rightHip?.roll ?? 0) * toRad;
          }
          if (rightKneeGroupRef.current) {
            rightKneeGroupRef.current.rotation.x = (smoothed.rightKnee ?? 0) * toRad;
          }
          if (rightAnkleGroupRef.current) {
            rightAnkleGroupRef.current.rotation.x = -(smoothed.rightAnkle ?? 0) * toRad;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update Lighting Preset
  useEffect(() => {
    if (!mainKeyLightRef.current || !frontFillLightRef.current || !backRimLightRef.current || !hemiLightRef.current || !ambientLightRef.current || !rendererRef.current) return;

    rendererRef.current.toneMappingExposure = exposureLevel;

    if (lightingPreset === 'studio_bright') {
      // High-Key Crisp Inspection Lighting
      mainKeyLightRef.current.intensity = 3.4;
      mainKeyLightRef.current.color.setHex(0xffffff);

      frontFillLightRef.current.intensity = 2.6;
      frontFillLightRef.current.color.setHex(0xdbeafe);

      backRimLightRef.current.intensity = 3.6;
      backRimLightRef.current.color.setHex(0x38bdf8);

      if (overheadLightRef.current) overheadLightRef.current.intensity = 2.2;
      hemiLightRef.current.intensity = 1.9;
      ambientLightRef.current.intensity = 1.4;

      if (sceneRef.current) sceneRef.current.background = new THREE.Color(0x0e1422);
    } else if (lightingPreset === 'cyberpunk') {
      // High-Contrast Cyan & Amber Lighting
      mainKeyLightRef.current.intensity = 2.4;
      mainKeyLightRef.current.color.setHex(0x00f0ff);

      frontFillLightRef.current.intensity = 2.0;
      frontFillLightRef.current.color.setHex(0xf59e0b);

      backRimLightRef.current.intensity = 4.8;
      backRimLightRef.current.color.setHex(0x00e5ff);

      if (overheadLightRef.current) overheadLightRef.current.intensity = 1.6;
      hemiLightRef.current.intensity = 1.2;
      ambientLightRef.current.intensity = 0.9;

      if (sceneRef.current) sceneRef.current.background = new THREE.Color(0x07090e);
    } else if (lightingPreset === 'natural_daylight') {
      // 5500K Neutral Balanced Daylight
      mainKeyLightRef.current.intensity = 3.0;
      mainKeyLightRef.current.color.setHex(0xfffaf0);

      frontFillLightRef.current.intensity = 2.2;
      frontFillLightRef.current.color.setHex(0xffffff);

      backRimLightRef.current.intensity = 2.5;
      backRimLightRef.current.color.setHex(0xf8fafc);

      if (overheadLightRef.current) overheadLightRef.current.intensity = 2.0;
      hemiLightRef.current.intensity = 2.0;
      ambientLightRef.current.intensity = 1.5;

      if (sceneRef.current) sceneRef.current.background = new THREE.Color(0x131a2a);
    }
  }, [lightingPreset, exposureLevel]);

  // Update Materials and Visibility when modelType changes
  useEffect(() => {
    if (humanoidGroupRef.current) {
      humanoidGroupRef.current.visible = modelType !== 'industrial_6axis' && modelType !== 'scara_4axis';
    }
    if (industrial6AxisRootRef.current) {
      industrial6AxisRootRef.current.visible = modelType === 'industrial_6axis';
    }
    if (scara4AxisRootRef.current) {
      scara4AxisRootRef.current.visible = modelType === 'scara_4axis';
    }

    const meta = OPEN_SOURCE_ROBOTS.find(r => r.id === modelType);
    if (!meta) return;

    if (darkArmorMatRef.current) {
      if (modelType === 'unitree_g1') {
        darkArmorMatRef.current.color.setHex(0x283142); // Distinct dark carbon titanium with high visibility
        darkArmorMatRef.current.metalness = 0.5;
        darkArmorMatRef.current.roughness = 0.35;
      } else if (modelType === 'stanford_aloha') {
        darkArmorMatRef.current.color.setHex(0x334155); // ALOHA industrial aluminum extrusion slate
        darkArmorMatRef.current.metalness = 0.4;
        darkArmorMatRef.current.roughness = 0.45;
      } else if (modelType === 'fourier_gr1') {
        darkArmorMatRef.current.color.setHex(0xf8fafc); // Clean white hospital armor
        darkArmorMatRef.current.metalness = 0.2;
        darkArmorMatRef.current.roughness = 0.3;
      } else if (modelType === 'inmoov') {
        darkArmorMatRef.current.color.setHex(0xe2e8f0); // 3D-printed ivory PLA
        darkArmorMatRef.current.metalness = 0.15;
        darkArmorMatRef.current.roughness = 0.6;
      } else {
        darkArmorMatRef.current.color.setHex(0x242d3d);
        darkArmorMatRef.current.metalness = 0.45;
        darkArmorMatRef.current.roughness = 0.35;
      }
    }

    if (silverJointMatRef.current) {
      silverJointMatRef.current.color.setHex(meta.colorScheme.silverJoint);
    }
    if (accentMatRef.current) {
      accentMatRef.current.color.setHex(meta.colorScheme.accent);
    }
    if (glowMatRef.current) {
      glowMatRef.current.color.setHex(meta.colorScheme.glow);
      glowMatRef.current.emissive.setHex(meta.colorScheme.glow);
    }
  }, [modelType]);

  // Load Custom File (GLTF / OBJ)
  useEffect(() => {
    if (!customFile || !sceneRef.current) return;

    const fileName = customFile.name.toLowerCase();
    const url = URL.createObjectURL(customFile);

    if (customModelGroupRef.current && sceneRef.current) {
      sceneRef.current.remove(customModelGroupRef.current);
      customModelGroupRef.current = null;
    }

    if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
      const loader = new GLTFLoader();
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.position.set(0.65, 0, 0);
        sceneRef.current?.add(model);
        customModelGroupRef.current = model;
        URL.revokeObjectURL(url);
      });
    } else if (fileName.endsWith('.obj')) {
      const loader = new OBJLoader();
      loader.load(url, (obj) => {
        obj.position.set(0.65, 0, 0);
        obj.scale.set(0.01, 0.01, 0.01);
        sceneRef.current?.add(obj);
        customModelGroupRef.current = obj;
        URL.revokeObjectURL(url);
      });
    }
  }, [customFile]);

  // Update Arm Dimensions
  useEffect(() => {
    if (!leftUpperArmMeshRef.current || !leftForearmMeshRef.current) return;
    const upperScale = armParams.upperArmLength / 0.30;
    const foreScale = armParams.forearmLength / 0.28;

    leftUpperArmMeshRef.current.scale.set(1, upperScale, 1);
    rightUpperArmMeshRef.current?.scale.set(1, upperScale, 1);

    if (leftElbowGroupRef.current) leftElbowGroupRef.current.position.y = -armParams.upperArmLength;
    if (rightElbowGroupRef.current) rightElbowGroupRef.current.position.y = -armParams.upperArmLength;

    leftForearmMeshRef.current.scale.set(1, foreScale, 1);
    rightForearmMeshRef.current?.scale.set(1, foreScale, 1);

    if (leftWristPitchGroupRef.current) leftWristPitchGroupRef.current.position.y = -armParams.forearmLength;
    if (rightWristPitchGroupRef.current) rightWristPitchGroupRef.current.position.y = -armParams.forearmLength;
    if (leftWristGroupRef.current) leftWristGroupRef.current.position.y = -armParams.forearmLength;
    if (rightWristGroupRef.current) rightWristGroupRef.current.position.y = -armParams.forearmLength;

    if (leftShoulderPitchGroupRef.current) leftShoulderPitchGroupRef.current.position.x = armParams.shoulderWidth / 2;
    if (rightShoulderPitchGroupRef.current) rightShoulderPitchGroupRef.current.position.x = -armParams.shoulderWidth / 2;
    if (leftShoulderGroupRef.current) leftShoulderGroupRef.current.position.x = armParams.shoulderWidth / 2;
    if (rightShoulderGroupRef.current) rightShoulderGroupRef.current.position.x = -armParams.shoulderWidth / 2;
  }, [armParams]);

  // Wireframe toggle
  useEffect(() => {
    allMaterialsRef.current.forEach(mat => {
      mat.wireframe = showWireframe;
    });
  }, [showWireframe]);

  const applyCameraPreset = (preset: 'perspective' | 'front' | 'leftArm' | 'rightArm' | 'top') => {
    setCameraPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'front':
        camera.position.set(0, 1.2, 2.7);
        controls.target.set(0, 1.0, 0);
        break;
      case 'perspective':
        camera.position.set(1.5, 1.4, 2.4);
        controls.target.set(0, 0.95, 0);
        break;
      case 'leftArm':
        camera.position.set(0.9, 1.25, 1.2);
        controls.target.set(0.3, 1.15, 0);
        break;
      case 'rightArm':
        camera.position.set(-0.9, 1.25, 1.2);
        controls.target.set(-0.3, 1.15, 0);
        break;
      case 'top':
        camera.position.set(0, 3.2, 0.01);
        controls.target.set(0, 0.9, 0);
        break;
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        {/* Model Indicator & Quick Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs shadow-xl">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Bot className="w-4 h-4" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100">{activeMeta.name}</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  {activeMeta.dof} DOF
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{activeMeta.alias}</span>
            </div>
          </div>

          {onModelTypeChange && (
            <select
              value={modelType}
              onChange={(e) => onModelTypeChange(e.target.value as RobotModelType)}
              className="ml-2 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {OPEN_SOURCE_ROBOTS.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <div className="h-4 w-px bg-slate-700 ml-1" />
          <div className="flex items-center gap-1 text-slate-300 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-400 font-bold">{fps}</span>
            <span>FPS</span>
          </div>

          <div className="h-4 w-px bg-slate-700 ml-1" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {armParams.controlAlgorithm === 's_curve_ruckig'
                ? 'Ruckig S-Curve'
                : armParams.controlAlgorithm === 'one_euro'
                ? '1€ Adaptive'
                : armParams.controlAlgorithm === 'virtual_impedance'
                ? '阻抗柔顺力控'
                : `二阶临界阻尼 ζ=${(armParams.dampingFactor ?? 1.0).toFixed(1)}`}
            </span>
          </div>
        </div>

        {/* Viewport Control Buttons & Studio Lighting Rig Switcher */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-2xl">
          {/* Lighting Rig Selector - Icon Only */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setLightingPreset('studio_bright')}
              title="影棚高光模式 (Studio Bright 3.4x)"
              className={`p-1.5 rounded transition ${
                lightingPreset === 'studio_bright'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setLightingPreset('cyberpunk')}
              title="赛博轮廓模式 (Cyber Glow)"
              className={`p-1.5 rounded transition ${
                lightingPreset === 'cyberpunk'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              onClick={() => setLightingPreset('natural_daylight')}
              title="自然日光模式 (5500K Daylight)"
              className={`p-1.5 rounded transition ${
                lightingPreset === 'natural_daylight'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SunMedium className="w-3.5 h-3.5 text-sky-300" />
            </button>
          </div>

          {/* Exposure Quick Toggle */}
          <button
            onClick={() => setExposureLevel(prev => (prev >= 1.7 ? 1.1 : prev + 0.3))}
            title="调节视口曝光亮度 (点击循环切换)"
            className="px-1.5 py-1 text-[11px] font-mono rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3 text-yellow-400" />
            <span>{exposureLevel.toFixed(1)}x</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Viewport Display Toggles - Icon Only */}
          <button
            onClick={() => setShowAxes(!showAxes)}
            title={showAxes ? '隐藏三维坐标轴' : '显示三维坐标轴 (Axes)'}
            className={`p-1.5 rounded transition ${
              showAxes ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            title={showWireframe ? '关闭线框模式' : '开启线框渲染 (Wireframe)'}
            className={`p-1.5 rounded transition ${
              showWireframe ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowAngleLabels(!showAngleLabels)}
            title={showAngleLabels ? '隐藏关节数据 HUD' : '显示关节数据 HUD'}
            className={`p-1.5 rounded transition ${
              showAngleLabels ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Camera Presets - Compact */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => applyCameraPreset('perspective')}
              title="3D 透视自由视角"
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition ${
                cameraPreset === 'perspective' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D
            </button>
            <button
              onClick={() => applyCameraPreset('front')}
              title="正前方视角 (Front View)"
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition ${
                cameraPreset === 'front' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              正视
            </button>
            <button
              onClick={() => applyCameraPreset('leftArm')}
              title="左臂特写侧视 (Side View)"
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition ${
                cameraPreset === 'leftArm' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              侧视
            </button>
          </div>

          <button
            onClick={() => applyCameraPreset('perspective')}
            title="复位默认视角 (Reset Camera)"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating HUD Telemetry Overlay */}
      {showAngleLabels && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
          {modelType === 'industrial_6axis' ? (
            <>
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    6轴主关节 (MAIN J1-J3)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">UR5e/KUKA</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">J1 基座回转:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightShoulder?.yaw ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J2 大臂俯仰:</span>
                    <span className="text-cyan-300 font-bold">{(-(joints.rightShoulder?.pitch ?? 0)).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J3 小臂俯仰:</span>
                    <span className="text-amber-400 font-bold">{(-(joints.rightElbow ?? 0)).toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px] hidden md:block">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    腕部动力链 (WRIST J4-J6)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">法兰工具</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">J4 腕部俯仰:</span>
                    <span className="text-cyan-300 font-bold">{(-(joints.rightWrist?.pitch ?? 0)).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J5 腕部偏航:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightWrist?.yaw ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J6 法兰旋转:</span>
                    <span className="text-amber-400 font-bold">{(joints.rightWrist?.roll ?? 0).toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    工具末端 (END EFFECTOR)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">气动抓爪</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">夹持开度:</span>
                    <span className="text-emerald-300 font-bold">25.0 mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">额定负载:</span>
                    <span className="text-cyan-300 font-bold">5.0 kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">工作空间半径:</span>
                    <span className="text-amber-300 font-bold">850 mm</span>
                  </div>
                </div>
              </div>
            </>
          ) : modelType === 'scara_4axis' ? (
            <>
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    水平双关节 (ARM J1/J2)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">SCARA 平面</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">J1 大臂回转:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightShoulder?.yaw ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J2 小臂回转:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightElbow ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">平面跨距:</span>
                    <span className="text-amber-300 font-bold">600 mm</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px] hidden md:block">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    丝杠与旋转 (Z / THETA)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">高速花键</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">J3 丝杠行程:</span>
                    <span className="text-cyan-300 font-bold">{Math.min(180, Math.round(Math.abs(joints.rightShoulder?.pitch ?? 0) * 2.2))} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">J4 Theta 角度:</span>
                    <span className="text-cyan-300 font-bold">{((joints.rightWrist?.yaw ?? 0) * 2).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">最高节拍:</span>
                    <span className="text-emerald-400 font-bold">0.32 s</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    真空吸盘 (VACUUM HEAD)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">SMT 贴片</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">真空负压:</span>
                    <span className="text-emerald-300 font-bold">-85 kPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">重复定位精度:</span>
                    <span className="text-cyan-300 font-bold">±0.015 mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">工件类型:</span>
                    <span className="text-amber-300 font-bold">3C / PCB IC</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    左手臂动力链 (L-ARM)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(armParams?.upperArmLength ?? 0.28).toFixed(2)}m / {(armParams?.forearmLength ?? 0.25).toFixed(2)}m
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">肩关节 Roll:</span>
                    <span className="text-cyan-300 font-bold">{(joints.leftShoulder?.roll ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">肩关节 Pitch:</span>
                    <span className="text-cyan-300 font-bold">{(joints.leftShoulder?.pitch ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">肘关节 Flex:</span>
                    <span className="text-amber-400 font-bold">{(joints.leftElbow ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">腕关节 偏航:</span>
                    <span className="text-cyan-300 font-bold">{(joints.leftWrist?.yaw ?? 0).toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              {/* Center Core & Legs Telemetry */}
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px] hidden md:block">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    躯干与双腿动力链 (CORE & LEGS)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    12 轴全身下肢
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">腰部俯仰/旋转:</span>
                    <span className="text-cyan-300 font-bold">{(joints.spinePitch ?? 0).toFixed(1)}° / {(joints.spineYaw ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">颈部俯仰/偏航:</span>
                    <span className="text-cyan-300 font-bold">{(joints.neckPitch ?? 0).toFixed(1)}° / {(joints.neckYaw ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">双膝屈伸 (L / R):</span>
                    <span className="text-amber-400 font-bold">{(joints.leftKnee ?? 0).toFixed(1)}° / {(joints.rightKnee ?? 0).toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 text-xs shadow-2xl pointer-events-auto max-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    右手臂动力链 (R-ARM)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(armParams?.upperArmLength ?? 0.28).toFixed(2)}m / {(armParams?.forearmLength ?? 0.25).toFixed(2)}m
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">肩关节 Roll:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightShoulder?.roll ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">肩关节 Pitch:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightShoulder?.pitch ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">肘关节 Flex:</span>
                    <span className="text-amber-400 font-bold">{(joints.rightElbow ?? 0).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">腕关节 偏航:</span>
                    <span className="text-cyan-300 font-bold">{(joints.rightWrist?.yaw ?? 0).toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
