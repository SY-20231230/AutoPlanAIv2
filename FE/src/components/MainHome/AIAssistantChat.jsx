import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import '../../styles/MainHome/AIAssistantChat.css';

const DUMMY_ANSWER = '*구현 예정 기능입니다!';

const AIAssistantChat = () => {
  const [messages, setMessages] = useState([
{ 
  sender: 'ai', 
  text: '기획서에 대한 아이디어나 궁금한 점을 말씀해 주세요!' 
}
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');

    // 실제 API 대신 데모 응답
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'ai', text: DUMMY_ANSWER }]);
    }, 900);
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Bot size={20} style={{ color: '#2563eb' }} />
        Auto Plan AI ChatBot
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`ai-chat-message ${msg.sender === 'user' ? 'right' : 'left'}`}
          >
            <span className="ai-chat-avatar">
              {msg.sender === 'ai' ? (
                <Bot size={18} style={{ color: '#2563eb' }} />
              ) : (
                <UserIcon size={18} style={{ color: '#666' }} />
              )}
            </span>
            <span className="ai-chat-bubble">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="ai-chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="아이디어나 질문을 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="ai-chat-input"
          autoFocus
        />
        <button className="ai-chat-send-btn" type="submit">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default AIAssistantChat;