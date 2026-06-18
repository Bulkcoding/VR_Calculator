"use client";

import { useState, useEffect } from "react";

interface KisSettingsProps {
  onClose: () => void;
  onImported: () => void;
}

export default function KisSettings({ onClose, onImported }: KisSettingsProps) {
  const [hasCredentials, setHasCredentials] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ appKey: "", appSecret: "", accNo: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ totalEvlu: number; purchase: number; profit: number; profitRate: number; cash: number } | null>(null);

  const loadCreds = async () => {
    const res = await fetch("/api/brokers/kis/credentials");
    const d = await res.json();
    setHasCredentials(d.hasCredentials);
    if (d.hasCredentials) {
      setForm({ appKey: d.appKey || "", appSecret: "", accNo: d.accNo || "" });
    }
  };

  useEffect(() => { loadCreds(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/brokers/kis/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setHasCredentials(true);
      setEditing(false);
      setResult("저장 완료");
    } else {
      setResult("저장 실패");
    }
    setSaving(false);
  };

  const removeCreds = async () => {
    await fetch("/api/brokers/kis/credentials", { method: "DELETE" });
    setHasCredentials(false);
    setForm({ appKey: "", appSecret: "", accNo: "" });
    setResult("삭제 완료");
  };

  const importHoldings = async () => {
    setImporting(true);
    setResult(null);
    const res = await fetch("/api/brokers/kis/import", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setResult(`${data.added}개 추가, ${data.updated}개 갱신`);
      if (data.accountSummary) {
        setSummary({
          totalEvlu: data.accountSummary.totalEvlu,
          purchase: data.accountSummary.totalPurchase,
          profit: data.accountSummary.profitLoss,
          profitRate: data.accountSummary.profitLossRate,
          cash: data.accountSummary.cashBalance,
        });
      }
      onImported();
    } else {
      setResult(`오류: ${data.error}`);
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">한국투자증권 API 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>1. <a href="https://apiportal.koreainvestment.com" target="_blank" className="text-blue-600 underline">KIS Developers</a> 접속</p>
          <p>2. 앱키(AppKey) + 앱시크릿(AppSecret) 발급</p>
          <p>3. 계좌번호 입력 (예: 12345678-01)</p>
        </div>

        {!hasCredentials || editing ? (
          <form onSubmit={save} className="space-y-3">
            <input
              placeholder="AppKey"
              value={form.appKey}
              onChange={(e) => setForm({ ...form, appKey: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="AppSecret"
              type="password"
              value={form.appSecret}
              onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="계좌번호 (예: 12345678-01)"
              value={form.accNo}
              onChange={(e) => setForm({ ...form, accNo: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "저장중..." : "저장"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setForm({ appKey: "", appSecret: "", accNo: "" }); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              ✅ API 키가 등록되어 있습니다
            </div>
            <button
              onClick={() => { setEditing(true); loadCreds(); }}
              className="w-full px-4 py-2 rounded-lg border border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50"
            >
              ✏️ API 키 수정
            </button>
            <button
              onClick={importHoldings}
              disabled={importing}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? "불러오는중..." : "📥 보유종목 불러오기"}
            </button>
            <button
              onClick={removeCreds}
              className="w-full px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50"
            >
              API 키 삭제
            </button>
          </div>
        )}

        {result && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {result}
          </div>
        )}
        {summary && (
          <div className="text-sm space-y-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div className="flex justify-between">
              <span className="text-gray-500">총평가액</span>
              <span className="font-medium">₩{summary.totalEvlu.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">예수금</span>
              <span className="font-medium">₩{summary.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">평가손익</span>
              <span className={`font-medium ${summary.profit >= 0 ? "text-red-500" : "text-blue-500"}`}>
                {summary.profit >= 0 ? "+" : ""}₩{summary.profit.toLocaleString()}
                ({summary.profitRate >= 0 ? "+" : ""}{summary.profitRate.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
