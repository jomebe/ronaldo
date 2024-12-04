const WebSocket = require('ws');
const http = require('http');

const server = http.createServer(
  (req, res) => {
    res.writeHead(200,
      { 'Content-Type': 'text/html' });
    res.write('<h1>Ronaldo Game Realtime Server!</h1>');
    res.end();
  }
);
const wss = new WebSocket.Server({ server , path: '/ws' });

const players = {};
let ball = {
  x: 400,
  y: 200,
  radius: 10,
  vx: 0,
  vy: 0,
  lastUpdate: Date.now()
};
let scores = { blue: 0, red: 0 };



// 플레이어 목록 브로드캐스트
function broadcastPlayerList() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'player_list',
        players: players
      }));
    }
  });
}



// 공의 위치 업데이트
function updateBall() {
  const currentTime = Date.now();
  const deltaTime = (currentTime - ball.lastUpdate) / 1000;

  ball.x += ball.vx * deltaTime * 60;
  ball.y += ball.vy * deltaTime * 60;

  // 벽 충돌 및 물리 로직
  if (ball.x - ball.radius < 0 || ball.x + ball.radius > 800) {
    ball.vx *= -0.8;
    ball.x = ball.x - ball.radius < 0 ? ball.radius : 800 - ball.radius;
  }

  if (ball.y - ball.radius < 0 || ball.y + ball.radius > 400) {
    ball.vy *= -0.8;
    ball.y = ball.y - ball.radius < 0 ? ball.radius : 400 - ball.radius;
  }

  // 플레이어와의 충돌 처리 추가
  Object.values(players).forEach(player => {
    const dx = ball.x - (player.x + player.width / 2);
    const dy = ball.y - (player.y + player.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = ball.radius + Math.max(player.width, player.height) / 2;
  
    if (distance < minDistance) {
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
  

  // 마찰력 적용
  ball.vx *= 0.98;
  ball.vy *= 0.98;

  ball.lastUpdate = currentTime;

  // 매우 작은 속도는 0으로 처리
  if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
  if (Math.abs(ball.vy) < 0.01) ball.vy = 0;

  // 골 체크
  checkGoal();

  // 모든 클라이언트에게 공 상태 브로드캐스트
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'ball_update',
        ball: ball
      }));
    }
  });
}

// 골 체크
function checkGoal() {
  const goalSize = { width: 20, height: 100 };

  // 왼쪽 골대 체크
  if (ball.x - ball.radius < goalSize.width &&
    ball.y > 150 && ball.y < 250) {
    scores.red++;
    resetBall();
    return true;
  }

  // 오른쪽 골대 체크
  if (ball.x + ball.radius > 780 &&
    ball.y > 150 && ball.y < 250) {
    scores.blue++;
    resetBall();
    return true;
  }

  return false;
}

// 공 초기화
function resetBall() {
  ball = {
    x: 400,
    y: 200,
    radius: 10,
    vx: 0,
    vy: 0,
    lastUpdate: Date.now()
  };

  // 스코어 브로드캐스트
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'scores_update',
        scores: scores
      }));
    }
  });
}

// 게임 루프 (60 FPS)
setInterval(updateBall, 1000 / 144);

// WebSocket 연결 이벤트 처리 함수
function onConnection(ws) {
  const playerId = Math.random().toString(36).substring(2);
  let currentPlayerId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'connect':
        const team = Object.keys(players).length === 0 ? 'blue' : 'red';
        currentPlayerId = data.player.id;
        const player = {
          ...data.player,
          team: data.player.team,
          color: data.player.team === 'blue' ? '#4a9eff' : '#ff4a4a',
          x: data.player.team === 'blue' ? 100 : 700
        };

        players[data.player.id] = player;

        // 새 플레이어에게 현재 게임 상태 전송
        ws.send(JSON.stringify({
          type: 'game_state',
          players: players,
          ball: ball,
          team: player.team,
        }));

        // 다른 모든 클라이언트에게 새 플레이어 알림
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'player_joined',
              player: player
            }));
          }
        });

        broadcastPlayerList();
        break;

      case 'player_update':
        if (players[data.playerId]) {
          players[data.playerId] = data.player;

          // 모든 클라이언트에게 플레이어 위치 브로드캐스트
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'player_update',
                playerId: data.playerId,
                player: data.player
              }));
            }
          });
        }
        break;
        case 'player_input':
          if (players[currentPlayerId]) {
            // 키 상태를 플레이어에 반영
            const player = players[currentPlayerId];
            
            // 이동 로직 (클라이언트와 동일하게 구현)
            const baseSpeed = 2;
            const dashSpeed = 4; // 대쉬 속도
            const speedMultiplier = data.keys.Shift ? dashSpeed : 1;
            const speed = baseSpeed * speedMultiplier;
        
            if (data.keys.ArrowUp) player.y -= speed;
            if (data.keys.ArrowDown) player.y += speed;
            if (data.keys.ArrowLeft) player.x -= speed;
            if (data.keys.ArrowRight) player.x += speed;
        
            // 캔버스 경계 제한 (800x400 기준)
            player.x = Math.max(0, Math.min(800 - player.width, player.x));
            player.y = Math.max(0, Math.min(400 - player.height, player.y));
        
            // 대쉬 상태에 따라 색상 변경
            player.color = data.keys.Shift 
              ? (player.team === 'blue' ? '#87CEFA' : '#FF6347') 
              : (player.team === 'blue' ? '#4a9eff' : '#ff4a4a');
        
            // 모든 클라이언트에게 플레이어 위치 브로드캐스트
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'player_update',
                  playerId: currentPlayerId,
                  player: player
                }));
              }
            });
          }
          break;

      case 'disconnect':
        delete players[playerId];
        broadcastPlayerList();

        // 다른 모든 클라이언트에게 플레이어 나감 알림
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'player_left',
              playerId: playerId
            }));
          }
        });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`클라이언트 연결 종료: ${currentPlayerId}`);
    delete players[currentPlayerId];
    // 모든 클라이언트에게 플레이어 나감 알림
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'player_left',
          playerId: currentPlayerId
        }));
      }
    });
    broadcastPlayerList();
  });
  
  ws.on('error', (err) => {
    console.error(`클라이언트 오류: ${playerId}`, err);
  });
  
}

// WebSocket 서버 연결 이벤트
wss.on('connection', onConnection);

wss.on('error', (err) => {
  console.error('WebSocket 서버 오류:', err);
});

server.on('error', (err) => {
  console.error('HTTP 서버 오류:', err);
});

// 서버 포트 설정
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
