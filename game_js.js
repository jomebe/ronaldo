// WebSocket 서버 주소 (로컬 개발 환경)
const WS_SERVER = 'wss://ronaldo-31b9.onrender.com/ws';

// DOM 요소 캐싱
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const powerBar = document.getElementById('powerBar');
const statusElement = document.getElementById('status');

// 골대 크기 상수
const GOAL_SIZE = {
  width: 20,
  height: 100
};

// WebSocket 연결 상태 관리
let socket = null;
let isConnected = false;

// 팀과 플레이어 이름 초기화
const playerName = sessionStorage.getItem('playerName') || generatePlayerName();
const playerTeam = sessionStorage.getItem('playerTeam') || (Math.random() < 0.5 ? 'blue' : 'red');

const localPlayer = {
  id: generateUniqueId(),
  x: playerTeam === 'blue' ? 150 : 650,
  y: canvas.height / 2,
  width: 30,
  height: 30,
  color: playerTeam === 'blue' ? '#4a9eff' : '#ff4a4a',  // 이렇게 수정
  score: 0,
  team: playerTeam,
  name: playerName,
  powerCharge: 0,
  lastActive: Date.now()
};

// 공 초기 상태
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 10,
  vx: 0,
  vy: 0,
  lastUpdate: Date.now()
};

// 게임 상태 변수들
let players = {};
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  
  // WASD Keys
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,

  ShiftLeft: false
};
let scores = { blue: 0, red: 0 };
let lastUpdateTime = Date.now();

// 유틸리티 함수: 고유 ID 생성
function generateUniqueId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 유틸리티 함수: 랜덤 플레이어 이름 생성
function generatePlayerName() {
  const adjectives = ['빠른', '강한', '날쌘', '민첩한', '슈퍼'];
  const nouns = ['선수', '공격수', '골키퍼', '스트라이커', '플레이메이커'];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}_${Math.floor(Math.random() * 1000)}`;
}

// WebSocket 연결 함수
function connectWebSocket() {
  socket = new WebSocket(WS_SERVER);

  socket.onopen = handleWebSocketOpen;
  socket.onmessage = handleWebSocketMessage;
  socket.onclose = handleWebSocketClose;
  socket.onerror = handleWebSocketError;
}

// WebSocket 열기 핸들러
function handleWebSocketOpen() {
  console.log('WebSocket connection established');
  isConnected = true;
  statusElement.textContent = '서버에 연결되었습니다.';
  
  socket.send(JSON.stringify({
    type: 'connect',
    player: localPlayer
  }));
}

// WebSocket 메시지 핸들러
function handleWebSocketMessage(event) {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'player_list':
      players = data.players;
      updatePlayerList(players);
      break;
      case 'game_state':
      // 게임 상태 완전히 새로고침
      players = data.players || {};
      ball = data.ball || { x: canvas.width / 2, y: canvas.height / 2, radius: 10, vx: 0, vy: 0 };
      
      // 로컬 플레이어의 팀과 위치 설정
      if (data.team) {
        localPlayer.team = data.team;
        localPlayer.color = data.team;
        localPlayer.x = data.team === 'blue' ? 100 : 700;
      }
      
      updatePlayerList(players);
      break;
    case 'ball_update':
      updateBallState(data.ball);
      break;
    case 'player_update':
       // 다른 플레이어의 위치 업데이트
      players[data.playerId] = data.player;
      break;
    case 'scores_update':
      updateScores(data.scores);
      break;
    case 'player_joined':
      players[data.player.id] = data.player;
      updatePlayerList(players);
      break;
    case 'player_left':
      delete players[data.playerId];
      updatePlayerList(players);
      break;
    case 'team_assignment':
      localPlayer.team = data.team;
      localPlayer.color = data.team;
      break;
  }
}

// WebSocket 닫기 핸들러
function handleWebSocketClose() {
  console.log('WebSocket connection closed');
  isConnected = false;
  statusElement.textContent = '서버 연결이 끊겼습니다. 재연결 중...';
  setTimeout(connectWebSocket, 3000);
}

// WebSocket 에러 핸들러
function handleWebSocketError(error) {
  console.error('WebSocket Error:', error);
  statusElement.textContent = '서버 연결 오류 발생';
}

// 플레이어 목록 업데이트 함수
function updatePlayerList(playerList) {
  const playerListElement = document.getElementById('playerList');
  playerListElement.innerHTML = '';
  
  Object.values(playerList).forEach(player => {
    const div = document.createElement('div');
    div.textContent = `${player.name} (${player.team})`;
    div.style.color = player.team === 'blue' ? '#4a9eff' : '#ff4a4a';
    playerListElement.appendChild(div);
  });
}

// 게임 상태 업데이트 함수
function updateGameState(data) {
  players = data.players || {};
  ball = data.ball || { x: canvas.width / 2, y: canvas.height / 2, radius: 10, vx: 0, vy: 0 };
  
  if (data.team) {
    localPlayer.team = data.team;
    localPlayer.color = data.team;
    localPlayer.x = data.team === 'blue' ? 100 : 700;
  }
  
}

// 공 상태 업데이트 함수
function updateBallState(newBallState) {
  ball.x = newBallState.x;
  ball.y = newBallState.y;
  ball.vx = newBallState.vx;
  ball.vy = newBallState.vy;
}

// 점수 업데이트 함수
function updateScores(newScores) {
  scores = newScores;
  document.getElementById('blueScore').textContent = `Blue: ${scores.blue}`;
  document.getElementById('redScore').textContent = `Red: ${scores.red}`;
}

// 키보드 이벤트 리스너 추가
function addKeyboardListeners() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

// 키 다운 이벤트 핸들러
function handleKeyDown(e) {
  //alert("enter key"+e.code);
  // 모든 키에 대해 상태 업데이트
  if (e.code in keys) {
    keys[e.code] = true;
  }

  // 서버에 키 상태 전송
  sendKeyInputToServer();
}

// 키 업 이벤트 핸들러
function handleKeyUp(e) {
  // 모든 키에 대해 상태 업데이트
  if (e.code in keys) {
    keys[e.code] = false;
  }

  // 서버에 키 상태 전송
  sendKeyInputToServer();
}

// 서버에 키 입력 전송
function sendKeyInputToServer() {
  if (isConnected) {
    socket.send(JSON.stringify({
      type: 'player_input',
      keys: keys
    }));
  }
}




// 그리기 함수
function draw() {
    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2ecc71');   // 밝은 잔디색
    gradient.addColorStop(1, '#27ae60');   // 어두운 잔디색
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // 필드 라인 그리기
    drawFieldLines();
  
    // 골대 그리기
    drawDetailedGoals();
  
    // 플레이어 그리기
    drawPlayers();
  
    // 공 그리기
    drawBall();
  }
  

// 골대 그리기
function drawGoals() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, (canvas.height - GOAL_SIZE.height) / 2, GOAL_SIZE.width, GOAL_SIZE.height);
  ctx.fillRect(canvas.width - GOAL_SIZE.width, (canvas.height - GOAL_SIZE.height) / 2, GOAL_SIZE.width, GOAL_SIZE.height);
}

// 플레이어 그리기
// function drawPlayers() {
//   Object.values(players).forEach(player => {
//     if (player.id !== localPlayer.id) {
//       //alert(player.team);
//       ctx.fillStyle = player.color || (player.team === 'blue' ? '#4a9eff' : '#ff4a4a');
//       ctx.fillRect(player.x, player.y, player.width, player.height);
//     }
//   });

//   // 로컬 플레이어 그리기
//   ctx.fillStyle = localPlayer.team === 'blue' ? '#4a9eff' : '#ff4a4a';
//   ctx.fillRect(localPlayer.x, localPlayer.y, localPlayer.width, localPlayer.height);
// }
// drawPlayers 함수도 약간 조정
function drawPlayers() {
    Object.values(players).forEach(player => {
      if (player.id !== localPlayer.id) {
        drawPlayerSVG(player.x, player.y, player.width, player.height, player.color);
      }
    });
  
    // 로컬 플레이어 그리기
    drawPlayerSVG(localPlayer.x, localPlayer.y, localPlayer.width, localPlayer.height, localPlayer.color);
  }
  
  
  function drawPlayerSVG(x, y, width, height, color) {
    // 스케일링을 고려한 SVG 그리기
    const scaleX = width / 50;
    const scaleY = height / 70;
  
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    
    // 머리
    ctx.beginPath();
    ctx.arc(25, 15, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // 몸통
    ctx.beginPath();
    ctx.moveTo(25, 25);
    ctx.lineTo(25, 45);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // 팔
    ctx.beginPath();
    ctx.moveTo(25, 30);
    ctx.lineTo(15, 40);
    ctx.moveTo(25, 30);
    ctx.lineTo(35, 40);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 다리
    ctx.beginPath();
    ctx.moveTo(25, 45);
    ctx.lineTo(20, 60);
    ctx.moveTo(25, 45);
    ctx.lineTo(30, 60);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
  }

// 공 그리기
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

// 필드 라인 상세 그리기
function drawFieldLines() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
  
    // 중앙선
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
  
    // 중앙 원
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
  
    // 페널티 박스 (왼쪽)
    ctx.strokeRect(
      0, 
      canvas.height / 2 - 100, 
      100, 
      200
    );
  
    // 페널티 박스 (오른쪽)
    ctx.strokeRect(
      canvas.width - 100, 
      canvas.height / 2 - 100, 
      100, 
      200
    );
  
    // 중앙 점
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
  
  // 골대 상세 그리기
  function drawDetailedGoals() {
    // 왼쪽 골대 (Blue 팀)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, (canvas.height - GOAL_SIZE.height) / 2, GOAL_SIZE.width, GOAL_SIZE.height);
    
    // 오른쪽 골대 (Red 팀)
    ctx.fillRect(
      canvas.width - GOAL_SIZE.width, 
      (canvas.height - GOAL_SIZE.height) / 2, 
      GOAL_SIZE.width, 
      GOAL_SIZE.height
    );
  
    // 골대 네트 효과 (약간의 그림자와 선)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1;
    
    // 왼쪽 골대 네트 효과
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (canvas.height - GOAL_SIZE.height) / 2 + i * (GOAL_SIZE.height / 10));
      ctx.lineTo(GOAL_SIZE.width, (canvas.height - GOAL_SIZE.height) / 2 + i * (GOAL_SIZE.height / 10));
      ctx.stroke();
    }
  
    // 오른쪽 골대 네트 효과
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(
        canvas.width - GOAL_SIZE.width, 
        (canvas.height - GOAL_SIZE.height) / 2 + i * (GOAL_SIZE.height / 10)
      );
      ctx.lineTo(
        canvas.width, 
        (canvas.height - GOAL_SIZE.height) / 2 + i * (GOAL_SIZE.height / 10)
      );
      ctx.stroke();
    }
  }

// 공 업데이트 함수
function updateBall() {

  const currentTime = Date.now();
  const deltaTime = (currentTime - lastUpdateTime) / 1000;
  lastUpdateTime = currentTime;

  // 공 위치 업데이트
  ball.x += ball.vx * deltaTime * 60;
  ball.y += ball.vy * deltaTime * 60;

  // 벽 충돌 처리
  handleWallCollision();

  // 플레이어 충돌 처리
  handlePlayerCollisions();

  // 마찰력 적용
  applyFriction();

  // 골 체크
  checkGoal();

  // 작은 속도는 0으로 만들기
  resetLowSpeeds();

  // WebSocket으로 ball 상태 전송
  sendBallUpdate();
}

// 벽 충돌 처리
function handleWallCollision() {
  if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
    ball.vx *= -0.8;
    ball.x = ball.x - ball.radius < 0 ? ball.radius : canvas.width - ball.radius;
  }

  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.vy *= -0.8;
    ball.y = ball.y - ball.radius < 0 ? ball.radius : canvas.height - ball.radius;
  }
}

// 플레이어 충돌 처리
function handlePlayerCollisions() {
  const playerList = [...Object.values(players), localPlayer];

  playerList.forEach(player => {
    if (checkCollision(ball, player)) {
      const dx = ball.x - (player.x + player.width / 2);
      const dy = ball.y - (player.y + player.height / 2);
      const angle = Math.atan2(dy, dx);

      // 공이 멈춰있을 경우 최소 속도를 설정
      const minSpeed = 3; // 최소 속도
      if (ball.vx === 0 && ball.vy === 0) {
        ball.vx = Math.cos(angle) * minSpeed;
        ball.vy = Math.sin(angle) * minSpeed;
      } else {
        // 공이 움직이고 있다면 기존 로직 적용
        const collisionForce = 5;
        ball.vx = Math.cos(angle) * collisionForce;
        ball.vy = Math.sin(angle) * collisionForce;
      }
    }
  });
}


// 마찰력 적용
function applyFriction() {
  ball.vx *= 0.98;
  ball.vy *= 0.98;
}

// 낮은 속도 리셋
function resetLowSpeeds() {
  if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
  if (Math.abs(ball.vy) < 0.01) ball.vy = 0;
}

// 공 상태 전송
function sendBallUpdate() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'ball_update',
      ball: ball
    }));
  }
}

// 충돌 체크 함수 수정
function checkCollision(ball, player) {
    // 플레이어의 중심점 계산
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
  
    // 충돌 박스 크기 조정 (원형 히트박스)
    const hitboxRadius = Math.min(player.width, player.height) / 2;
  
    // 공과 플레이어 중심 사이의 거리 계산
    const dx = ball.x - playerCenterX;
    const dy = ball.y - playerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
  
    // 충돌 판정
    return distance < (ball.radius + hitboxRadius);
  }

// 골 체크 함수
function checkGoal() {
  // 왼쪽 골대 (blue 팀)
  if (ball.x - ball.radius < GOAL_SIZE.width && 
      ball.y > (canvas.height - GOAL_SIZE.height) / 2 && 
      ball.y < (canvas.height + GOAL_SIZE.height) / 2) {
    scores.red++;
    celebrateGoal('red');
    resetBall();
    return true;
  } 
  // 오른쪽 골대 (red 팀)
  else if (ball.x + ball.radius > canvas.width - GOAL_SIZE.width && 
           ball.y > (canvas.height - GOAL_SIZE.height) / 2 && 
           ball.y < (canvas.height + GOAL_SIZE.height) / 2) {
    scores.blue++;
    celebrateGoal('blue');
    resetBall();
    return true;
  }
  return false;
}

// 골 시 축하 함수
function celebrateGoal(team) {
  statusElement.textContent = `🎉 ${team.toUpperCase()} 팀 골!!!`;
  statusElement.style.color = team === 'blue' ? '#4a9eff' : '#ff4a4a';
  setTimeout(() => {
    statusElement.textContent = '';
  }, 2000);

  // 점수 업데이트를 서버에 전송
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'scores_update',
      scores: scores
    }));
  }
}

// 공 리셋 함수
function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    vx: 0,
    vy: 0,
    lastUpdate: Date.now()
  };

  // 공 리셋을 서버에 전송
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'ball_update',
      ball: ball
    }));
  }
}



// 로컬 플레이어 업데이트 함수
function updateLocalPlayer() {
const baseSpeed = 2;
const dashSpeed = 2; // 대쉬 속도 증가
const normalSpeed = 1; // 일반 이동 속도 계수

// Shift 키 누르고 있을 때 대쉬 속도 적용
const speedMultiplier = keys.ShiftLeft ? dashSpeed : normalSpeed;
const speed = baseSpeed * speedMultiplier;

  // 화살표 키 지원
if (keys.ArrowUp || keys.KeyW) localPlayer.y -= speed;
if (keys.ArrowDown || keys.KeyS) localPlayer.y += speed;
if (keys.ArrowLeft || keys.KeyA) localPlayer.x -= speed;
if (keys.ArrowRight || keys.KeyD) localPlayer.x += speed;

// 캔버스 경계 제한
localPlayer.x = Math.max(0, Math.min(canvas.width - localPlayer.width, localPlayer.x));
localPlayer.y = Math.max(0, Math.min(canvas.height - localPlayer.height, localPlayer.y));

// 대쉬 시각적 표시 (선택적)
if (keys.ShiftLeft) {
localPlayer.color = localPlayer.team === 'blue' ? '#87CEFA' : '#FF6347'; // 밝은 색상으로 변경
} else {
// 원래 팀 색상으로 복원
localPlayer.color = localPlayer.team === 'blue' ? '#4a9eff' : '#ff4a4a';
}

// 플레이어 상태를 서버에 전송
if (socket && socket.readyState === WebSocket.OPEN) {
socket.send(JSON.stringify({
  type: 'player_update',
  playerId: localPlayer.id,
  player: localPlayer
}));
}
}

// 게임 루프
function gameLoop() {
  updateLocalPlayer();
    updateBall();
  draw();
  requestAnimationFrame(gameLoop);
}

// 초기화 함수
function init() {
  connectWebSocket();
  addKeyboardListeners();
  gameLoop();

  // 창이 닫힐 때 연결 종료
  window.addEventListener('beforeunload', () => {
    if (isConnected) {
      socket.send(JSON.stringify({
        type: 'disconnect',
        playerId: localPlayer.id
      }));
      socket.close();
    }
  });
}

// 게임 시작
init();