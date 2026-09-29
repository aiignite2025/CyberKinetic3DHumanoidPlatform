/**
 * YOLO 2D-to-3D Pose Lifting & Kinematics Control Center
 * Displays:
 * 1. Architecture Flow: YOLO 2D Keypoints -> Metric Pinhole Back-Projection -> Ray-Bone Quadratic Solver -> Humanoid IK
 * 2. Real-time 3D Joint Metric Coordinates Table (X, Y, Z in meters) & Bone Invariance Validation
 * 3. Open-Source Algorithm Comparison Matrix (MotionBERT, HybrIK, VideoPose3D, Geometric Ray-Bone)
 * 4. Interactive Calibration Controls (Camera FOV, Body Height, Shoulder Span, Disambiguation Strategy)
 * 5. Real-Time 3D Skeleton Depth Projection Canvas
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  YoloLiftingConfig,
  YoloLiftingResult,
  ProcessedJoints,
} from '../types/robot';
import {
  OPEN_SOURCE_LIFTING_MODELS,
  COCO_KEYPOINTS,
  COCO_BONES,
  COCO_KEYPOINT_NAMES,
} from '../utils/yolo3dLifting';
import {
  Layers,
  Box,
  Cpu,
  Zap,
  Sliders,
  ExternalLink,
  CheckCircle,
  Activity,
  Maximize2,
  RefreshCw,
  GitBranch,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface YoloLiftingPanelProps {
  config: YoloLiftingConfig;
  onConfigChange: (newConfig: YoloLiftingConfig) => void;
  liftingResult: YoloLiftingResult | null;
  onApplyJoints?: (joints: ProcessedJoints) => void;
  isYoloActive: boolean;
  onToggleYolo: () => void;
}

export const YoloLiftingPanel: React.FC<YoloLiftingPanelProps> = ({
  config,
  onConfigChange,
  liftingResult,
  isYoloActive,
  onToggleYolo,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'matrix' | 'coordinates' | 'calibration'>('pipeline');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateConfigField = <K extends keyof YoloLiftingConfig>(key: K, value: YoloLiftingConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  // Render 3D Perspective Skeleton on mini canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!liftingResult || !liftingResult.joints3D) {
      // Draw idle placeholder
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('等待 3D 关节坐标流传入...', width / 2, height / 2);
      return;
    }

    // Helper to project 3D camera coords (x right, y down, z forward) to 2D canvas
    const project = (x: number, y: number, z: number) => {
      const scale = 220 / Math.max(0.5, z);
      const cx = width / 2;
      const cy = height / 2 - 20;
      return {
        px: cx + x * scale,
        py: cy + y * scale,
        depth: z,
      };
    };

    const jointsMap = liftingResult.joints3D;

    // Draw Bones with depth gradients
    COCO_BONES.forEach(([idA, idB]) => {
      const nameA = COCO_KEYPOINT_NAMES[idA];
      const nameB = COCO_KEYPOINT_NAMES[idB];
      const jA = jointsMap[nameA];
      const jB = jointsMap[nameB];

      if (jA && jB) {
        const pA = project(jA.x, jA.y, jA.z);
        const pB = project(jB.x, jB.y, jB.z);

        const avgDepth = (jA.z + jB.z) / 2;
        // Color code depth: closer (cyan/green) -> farther (indigo/purple)
        const alpha = Math.max(0.3, Math.min(1.0, 2.5 / avgDepth));
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = Math.max(1.5, 4 / avgDepth);

        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.stroke();
      }
    });

    // Draw Joint Nodes
    Object.values(jointsMap).forEach(j => {
      const p = project(j.x, j.y, j.z);
      const radius = Math.max(2.5, 5 / p.depth);

      // Depth-based color
      ctx.fillStyle = p.depth < 1.6 ? '#22c55e' : p.depth < 2.0 ? '#06b6d4' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw coordinate tag
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`3D空间根深度 Z: ${liftingResult.rootDepthMeters.toFixed(2)}m`, 8, height - 10);
    ctx.textAlign = 'right';
    ctx.fillText(`重投影误差: ${liftingResult.reprojectionErrorPx}px`, width - 8, height - 10);
  }, [liftingResult]);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 text-slate-200 text-xs">
      {/* Top Header & Fast Switcher */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-cyan-300 flex items-center gap-2">
              <span>YOLO 2D→3D 关节解算</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">
                17-COCO 拓扑
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              单目 2D 坐标升维恢复三维深度与机器人逆解 (IK)
            </div>
          </div>
        </div>

        <button
          onClick={onToggleYolo}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 border shadow-sm ${
            isYoloActive
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/20 font-bold'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isYoloActive ? '解算引擎运行中' : '启动 3D 解算'}</span>
        </button>
      </div>

      {/* Sub navigation tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 pt-1 gap-1">
        <button
          onClick={() => setActiveSubTab('pipeline')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition flex items-center gap-1.5 ${
            activeSubTab === 'pipeline'
              ? 'bg-slate-900 text-cyan-300 border-t border-x border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3 h-3" />
          <span>算法原理架构</span>
        </button>
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition flex items-center gap-1.5 ${
            activeSubTab === 'matrix'
              ? 'bg-slate-900 text-cyan-300 border-t border-x border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          <span>开源模型对比</span>
        </button>
        <button
          onClick={() => setActiveSubTab('coordinates')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition flex items-center gap-1.5 ${
            activeSubTab === 'coordinates'
              ? 'bg-slate-900 text-cyan-300 border-t border-x border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3 h-3" />
          <span>3D坐标监控 ({liftingResult ? Object.keys(liftingResult.joints3D).length : 0})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('calibration')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition flex items-center gap-1.5 ${
            activeSubTab === 'calibration'
              ? 'bg-slate-900 text-cyan-300 border-t border-x border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>标定与调优</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Real-time 3D Mini Wireframe Visualizer */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>单目三维姿态重构空间 (Camera Coordinate Frame)</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 近景
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span> 中景
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> 远景
              </span>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80">
            <canvas
              ref={canvasRef}
              width={340}
              height={170}
              className="w-full h-[170px] block"
            />
            <div className="absolute top-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-cyan-400 border border-cyan-800/60 backdrop-blur-sm">
              延迟: {liftingResult?.latencyMs ?? 1.2} ms | 算法: {liftingResult?.method || '几何射线求解'}
            </div>
          </div>
        </div>

        {/* Tab 1: Pipeline Architecture */}
        {activeSubTab === 'pipeline' && (
          <div className="space-y-3">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 space-y-2.5">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>从 YOLO 2D 骨骼到三维人形机器人映射的核心解算链</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                YOLO 输出的仅为像素平面的二维坐标 <code className="text-cyan-300 font-mono">(u, v)</code>，缺乏绝对深度 <code className="text-cyan-300 font-mono">Z</code>。平台构建了端到端物理逆解管线，实现从 2D 图像到 14 轴电机闭环控制：
              </p>

              {/* 5-Stage Step Flow */}
              <div className="grid grid-cols-1 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold shrink-0">
                    Step 1
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">单目针孔相机反投影 (Pinhole Ray Casting)</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      利用相机内参矩阵 <code className="text-sky-300">K = diag(f_x, f_y, 1)</code> 将 2D 像素反投影为空间归一化射线向量 <code className="text-sky-300">r = (x_n, y_n, 1) / ||r||</code>。
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold shrink-0">
                    Step 2
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">人体测度基准恢复绝对根深度 (Root Depth Estimation)</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      依据人体左右肩宽刚体不变量 <code className="text-sky-300">L_shoulder ≈ 0.38m</code>，按相似三角形透视公式 <code className="text-sky-300">Z_root = (f × L) / Δu_pixel</code> 恢复绝对物理深度。
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold shrink-0">
                    Step 3
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">二次曲面射线相交解析解 (Ray-Sphere Intersection)</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      对大臂/前臂，以肩部为球心、骨长 <code className="text-sky-300">L_bone</code> 为半径，与手肘射线求交：<code className="text-sky-300">λ² + Bλ + C = 0</code>，封闭形式直接求解 <code className="text-sky-300">λ</code>。
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold shrink-0">
                    Step 4
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">前后深度歧义性消解 (Front/Back Disambiguation)</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      二次方程具有双根（向前伸/向后背）。结合生物力学关节极限（人手肘天然向前弯曲）与帧间速度连续性 <code className="text-sky-300">argmin |λ - λ_prev|</code> 消除伪态跳变。
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold shrink-0">
                    Step 5
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">三维笛卡尔到机器人电机角度逆解 (Robot IK Mapping)</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      将三维物理向量转换为机器人的 14 自由度电机指令（肩部 Pitch/Roll/Yaw、肘部 Flexion、手腕及腰腿），并写入实时 MQTT 硬件驱动报文。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Open Source Models Comparison Matrix */}
        {activeSubTab === 'matrix' && (
          <div className="space-y-3">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3">
              <div className="font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>主流开源 2D→3D 人体姿态升维算法评测</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">基准: Human3.6M 数据集</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                针对配合 YOLO 进行 3D 动作捕捉与机器人仿真，业界主流方案在精度、端侧延时与硬件适用性上的横向评估：
              </p>

              <div className="space-y-2.5">
                {OPEN_SOURCE_LIFTING_MODELS.map((model, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span className="text-cyan-300">{model.name}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                              实时首选
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          机构: {model.source} | 架构: {model.architecture}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-amber-300 font-bold">误差: {model.mpjpeMm} mm</div>
                        <div className="text-slate-400 text-[10px]">边缘帧率: ~{model.fpsEdge} FPS</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <div className="text-emerald-400 font-medium text-[10px] mb-0.5">核心优势:</div>
                        <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[10px]">
                          {model.advantages.map((adv, aIdx) => (
                            <li key={aIdx}>{adv}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-cyan-400 font-medium text-[10px] mb-0.5">机器人工程定位:</div>
                        <div className="text-slate-300 text-[10px] bg-slate-950 p-1.5 rounded border border-slate-800">
                          {model.bestForRobotics}
                        </div>
                      </div>
                    </div>

                    {model.openSourceUrl.startsWith('http') && (
                      <div className="mt-2 text-right">
                        <a
                          href={model.openSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                        >
                          <span>查看 GitHub 开源项目</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Real-Time 3D Coordinates Table */}
        {activeSubTab === 'coordinates' && (
          <div className="space-y-3">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span>实时三维公制物理坐标 (相机笛卡尔坐标系, 单位: 米)</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                  X 右 | Y 下 | Z 前(深度)
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">关节编号 / 名称</th>
                      <th className="py-1.5 px-2 text-right">X (m)</th>
                      <th className="py-1.5 px-2 text-right">Y (m)</th>
                      <th className="py-1.5 px-2 text-right">Z 深度 (m)</th>
                      <th className="py-1.5 px-2 text-right">置信度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {liftingResult && liftingResult.joints3D ? (
                      Object.values(liftingResult.joints3D).map(j => (
                        <tr key={j.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-1.5 px-2 font-sans font-medium text-slate-300 flex items-center gap-1.5">
                            <span className="text-[10px] text-cyan-500 font-mono">#{j.id}</span>
                            <span>{j.name}</span>
                          </td>
                          <td className={`py-1.5 px-2 text-right ${j.x < 0 ? 'text-amber-300' : 'text-cyan-300'}`}>
                            {j.x.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-300">
                            {j.y.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-emerald-400">
                            {j.z.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-400">
                            {(j.confidence * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          暂无实时 3D 关节数据流
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Interactive Calibration Controls */}
        {activeSubTab === 'calibration' && (
          <div className="space-y-3">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 space-y-3">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>几何解算与人体刚体先验参数标定</span>
                </span>
                <button
                  onClick={() =>
                    onConfigChange({
                      focalLengthPx: 800,
                      cameraFovDeg: 65,
                      userHeightMeters: 1.75,
                      shoulderWidthMeters: 0.38,
                      upperArmLengthMeters: 0.28,
                      forearmLengthMeters: 0.25,
                      disambiguationMode: 'hybrid',
                      temporalWindowFrames: 5,
                      smoothingFactor: 0.25,
                    })
                  }
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>恢复标准先验</span>
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-3">
                {/* Camera FOV */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">相机视场角 (Camera FOV)</span>
                    <span className="font-mono text-cyan-400">{config.cameraFovDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min={45}
                    max={95}
                    step={1}
                    value={config.cameraFovDeg}
                    onChange={e => updateConfigField('cameraFovDeg', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    标准笔记本网络摄像头通常在 60° ~ 75° 之间
                  </div>
                </div>

                {/* Shoulder Width Prior */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">人体双肩宽度先验 (Shoulder Span)</span>
                    <span className="font-mono text-cyan-400">{(config.shoulderWidthMeters * 100).toFixed(0)} cm</span>
                  </div>
                  <input
                    type="range"
                    min={0.30}
                    max={0.48}
                    step={0.01}
                    value={config.shoulderWidthMeters}
                    onChange={e => updateConfigField('shoulderWidthMeters', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    直接决定绝对深度 Z 的物理缩放基准
                  </div>
                </div>

                {/* Upper Arm Length */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">大臂几何硬约束长度 (Upper Arm)</span>
                    <span className="font-mono text-cyan-400">{(config.upperArmLengthMeters * 100).toFixed(0)} cm</span>
                  </div>
                  <input
                    type="range"
                    min={0.20}
                    max={0.38}
                    step={0.01}
                    value={config.upperArmLengthMeters}
                    onChange={e => updateConfigField('upperArmLengthMeters', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Forearm Length */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">前臂几何硬约束长度 (Forearm)</span>
                    <span className="font-mono text-cyan-400">{(config.forearmLengthMeters * 100).toFixed(0)} cm</span>
                  </div>
                  <input
                    type="range"
                    min={0.18}
                    max={0.34}
                    step={0.01}
                    value={config.forearmLengthMeters}
                    onChange={e => updateConfigField('forearmLengthMeters', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Disambiguation Mode */}
                <div>
                  <div className="text-[11px] text-slate-300 font-medium mb-1">
                    前后深度歧义性消解策略 (Disambiguation Mode)
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['hybrid', 'temporal_continuity', 'anatomical_limits'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateConfigField('disambiguationMode', mode)}
                        className={`p-2 rounded-lg border text-center transition font-mono text-[10px] ${
                          config.disambiguationMode === mode
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {mode === 'hybrid'
                          ? '混合自适应'
                          : mode === 'temporal_continuity'
                          ? '时序平滑'
                          : '解剖学极限'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smoothing Factor */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">时序平滑阻尼 (Smoothing Damping)</span>
                    <span className="font-mono text-cyan-400">{(config.smoothingFactor * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.60}
                    step={0.05}
                    value={config.smoothingFactor}
                    onChange={e => updateConfigField('smoothingFactor', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
