"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BROKERS, getBrokerLabel } from "@/lib/brokers";
import { getBrokerLogoPath } from "@/lib/brokerLogos";

type SyncStatus = "idle" | "creating" | "requested" | "running" | "completed" | "failed";

interface SyncRequestState {
  id: string;
  broker: string | null;
  status: Exclude<SyncStatus, "idle" | "creating">;
  requestedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  deepLink?: string;
}

interface BrokerConnectionModalProps {
  onClose: () => void;
  onImported: () => void;
  initialBroker?: string;
}

function findBroker(brokerId: string) {
  return BROKERS.find((item) => item.id === brokerId) || BROKERS[0];
}

function statusLabel(status: SyncStatus) {
  switch (status) {
    case "creating":
      return "동기화 요청 생성 중";
    case "requested":
      return "Sync Bridge 실행 대기";
    case "running":
      return "로컬 앱에서 조회 중";
    case "completed":
      return "동기화 완료";
    case "failed":
      return "동기화 실패";
    default:
      return "대기 중";
  }
}

export default function BrokerConnectionModal({
  onClose,
  onImported,
  initialBroker = "kis",
}: BrokerConnectionModalProps) {
  const [selectedBroker, setSelectedBroker] = useState<string>(findBroker(initialBroker).id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncRequest, setSyncRequest] = useState<SyncRequestState | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [installHint, setInstallHint] = useState(false);
  const [error, setError] = useState("");
  const importedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const broker = findBroker(selectedBroker);
  const isBusy = status === "creating" || status === "requested" || status === "running";

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!syncRequest?.id || syncRequest.status === "completed" || syncRequest.status === "failed") return;

    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/brokers/sync-requests?id=${encodeURIComponent(syncRequest.id)}`);
      if (!res.ok) return;

      const next = await res.json();
      setSyncRequest((prev) => ({ ...prev, ...next }));
      setStatus(next.status);

      if (next.status === "completed" && !importedRef.current) {
        importedRef.current = true;
        onImported();
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [onImported, syncRequest?.id, syncRequest?.status]);

  const selectBroker = (brokerId: string) => {
    setSelectedBroker(brokerId);
    setSyncRequest(null);
    setStatus("idle");
    setInstallHint(false);
    setError("");
    importedRef.current = false;
  };

  const startBridgeSync = async () => {
    setStatus("creating");
    setError("");
    setInstallHint(false);
    importedRef.current = false;

    const res = await fetch("/api/brokers/sync-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker: selectedBroker }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.deepLink) {
      setStatus("failed");
      setError(data?.error || "Sync Bridge 요청을 만들지 못했습니다.");
      return;
    }

    setSyncRequest({
      id: data.id,
      broker: data.broker,
      status: data.status,
      requestedAt: data.requestedAt,
      deepLink: data.deepLink,
    });
    setStatus("requested");

    window.location.href = data.deepLink;
    window.setTimeout(() => setInstallHint(true), 1800);
  };

  const retryDeepLink = () => {
    if (!syncRequest?.deepLink) return;
    window.location.href = syncRequest.deepLink;
    setInstallHint(true);
  };

  const selectedLabel = getBrokerLabel(selectedBroker);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">ReValue Sync Bridge</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">증권사 계좌 동기화</h2>
            <p className="mt-1 text-sm text-gray-500">
              API Key와 Secret은 로컬 Windows 앱에 보관하고, 웹은 동기화 요청과 결과만 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="relative" ref={dropdownRef}>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">증권사 선택</label>
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition hover:bg-gray-50"
            >
              <Image
                src={getBrokerLogoPath(broker.id) || "/branding/revalue-green.png"}
                alt={selectedLabel}
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full object-contain"
                unoptimized
              />
              <span className="flex-1 text-left font-medium text-gray-900">{selectedLabel}</span>
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {BROKERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      selectBroker(item.id);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-blue-50"
                  >
                    <Image
                      src={getBrokerLogoPath(item.id) || "/branding/revalue-green.png"}
                      alt={item.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 rounded-full object-contain"
                      unoptimized
                    />
                    <span className={selectedBroker === item.id ? "flex-1 text-left font-semibold text-blue-600" : "flex-1 text-left text-gray-700"}>
                      {item.name}
                    </span>
                    {selectedBroker === item.id && (
                      <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">로컬 앱으로 안전하게 조회</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  `revalue://sync`로 Windows 앱을 열고, 앱이 보유종목을 조회한 뒤 이 요청 ID에 결과를 반영합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{statusLabel(status)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {syncRequest?.id ? `요청 ID ${syncRequest.id}` : "Sync Bridge를 실행하면 상태를 자동으로 확인합니다."}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "failed"
                    ? "bg-red-100 text-red-700"
                    : isBusy
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
              }`}>
                {status === "idle" ? "준비" : status}
              </span>
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            {syncRequest?.errorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{syncRequest.errorMessage}</p>
            )}
            {installHint && status !== "completed" && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                앱이 열리지 않았다면 ReValue Sync Bridge 설치 또는 `revalue://` URL scheme 등록이 필요합니다.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              "웹에서 요청 생성",
              "WPF 앱에서 API 조회",
              "완료 후 보유종목 갱신",
            ].map((label, index) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600 shadow-sm">
                  {index + 1}
                </div>
                <p className="text-xs font-semibold text-gray-800">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={startBridgeSync}
              disabled={isBusy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" />
                <path d="m10 14 2 2 4-4" />
              </svg>
              {isBusy ? "동기화 대기 중" : `${selectedLabel} Sync Bridge 실행`}
            </button>
            <button
              type="button"
              onClick={retryDeepLink}
              disabled={!syncRequest?.deepLink || status === "completed"}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다시 열기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
