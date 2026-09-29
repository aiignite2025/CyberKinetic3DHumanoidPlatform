/**
 * Practical Actions Library & Real-World Motion Task Benchmark Panel
 */

import React, { useState } from 'react';
import { PracticalActionType, MotorConfig, ProcessedJoints } from '../types/robot';
import { PRACTICAL_ACTIONS } from '../data/openSourceRobots';
import {
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  Zap,
  Radio,
  FileCheck,
  Send,
  Boxes,
  HandMetal,
  ShieldAlert,
  Flame
} from 'lucide-react';

interface PracticalActionsPanelProps {
  currentAction: PracticalActionType;
  onSelectAction: (action: PracticalActionType) => void;
  motors: MotorConfig[];
  onTriggerMqttStream?: () => void;
  mqttConnected: boolean;
}

export const PracticalActionsPanel: React.FC<PracticalActionsPanelProps> = ({
  currentAction,
  onSelectAction,
  motors,
  onTriggerMqttStream,
  mqttConnected,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'industrial' | 'teleop' | 'service' | 'safety' | 'benchmark'>('all');

  const selectedMeta = PRACTICAL_ACTIONS.find(a => a.id === currentAction) || PRACTICAL_ACTIONS[0];
  const filteredActions = PRACTICAL_ACTIONS.filter(
    a => filterCategory === 'all' || a.category === filterCategory
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              具身实例动作库 (Practical Action Benchmark)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              工业双臂作业 / ALOHA 精细遥操作 / 迎宾与安全基准
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/80">
          {PRACTICAL_ACTIONS.length} 项标准任务
        </span>
      </div>

      {/* Category Tabs */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/30 flex gap-1 overflow-x-auto text-[11px]">
        {[
          { id: 'all', label: '全部', title: '全部 12 组标准任务' },
          { id: 'industrial', label: '搬运', title: '工业物料双臂抓取与搬运' },
          { id: 'teleop', label: '遥操作', title: 'Mobile ALOHA 桌面精细遥操作装配' },
          { id: 'service', label: '服务', title: '商用迎宾送物与桌面清洁' },
          { id: 'safety', label: '安全', title: '交叉双臂急停与安全防御' },
          { id: 'benchmark', label: '基准', title: '全自由度多轴动力学与太极基准' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id as any)}
            title={cat.title}
            className={`px-2 py-1 rounded transition whitespace-nowrap ${
              filterCategory === cat.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active Action Highlight Banner */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-300">
              当前仿真任务: {selectedMeta.name}
            </span>
          </div>

          {mqttConnected && (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              MQTT 同步中
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/90 p-2 rounded border border-slate-800">
          {selectedMeta.description}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
            <span className="text-slate-500 block">应用场景:</span>
            <span className="text-slate-200">{selectedMeta.useCase}</span>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
            <span className="text-slate-500 block">核心驱动关节:</span>
            <span className="text-cyan-300">{selectedMeta.keyJoints.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Action Selection Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400">
          选择执行实例动作:
        </div>

        {filteredActions.map(action => {
          const isCurrent = currentAction === action.id;
          return (
            <div
              key={action.id}
              onClick={() => onSelectAction(action.id)}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-start justify-between ${
                isCurrent
                  ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    {action.id === 'pick_place' && <Boxes className="w-3.5 h-3.5 text-cyan-400" />}
                    {action.id === 'peg_in_hole' && <HandMetal className="w-3.5 h-3.5 text-indigo-400" />}
                    {action.id === 'estop_shield' && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                    {action.id === 'taichi' && <Flame className="w-3.5 h-3.5 text-emerald-400" />}
                    {action.name}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {action.description}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAction(action.id);
                }}
                title={isCurrent ? `当前正在演练: ${action.name}` : `点击执行: ${action.name}`}
                className={`px-2 py-1 rounded text-xs font-semibold transition shrink-0 flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isCurrent ? '演练中' : '执行'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
