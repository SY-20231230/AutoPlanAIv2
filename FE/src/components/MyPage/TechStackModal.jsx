import React, { useState } from 'react';
import { TextField, Autocomplete, Button } from '@mui/material';

const stackOptions = [
  'React.js', 'Node.js', 'Python', 'MySQL', 'Django', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes',
  // 추가 원하는 스택 입력 가능
];

const TechStackModal = ({ team, onClose, onSave }) => {
  // team 배열 중 첫번째 멤버를 기준으로 포지션/스택 편집 (나의 프로필 관리용)
  const initial = team[0] || { name: '', position: '', stack: '' };

  const [position, setPosition] = useState(initial.position || '');
  const [stack, setStack] = useState(
    initial.stack
      ? initial.stack.split(',').map(s => s.trim()).filter(Boolean)
      : []
  );

  const handleSave = () => {
    const updatedTeam = [{ ...initial, position, stack: stack.join(', ') }, ...team.slice(1)];
    onSave(updatedTeam);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content large" style={{ maxWidth: 500 }}>
        <h2>기술 스택 관리</h2>

        <TextField
          label="포지션"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="프론트엔드, 백엔드 등"
        />

        <Autocomplete
          multiple
          freeSolo
          options={stackOptions}
          value={stack}
          onChange={(event, newValue) => setStack(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="기술 스택"
              placeholder="스택을 입력하거나 선택하세요"
              margin="normal"
              fullWidth
            />
          )}
        />

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <Button variant="contained" onClick={handleSave} style={{ marginRight: 10 }}>
            변경사항 저장
          </Button>
          <Button variant="outlined" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TechStackModal;