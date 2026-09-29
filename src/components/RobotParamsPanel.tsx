/**
 * Robot Arm Geometric Parameters & Mechanical Kinematics Configuration
 */

import React from 'react';
import { RobotArmParams, MotionControlAlgorithm } from '../types/robot';
import { Sliders, RotateCcw, Wrench, Shield, Check, Cpu, Waves, Gauge, Zap, Activity } from 'lucide-react';

interface RobotParamsPanelProps {
  params: RobotArmParams;
  onChange: (newParams: RobotArmParams) => void;
}

export const RobotParamsPanel: React.FC<RobotParamsPanelProps> = ({
  params,
  onChange,
}) => {
  const updateField = <K extends keyof RobotArmParams>(key: K, value: RobotArmParams[K]) => {
    onChange({
      ...params,
      [key]: value,
    });
  };

  const applyPreset = (preset: 'standard' | 'compact' | 'industrial') => {
    switch (preset) {
      case 'standard':
        onChange({
          upperArmLength: 0.30,
          forearmLength: 0.28,
          handLength: 0.16,
          shoulderWidth: 0.42,
          torsoHeight: 0.55,
          gearRatio: 50,
          maxAngularSpeed: 180,
          dampingFactor: 1.0,
          controlAlgorithm: 'critically_damped',
          maxAcceleration: 360,
          springStiffness: 9.0,
        });
        break;
      case 'compact':
        onChange({
          upperArmLength: 0.22,
          forearmLength: 0.20,
          handLength: 0.12,
          shoulderWidth: 0.34,
          torsoHeight: 0.45,
          gearRatio: 30,
          maxAngularSpeed: 220,
          dampingFactor: 1.0,
          controlAlgorithm: 'critically_damped',
          maxAcceleration: 400,
          springStiffness: 10.0,
        });
        break;
      case 'industrial':
        onChange({
          upperArmLength: 0.40,
          forearmLength: 0.36,
          handLength: 0.18,
          shoulderWidth: 0.50,
          torsoHeight: 0.65,
          gearRatio: 100,
          maxAngularSpeed: 120,
          dampingFactor: 1.2,
          controlAlgorithm: 's_curve_ruckig',
          maxAcceleration: 240,
          springStiffness: 7.5,
        });
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100">
              结构与臂长参数 (Kinematic Params)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              定义机械臂连杆长度与传动伺服极限
            </div>
          </div>
        </div>

        <button
          onClick={() => applyPreset('standard')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3 text-cyan-400" />
          <span>重置默认</span>
        </button>
      </div>

      {/* Preset Profiles */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/30 space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400">机器人构型预设 (Presets):</div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => applyPreset('standard')}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 hover:border-cyan-500/50 hover:bg-slate-800/80 text-left transition"
          >
            <div className="text-xs font-semibold text-cyan-300">标准人形</div>
            <div className="text-[10px] text-slate-500">1:1 成人尺寸</div>
          </button>
          <button
            onClick={() => applyPreset('compact')}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 hover:border-cyan-500/50 hover:bg-slate-800/80 text-left transition"
          >
            <div className="text-xs font-semibold text-amber-300">轻型紧凑</div>
            <div className="text-[10px] text-slate-500">高机动灵活</div>
          </button>
          <button
            onClick={() => applyPreset('industrial')}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 hover:border-cyan-500/50 hover:bg-slate-800/80 text-left transition"
          >
            <div className="text-xs font-semibold text-emerald-300">重载工业</div>
            <div className="text-[10px] text-slate-500">长连杆大扭矩</div>
          </button>
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Upper Arm Length */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-200">大臂长度 (Upper Arm Length)</span>
            <span className="font-mono text-cyan-400 font-bold">
              {((params?.upperArmLength ?? 0.28) * 100).toFixed(1)} cm ({((params?.upperArmLength ?? 0.28)).toFixed(2)} m)
            </span>
          </div>
          <input
            type="range"
            min="0.18"
            max="0.50"
            step="0.01"
            value={params?.upperArmLength ?? 0.28}
            onChange={e => updateField('upperArmLength', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>18.0 cm</span>
            <span>50.0 cm</span>
          </div>
        </div>

        {/* Forearm Length */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-200">前臂小臂长度 (Forearm Length)</span>
            <span className="font-mono text-cyan-400 font-bold">
              {((params?.forearmLength ?? 0.25) * 100).toFixed(1)} cm ({((params?.forearmLength ?? 0.25)).toFixed(2)} m)
            </span>
          </div>
          <input
            type="range"
            min="0.16"
            max="0.45"
            step="0.01"
            value={params?.forearmLength ?? 0.25}
            onChange={e => updateField('forearmLength', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>16.0 cm</span>
            <span>45.0 cm</span>
          </div>
        </div>

        {/* Shoulder Width */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-200">双肩间距 (Shoulder Width)</span>
            <span className="font-mono text-cyan-400 font-bold">
              {((params?.shoulderWidth ?? 0.38) * 100).toFixed(1)} cm
            </span>
          </div>
          <input
            type="range"
            min="0.28"
            max="0.60"
            step="0.01"
            value={params.shoulderWidth}
            onChange={e => updateField('shoulderWidth', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>28.0 cm</span>
            <span>60.0 cm</span>
          </div>
        </div>

        {/* Motion Smoothing & Servo Dynamics Settings */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>运动平滑与物理阻尼算法</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              物理二阶动力学
            </span>
          </div>

          {/* Algorithm Selector Buttons */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400 font-medium">阻尼与轨迹算法模型 (Algorithm):</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateField('controlAlgorithm', 'critically_damped')}
                className={`p-2 rounded border text-left transition flex flex-col gap-0.5 ${
                  (params.controlAlgorithm ?? 'critically_damped') === 'critically_damped'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  二阶临界阻尼 (推荐)
                </span>
                <span className="text-[9px] text-slate-400 line-clamp-1">
                  ζ=1.0 物理零超调、无回弹
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateField('controlAlgorithm', 's_curve_ruckig')}
                className={`p-2 rounded border text-left transition flex flex-col gap-0.5 ${
                  params.controlAlgorithm === 's_curve_ruckig'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Ruckig S 曲线
                </span>
                <span className="text-[9px] text-slate-400 line-clamp-1">
                  Jerk 加加速度有限约束
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateField('controlAlgorithm', 'virtual_impedance')}
                className={`p-2 rounded border text-left transition flex flex-col gap-0.5 ${
                  params.controlAlgorithm === 'virtual_impedance'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  虚拟阻抗力控
                </span>
                <span className="text-[9px] text-slate-400 line-clamp-1">
                  弹簧阻尼柔顺伺服
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateField('controlAlgorithm', 'one_euro')}
                className={`p-2 rounded border text-left transition flex flex-col gap-0.5 ${
                  params.controlAlgorithm === 'one_euro'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-indigo-400" />
                  自适应 1€ 滤波
                </span>
                <span className="text-[9px] text-slate-400 line-clamp-1">
                  动捕速度自适应防抖
                </span>
              </button>
            </div>
          </div>

          {/* Damping Ratio zeta Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <span>物理阻尼比 (Damping Ratio ζ)</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {(params?.dampingFactor ?? 1.0).toFixed(2)}{' '}
                {(params?.dampingFactor ?? 1.0) === 1.0 ? '(临界阻尼)' : (params?.dampingFactor ?? 1.0) < 1.0 ? '(轻微回弹)' : '(过阻尼沉稳)'}
              </span>
            </div>
            <input
              type="range"
              min="0.20"
              max="2.00"
              step="0.05"
              value={params?.dampingFactor ?? 1.0}
              onChange={e => updateField('dampingFactor', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.20 (欠阻尼)</span>
              <span className="text-cyan-400 font-semibold">1.00 (临界阻尼·无超调)</span>
              <span>2.00 (强过阻尼)</span>
            </div>
          </div>

          {/* Max Angular Velocity Limit */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">最大旋转角速度 (Max Velocity Limit)</span>
              <span className="font-mono text-cyan-300 font-bold">{params.maxAngularSpeed} °/s</span>
            </div>
            <input
              type="range"
              min="30"
              max="360"
              step="10"
              value={params.maxAngularSpeed}
              onChange={e => updateField('maxAngularSpeed', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>30 °/s (极慢平稳)</span>
              <span>180 °/s (标准人体速度)</span>
              <span>360 °/s (工业高机动)</span>
            </div>
          </div>

          {/* Max Angular Acceleration Limit */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">最大角加速度 (Max Acceleration)</span>
              <span className="font-mono text-cyan-300 font-bold">{params.maxAcceleration ?? 360} °/s²</span>
            </div>
            <input
              type="range"
              min="60"
              max="720"
              step="20"
              value={params.maxAcceleration ?? 360}
              onChange={e => updateField('maxAcceleration', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>60 °/s² (柔顺启动)</span>
              <span>360 °/s² (标准拟真)</span>
              <span>720 °/s² (高响应)</span>
            </div>
          </div>

          {/* Natural Frequency / Stiffness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">响应固有频率 (Natural Frequency ωn)</span>
              <span className="font-mono text-cyan-300 font-bold">{(params.springStiffness ?? 9.0).toFixed(1)} rad/s</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="20.0"
              step="0.5"
              value={params.springStiffness ?? 9.0}
              onChange={e => updateField('springStiffness', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>3.0 (高柔和顺从)</span>
              <span>9.0 (标准仿生)</span>
              <span>20.0 (高刚性伺服)</span>
            </div>
          </div>

          {/* Harmonic Drive Gear Ratio */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">谐波减速比 (Harmonic Gear Ratio)</span>
              <span className="font-mono text-cyan-300 font-bold">{params.gearRatio}:1</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={params.gearRatio}
              onChange={e => updateField('gearRatio', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Physics-Compliant Guarantee Notice */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Shield className="w-4 h-4 shrink-0" />
            <span>物理定律与运动学平滑保证</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[10px]">
            系统采用连续二阶状态方程（$m\ddot\theta + c\dot\theta + k\Delta\theta = 0$）与 Jerk 加加速度限幅，彻底杜绝瞬间跨越突变。无论从何种动作切换或遭遇视觉丢帧，手臂均沿连续平滑轨迹平顺到达目标点。
          </p>
        </div>
      </div>
    </div>
  );
};
