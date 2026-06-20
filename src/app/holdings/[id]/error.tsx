"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4 shadow-sm">
        <div className="text-4xl">⚠️</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">페이지를 불러올 수 없습니다</h2>
          <p className="text-sm text-gray-500 mt-1">
            서버 응답이 지연되거나 일시적인 오류가 발생했습니다.
          </p>
        </div>
        <button
          onClick={reset}
          className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="block text-sm text-gray-500 hover:text-gray-700"
        >
          ← 대시보드로 돌아가기
        </a>
      </div>
    </div>
  );
}
