const playerNameInput = document.getElementById('playerNameInput');
const blueTeamBtn = document.getElementById('blueTeamBtn');
const redTeamBtn = document.getElementById('redTeamBtn');
const startGameBtn = document.getElementById('startGameBtn');
const createRoomInput = document.getElementById('createRoomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');

let selectedTeam = null;
let currentRoom = null;

playerNameInput.addEventListener('input', validateForm);
blueTeamBtn.addEventListener('click', () => selectTeam('blue'));
redTeamBtn.addEventListener('click', () => selectTeam('red'));
startGameBtn.addEventListener('click', startGame);

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);

function selectTeam(team) {
  selectedTeam = team;
  blueTeamBtn.style.opacity = team === 'blue' ? '1' : '0.6';
  redTeamBtn.style.opacity = team === 'red' ? '1' : '0.6';
  validateForm();
}

function validateForm() {
  const playerName = playerNameInput.value.trim();
  startGameBtn.disabled = !(playerName && selectedTeam && currentRoom);
}

function createRoom() {
  const roomName = createRoomInput.value.trim();
  if (!roomName) {
    alert('방 이름을 입력해주세요.');
    return;
  }

  // 방 코드 생성 (랜덤 문자열)
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  currentRoom = {
    name: roomName,
    code: roomCode,
    players: []
  };

  alert(`방이 생성되었습니다. 방 코드: ${roomCode}`);
  createRoomInput.value = '';
  roomCodeInput.value = roomCode;
  validateForm();
}

function joinRoom() {
  const roomCode = roomCodeInput.value.trim().toUpperCase();
  if (!roomCode) {
    alert('방 코드를 입력해주세요.');
    return;
  }

  // 여기서 실제 서버와 통신하여 방 존재 여부 확인
  // 현재는 시뮬레이션
  currentRoom = {
    name: '예시 방',
    code: roomCode,
    players: []
  };

  alert(`${roomCode} 방에 참여했습니다.`);
  validateForm();
}

function startGame() {
  const playerName = playerNameInput.value.trim();
  
  // 게임 화면으로 리다이렉트 또는 게임 초기화
  sessionStorage.setItem('playerName', playerName);
  sessionStorage.setItem('playerTeam', selectedTeam);
  sessionStorage.setItem('roomCode', currentRoom.code);
  
  // 게임 페이지로 이동 (기존 게임 HTML 경로)
  window.location.href = 'game.html';
}