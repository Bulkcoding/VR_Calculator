"use client";

import { useState } from "react";

interface EditHoldingFormProps {
  holding: {
    id: string;
    name: string;
    ticker: string;
    quantity: number;
    avgPrice: number;
    currency: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

export default function EditHoldingForm({ holding, onSave, onCancel }: EditHoldingFormProps) {
  const [form, setForm] = useState({
    name: holding.name,
    quantity: String(holding.quantity),
    avgPrice: String(holding.avgPrice),
    currency: holding.currency,
    broker: (holding as any).broker || "manual",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/holdings?id=${holding.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        quantity: parseFloat(form.quantity),
        avgPrice: parseFloat(form.avgPrice),
        currency: form.currency,
        broker: form.broker,
      }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form
        onSubmit={save}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4"
      >
        <h2 className="font-semibold text-gray-900">종목 수정</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">종목명</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">보유수량</label>
          <input
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">평균단가</label>
          <div className="flex gap-1">
            <input
              type="number"
              step="any"
              value={form.avgPrice}
              onChange={(e) => setForm({ ...form, avgPrice: e.target.value })}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="KRW">₩</option>
              <option value="USD">$</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">증권사</label>
          <select
            value={form.broker}
            onChange={(e) => setForm({ ...form, broker: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="manual">수동입력</option>
            <option value="kis">한국투자증권</option>
            <option value="kiwoom">키움증권</option>
            <option value="toss">토스증권</option>
            <option value="kakao">카카오페이증권</option>
            <option value="samsung">삼성증권</option>
            <option value="mirae">미래에셋증권</option>
            <option value="daishin">대신증권</option>
            <option value="nh">NH투자증권</option>
            <option value="shinhan">신한투자증권</option>
            <option value="kb">KB증권</option>
            <option value="ls">LS증권</option>
            <option value="csv">CSV 업로드</option>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "저장중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
