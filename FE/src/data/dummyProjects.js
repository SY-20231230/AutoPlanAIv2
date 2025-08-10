// src/data/dummyProjects.js
const dummyProjects = [
  {
    id: 1,
    name: 'Auto Plan AI',
    desc: '자동 기획서/명세서 생성 서비스 FE 개발',
    ideaText: '자동 기획서 생성 프로젝트',
    draftSpec: [
      { 기능명: '로그인', 설명: '사용자 로그인 처리' },
      { 기능명: '회원가입', 설명: '신규 사용자 등록' },
    ],
    finalSpec: [
      { 기능명: '로그인', 설명: '사용자 로그인 처리' },
      { 기능명: '회원가입', 설명: '신규 사용자 등록' },
    ],
    team: [
      { name: '전 주은', position: '프론트엔드', stack: 'React.js' },
      { name: '홍길동', position: '백엔드', stack: 'Node.js' },
    ],
  },
  // 프로젝트 더 추가 가능
];

export default dummyProjects;