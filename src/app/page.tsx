import Link from 'next/link';
import { getAllCharacters } from '@/lib/character/registry';

export default function Home() {
  const characters = getAllCharacters();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CyberAgent</h1>
                <p className="text-sm text-gray-600">AI Agent 机器人控制平台</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            让你的机器人拥有个性
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            选择你喜欢的角色，连接你的机器人，开始虚拟与现实的互动体验
          </p>
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <Link
              href={`/agent/${character.id}`}
              key={character.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
            >
              {/* Character Card Header */}
              <div className="h-32 bg-gradient-to-r from-purple-500 to-blue-500 relative">
                <div className="absolute inset-0 bg-black opacity-10 group-hover:opacity-20 transition-opacity"></div>
              </div>

              {/* Character Icon */}
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-full -mt-10 mx-auto border-4 border-purple-500 flex items-center justify-center">
                  {character.id.includes('dog') ? (
                    <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                  ) : (
                    <svg className="w-12 h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3h4v2h-4zm0-4h4v2h-4zm0-4h4v2h-4z"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* Character Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {character.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {character.description}
                </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  v1.0
                </span>
                  <span className="text-purple-600 font-medium group-hover:text-purple-700">
                    选择角色 →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-16 bg-white rounded-xl shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            使用流程
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">选择角色</h4>
              <p className="text-gray-600">
                从画廊中选择你喜欢的 AI 角色，每个角色都有独特的行为模式
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">连接机器人</h4>
              <p className="text-gray-600">
                将你的 RoboMaster 机器人连接，系统将自动识别设备
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">开始互动</h4>
              <p className="text-gray-600">
                启动机器人，让它以选择的角色身份开始在家探索
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>CyberAgent - 虚拟 AI 机器人驱动平台</p>
            <p className="text-sm mt-2">
              Powered by Next.js, TypeScript & Behavior Trees
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
