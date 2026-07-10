"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { BROKERS, getBrokerLabel } from "@/lib/brokers";
import { getBrokerLogoPath } from "@/lib/brokerLogos";

interface ConnectedBroker {
  broker: string;
  label: string | null;
  maskedAccNo: string;
  status?: string;
  lastSyncedAt?: string | null;
  source?: "bridge" | "server";
}

interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  broker: string;
  currency: string;
}

interface SyncRequest {
  id: string;
  broker: string | null;
  status: "requested" | "running" | "completed" | "failed";
  requestedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  deepLink?: string;
}

const SYNC_STEPS = [
  { title: "웹에서 연동 버튼 클릭", desc: "ReValue 웹에서 동기화 요청을 생성합니다.", icon: "globe" },
  { title: "응용 프로그램 실행", desc: "revalue://sync로 로컬 WPF 앱을 엽니다.", icon: "window" },
  { title: "증권사 API 조회", desc: "내 PC에서 증권사 Open API를 호출합니다.", icon: "cloud" },
  { title: "DB 저장", desc: "조회한 보유주식을 요청 ID에 반영합니다.", icon: "database" },
  { title: "웹 반영", desc: "완료 상태를 확인하고 보유종목을 갱신합니다.", icon: "check" },
] as const;

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  switch (name) {
    case "refresh":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      );
    case "globe":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
        </svg>
      );
    case "window":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9h18" />
          <path d="M8 5v4" />
        </svg>
      );
    case "cloud":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H7a5 5 0 1 1 .9-9.92 7 7 0 0 1 13.1 3.42A3.5 3.5 0 0 1 17.5 19Z" />
        </svg>
      );
    case "database":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    default:
      return null;
  }
}

function formatMoney(value: number | null | undefined, currency = "KRW") {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadge(status?: string) {
  switch (status) {
    case "completed":
    case "connected":
      return "bg-emerald-100 text-emerald-700";
    case "running":
    case "requested":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function BrokerConnectionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [connected, setConnected] = useState<ConnectedBroker[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedBroker, setSelectedBroker] = useState("toss");
  const [loading, setLoading] = useState(true);
  const [syncRequest, setSyncRequest] = useState<SyncRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [installHint, setInstallHint] = useState(false);
  const [error, setError] = useState("");
  const importedRef = useRef(false);

  const fetchConnected = useCallback(async () => {
    const res = await fetch("/api/brokers/list");
    if (res.ok) setConnected(await res.json());
  }, []);

  const fetchHoldings = useCallback(async () => {
    const res = await fetch("/api/holdings");
    if (res.ok) setHoldings(await res.json());
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") {
      timer = window.setTimeout(() => {
        Promise.all([fetchConnected(), fetchHoldings()]).finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    }

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [fetchConnected, fetchHoldings, router, status]);

  useEffect(() => {
    if (!syncRequest?.id || syncRequest.status === "completed" || syncRequest.status === "failed") return;

    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/brokers/sync-requests?id=${encodeURIComponent(syncRequest.id)}`);
      if (!res.ok) return;

      const next = await res.json();
      setSyncRequest((prev) => ({ ...prev, ...next }));

      if (next.status === "completed" && !importedRef.current) {
        importedRef.current = true;
        await Promise.all([fetchConnected(), fetchHoldings()]);
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [fetchConnected, fetchHoldings, syncRequest?.id, syncRequest?.status]);

  const totalValue = useMemo(() => (
    holdings.reduce((sum, holding) => {
      if (holding.currentPrice == null) return sum;
      return sum + holding.currentPrice * holding.quantity;
    }, 0)
  ), [holdings]);

  const currentBroker = BROKERS.find((broker) => broker.id === selectedBroker) || BROKERS[0];
  const previewHoldings = holdings.slice(0, 5);
  const isSyncing = creating || syncRequest?.status === "requested" || syncRequest?.status === "running";

  const startSync = async () => {
    setCreating(true);
    setInstallHint(false);
    setError("");
    importedRef.current = false;

    const res = await fetch("/api/brokers/sync-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker: selectedBroker }),
    });

    const data = await res.json().catch(() => null);
    setCreating(false);

    if (!res.ok || !data?.deepLink) {
      setError(data?.error || "동기화 요청을 만들지 못했습니다.");
      return;
    }

    setSyncRequest({
      id: data.id,
      broker: data.broker,
      status: data.status,
      requestedAt: data.requestedAt,
      deepLink: data.deepLink,
    });

    window.location.href = data.deepLink;
    window.setTimeout(() => setInstallHint(true), 1800);
  };

  const retryDeepLink = () => {
    if (!syncRequest?.deepLink) return;
    window.location.href = syncRequest.deepLink;
    setInstallHint(true);
  };

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩 중...</div>;
  }

  return (
    <DashboardShell
      title="증권사 연동"
      subtitle="로컬 Windows 앱으로 보유주식을 안전하게 동기화합니다."
      hideBrand
      rightSlot={
        <button
          type="button"
          onClick={startSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="refresh" className="h-4 w-4" />
          Sync Bridge 실행
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Image src="/branding/revalue-green.png" alt="ReValue" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">ReValue Sync Bridge</p>
                      <h1 className="text-2xl font-bold text-gray-900">로컬 증권사 연동</h1>
                    </div>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                    증권사 API Key와 Secret은 WPF 앱의 Windows Credential Manager 또는 DPAPI 저장소에 두고, 웹은 단기 요청 ID로 동기화 상태만 추적합니다.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  HTTPS + 요청 토큰
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-600">증권사 선택</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {BROKERS.map((broker) => {
                      const selected = selectedBroker === broker.id;
                      return (
                        <button
                          key={broker.id}
                          type="button"
                          onClick={() => setSelectedBroker(broker.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            selected
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <Image
                            src={getBrokerLogoPath(broker.id) || "/branding/revalue-green.png"}
                            alt={broker.name}
                            width={24}
                            height={24}
                            className="h-6 w-6 shrink-0 rounded-full object-contain"
                            unoptimized
                          />
                          <span className="truncate font-medium">{broker.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">연동 상태</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {syncRequest?.id ? `요청 ID ${syncRequest.id}` : `${currentBroker.name} 동기화를 시작할 수 있습니다.`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(syncRequest?.status)}`}>
                      {creating ? "creating" : syncRequest?.status || "ready"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-[11px] text-gray-400">요청 시간</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{formatTime(syncRequest?.requestedAt)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-[11px] text-gray-400">시작 시간</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{formatTime(syncRequest?.startedAt)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-[11px] text-gray-400">완료 시간</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{formatTime(syncRequest?.completedAt)}</p>
                    </div>
                  </div>

                  {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                  {syncRequest?.errorMessage && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{syncRequest.errorMessage}</p>
                  )}
                  {installHint && syncRequest?.status !== "completed" && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      앱이 열리지 않았다면 ReValue Sync Bridge 설치 또는 `revalue://` URL scheme 등록이 필요합니다.
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={startSync}
                      disabled={isSyncing}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="refresh" className="h-4 w-4" />
                      {isSyncing ? "동기화 대기 중" : `${currentBroker.name} 보유주식 불러오기`}
                    </button>
                    <button
                      type="button"
                      onClick={retryDeepLink}
                      disabled={!syncRequest?.deepLink || syncRequest.status === "completed"}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      앱 다시 열기
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">보유주식 미리보기</h2>
                  <span className="text-xs text-gray-400">총 {holdings.length}개</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
                  <div className="grid grid-cols-[minmax(0,1fr)_72px_96px] bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
                    <span>종목</span>
                    <span className="text-right">수량</span>
                    <span className="text-right">평가금액</span>
                  </div>
                  {loading ? (
                    <div className="px-3 py-8 text-center text-sm text-gray-400">불러오는 중...</div>
                  ) : previewHoldings.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-gray-400">아직 동기화된 보유종목이 없습니다.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {previewHoldings.map((holding) => (
                        <div key={holding.id} className="grid grid-cols-[minmax(0,1fr)_72px_96px] items-center px-3 py-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{holding.name}</p>
                            <p className="truncate text-xs text-gray-400">{holding.ticker} · {getBrokerLabel(holding.broker)}</p>
                          </div>
                          <span className="text-right text-gray-600">{holding.quantity.toLocaleString()}</span>
                          <span className="text-right font-semibold text-gray-900">
                            {formatMoney(holding.currentPrice == null ? null : holding.currentPrice * holding.quantity, holding.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500">총 평가금액</span>
                  <span className="text-base font-bold text-blue-600">{formatMoney(totalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-base font-semibold text-gray-900">연동된 증권사</h2>
              <p className="mt-1 text-sm text-gray-500">WPF 브리지 또는 기존 서버 연동으로 등록된 계좌입니다.</p>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-xl border border-gray-100 px-4 py-8 text-center text-sm text-gray-400">불러오는 중...</div>
                ) : connected.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                    연동된 증권사가 없습니다. 위에서 Sync Bridge를 실행해 주세요.
                  </div>
                ) : (
                  connected.map((item) => (
                    <div key={item.broker} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                      <Image
                        src={getBrokerLogoPath(item.broker) || "/branding/revalue-green.png"}
                        alt={item.label || item.broker}
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 rounded-full object-contain"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{item.label || getBrokerLabel(item.broker)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(item.status)}`}>
                            {item.status || "connected"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          계좌번호 {item.maskedAccNo} · 마지막 동기화 {formatTime(item.lastSyncedAt)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-400">{item.source === "bridge" ? "WPF" : "Server"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <Icon name="shield" className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-semibold text-gray-900">보안 설계</h2>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["service_role 미사용", "웹과 WPF 모두 관리자 키를 내장하지 않습니다."],
                  ["짧은 요청 토큰", "브라우저가 만든 요청은 15분짜리 토큰으로만 완료할 수 있습니다."],
                  ["로컬 키 저장", "증권사 API Key/Secret은 Windows Credential Manager 또는 DPAPI에 저장합니다."],
                  ["IP 제한 대응", "증권사 Open API가 허용 IP를 요구하면 사용자 PC 공인 IP, 고정 IP VPN, 최소 중계 서버 중 증권사 정책에 맞춰 선택합니다."],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Icon name="refresh" className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">동기화 흐름</h2>
            </div>
            <div className="mt-5 space-y-4">
              {SYNC_STEPS.map((step, index) => {
                const done = syncRequest?.status === "completed" || (
                  syncRequest?.status === "running" && index < 3
                ) || (
                  syncRequest?.status === "requested" && index < 2
                );
                return (
                  <div key={step.title} className="relative flex gap-3">
                    {index < SYNC_STEPS.length - 1 && <div className="absolute left-5 top-11 h-7 w-px bg-gray-200" />}
                    <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      done ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Icon name={step.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600">{index + 1}</span>
                        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900">동기화 로그</h2>
            <div className="mt-4 space-y-2">
              {[
                ["요청 생성", syncRequest?.requestedAt, !!syncRequest],
                ["응용프로그램 실행", syncRequest?.startedAt || syncRequest?.requestedAt, syncRequest?.status === "running" || syncRequest?.status === "completed"],
                ["보유주식 반영", syncRequest?.completedAt, syncRequest?.status === "completed"],
              ].map(([label, time, done]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">{formatTime(time as string | null | undefined)}</span>
                </div>
              ))}
              {!syncRequest && <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">아직 동기화 요청이 없습니다.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">WPF 앱 콜백</p>
            <p className="mt-2 text-xs leading-5 text-blue-800">
              앱은 딥링크의 `callbackUrl`, `requestId`, `token`을 사용해 `/api/bridge/sync`로 시작/완료 상태와 holdings 배열을 전송합니다.
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
