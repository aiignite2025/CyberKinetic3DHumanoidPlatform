/**
 * Humanoid Robot Servo Motor Telemetry & Actuator Monitoring Panel
 */

import React, { useState } from 'react';
import { MotorConfig } from '../types/robot';
import {
  Gauge,
  Thermometer,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface MotorDashboardProps {
  motors: MotorConfig[];
  onZeroAllMotors: () => void;
}

export const MotorDashboard: React.FC<MotorDashboardProps> = ({
  motors,
  onZeroAllMotors,
}) => {
  const [filterGroup, setFilterGroup] = useState<'all' | 'arms' | 'torso_neck' | 'legs'>('all');

  const filteredMotors = motors.filter(m => {
    if (filterGroup === 'all') return true;
    if (filterGroup === 'arms') return m.id.startsWith('L_M') || m.id.startsWith('R_M');
    if (filterGroup === 'torso_neck') return m.id.startsWith('C_M');
    if (filterGroup === 'legs') return m.id.startsWith('L_L') || m.id.startsWith('R_L');
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              全身关节与电机动力学监控
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                {motors.length} 轴
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              双臂(12) + 躯干与头颈(6) + 双腿下肢(8)
            </div>
          </div>
        </div>

        <button
          onClick={onZeroAllMotors}
          title="一键将全部 26 轴伺服电机位置与编码器归零标定"
          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>归零</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-950/30 flex gap-1">
        {[
          { id: 'all', label: '全部', count: motors.length },
          { id: 'arms', label: '双臂', count: 12 },
          { id: 'torso_neck', label: '腰颈', count: 6 },
          { id: 'legs', label: '双腿', count: 8 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterGroup(tab.id as any)}
            title={`筛选${tab.label}驱动关节 (${tab.count} 轴)`}
            className={`flex-1 py-1 text-xs font-medium rounded transition flex items-center justify-center gap-1 ${
              filterGroup === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] opacity-75 font-mono">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Motor List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredMotors.map(motor => {
          // Calculate percentage in range [minAngle, maxAngle]
          const currentAngle = motor.currentAngle ?? 0;
          const targetAngle = motor.targetAngle ?? 0;
          const range = Math.max(1, motor.maxAngle - motor.minAngle);
          const pct = Math.max(0, Math.min(100, ((currentAngle - motor.minAngle) / range) * 100));

          return (
            <div
              key={motor.id}
              className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-slate-700 transition"
            >
              {/* Motor Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    motor.side === 'left'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : motor.side === 'right'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {motor.id}
                  </span>
                  <span className="text-xs font-medium text-slate-200">
                    {motor.name}
                  </span>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {motor.status === 'warning' ? (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      负载过高
                    </span>
                  ) : motor.status === 'active' ? (
                    <span className="text-cyan-400 flex items-center gap-0.5">
                      <Zap className="w-3 h-3" />
                      运转中
                    </span>
                  ) : (
                    <span className="text-slate-400">就绪</span>
                  )}
                </div>
              </div>

              {/* Progress Bar & Angle Value */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">当前角度 / 目标:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-cyan-300">
                      {currentAngle.toFixed(1)}°
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      / {targetAngle.toFixed(1)}°
                    </span>
                  </div>
                </div>

                {/* Visual Angle Track */}
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      motor.side === 'left'
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                        : motor.side === 'right'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{motor.minAngle}°</span>
                  <span>{motor.maxAngle}°</span>
                </div>
              </div>

              {/* Telemetry Metrics: Torque, Temp, Voltage */}
              <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/60 text-[10px] font-mono">
                <div className="bg-slate-900 px-2 py-1 rounded flex items-center justify-between">
                  <span className="text-slate-500">转矩:</span>
                  <span className="text-slate-200 font-semibold">{(motor.torque ?? 0).toFixed(2)} Nm</span>
                </div>
                <div className="bg-slate-900 px-2 py-1 rounded flex items-center justify-between">
                  <span className="text-slate-500">温度:</span>
                  <span className={`${(motor.temperature ?? 0) > 50 ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                    {(motor.temperature ?? 0).toFixed(1)}℃
                  </span>
                </div>
                <div className="bg-slate-900 px-2 py-1 rounded flex items-center justify-between">
                  <span className="text-slate-500">电压:</span>
                  <span className="text-slate-200">{(motor.voltage ?? 24).toFixed(1)} V</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
