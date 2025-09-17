/*
 * This file is part of Snake-Game.
 * Copyright (C) isMnw
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const moveSound = document.getElementById("moveSound");
const eatSound = document.getElementById("eatSound");
const gameOverSound = document.getElementById("gameOverSound");
const scoreEl = document.getElementById("score");
const lengthEl = document.getElementById("length");
const levelEl = document.getElementById("level");
const highScoreVal = document.getElementById("highScoreVal");
const msg = document.getElementById("msg");
const speedRange = document.getElementById("speedRange");
const speedVal = document.getElementById("speedVal");
const mapRes = document.getElementById("mapRes");
const mapValW = document.getElementById("mapValW");
const mapValH = document.getElementById("mapValH");
const staticLvl = document.getElementById("staticLvl");

// game settings
let gridSize = 30; // cell size in pixels
let mapArea = Number(mapRes.value);
let cols = mapArea;
let rows = Math.floor((mapArea * 2) / 3);

let snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
let dir = { x: 1, y: 0 }; // moving right initially
let nextDir = null; // queued direction to avoid reverse
let apple = null;
let score = 0;
let paused = true;
let gameOver = false;
let highScore = Number(localStorage.getItem("snake_high") || 0);
let staticVal = false;
let baseSpeed = Number(speedRange.value); // ticks per second
let tickInterval = 1000 / baseSpeed;
let lastTick = 0;
let level = 1;

highScoreVal.textContent = highScore;
speedVal.textContent = baseSpeed;
mapValW.textContent = cols;
mapValH.textContent = rows;

function setCanvas() {
  cols = mapArea;
  rows = Math.floor((mapArea * 2) / 3);
  canvas.width = cols * gridSize;
  canvas.height = rows * gridSize;
}

function restartGame() {
  moveSound.pause();
  moveSound.currentTime = 0;
  setCanvas();
  snake = [{ x: Math.floor(cols / 3), y: Math.floor(rows / 2) }];
  dir = { x: 1, y: 0 };
  nextDir = null;
  spawnApple();
  score = 0;
  level = 1;
  gameOver = false;
  paused = true;
  updateHUD();
  msg.textContent = "Ready — press Play";
}

function resetGame() {
  restartGame();
}

function spawnApple() {
  let tries = 0;
  while (true) {
    const ax = Math.floor(Math.random() * cols);
    const ay = Math.floor(Math.random() * rows);
    let collide = snake.some((s) => s.x === ax && s.y === ay);
    if (!collide) {
      apple = { x: ax, y: ay };
      break;
    }
    if (++tries > 200) {
      break;
    }
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  lengthEl.textContent = snake.length;
  levelEl.textContent = level;
}

function setDirection(x, y) {
  // prevent reversing
  if (dir.x === -x && dir.y === -y) return;
  // queue next direction to apply on next tick
  nextDir = { x, y };
}

// handle keyboard input
window.addEventListener("keydown", (e) => {
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D",
    ].includes(e.key)
  ) {
    e.preventDefault();
  }
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
    setDirection(0, -1);
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
    setDirection(0, 1);
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
    setDirection(-1, 0);
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
    setDirection(1, 0);

  if (e.key === "p" || e.key === "P") {
    // P to pause
    togglePause();
  }

  if (e.key === "r" || e.key === "R") {
    // R to restart
    restartGame();
    msg.textContent = "Restarted";
  }

  if (e.key === "Enter") {
    // Enter to play/resume
    if (gameOver) restartGame();
    paused = false;
    msg.textContent = "Playing";
  }
});

// buttons
function playBtn() {
  if (gameOver) restartGame();
  paused = false;
  msg.textContent = "Playing";
}

function restartBtn() {
  restartGame();
  paused = true;
  msg.textContent = "Restarted";
}

speedRange.addEventListener("input", () => {
  baseSpeed = Number(speedRange.value);
  speedVal.textContent = baseSpeed;
  tickInterval = 1000 / baseSpeed;
});
mapRes.addEventListener("input", () => {
  mapArea = Number(mapRes.value);
  setCanvas();
  mapValW.textContent = cols;
  mapValH.textContent = rows;
  restartGame();
});

function statusSwitch() {
  staticVal = !staticVal;
  staticLvl.style.background = staticVal
    ? "linear-gradient(45deg, var(--panel), var(--panel-2))"
    : "var(--glass)";
  staticLvl.textContent = staticVal ? " On " : " Off ";
}

function togglePause() {
  while (!gameOver) {
    paused = !paused;
    msg.textContent = paused ? "Paused" : "Playing";
    return;
  }
}

function resetHighBtn() {
  localStorage.removeItem("snake_high");
  highScore = 0;
  highScoreVal.textContent = 0;
  msg.textContent = "High score reset";
}

function tick() {
  // apply queued direction
  if (nextDir) {
    dir = nextDir;
    nextDir = null;
  }

  // move head
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // wall collision -> game over
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    endGame();
    return;
  }

  // self collision
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      endGame();
      return;
    }
  }
  // add new head

  snake.unshift(head);

  // eat apple
  if (apple && head.x === apple.x && head.y === apple.y) {
    score += 10;
    if (score % 100 === 0) levelUp();
    spawnApple();
    eatSound.currentTime = 0;
    eatSound.play();
  } else {
    snake.pop();
  }

  updateHUD();
}

function levelUp() {
  while (!staticVal) {
    level += 1;
    // make game slightly faster
    baseSpeed = Math.min(100, baseSpeed + 1);
    speedRange.value = baseSpeed;
    speedVal.textContent = baseSpeed;
    tickInterval = 1000 / baseSpeed;
    msg.textContent = "Level up! " + level;
    return tick();
  }
}

function endGame() {
  gameOverSound.play();
  paused = true;
  gameOver = true;
  msg.textContent = "Game over — Score: " + score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snake_high", highScore);
    highScoreVal.textContent = highScore;
    msg.textContent += " — New High Score!";
  }
}

function draw() {
  // background
  ctx.fillStyle = "#222831";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid (subtle) - drawn as faint lines for texture
  ctx.strokeStyle = "#22283100";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * gridSize, 0);
    ctx.lineTo(x * gridSize, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * gridSize);
    ctx.lineTo(canvas.width, y * gridSize);
    ctx.stroke();
  }

  // apple
  if (apple) {
    drawCell(apple.x, apple.y, "#ef4444");
    // little shine
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(
      apple.x * gridSize + gridSize * 0.2,
      apple.y * gridSize + gridSize * 0.12,
      gridSize * 0.28,
      gridSize * 0.18
    );
    // stem
    ctx.fillStyle = "rgba(116, 63, 20, 1)";
    ctx.fillRect(
      apple.x * gridSize + gridSize * 0.4,
      apple.y * gridSize + gridSize * -0.1,
      gridSize * 0.2,
      gridSize * 0.3
    );
  }

  // snake
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const isHead = i === 0;
    const color = isHead ? "linear" : "body";
    if (isHead) {
      drawCell(s.x, s.y, "#0cac26ff");
      // eye
      ctx.fillStyle = "#042927";
      const eyeSize = Math.max(2, gridSize * 0.12);
      ctx.fillRect(
        s.x * gridSize + gridSize * 0.65,
        s.y * gridSize + gridSize * 0.2,
        eyeSize,
        eyeSize
      );
      ctx.fillRect(
        s.x * gridSize + gridSize * 0.25,
        s.y * gridSize + gridSize * 0.2,
        eyeSize,
        eyeSize
      );
    } else {
      // slightly darker body gradient effect by mixing two fills
      drawCell(s.x, s.y, "#34d334ff");
    }
  }
}

function drawCell(cx, cy, color) {
  const x = cx * gridSize,
    y = cy * gridSize;
  // base
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
  // subtle inner shadow to suggest simple texture
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + 1, y + gridSize * 0.65, gridSize - 2, gridSize * 0.35);
}

// main loop
function loop(ts) {
  if (!lastTick) lastTick = ts;
  const delta = ts - lastTick;
  if (!paused && delta >= tickInterval) {
    tick();
    lastTick = ts;
  }
  draw();
  requestAnimationFrame(loop);
}

// resize handling (recalculate grid)
window.addEventListener("resize", () => {
  // keep canvas size as is but adapt grid count
  setCanvas();
});

// init
restartGame();
requestAnimationFrame(loop);
