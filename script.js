// Game state
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameMode = 'pvp';
let gameActive = true;
let scores = { X: 0, O: 0, draw: 0 };
let isAiThinking = false;

// Winning combinations
const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

// DOM elements
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');
const labelOEl = document.getElementById('label-o');
const modeBtns = document.querySelectorAll('.mode-btn');
const newGameBtn = document.getElementById('new-game');
const resetScoresBtn = document.getElementById('reset-scores');

// Sound effects using Web Audio API
function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'click') {
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.15 + 0.3);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
      });
    } else if (type === 'draw') {
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'ai') {
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.08);
    }
  } catch (e) {
    // Silently fail if audio not supported
  }
}

// Check for winner
function checkWinner(boardState) {
  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      return { winner: boardState[a], line: combo };
    }
  }
  return { winner: null, line: null };
}

// Update status display
function updateStatus(message, className = '') {
  statusEl.textContent = message;
  statusEl.className = 'status' + (className ? ' ' + className : '');
}

// Update scores
function updateScores() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
}

// Handle cell click
function handleCellClick(e) {
  const index = parseInt(e.target.dataset.index);
  
  if (board[index] || !gameActive || isAiThinking) return;
  
  // Prevent user from clicking when it's AI's turn
  if (gameMode === 'ai' && currentPlayer === 'O') return;

  playSound('click');
  makeMove(index, 'click');

  // Trigger AI move if it's AI's turn
  if (gameActive && gameMode === 'ai' && currentPlayer === 'O') {
    isAiThinking = true;
    updateStatus('AI is thinking...');
    setTimeout(() => {
      makeAiMove();
      isAiThinking = false;
    }, 600);
  }
}

// Make a move
function makeMove(index, moveType = 'normal') {
  board[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase(), 'taken');
  
  if (moveType === 'ai') {
    playSound('ai');
  }

  const { winner, line } = checkWinner(board);
  
  if (winner) {
    gameActive = false;
    cells.forEach(c => c.classList.add('game-over'));
    line.forEach(i => cells[i].classList.add('winning'));
    
    scores[winner]++;
    updateScores();
    
    const winnerName = gameMode === 'ai' && winner === 'O' ? 'AI' : `Player ${winner}`;
    updateStatus(`${winnerName} Wins!`, 'won');
    setTimeout(() => playSound('win'), 100);
  } else if (!board.includes('')) {
    gameActive = false;
    cells.forEach(c => c.classList.add('game-over'));
    scores.draw++;
    updateScores();
    updateStatus("It's a Draw!", 'draw');
    setTimeout(() => playSound('draw'), 100);
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    const playerName = gameMode === 'ai' && currentPlayer === 'O' ? 'AI' : `Player ${currentPlayer}`;
    updateStatus(`${playerName}'s Turn`);
  }
}

// AI move logic
function makeAiMove() {
  if (!gameActive) {
    isAiThinking = false;
    return;
  }

  const availableMoves = board.map((s, i) => s === '' ? i : -1).filter(i => i !== -1);
  if (availableMoves.length === 0) return;

  let move = -1;
  
  // Try to win
  for (const idx of availableMoves) {
    const testBoard = [...board];
    testBoard[idx] = 'O';
    if (checkWinner(testBoard).winner === 'O') {
      move = idx;
      break;
    }
  }

  // Block player from winning
  if (move === -1) {
    for (const idx of availableMoves) {
      const testBoard = [...board];
      testBoard[idx] = 'X';
      if (checkWinner(testBoard).winner === 'X') {
        move = idx;
        break;
      }
    }
  }

  // Take center
  if (move === -1 && board[4] === '') {
    move = 4;
  }

  // Random move
  if (move === -1) {
    move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  makeMove(move, 'ai');
}

// Reset game
function resetGame() {
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameActive = true;
  isAiThinking = false;
  
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
  });
  
  updateStatus("Player X's Turn");
}

// Reset scores
function resetScores() {
  scores = { X: 0, O: 0, draw: 0 };
  updateScores();
  resetGame();
}

// Change game mode
function changeMode(mode) {
  gameMode = mode;
  labelOEl.textContent = mode === 'ai' ? 'AI' : 'Player O';
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  resetGame();
}

// Event listeners
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
newGameBtn.addEventListener('click', resetGame);
resetScoresBtn.addEventListener('click', resetScores);
modeBtns.forEach(btn => btn.addEventListener('click', () => changeMode(btn.dataset.mode)));
