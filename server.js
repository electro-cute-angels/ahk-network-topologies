// ===================== server.js =====================
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let gameInProgress = false;
let currentTurn = 0;

io.on('connection', (socket) => {
  const player = { id: null, socket, ready: false, word: null };
  players.push(player);
  updatePlayerIds();

  socket.emit('assigned-id', player.id);
  io.emit('update-ready-count', countReady(), players.length);

  socket.on('player-ready', () => {
    player.ready = true;
    io.emit('update-ready-count', countReady(), players.length);
    if (countReady() === players.length) startGame();
  });

  socket.on('submit-word', (word) => {
    player.word = word;
    socket.emit('display-word', word);
    nextTurn();
  });

  socket.on('request-reset', () => {
    if (player.id === 0) resetGame();
  });

  socket.on('disconnect', () => {
    const wasInGame = gameInProgress;
    players = players.filter(p => p.socket !== socket);
    updatePlayerIds();
    if (!wasInGame) {
      io.emit('reset');
    } else {
      io.emit('disconnect-during-game');
      resetGame();
    }
  });
});

function countReady() {
  return players.filter(p => p.ready).length;
}

function updatePlayerIds() {
  players.forEach((p, i) => {
    p.id = i;
    p.socket.emit('assigned-id', i);
  });
}

function startGame() {
  gameInProgress = true;
  currentTurn = 0;
  players.forEach(p => p.ready = false);
  io.emit('game-started');
  startTurn(currentTurn);
}

function startTurn(index) {
  if (index >= players.length) {
    io.emit('game-ended');
    return;
  }
  const player = players[index];
  player.socket.emit('your-turn');
  io.emit('turn-indicator', index);
  setTimeout(() => {
    if (!player.word) {
      player.socket.emit('auto-submit');
      player.word = '';
      player.socket.emit('display-word', '');
      nextTurn();
    }
  }, 6000);
}

function nextTurn() {
  currentTurn++;
  startTurn(currentTurn);
}

function resetGame() {
  players = [];
  gameInProgress = false;
  currentTurn = 0;
  io.emit('reset');
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));