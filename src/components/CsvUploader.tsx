"use client";

import { useCallback, useRef } from "react";

export default function CsvUploader({ onUpload }: { onUpload: (data: any[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(Boolean);
        if (lines.length < 2) return;

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const items = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] || "";
          });
          return obj;
        });
        onUpload(items);
      };
      reader.readAsText(file, "UTF-8");

      if (inputRef.current) inputRef.current.value = "";
    },
    [onUpload]
  );

  return (
    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition">
      <span>CSV 업로드</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
}
