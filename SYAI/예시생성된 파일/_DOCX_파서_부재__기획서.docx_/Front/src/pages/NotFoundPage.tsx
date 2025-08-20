import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      backgroundColor: '#f8f8f8',
      color: '#333'
    }}>
      <h1 style={{ fontSize: '6em', margin: '0' }}>404</h1>
      <h2 style={{ fontSize: '2em', marginTop: '10px' }}>페이지를 찾을 수 없습니다.</h2>
      <p style={{ fontSize: '1.2em', marginBottom: '30px' }}>요청하신 페이지가 존재하지 않거나, 사용할 수 없는 페이지입니다.</p>
      <Link to="/" style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px',
        fontSize: '1.1em',
        transition: 'background-color 0.3s ease'
      }}>
        홈으로 돌아가기
      </Link>
    </div>
  );
};

export default NotFoundPage;