export default function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700/50 animate-pulse">
      <div className="p-5">
        {/* 标题骨架 */}
        <div className="h-5 bg-gray-700 rounded mb-3 w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded mb-2 w-full"></div>
        <div className="h-4 bg-gray-700 rounded mb-4 w-2/3"></div>

        {/* 摘要骨架 */}
        <div className="h-3 bg-gray-700 rounded mb-2 w-full"></div>
        <div className="h-3 bg-gray-700 rounded mb-2 w-full"></div>
        <div className="h-3 bg-gray-700 rounded mb-4 w-5/6"></div>

        {/* 底部元数据骨架 */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
            <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
          </div>
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
      {/* 统计卡片骨架 */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl p-5 bg-gray-800/50 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded w-20"></div>
              <div className="h-8 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
          </div>
          <div className="mt-3 h-3 bg-gray-700 rounded w-24"></div>
        </div>
      ))}

      {/* 图表骨架 */}
      <div className="rounded-xl p-5 bg-gray-800/50 border border-gray-700 md:col-span-2">
        <div className="h-4 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 bg-gray-700 rounded w-20"></div>
              <div className="flex-1 h-6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-5 bg-gray-800/50 border border-gray-700 md:col-span-2">
        <div className="h-4 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 bg-gray-700 rounded w-20"></div>
              <div className="flex-1 h-6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
