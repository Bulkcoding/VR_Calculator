interface RingProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  trackColor?: string;
  progressColor?: string;
}

export default function RingProgress({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  trackColor = "#e0e7ff",
  progressColor = "#6366f1",
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const pct = Math.round(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">{pct}%</div>
        {label && <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>}
        {sublabel && <div className="text-[10px] text-gray-400">{sublabel}</div>}
      </div>
    </div>
  );
}
