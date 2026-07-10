export const BROKERS = [
  { id: "toss", name: "토스증권", shortName: "Toss", supportsBridge: true },
  { id: "kis", name: "한국투자증권", shortName: "KIS", supportsBridge: true },
  { id: "samsung", name: "삼성증권", shortName: "Samsung", supportsBridge: true },
  { id: "kb", name: "KB증권", shortName: "KB", supportsBridge: true },
  { id: "kakao", name: "카카오페이증권", shortName: "Kakao", supportsBridge: true },
  { id: "mirae", name: "미래에셋증권", shortName: "Mirae", supportsBridge: true },
  { id: "nh", name: "NH투자증권", shortName: "NH", supportsBridge: true },
  { id: "shinhan", name: "신한투자증권", shortName: "Shinhan", supportsBridge: true },
  { id: "hana", name: "하나증권", shortName: "Hana", supportsBridge: true },
] as const;

export type BrokerId = (typeof BROKERS)[number]["id"];

export const BROKER_LABELS: Record<string, string> = BROKERS.reduce(
  (acc, broker) => {
    acc[broker.id] = broker.name;
    return acc;
  },
  {
    manual: "수동 입력",
    other: "기타 증권사",
    daishin: "대신증권",
    yuanta: "유안타증권",
    eugene: "유진투자증권",
    kiwoom: "키움증권",
    ls: "LS증권",
  } as Record<string, string>,
);

export function getBrokerLabel(brokerId: string | null | undefined) {
  if (!brokerId) return "증권사";
  return BROKER_LABELS[brokerId] ?? brokerId.toUpperCase();
}

export function isBridgeBrokerId(value: string | null | undefined): value is BrokerId {
  return BROKERS.some((broker) => broker.id === value);
}

