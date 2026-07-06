"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import BrokerConnectionModal from "@/components/BrokerConnectionModal";
import { getBrokerLogoPath } from "@/lib/brokerLogos";

const ALL_BROKERS = [
  { id: "kis", name: "한국투자증권", shortName: "KIS", color: "bg-blue-600", supportsImport: true },
  { id: "toss", name: "토스증권", shortName: "TS", color: "bg-blue-500", supportsImport: true },
  // { id: "samsung", name: "삼성증권", shortName: "SS", color: "bg-orange-500", supportsImport: false },
  // { id: "kb", name: "KB증권", shortName: "KB", color: "bg-yellow-500", supportsImport: false },
  // { id: "mirae", name: "미래에셋증권", shortName: "MA", color: "bg-teal-600", supportsImport: false },
  // { id: "nh", name: "NH투자증권", shortName: "NH", color: "bg-green-600", supportsImport: false },
  // { id: "shinhan", name: "신한투자증권", shortName: "SH", color: "bg-blue-700", supportsImport: false },
  // { id: "daishin", name: "대신증권", shortName: "DS", color: "bg-gray-600", supportsImport: false },
  // { id: "hana", name: "하나증권", shortName: "HA", color: "bg-emerald-600", supportsImport: false },
  // { id: "yuanta", name: "유안타증권", shortName: "YT", color: "bg-red-500", supportsImport: false },
  // { id: "eugene", name: "유진투자증권", shortName: "EG", color: "bg-purple-600", supportsImport: false },
  // { id: "other", name: "기타 증권사", shortName: "•••", color: "bg-gray-400", supportsImport: false },
];

interface ConnectedBroker {
  broker: string;
  label: string | null;
  maskedAccNo: string;
}

export default function BrokerConnectionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [connected, setConnected] = useState<ConnectedBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; broker: string }>({ open: false, broker: "kis" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") fetchConnected();
  }, [status]);

  const fetchConnected = async () => {
    setLoading(true);
    const res = await fetch("/api/brokers/list");
    if (res.ok) setConnected(await res.json());
    setLoading(false);
  };

  const handleDisconnect = async (brokerId: string) => {
    await fetch(`/api/brokers/credentials?broker=${brokerId}`, { method: "DELETE" });
    fetchConnected();
  };

  const handleImport = async (brokerId: string) => {
    if (brokerId !== "kis" && brokerId !== "toss") return;
    setImporting(brokerId);
    const res = await fetch(`/api/brokers/${brokerId}/import`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setImporting(null);
    if (!res.ok) {
      alert(data.error || "보유종목 불러오기에 실패했습니다.");
      return;
    }
    alert(`불러오기 완료: 추가 ${data.added ?? 0}건 · 갱신 ${data.updated ?? 0}건`);
  };

  const openModal = (brokerId: string) => setModal({ open: true, broker: brokerId });
  const closeModal = () => { setModal({ open: false, broker: "kis" }); fetchConnected(); };

  const connectedIds = new Set(connected.map((c) => c.broker));
  const availableBrokers = ALL_BROKERS.filter((b) => !connectedIds.has(b.id));

  const getBrokerInfo = (id: string) => ALL_BROKERS.find((b) => b.id === id);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  }

  return (
    <DashboardShell
      title="증권사 연동"
      hideBrand
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal("kis")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            연동 추가
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500 -mt-2">
          API로 연동하여 계좌 정보를 안전하게 불러오고 거래를 실행할 수 있습니다.
        </p>

        {/* Connected brokers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">연동된 증권사</h2>
          <p className="text-sm text-gray-400 mb-5">
            현재 연동되어 있는 증권사입니다. 데이터를 불러오거나 설정을 관리할 수 있습니다.
          </p>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : connected.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              연동된 증권사가 없습니다.
              <br />
              아래에서 연동할 증권사를 선택하거나 우측 상단의 연동 추가를 눌러보세요.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {connected.map((c) => {
                const info = getBrokerInfo(c.broker);
                return (
                  <div key={c.broker} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <Image
                      src={getBrokerLogoPath(c.broker) || ""}
                      alt={info?.name || c.broker}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-contain shrink-0"
                      unoptimized
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {c.label || info?.name || c.broker}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          연동됨
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        연동 계좌 1개 · 계좌번호 {c.maskedAccNo}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      정상
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleImport(c.broker)}
                        disabled={importing === c.broker || !info?.supportsImport}
                        title={!info?.supportsImport ? "현재 KIS만 지원됩니다" : undefined}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                        {importing === c.broker ? "불러오는중..." : "데이터 불러오기"}
                      </button>
                      <button
                        onClick={() => openModal(c.broker)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition"
                        title="설정"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDisconnect(c.broker)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                      >
                        연동 해제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available brokers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">연동 가능한 증권사</h2>
          <p className="text-sm text-gray-400 mb-5">
            추가로 연동할 수 있는 증권사입니다. API 연동을 통해 계좌 정보를 불러올 수 있습니다.
          </p>

          {availableBrokers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">모든 지원 증권사가 연동되어 있습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableBrokers.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition">
                  <Image
                    src={getBrokerLogoPath(b.id) || ""}
                    alt={b.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-contain shrink-0"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">{b.name}</div>
                  </div>
                  <button
                    onClick={() => b.id !== "other" && openModal(b.id)}
                    disabled={b.id === "other"}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap disabled:text-gray-400 disabled:cursor-not-allowed shrink-0"
                  >
                    연동하기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">안전한 API 연동</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            모든 API 연동은 암호화되어 안전하게 처리되며, 고객님의 계정 정보는 저장되지 않습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "읽기 전용 데이터", desc: "계좌 조회 및 잔고 정보만 읽어옵니다." },
              { title: "암호화 통신", desc: "모든 데이터는 암호화되어 전송됩니다." },
              { title: "보안 인증", desc: "공식 API를 통해 안전하게 연동됩니다." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal.open && (
        <BrokerConnectionModal
          initialBroker={modal.broker}
          onClose={closeModal}
          onImported={fetchConnected}
        />
      )}
    </DashboardShell>
  );
}
