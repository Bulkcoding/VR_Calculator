// Broker ID to logo image path mapping
// Images stored in /public/brokers/

const brokerLogos: Record<string, string> = {
  kis: "/brokers/kis.png",
  toss: "/brokers/toss.jpg",
  samsung: "/brokers/samsung.png",
  kb: "/brokers/kb.jpg",
  mirae: "/brokers/mirae.png",
  nh: "/brokers/nh.png",
  shinhan: "/brokers/shinhan.jpg",
  daishin: "/brokers/daishin.png",
  yuanta: "/brokers/yuanta.jpg",
  eugene: "/brokers/eugene.webp",
  kakao: "/brokers/kakao.png",
  hana: "/brokers/hana.jpg",
};

export function getBrokerLogoPath(brokerId: string): string | null {
  return brokerLogos[brokerId] ?? null;
}
