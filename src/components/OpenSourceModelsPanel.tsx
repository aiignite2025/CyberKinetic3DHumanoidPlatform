/**
 * Open-Source Humanoid Robot Models Hub & External Model Importer
 * Supports Unitree G1, Stanford Mobile ALOHA, Fourier GR-1, InMoov,
 * plus local GLTF/GLB/OBJ file drag & drop importer.
 */

import React, { useState, useRef } from 'react';
import { RobotModelType, RobotArmParams, OpenSourceRobotMeta } from '../types/robot';
import { OPEN_SOURCE_ROBOTS } from '../data/openSourceRobots';
import {
  Bot,
  ExternalLink,
  Upload,
  CheckCircle2,
  FileCode,
  Layers,
  Wrench,
  Shield,
  Sparkles,
  GitBranch,
  Info,
  ChevronRight,
  Sliders,
  RotateCcw
} from 'lucide-react';

interface OpenSourceModelsPanelProps {
  currentModel: RobotModelType;
  onSelectModel: (model: RobotModelType, recommendedParams: RobotArmParams) => void;
  onCustomModelFileLoaded?: (file: File) => void;
  customFileName?: string | null;
}

export const OpenSourceModelsPanel: React.FC<OpenSourceModelsPanelProps> = ({
  currentModel,
  onSelectModel,
  onCustomModelFileLoaded,
  customFileName,
}) => {
  const [selectedMetaId, setSelectedMetaId] = useState<RobotModelType>(currentModel);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMeta = OPEN_SOURCE_ROBOTS.find(r => r.id === selectedMetaId) || OPEN_SOURCE_ROBOTS[0];

  const handleApplyModel = (meta: OpenSourceRobotMeta) => {
    setSelectedMetaId(meta.id);
    onSelectModel(meta.id, meta.recommendedParams);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onCustomModelFileLoaded?.(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onCustomModelFileLoaded?.(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              开源实用机器人模型库 (Open-Source Models)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              量产级人形机器人 URDF / 遥操作真机构型
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
          5 款主流开源构型
        </span>
      </div>

      {/* Model Cards Carousel / Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
          <span>选择开源真机模型构型:</span>
          <span className="text-[10px] text-slate-500">点击切换 3D 外观与运动学参数</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {OPEN_SOURCE_ROBOTS.map(meta => {
            const isCurrent = currentModel === meta.id;
            return (
              <div
                key={meta.id}
                onClick={() => handleApplyModel(meta)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-start justify-between ${
                  isCurrent
                    ? 'bg-cyan-500/15 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">
                      {meta.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {meta.dof} 自由度
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        已装载
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-cyan-400 font-medium">
                    {meta.alias}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-2">
                    {meta.description}
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyModel(meta);
                    }}
                    title={isCurrent ? `当前已装载: ${meta.name}` : `切换至 ${meta.name} 开源构型`}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isCurrent ? '当前' : '切换'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Model Technical Specs & GitHub Repository */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Specs Card */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              {activeMeta.name} 开源技术参数
            </span>
            <a
              href={activeMeta.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`访问 ${activeMeta.name} 的官方 GitHub 开源仓库`}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 transition"
            >
              <span>GitHub 源码</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">研发机构 / 厂商</span>
              <span className="text-slate-200 font-semibold">{activeMeta.creator}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">开源规范与资产</span>
              <span className="text-cyan-300">{activeMeta.openSourceType}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">推荐大臂/前臂连杆</span>
              <span className="text-amber-400 font-bold">
                {(activeMeta.recommendedParams.upperArmLength * 100).toFixed(0)}cm / {(activeMeta.recommendedParams.forearmLength * 100).toFixed(0)}cm
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">伺服额定角速度</span>
              <span className="text-emerald-400 font-bold">{activeMeta.recommendedParams.maxAngularSpeed} °/s</span>
            </div>
          </div>
        </div>

        {/* Local 3D Model Uploader (GLTF / GLB / OBJ) */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              自定义开源 3D 模型导入 (Custom Mesh)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">.GLTF / .GLB / .OBJ</span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".gltf,.glb,.obj"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
            <div className="text-xs font-semibold text-slate-200">
              {customFileName ? `已加载: ${customFileName}` : '点击或拖拽 3D 机器人文件至此'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              支持从 GitHub ROS 包导出的机器人零件或整机网格
            </div>
          </div>
        </div>

        {/* Developer Practical Notice */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="text-slate-300 font-medium flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            开源实用机器人开发建议 (Robotics Practice Guide)
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            1. <strong>双臂桌面遥操作首选</strong>：推荐选用 <strong>Stanford Mobile ALOHA</strong> 构型，其双臂工作空间（Workspace）与人体工学前臂角度高度契合，示教数据可直接用于 ACT/Diffusion Policy 具身智能策略训练。
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            2. <strong>全身高动态巡检首选</strong>：推荐选用 <strong>Unitree G1</strong> 构型，小惯量关节设计保证了摄像头高速动捕下的零延迟响应。
          </p>
        </div>
      </div>
    </div>
  );
};
