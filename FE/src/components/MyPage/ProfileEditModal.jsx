import React, { useState, useEffect } from 'react';

const ProfileEditModal = ({ profile, onClose, onSave }) => {
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [email, setEmail] = useState(profile.email || '');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null); // 이미지 파일
  const [previewUrl, setPreviewUrl] = useState(''); // 미리보기용 URL

  // 기존 프로필 이미지가 있으면 미리보기 설정 (예: profile.imageUrl)
  useEffect(() => {
    if (profile.imageUrl) {
      setPreviewUrl(profile.imageUrl);
    }
  }, [profile.imageUrl]);

  // 이미지 선택 시 미리보기 생성
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  };

  const handleSave = () => {
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    // onSave에 이미지 파일도 같이 넘길 수 있도록 수정
    onSave({ nickname, email, password, profileImage });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>개인정보 변경</h2>

        <label>프로필 사진</label>
        <div style={{ marginBottom: '1rem' }}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="프로필 미리보기"
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#ddd', lineHeight: '100px', textAlign: 'center' }}>
              이미지 없음
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ marginTop: '0.5rem' }}
          />
        </div>

        <label>닉네임</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} />

        <label>이메일</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />

        <label>새 비밀번호</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

        <label>비밀번호 확인</label>
        <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} />

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleSave}>저장</button>
          <button onClick={onClose} style={{ marginLeft: 10 }}>취소</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;