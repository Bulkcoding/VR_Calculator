const BROKERS = [
  { id: 'toss', name: '토스증권', shortName: 'Toss' },
  { id: 'kis', name: '한국투자증권', shortName: 'KIS' },
  { id: 'samsung', name: '삼성증권', shortName: 'Samsung' },
  { id: 'kb', name: 'KB증권', shortName: 'KB' },
  { id: 'kakao', name: '카카오페이증권', shortName: 'Kakao' },
  { id: 'mirae', name: '미래에셋증권', shortName: 'Mirae' },
  { id: 'nh', name: 'NH투자증권', shortName: 'NH' },
  { id: 'shinhan', name: '신한투자증권', shortName: 'Shinhan' },
  { id: 'hana', name: '하나증권', shortName: 'Hana' },
];

function findBroker(brokerId) {
  return BROKERS.find((item) => item.id === brokerId) || BROKERS[0];
}

module.exports = {
  BROKERS,
  findBroker,
};
