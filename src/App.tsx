/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ProcessedJoints,
  RobotArmParams,
  MotorConfig,
  TrackingAlgorithm,
  PoseLandmark3D,
  MqttConfig,
  TelemetryPacket,
  RobotModelType,
  PracticalActionType,
} from './types/robot';
import { calculateJointAngles, createDefaultMotors, updateMotorsWithJoints } from './utils/kinematics';
import { RobotMqttService } from './utils/mqttClient';
import { OPEN_SOURCE_ROBOTS, PRACTICAL_ACTIONS } from './data/openSourceRobots';
import { ThreeRobotViewer } from './components/ThreeRobotViewer';
import { CameraTracker } from './components/CameraTracker';
import { OpenSourceModelsPanel } from './components/OpenSourceModelsPanel';
import { PracticalActionsPanel } from './components/PracticalActionsPanel';
import { MotorDashboard } from './components/MotorDashboard';
import { RobotParamsPanel } from './components/RobotParamsPanel';
import { MqttPanel } from './components/MqttPanel';
import { MotionRecorder } from './components/MotionRecorder';
import {
  Bot,
  Activity,
  Gauge,
  Sliders,
  Radio,
  Compass,
  Cpu,
  Zap,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Sun
} from 'lucide-react';

export default function App() {
  // 1. Open-Source Robot Archetype
  const [currentModel, setCurrentModel] = useState<RobotModelType>('unitree_g1');
  const [customModelFile, setCustomModelFile] = useState<File | null>(null);

  // 2. Practical Robotic Action
  const [currentAction, setCurrentAction] = useState<PracticalActionType>('pick_place');

  // 3. Robot Arm Mechanical Parameters (Defaults to Unitree G1)
  const [armParams, setArmParams] = useState<RobotArmParams>(() => {
    const meta = OPEN_SOURCE_ROBOTS.find(r => r.id === 'unitree_g1');
    return meta ? meta.recommendedParams : {
      upperArmLength: 0.28,
      forearmLength: 0.25,
      handLength: 0.15,
      shoulderWidth: 0.38,
      torsoHeight: 0.52,
      gearRatio: 45,
      maxAngularSpeed: 200,
      dampingFactor: 1.0,
      controlAlgorithm: 'critically_damped',
      maxAcceleration: 360,
      springStiffness: 9.0,
    };
  });

  // 4. Kinematic & Joint States
  const [joints, setJoints] = useState<ProcessedJoints>({
    leftShoulder: { pitch: 0, roll: 15, yaw: 0 },
    leftElbow: 20,
    leftWrist: { pitch: 0, roll: 0, yaw: 0 },
    rightShoulder: { pitch: 0, roll: 15, yaw: 0 },
    rightElbow: 20,
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
  });

  // 5. Motors State
  const [motors, setMotors] = useState<MotorConfig[]>(() => createDefaultMotors());

  // 6. Algorithm & Vision Tracking
  const [trackingAlgorithm, setTrackingAlgorithm] = useState<TrackingAlgorithm>('one_euro');
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [visionFps, setVisionFps] = useState<number>(30);

  // 7. Right Sidebar Tab Navigation
  const [activeTab, setActiveTab] = useState<'models' | 'actions' | 'motors' | 'params' | 'mqtt' | 'recorder'>('models');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  // 8. Phase 2 MQTT Configuration & Live Service
  const [mqttConfig, setMqttConfig] = useState<MqttConfig>({
    brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
    port: 8084,
    clientId: `humanoid_twin_${Math.floor(Math.random() * 10000)}`,
    topicPrefix: 'robot/teleop/v1',
    qos: 0,
    rateHz: 30,
    format: 'json',
    connected: false,
    publishedCount: 0,
    lastLatencyMs: 2,
  });
  const [mqttStatusMsg, setMqttStatusMsg] = useState<string>('就绪，可连接外部 MQTT Broker');
  const [isMqttSimulated, setIsMqttSimulated] = useState<boolean>(false);
  const [recentPackets, setRecentPackets] = useState<{
    timestamp: number;
    seq: number;
    payload: string;
    bytes: number;
  }[]>([]);

  const mqttServiceRef = useRef<RobotMqttService | null>(null);
  const sequenceIdRef = useRef<number>(0);
  const lastPacketTimeRef = useRef<number>(0);

  // Initialize MQTT Service
  useEffect(() => {
    const service = new RobotMqttService(
      mqttConfig,
      (connected, simulated, message) => {
        setMqttConfig(prev => ({ ...prev, connected }));
        setIsMqttSimulated(simulated);
        setMqttStatusMsg(message);
      },
      (packet, payloadStr, bytes) => {
        setRecentPackets(prev => [
          {
            timestamp: packet.timestamp,
            seq: packet.sequenceId,
            payload: payloadStr,
            bytes,
          },
          ...prev.slice(0, 19),
        ]);
      }
    );

    mqttServiceRef.current = service;

    return () => {
      service.disconnect();
    };
  }, []);

  // Update MQTT config in service when state changes
  useEffect(() => {
    mqttServiceRef.current?.updateConfig(mqttConfig);
  }, [mqttConfig]);

  // Handle landmarks detected from camera
  const handleLandmarksDetected = useCallback(
    (landmarks: PoseLandmark3D[], algorithm: TrackingAlgorithm, isMirrored?: boolean) => {
      setIsTrackingActive(true);

      const solvedJoints = calculateJointAngles(landmarks, !!isMirrored);
      setJoints(solvedJoints);

      setMotors(prevMotors => {
        const updated = updateMotorsWithJoints(prevMotors, solvedJoints, armParams, 0.033);

        if (mqttConfig.connected && mqttServiceRef.current) {
          const now = performance.now();
          const intervalMs = 1000 / mqttConfig.rateHz;

          if (now - lastPacketTimeRef.current >= intervalMs) {
            lastPacketTimeRef.current = now;
            sequenceIdRef.current++;

            const packet: TelemetryPacket = {
              timestamp: Date.now(),
              sequenceId: sequenceIdRef.current,
              robotId: currentModel.toUpperCase(),
              algorithm,
              motors: updated.map(m => ({
                id: m.id,
                angle: m.currentAngle,
                target: m.targetAngle,
                torque: m.torque,
              })),
              params: {
                armUpper: armParams.upperArmLength,
                armFore: armParams.forearmLength,
              },
              metrics: {
                fps: visionFps,
                latencyMs: mqttConfig.lastLatencyMs,
              },
            };

            mqttServiceRef.current.publishTelemetry(packet);
          }
        }

        return updated;
      });
    },
    [armParams, mqttConfig, visionFps, currentModel]
  );

  // Switch Open-Source Robot Model
  const handleSelectModel = (model: RobotModelType, recommendedParams: RobotArmParams) => {
    setCurrentModel(model);
    setArmParams(recommendedParams);
  };

  // Switch Practical Action
  const handleSelectAction = (act: PracticalActionType) => {
    setCurrentAction(act);
  };

  // Manual motor zero calibration
  const handleZeroAllMotors = useCallback(() => {
    const zeroJoints: ProcessedJoints = {
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
    setJoints(zeroJoints);
    setMotors(prev =>
      prev.map(m => ({
        ...m,
        targetAngle: 0,
        currentAngle: 0,
        velocity: 0,
        torque: 0.2,
      }))
    );
  }, []);

  const handleMqttConnect = async () => {
    if (mqttServiceRef.current) {
      await mqttServiceRef.current.connect();
    }
  };

  const handleMqttDisconnect = () => {
    if (mqttServiceRef.current) {
      mqttServiceRef.current.disconnect();
    }
  };

  const handleSendPing = () => {
    if (!mqttServiceRef.current) return;
    sequenceIdRef.current++;
    const pingPacket: TelemetryPacket = {
      timestamp: Date.now(),
      sequenceId: sequenceIdRef.current,
      robotId: currentModel.toUpperCase(),
      algorithm: trackingAlgorithm,
      motors: motors.map(m => ({
        id: m.id,
        angle: m.currentAngle,
        target: m.targetAngle,
        torque: m.torque,
      })),
      params: {
        armUpper: armParams.upperArmLength,
        armFore: armParams.forearmLength,
      },
      metrics: {
        fps: visionFps,
        latencyMs: 1.5,
      },
    };
    mqttServiceRef.current.publishTelemetry(pingPacket);
  };

  const activeMeta = OPEN_SOURCE_ROBOTS.find(r => r.id === currentModel) || OPEN_SOURCE_ROBOTS[0];
  const activeActionMeta = PRACTICAL_ACTIONS.find(a => a.id === currentAction) || PRACTICAL_ACTIONS[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Cyber Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 border border-cyan-400/40">
            <Bot className="w-5 h-5 text-slate-950 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-white">
                CYBERKINETIC 3D
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                {activeMeta.alias.split(' ')[0]}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>人形机器人动作捕捉仿真平台</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono hidden sm:inline">
                当前任务: <span className="text-amber-300 font-bold">{activeActionMeta.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center Quick Chips */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">机型:</span>
            <span className="font-semibold text-cyan-300">{activeMeta.name}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">动作:</span>
            <span className="font-semibold text-amber-300">{activeActionMeta.name}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">MQTT:</span>
            <span className={`font-semibold ${mqttConfig.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
              {mqttConfig.connected ? (isMqttSimulated ? '硬件仿真' : '已桥接') : '待机'}
            </span>
          </div>
        </div>

        {/* Right Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('models');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'models' && !isRightPanelCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>开源机型</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('actions');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'actions' && !isRightPanelCollapsed
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>实例动作</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('motors');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'motors' && !isRightPanelCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">电机监控</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('params');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'params' && !isRightPanelCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">臂长结构</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mqtt');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'mqtt' && !isRightPanelCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">二期MQTT</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recorder');
              setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'recorder' && !isRightPanelCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">示教录制</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Vision & Camera Skeletal Tracker */}
        <div
          className={`transition-all duration-300 flex flex-col z-10 shrink-0 ${
            isLeftPanelCollapsed ? 'w-0 overflow-hidden' : 'w-[370px] max-w-[42vw]'
          }`}
        >
          <CameraTracker
            onLandmarksDetected={handleLandmarksDetected}
            selectedAlgorithm={trackingAlgorithm}
            onAlgorithmChange={setTrackingAlgorithm}
            activePracticalAction={currentAction}
            onSelectAction={handleSelectAction}
          />
        </div>

        {/* Left Panel Toggle Collapse Button */}
        <button
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          className="absolute top-20 z-20 left-0 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 p-1 rounded-r-md transition shadow-md"
          style={{ left: isLeftPanelCollapsed ? 0 : '370px' }}
          title={isLeftPanelCollapsed ? '展开动作视觉面板' : '折叠面板'}
        >
          {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Center Column: 3D Three.js Humanoid Robot Viewport */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
          <ThreeRobotViewer
            joints={joints}
            motors={motors}
            armParams={armParams}
            fps={visionFps}
            isTracking={isTrackingActive}
            modelType={currentModel}
            onModelTypeChange={model => {
              const meta = OPEN_SOURCE_ROBOTS.find(r => r.id === model);
              if (meta) handleSelectModel(model, meta.recommendedParams);
            }}
            customFile={customModelFile}
          />
        </main>

        {/* Right Panel Toggle Collapse Button */}
        <button
          onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
          className="absolute top-20 z-20 right-0 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 p-1 rounded-l-md transition shadow-md"
          style={{ right: isRightPanelCollapsed ? 0 : '390px' }}
          title={isRightPanelCollapsed ? '展开控制面板' : '折叠面板'}
        >
          {isRightPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Right Column: Tabbed Telemetry & Hardware Control */}
        <div
          className={`transition-all duration-300 flex flex-col z-10 shrink-0 ${
            isRightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-[390px] max-w-[45vw]'
          }`}
        >
          {activeTab === 'models' && (
            <OpenSourceModelsPanel
              currentModel={currentModel}
              onSelectModel={handleSelectModel}
              onCustomModelFileLoaded={file => setCustomModelFile(file)}
              customFileName={customModelFile?.name}
            />
          )}

          {activeTab === 'actions' && (
            <PracticalActionsPanel
              currentAction={currentAction}
              onSelectAction={handleSelectAction}
              motors={motors}
              mqttConnected={mqttConfig.connected}
              onTriggerMqttStream={handleSendPing}
            />
          )}

          {activeTab === 'motors' && (
            <MotorDashboard
              motors={motors}
              onZeroAllMotors={handleZeroAllMotors}
            />
          )}

          {activeTab === 'params' && (
            <RobotParamsPanel
              params={armParams}
              onChange={setArmParams}
            />
          )}

          {activeTab === 'mqtt' && (
            <MqttPanel
              config={mqttConfig}
              onUpdateConfig={patch => setMqttConfig(prev => ({ ...prev, ...patch }))}
              onConnect={handleMqttConnect}
              onDisconnect={handleMqttDisconnect}
              recentPackets={recentPackets}
              onSendPing={handleSendPing}
              statusMessage={mqttStatusMsg}
              isSimulated={isMqttSimulated}
            />
          )}

          {activeTab === 'recorder' && (
            <MotionRecorder
              currentMotors={motors}
              currentJoints={joints}
              onApplyPlaybackJoints={setJoints}
              onCalibrateZero={handleZeroAllMotors}
            />
          )}
        </div>
      </div>

      {/* Bottom Global Telemetry Status Bar */}
      <footer className="h-7 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">当前开源模型:</span>
            <span className="text-cyan-400 font-bold">{activeMeta.name}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">|</span>
            <span>连杆尺寸:</span>
            <span className="text-slate-200">
              L1={(armParams.upperArmLength * 100).toFixed(0)}cm, L2={(armParams.forearmLength * 100).toFixed(0)}cm
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-500">|</span>
            <span>执行任务:</span>
            <span className="text-amber-400 font-medium">{activeActionMeta.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">MQTT:</span>
            <span className={`${mqttConfig.connected ? 'text-emerald-400' : 'text-slate-500'}`}>
              {mqttConfig.connected ? `发布中 (${mqttConfig.rateHz}Hz)` : '就绪待机'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>CyberKinetic 具身智能物理数字孪生引擎</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
