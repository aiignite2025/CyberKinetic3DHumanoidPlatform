/**
 * Phase 2 MQTT Remote Teleoperation & Real-Time Hardware Synchronization Panel
 * Allows streaming motor telemetry to physical hardware via MQTT WebSocket brokers.
 */

import React, { useState } from 'react';
import { MqttConfig, TelemetryPacket } from '../types/robot';
import {
  Radio,
  Wifi,
  WifiOff,
  Send,
  Copy,
  Check,
  Terminal,
  Activity,
  Server,
  Layers,
  Zap,
  Clock,
  RotateCcw
} from 'lucide-react';

interface MqttPanelProps {
  config: MqttConfig;
  onUpdateConfig: (newConfig: Partial<MqttConfig>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  recentPackets: {
    timestamp: number;
    seq: number;
    payload: string;
    bytes: number;
  }[];
  onSendPing: () => void;
  statusMessage: string;
  isSimulated: boolean;
}

export const MqttPanel: React.FC<MqttPanelProps> = ({
  config,
  onUpdateConfig,
  onConnect,
  onDisconnect,
  recentPackets,
  onSendPing,
  statusMessage,
  isSimulated,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              二期 MQTT 硬件同步 (Hardware Teleop)
              {config.connected && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isSimulated
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isSimulated ? '硬件仿真回环' : 'LIVE 桥接'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              低延迟远程遥操作与舵机控制协议
            </div>
          </div>
        </div>

        {/* Connect / Disconnect Action */}
        {config.connected ? (
          <button
            onClick={onDisconnect}
            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>断开连接</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>启动同步桥</span>
          </button>
        )}
      </div>

      {/* Connection Status Banner */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/40 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          <span className={`w-2 h-2 rounded-full ${config.connected ? (isSimulated ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping') : 'bg-slate-600'}`} />
          <span className="font-mono truncate max-w-[240px]">{statusMessage || '未连接'}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-400 text-[10px]">
          <span>延时:</span>
          <span className="text-cyan-400 font-bold">{config.connected ? `${config.lastLatencyMs} ms` : '--'}</span>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-950/20">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>通信 Broker 节点配置</span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Broker URL (WebSocket)</label>
            <input
              type="text"
              value={config.brokerUrl}
              onChange={e => onUpdateConfig({ brokerUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              placeholder="wss://broker.emqx.io:8084/mqtt"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">发布频率 (Rate)</label>
              <select
                value={config.rateHz}
                onChange={e => onUpdateConfig({ rateHz: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              >
                <option value={10}>10 Hz (低带宽)</option>
                <option value={20}>20 Hz (常规)</option>
                <option value={30}>30 Hz (标准 30fps)</option>
                <option value={60}>60 Hz (低延迟极速)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">报文协议格式 (Protocol)</label>
              <select
                value={config.format}
                onChange={e => onUpdateConfig({ format: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              >
                <option value="json">JSON Telemetry (标准)</option>
                <option value="ros2">ROS2 JointState (机器人系统)</option>
                <option value="compact_hex">Compact Hex (单片机固件)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">发布主题 (MQTT Topic)</label>
            <input
              type="text"
              value={config.topicPrefix}
              onChange={e => onUpdateConfig({ topicPrefix: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              placeholder="robot/teleop/v1"
            />
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Card */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">已发报文</div>
            <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
              {config.publishedCount}
            </div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">网络延时</div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
              {config.connected ? `${config.lastLatencyMs} ms` : '--'}
            </div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">吞吐带宽</div>
            <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
              {config.connected ? `${((config.rateHz * 320) / 1024).toFixed(1)} KB/s` : '0 KB/s'}
            </div>
          </div>
        </div>
      </div>

      {/* Packet Stream Monitor */}
      <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            实时出站数据报文流 (Packet Stream)
          </span>
          <button
            onClick={onSendPing}
            disabled={!config.connected}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40"
          >
            发送校准帧
          </button>
        </div>

        {/* Live Terminal Log */}
        <div className="flex-1 bg-slate-950 rounded-lg p-2.5 border border-slate-800/80 font-mono text-[10px] overflow-y-auto space-y-2">
          {recentPackets.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 text-[11px]">
              {config.connected ? '等待关节运动数据流...' : '连接 MQTT 启动硬件遥测数据推送'}
            </div>
          ) : (
            recentPackets.map((pkt, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 p-2 rounded border border-slate-800/60 hover:border-slate-700 transition space-y-1"
              >
                <div className="flex justify-between text-slate-500">
                  <span className="text-cyan-400">Seq #{pkt.seq}</span>
                  <span>{new Date(pkt.timestamp).toLocaleTimeString()} ({pkt.bytes} Bytes)</span>
                  <button
                    onClick={() => handleCopy(pkt.payload, idx)}
                    className="hover:text-slate-200 transition"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-slate-300 break-all leading-tight font-mono text-[9px] max-h-16 overflow-y-auto">
                  {pkt.payload}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
