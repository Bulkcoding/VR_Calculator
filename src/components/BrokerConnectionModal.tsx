"use client";

import { useState, useEffect, useRef } from "react";

const BROKERS = [
  { id: "kis", name: "한국투자증권", guideUrl: "https://apiportal.koreainvestment.com", supportsImport: true },
  { id: "toss", name: "토스증권", guideUrl: "https://tossinvest.com", supportsImport: false },
  { id: "samsung", name: "삼성증권", guideUrl: "https://www.samsungpop.com", supportsImport: false },
  { id: "kb", name: "KB증권", guideUrl: "https://openapi.kbsec.com", supportsImport: false },
  { id: "mirae", name: "미래에셋증권", guideUrl: "https://securities.miraeasset.com", supportsImport: false },
  { id: "nh", name: "NH투자증권", guideUrl: "https://developers.nhqv.com", supportsImport: false },
  { id: "shinhan", name: "신한투자증권", guideUrl: "https://openapi.shinhaninvest.com", supportsImport: false },
  { id: "hana", name: "하나증권", guideUrl: "https://openapi.hanaw.com", supportsImport: false },
];

interface BrokerConnectionModalProps {
  onClose: () => void;
  onImported: () => void;
  initialBroker?: string;
}

export default function BrokerConnectionModal({
  onClose,
  onImported,
  initialBroker = "kis",
}: BrokerConnectionModalProps) {
  const [selectedBroker, setSelectedBroker] = useState(initialBroker);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [form, setForm] = useState({ appKey: "", appSecret: "", accNo: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const reqBrokerRef = useRef(selectedBroker);

  const broker = BROKERS.find((b) => b.id === selectedBroker) || BROKERS[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    // 증권사를 전환하면 일단 모든 입력을 공란/미연동 상태로 초기화한 뒤
    // 해당 증권사의 저장된 자격증명을 다시 불러온다.
    reqBrokerRef.current = selectedBroker;
    setHasCredentials(false);
    setNeedsReauth(false);
    setForm({ appKey: "", appSecret: "", accNo: "" });
    setResult(null);
    loadCreds(selectedBroker);
  }, [selectedBroker]);

  const loadCreds = async (brokerId: string) => {
    const res = await fetch(`/api/brokers/credentials?broker=${brokerId}`);
    const d = await res.json();
    // 응답이 도착하기 전에 다른 증권사로 전환했다면 이 응답은 무시한다.
    if (reqBrokerRef.current !== brokerId) return;
    if (d.hasCredentials) {
      // 연동된 증권사: 저장된 ApiKey / 계좌번호를 보여준다. (ApiSecret은 보안상 제외)
      setHasCredentials(true);
      setNeedsReauth(!!d.needsReauth);
      setForm({ appKey: d.appKey || "", appSecret: "", accNo: d.accNo || "" });
    } else {
      // 연동된 증권사가 아니면 ApiKey / ApiSecret / 계좌번호 모두 공란 유지
      setHasCredentials(false);
      setNeedsReauth(false);
      setForm({ appKey: "", appSecret: "", accNo: "" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/brokers/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker: selectedBroker, ...form }),
    });
    if (res.ok) {
      setHasCredentials(true);
      setNeedsReauth(false);
      setResult({ msg: "연동이 완료되었습니다.", ok: true });
    } else {
      const d = await res.json();
      setResult({ msg: d.error || "저장에 실패했습니다.", ok: false });
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    const res = await fetch(`/api/brokers/credentials?broker=${selectedBroker}`, { method: "DELETE" });
    if (res.ok) {
      setHasCredentials(false);
      setNeedsReauth(false);
      setForm({ appKey: "", appSecret: "", accNo: "" });
      setResult({ msg: "연동이 해제되었습니다.", ok: true });
    }
  };

  const handleImport = async () => {
    if (!broker.supportsImport) return;
    setImporting(true);
    setResult(null);
    const res = await fetch("/api/brokers/kis/import", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setResult({ msg: `${data.added}개 추가, ${data.updated}개 갱신`, ok: true });
      onImported();
    } else {
      setResult({ msg: `오류: ${data.error}`, ok: false });
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">증권사 연동</h2>
            <p className="text-sm text-gray-500 mt-0.5">연동할 증권사를 선택하고 API 정보를 입력하세요.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-1 p-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Broker selector + status row */}
          <div className="flex gap-3">
            <div className="flex-1 relative" ref={dropdownRef}>
              <p className="text-xs font-medium text-gray-700 mb-1.5">증권사 선택</p>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition"
              >
                <span className="text-gray-900">{broker.name}</span>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {BROKERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setSelectedBroker(b.id); setDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 transition"
                    >
                      <span className={selectedBroker === b.id ? "text-blue-600 font-medium" : "text-gray-700"}>
                        {b.name}
                      </span>
                      {selectedBroker === b.id && (
                        <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasCredentials && (
              <div className="flex-1">
                <p className="text-xs font-medium text-transparent mb-1.5 select-none">상태</p>
                {needsReauth ? (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg h-[42px]">
                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 leading-none">재인증 필요</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">저장된 키를 읽을 수 없어요. 다시 입력해 주세요</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg h-[42px]">
                    <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-green-700 leading-none">현재 연동 상태: 정상</p>
                      <p className="text-[11px] text-green-600 mt-0.5">API 키가 등록되어 있습니다</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form */}
          <form id="broker-form" onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">ApiKey</label>
              <input
                placeholder="발급받은 ApiKey를 입력하세요"
                value={form.appKey}
                onChange={(e) => setForm({ ...form, appKey: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">ApiSecret</label>
              <input
                placeholder={hasCredentials && !needsReauth ? "변경하지 않으려면 비워두세요" : "발급받은 ApiSecret를 입력하세요"}
                type="password"
                value={form.appSecret}
                onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                required={!hasCredentials || needsReauth}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">계좌번호</label>
              <input
                placeholder="예: 12345678-01"
                value={form.accNo}
                onChange={(e) => setForm({ ...form, accNo: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end">
              <a
                href={broker.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                공식 API 가이드
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </form>

          {/* 지원 기능 */}
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">지원 기능</p>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "보유종목 조회" },
                { label: "잔고 조회" },
                { label: "리밸런싱 데이터 동기화" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Result message */}
          {result && (
            <div className={`text-sm rounded-lg px-3 py-2.5 border ${result.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {result.msg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              form="broker-form"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {saving ? "저장중..." : "API 연동하기"}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!hasCredentials || !broker.supportsImport || importing}
              title={!broker.supportsImport ? "현재 KIS만 지원됩니다" : undefined}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {importing ? "불러오는중..." : "보유종목 불러오기"}
            </button>
            {hasCredentials && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                연동 해제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
