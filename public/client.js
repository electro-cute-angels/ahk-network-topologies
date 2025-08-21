const socket = io();
let playerId = null;
let isMyTurn = false;

const body = document.body;
const input = document.getElementById('word-input');
const readyBtn = document.getElementById('ready-btn');
const resetBtn = document.getElementById('reset-btn');
const info = document.getElementById('info');
const beep = document.getElementById('beep');
const timerBar = document.getElementById('timer-bar');
const timerFill = document.getElementById('timer-fill');

const canvas = document.getElementById('word-canvas');
const ctx = canvas.getContext('2d');

function drawWord(word) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
  
    // clear canvas
    ctx.clearRect(0, 0, w, h);
  
    // preload font
    document.fonts.load('100px Sprintura').then(() => {
      ctx.save();
      ctx.fillStyle = 'rgb(255,255,0)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
  
      // 1. Draw at known size in center
      const baseFontSize = 100;
      ctx.font = `${baseFontSize}px Sprintura`;
      const metrics = ctx.measureText(word);
      const textWidth = metrics.width;
      const textHeight = baseFontSize; // approx, since canvas can't measure true height
  
      // 2. Calculate scaling factors
      const scaleX = w / textWidth;
      const scaleY = (h / textHeight)*1.3;
  
      // 3. Apply scale to stretch to full screen
      ctx.translate(w / 2, h / 2);
      ctx.scale(scaleX, scaleY);
  
      // 4. Draw stretched word
      ctx.fillText(word.toUpperCase(), 0, 0);
      ctx.restore();
    });
  }
socket.on('assigned-id', (id) => {
  playerId = id;
  info.textContent = `You are Player ${id}`;
});

socket.on('update-ready-count', (ready, total) => {
  info.textContent = `Players Ready: ${ready}/${total}`;
});

socket.on('game-started', () => {
  readyBtn.style.display = 'none';
  info.textContent = 'Game Started!';
});

socket.on('your-turn', () => {
  isMyTurn = true;

  // green background
  body.style.backgroundColor = '#00ff00';

  // input box
  input.style.display = 'block';
  input.value = '';
  input.focus();

  // timer
  timerBar.style.display = 'block';
  timerFill.style.transition = 'none';
  timerFill.style.width = '0%';
  setTimeout(() => {
    timerFill.style.transition = 'width 6s linear';
    timerFill.style.width = '100%';
  }, 50);

  // sound
  beep.play();
});

socket.on('turn-indicator', (currentId) => {
  if (currentId !== playerId) {
    isMyTurn = false;
    body.style.backgroundColor = '#222';
    input.style.display = 'none';
    timerBar.style.display = 'none';
    timerFill.style.width = '0%';
  }
});

socket.on('auto-submit', () => {
  if (isMyTurn) {
    socket.emit('submit-word', input.value || '');
  }
});

socket.on('display-word', (word) => {
  input.style.display = 'none';
  drawWord(word);
  body.style.backgroundColor = 'black';
  timerBar.style.display = 'none';
});

socket.on('game-ended', () => {
  if (playerId === 0) resetBtn.style.display = 'block';
});

socket.on('reset', () => {
  window.location.reload();
});

socket.on('disconnect-during-game', () => {
  alert('A player left. Game has been reset.');
  window.location.reload();
});

socket.on('game-already-started', () => {
  info.textContent = 'Game already in progress. Please wait.';
  readyBtn.style.display = 'none';
});

readyBtn.onclick = () => {
  socket.emit('player-ready');
  readyBtn.disabled = true;
  readyBtn.textContent = 'WAITING...';
};

resetBtn.onclick = () => {
  socket.emit('request-reset');
};

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && isMyTurn) {
    socket.emit('submit-word', input.value || '');
    isMyTurn = false;
    timerFill.style.width = '0%';
    timerBar.style.display = 'none';
  }
});
