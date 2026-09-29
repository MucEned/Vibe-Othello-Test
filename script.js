const SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

const boardElement = document.querySelector('#board');
const blackScoreElement = document.querySelector('#black-score');
const whiteScoreElement = document.querySelector('#white-score');
const blackLabelElement = document.querySelector('#black-label');
const whiteLabelElement = document.querySelector('#white-label');
const turnMessageElement = document.querySelector('#turn-message');
const statusLightElement = document.querySelector('#status-light');
const moveCounterElement = document.querySelector('#move-counter');
const resultModal = document.querySelector('#result-modal');
const resultTitle = document.querySelector('#result-title');
const resultMessage = document.querySelector('#result-message');
const difficultySwitcher = document.querySelector('#difficulty-switcher');

const translations = {
  en: {
    topbarNote: 'FLIP THE BOARD · 64 CELLS',
    eyebrow: 'Strategic board game',
    titleStart: 'Claim',
    titleEnd: 'every square.',
    black: 'Black',
    white: 'White',
    you: 'You',
    computer: 'Computer',
    playerOne: 'Player 1',
    playerTwo: 'Player 2',
    gameMode: 'Game mode',
    local: '2 players',
    difficulty: 'Difficulty',
    newGame: 'New game',
    playAgain: 'Play again',
    gameOver: 'GAME OVER',
    thinking: 'Computer is thinking...',
    turn: (player) => `${player}'s turn`,
    move: (number) => `MOVE ${String(number).padStart(2, '0')}`,
    draw: 'Draw',
    blackWins: 'Black wins',
    whiteWins: 'White wins',
    legalMove: 'legal move',
    result: (black, white, isDraw) => `Final score: Black ${black} - White ${white}. ${isDraw ? 'No one gives way.' : 'The board has been decided.'}`
  },
  vi: {
    topbarNote: 'LẬT THẾ CỜ · 64 Ô',
    eyebrow: 'Bàn cờ chiến thuật',
    titleStart: 'Chiếm lấy',
    titleEnd: 'từng ô.',
    black: 'Đen',
    white: 'Trắng',
    you: 'Bạn',
    computer: 'Máy',
    playerOne: 'Người chơi 1',
    playerTwo: 'Người chơi 2',
    gameMode: 'Chế độ chơi',
    local: '2 người',
    difficulty: 'Độ khó',
    newGame: 'Ván mới',
    playAgain: 'Chơi lại',
    gameOver: 'VÁN ĐẤU KẾT THÚC',
    thinking: 'Máy đang nghĩ...',
    turn: (player) => `Lượt ${player}`,
    move: (number) => `NƯỚC ĐI ${String(number).padStart(2, '0')}`,
    draw: 'Hòa cờ',
    blackWins: 'Đen thắng',
    whiteWins: 'Trắng thắng',
    legalMove: 'nước đi hợp lệ',
    result: (black, white, isDraw) => `Kết quả cuối cùng: Đen ${black} - ${white} Trắng. ${isDraw ? 'Không ai nhường ai.' : 'Thế trận đã được định đoạt.'}`
  }
};

let board = [];
let currentPlayer = BLACK;
let mode = 'computer';
let difficulty = 3;
let language = 'en';
let moveNumber = 1;
let gameOver = false;
let computerTimer = null;

function t(key, ...args) {
  const value = translations[language][key];
  return typeof value === 'function' ? value(...args) : value;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key === 'newGame') {
      element.innerHTML = `<span aria-hidden="true">↻</span> ${t(key)}`;
    } else {
      element.textContent = t(key);
    }
  });
  document.querySelector('#language-button').textContent = language === 'en' ? 'VI' : 'EN';
  document.querySelector('#language-button').setAttribute('aria-label', language === 'en' ? 'Chuyển sang tiếng Việt' : 'Switch to English');
  document.querySelector('.mode-buttons').setAttribute('aria-label', t('gameMode'));
  document.querySelector('.difficulty-buttons').setAttribute('aria-label', t('difficulty'));
  document.querySelector('#board').setAttribute('aria-label', language === 'en' ? 'Othello board' : 'Bàn cờ Othello');
  document.querySelectorAll('.difficulty-button').forEach((button) => {
    button.setAttribute('aria-label', `${t('difficulty')} ${button.dataset.difficulty}`);
  });
}

function createInitialBoard() {
  const nextBoard = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  nextBoard[3][3] = WHITE;
  nextBoard[3][4] = BLACK;
  nextBoard[4][3] = BLACK;
  nextBoard[4][4] = WHITE;
  return nextBoard;
}

function inBounds(row, column) {
  return row >= 0 && row < SIZE && column >= 0 && column < SIZE;
}

function getFlips(row, column, player, state = board) {
  if (!inBounds(row, column) || state[row][column] !== EMPTY) return [];
  const opponent = player === BLACK ? WHITE : BLACK;
  const flips = [];

  for (const [rowStep, columnStep] of DIRECTIONS) {
    const directionFlips = [];
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;
    while (inBounds(nextRow, nextColumn) && state[nextRow][nextColumn] === opponent) {
      directionFlips.push([nextRow, nextColumn]);
      nextRow += rowStep;
      nextColumn += columnStep;
    }
    if (directionFlips.length && inBounds(nextRow, nextColumn) && state[nextRow][nextColumn] === player) {
      flips.push(...directionFlips);
    }
  }
  return flips;
}

function getLegalMoves(player, state = board) {
  const moves = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const flips = getFlips(row, column, player, state);
      if (flips.length) moves.push({ row, column, flips });
    }
  }
  return moves;
}

function makeMove(row, column, player) {
  const flips = getFlips(row, column, player);
  if (!flips.length) return false;
  board[row][column] = player;
  flips.forEach(([flipRow, flipColumn]) => { board[flipRow][flipColumn] = player; });
  return true;
}

function render(animatedPositions = new Set()) {
  const legalMoves = gameOver ? [] : getLegalMoves(currentPlayer);
  boardElement.replaceChildren();

  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const cell = document.createElement('button');
      const value = board[row][column];
      const move = legalMoves.find((candidate) => candidate.row === row && candidate.column === column);
      cell.className = `cell${move ? ' legal' : ''}`;
      cell.type = 'button';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${String.fromCharCode(65 + column)}${row + 1}${move ? `, ${t('legalMove')}` : ''}`);
      if (value !== EMPTY) {
        const disc = document.createElement('span');
        const isAnimated = animatedPositions.has(`${row},${column}`);
        disc.className = `disc ${value === BLACK ? 'black' : 'white'}${isAnimated ? ' disc-animated' : ''}`;
        disc.setAttribute('aria-hidden', 'true');
        cell.append(disc);
      }
      if (move) cell.addEventListener('click', () => playMove(row, column));
      boardElement.append(cell);
    }
  }

  const blackCount = board.flat().filter((value) => value === BLACK).length;
  const whiteCount = board.flat().filter((value) => value === WHITE).length;
  blackScoreElement.textContent = blackCount;
  whiteScoreElement.textContent = whiteCount;
  moveCounterElement.textContent = t('move', Math.min(moveNumber, 60));

  if (!gameOver) {
    const playerName = currentPlayer === BLACK ? t('black') : t('white');
    const isComputerTurn = mode === 'computer' && currentPlayer === WHITE;
    turnMessageElement.textContent = isComputerTurn ? t('thinking') : t('turn', playerName);
    statusLightElement.style.background = currentPlayer === BLACK ? 'var(--ink)' : 'var(--coral)';
  }
}

function playMove(row, column) {
  if (gameOver || (mode === 'computer' && currentPlayer === WHITE)) return;
  const flips = getFlips(row, column, currentPlayer);
  if (!flips.length || !makeMove(row, column, currentPlayer)) return;
  moveNumber += 1;
  advanceTurn(new Set([[row, column], ...flips].map(([flipRow, flipColumn]) => `${flipRow},${flipColumn}`)));
}

function advanceTurn(animatedPositions = new Set()) {
  currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  const nextMoves = getLegalMoves(currentPlayer);
  const otherPlayer = currentPlayer === BLACK ? WHITE : BLACK;

  if (!nextMoves.length) {
    if (getLegalMoves(otherPlayer).length) {
      const skippedPlayer = currentPlayer === BLACK ? 'Đen' : 'Trắng';
      currentPlayer = otherPlayer;
    } else {
      finishGame(animatedPositions);
      return;
    }
  }

  render(animatedPositions);
  if (mode === 'computer' && currentPlayer === WHITE && !gameOver) {
    window.clearTimeout(computerTimer);
    computerTimer = window.setTimeout(playComputerMove, 550);
  }
}

function playComputerMove() {
  const moves = getLegalMoves(WHITE);
  if (!moves.length) return advanceTurn();
  const bestMove = moves
    .map((move) => ({ ...move, score: scoreComputerMove(move) }))
    .sort((first, second) => second.score - first.score)[0];
  makeMove(bestMove.row, bestMove.column, WHITE);
  moveNumber += 1;
  advanceTurn(new Set([[bestMove.row, bestMove.column], ...bestMove.flips].map(([row, column]) => `${row},${column}`)));
}

function scoreComputerMove(move) {
  const positionWeight = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [5, -2, 1, 1, 1, 1, -2, 5],
    [5, -2, 1, 1, 1, 1, -2, 5],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
  ];
  const randomFactor = Math.random();
  if (difficulty === 1) return randomFactor;
  if (difficulty === 2) return move.flips.length * 10 + randomFactor;

  const positionalScore = positionWeight[move.row][move.column];
  if (difficulty === 3) return positionalScore * 4 + move.flips.length * 2 + randomFactor;

  const simulatedBoard = board.map((row) => [...row]);
  simulatedBoard[move.row][move.column] = WHITE;
  move.flips.forEach(([row, column]) => { simulatedBoard[row][column] = WHITE; });
  const opponentMoves = getLegalMoves(BLACK, simulatedBoard).length;
  const cornerBonus = positionalScore === 100 ? 200 : 0;
  return positionalScore * 6 + move.flips.length * 2 - opponentMoves * (difficulty === 5 ? 7 : 3) + cornerBonus + randomFactor;
}

function finishGame(animatedPositions = new Set()) {
  gameOver = true;
  const blackCount = board.flat().filter((value) => value === BLACK).length;
  const whiteCount = board.flat().filter((value) => value === WHITE).length;
  const isDraw = blackCount === whiteCount;
  const winner = isDraw ? t('draw') : blackCount > whiteCount ? t('blackWins') : t('whiteWins');
  resultTitle.textContent = winner;
  resultMessage.textContent = t('result', blackCount, whiteCount, isDraw);
  turnMessageElement.textContent = t('gameOver');
  render(animatedPositions);
  resultModal.classList.add('visible');
  resultModal.setAttribute('aria-hidden', 'false');
}

function startNewGame() {
  window.clearTimeout(computerTimer);
  board = createInitialBoard();
  currentPlayer = BLACK;
  moveNumber = 1;
  gameOver = false;
  resultModal.classList.remove('visible');
  resultModal.setAttribute('aria-hidden', 'true');
  blackLabelElement.textContent = mode === 'computer' ? t('you') : t('playerOne');
  whiteLabelElement.textContent = mode === 'computer' ? t('computer') : t('playerTwo');
  difficultySwitcher.classList.toggle('disabled', mode !== 'computer');
  render();
}

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    document.querySelectorAll('.mode-button').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    startNewGame();
  });
});

document.querySelectorAll('.difficulty-button').forEach((button) => {
  button.addEventListener('click', () => {
    difficulty = Number(button.dataset.difficulty);
    document.querySelectorAll('.difficulty-button').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    startNewGame();
  });
});

document.querySelector('#new-game-button').addEventListener('click', startNewGame);
document.querySelector('#modal-new-game').addEventListener('click', startNewGame);
document.querySelector('#language-button').addEventListener('click', () => {
  language = language === 'en' ? 'vi' : 'en';
  applyLanguage();
  blackLabelElement.textContent = mode === 'computer' ? t('you') : t('playerOne');
  whiteLabelElement.textContent = mode === 'computer' ? t('computer') : t('playerTwo');
  render();
});

applyLanguage();
startNewGame();
