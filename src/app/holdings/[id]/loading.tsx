export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">종목 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}
