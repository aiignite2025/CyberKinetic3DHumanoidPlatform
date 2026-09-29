/**
 * Motion Trajectory Recorder & Physical Robot Zero-Point Calibration
 */

import React, { useState, useRef, useEffect } from 'react';
import { MotorConfig, ProcessedJoints } from '../types/robot';
import {
  CircleDot,
  Square,
  Play,
  Download,
  Trash2,
  Clock,
  Compass,
  FileCheck,
  RotateCcw
} from 'lucide-react';

interface MotionRecorderProps {
  currentMotors: MotorConfig[];
  currentJoints: ProcessedJoints;
  onApplyPlaybackJoints: (joints: ProcessedJoints) => void;
  onCalibrateZero: () => void;
}

interface FrameRecord {
  timeMs: number;
  joints: ProcessedJoints;
  motorAngles: Record<string, number>;
}

export const MotionRecorder: React.FC<MotionRecorderProps> = ({
  currentMotors,
  currentJoints,
  onApplyPlaybackJoints,
  onCalibrateZero,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [recordedFrames, setRecordedFrames] = useState<FrameRecord[]>([]);
  const [recordDuration, setRecordDuration] = useState<number>(0);

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Recording loop
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = performance.now();
      const frames: FrameRecord[] = [];

      intervalRef.current = window.setInterval(() => {
        const now = performance.now();
        const elapsed = now - startTimeRef.current;
        setRecordDuration(elapsed);

        const motorSnapshot: Record<string, number> = {};
        currentMotors.forEach(m => {
          motorSnapshot[m.id] = m.currentAngle;
        });

        frames.push({
          timeMs: Math.round(elapsed),
          joints: JSON.parse(JSON.stringify(currentJoints)),
          motorAngles: motorSnapshot,
        });
      }, 33); // ~30 fps recording

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRecordedFrames(frames);
      };
    }
  }, [isRecording]);

  const startRecord = () => {
    setRecordedFrames([]);
    setRecordDuration(0);
    setIsRecording(true);
  };

  const stopRecord = () => {
    setIsRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Playback recorded trajectory
  const playRecording = () => {
    if (recordedFrames.length === 0 || isPlaying) return;
    setIsPlaying(true);

    let frameIdx = 0;
    const startPlayTime = performance.now();

    const step = () => {
      const elapsed = performance.now() - startPlayTime;
      while (frameIdx < recordedFrames.length - 1 && recordedFrames[frameIdx].timeMs < elapsed) {
        frameIdx++;
      }

      if (frameIdx < recordedFrames.length) {
        onApplyPlaybackJoints(recordedFrames[frameIdx].joints);
        playbackTimerRef.current = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
      }
    };

    playbackTimerRef.current = requestAnimationFrame(step);
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    setIsPlaying(false);
  };

  const exportJson = () => {
    if (recordedFrames.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recordedFrames, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `humanoid_trajectory_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100">
              动作轨迹录制与标定 (Recording & Trajectory)
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              导出轨迹可直接烧录到物理机器人回放
            </div>
          </div>
        </div>

        <button
          onClick={onCalibrateZero}
          title="校准并重置全部关节为 T-Pose 零位"
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>标定</span>
        </button>
      </div>

      {/* Record & Play Controls */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <button
                onClick={stopRecord}
                title="停止当前动作轨迹录制"
                className="px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/20 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>停止</span>
              </button>
            ) : (
              <button
                onClick={startRecord}
                disabled={isPlaying}
                title="开始录制机器人动作示教轨迹 (30 FPS)"
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                <CircleDot className="w-3.5 h-3.5 fill-current" />
                <span>录制</span>
              </button>
            )}

            {isPlaying ? (
              <button
                onClick={stopPlayback}
                title="停止轨迹回放"
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>停止</span>
              </button>
            ) : (
              <button
                onClick={playRecording}
                disabled={recordedFrames.length === 0 || isRecording}
                title={recordedFrames.length === 0 ? '暂无录制帧' : `回放已录制的 ${recordedFrames.length} 帧动作轨迹`}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                <span>回放</span>
              </button>
            )}
          </div>

          <button
            onClick={exportJson}
            disabled={recordedFrames.length === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40"
            title="导出 JSON 轨迹文件"
          >
            <Download className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Recording Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">录制时长:</span>
            <span className="text-cyan-400 font-bold">{(recordDuration / 1000).toFixed(1)} s</span>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">帧数:</span>
            <span className="text-cyan-400 font-bold">{recordedFrames.length} 帧</span>
          </div>
        </div>
      </div>

      {/* Trajectory Info & Instructions */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs text-slate-400">
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            动作示教与离线部署流程
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
            <li>站立于摄像头前，保持双臂自然伸展进行 T-Pose 零位标定。</li>
            <li>点击【开始录制动作】，本平台将以 30Hz 采样率高频记录人体关节经由 YOLO + MediaPipe + 动力学滤波计算出的 14 轴舵机离散角度序列。</li>
            <li>录制完毕后可点击【回放动作】验证 3D 虚拟人偶动作还原平滑度。</li>
            <li>点击下载按钮导出标准 JSON 轨迹包，二期可直接作为 ROS2 节点播放源发送至硬件底层驱动。</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
