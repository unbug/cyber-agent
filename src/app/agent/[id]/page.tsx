"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllCharacters, getCharacter } from '@/lib/character/registry';
import {
  BehaviorTreeExecutor,
  BehaviorTreeContext,
  RobotState,
} from '@/lib/behaviorTree/executor';

export default function AgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get('id');
  const [character, setCharacter] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [treeStatus, setTreeStatus] = useState('idle');
  const [robotState, setRobotState] = useState<RobotState | null>(null);
  const [context, setContext] = useState<BehaviorTreeContext>({});

  useEffect(() => {
    if (characterId) {
      const char = getCharacter(characterId);
      if (char) {
        setCharacter(char);
      } else {
        router.push('/');
      }
    }
  }, [characterId, router]);

  const handleConnect = async () => {
    // Simulated connection
    console.log('[UI] Connecting robot...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnected(true);
  };

  const handleDisconnect = async () => {
    console.log('[UI] Disconnecting robot...');
    setIsConnected(false);
    setIsRunning(false);
    setRobotState(null);
  };

  const handleStart = async () => {
    if (!isConnected) {
      alert('请先连接机器人');
      return;
    }

    console.log('[UI] Starting behavior tree...');
    const executor = new BehaviorTreeExecutor(
      character,
      {
        robotState: {
          batteryLevel: 100,
          position: { x: 0, y: 0 },
          orientation: 0,
          isMoving: false,
        },
        sensors: {
          proximity: {
            front: 100,
            back: 100,
            left: 100,
            right: 100,
          },
        },
      }
    );

    executor.onStatusChange((nodeId, status) => {
      setTreeStatus(status ?? 'idle');
      console.log(`[BT] Node ${nodeId}: ${status}`);
    });

    setIsRunning(true);
    await executor.execute();
    setIsRunning(false);
    setTreeStatus('idle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 返回
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {character?.name?.charAt(0) || ''}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {character?.name}
                </h1>
                <p className="text-sm text-gray-600">{character?.description}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Character Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              角色信息
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">角色 ID</p>
                <p className="text-gray-900 font-mono">{character?.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">版本</p>
                <p className="text-gray-900">v{character?.version || '1.0'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">状态机</p>
                <div className="text-sm bg-gray-100 rounded p-3 font-mono text-gray-800">
                  <pre>{JSON.stringify(character?.root, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Robot Status Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              机器人状态
            </h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <p className="text-gray-600 mb-4">机器人未连接</p>
                <button
                  onClick={handleConnect}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  连接机器人
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium">已连接</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    断开连接
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">电量</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${robotState?.batteryLevel || 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">
                      {robotState?.batteryLevel || 100}%
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">位置</p>
                    <p className="text-gray-900">
                      X: {robotState?.position?.x || 0}, Y: {robotState?.position?.y || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">朝向</p>
                    <p className="text-gray-900">
                      {robotState?.orientation || 0}°
                      <span className="text-gray-500 ml-2">
                        {robotState?.orientation === 0
                          ? '👆'
                          : robotState?.orientation === 90
                          ? '➡️'
                          : robotState?.orientation === 180
                          ? '👇'
                          : '⬅️'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">移动状态</p>
                    <p className={`text-sm ${robotState?.isMoving ? 'text-orange-500' : 'text-green-600'}`}>
                      {robotState?.isMoving ? '🏃 移动中' : '😴 静止'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            控制面板
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">行为树状态</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isRunning ? 'bg-orange-500 animate-pulse' :
                    treeStatus === 'success' ? 'bg-green-500' :
                    treeStatus === 'failure' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-sm text-gray-900 capitalize">
                    {isRunning ? '运行中' : treeStatus}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={isRunning || !isConnected || !character}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : !isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isRunning ? '运行中...' : '启动机器人'}
            </button>
          </div>

          {/* Status messages */}
          {isConnected && isRunning && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                🤖 机器人正在执行行为树...
              </p>
              <p className="text-sm text-blue-600 mt-1">
                观察面板中的状态变化，体验 AI Agent 的自主行为
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
