const playerNameInput = document.getElementById('playerNameInput');
    const blueTeamBtn = document.getElementById('blueTeamBtn');
    const redTeamBtn = document.getElementById('redTeamBtn');
    const startGameBtn = document.getElementById('startGameBtn');

    let selectedTeam = null;

    playerNameInput.addEventListener('input', validateForm);
    blueTeamBtn.addEventListener('click', () => selectTeam('blue'));
    redTeamBtn.addEventListener('click', () => selectTeam('red'));
    startGameBtn.addEventListener('click', startGame);

    function selectTeam(team) {
      selectedTeam = team;
      blueTeamBtn.style.opacity = team === 'blue' ? '1' : '0.6';
      redTeamBtn.style.opacity = team === 'red' ? '1' : '0.6';
      validateForm();
    }

    function validateForm() {
      const playerName = playerNameInput.value.trim();
      startGameBtn.disabled = !(playerName && selectedTeam);
    }

    function startGame() {
      const playerName = playerNameInput.value.trim();
      
      // 게임 화면으로 리다이렉트 또는 게임 초기화
      sessionStorage.setItem('playerName', playerName);
      sessionStorage.setItem('playerTeam', selectedTeam);
      
      // 게임 페이지로 이동 (기존 게임 HTML 경로)
      window.location.href = 'game.html';
    }