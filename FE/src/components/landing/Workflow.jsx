// 📁 src/components/Workflow.jsx
import React from 'react';
import '../../styles/landing/Workflow.css';
import { FaPenFancy, FaRobot, FaUserFriends, FaFileAlt } from 'react-icons/fa';

const steps = [
  {
    icon: <FaPenFancy size={32} color="white" />,
    title: '아이디어 입력',
    desc: '자연어로 프로젝트 아이디어를 간단히 설명하세요.',
  },
  {
    icon: <FaRobot size={32} color="white" />,
    title: 'AI 분석',
    desc: 'AI가 입력 내용을 구조화하고 명세를 생성합니다.',
  },
  {
    icon: <FaUserFriends size={32} color="white" />,
    title: '스마트 매칭',
    desc: '유사 프로젝트를 찾고 팀원에게 업무를 배정합니다.',
  },
  {
    icon: <FaFileAlt size={32} color="white" />,
    title: '문서화 및 실행',
    desc: '명세서를 PDF/Word로 출력하고 개발을 시작하세요.',
  },
];

const Workflow = () => {
  return (
    <section className="workflow">
      <h2>Auto Plan AI는 이렇게 작동해요</h2>
      <p className="workflow-sub">아이디어를 실제 실행 계획으로 바꾸는 4단계 과정</p>
      <div className="workflow-steps">
        {steps.map((step, i) => (
          <div className="workflow-step" key={i}>
            <div className="workflow-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            <div className="step-number">{i + 1}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Workflow;
