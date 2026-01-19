import React, { useEffect, useRef, useCallback, useState } from "react";
import useSound from 'use-sound';
import { Howler } from 'howler';

import Confetti from "./Confetti";
import Player from "./Player";
import LanguageSelector from "./LanguageSelector";
import Menu from "./Menu";
import Timer, { formatTime } from "./Timer";

import { useTranslation } from 'react-i18next';
import useVoiceControl from "../hooks/useVoiceControl";
import { interpretVoiceCommand, interpretSequence } from "../utils/voiceCommandsMap";

import winSound from "../../public/assets/sounds/win-sound.mp3";
import uiElementSelectionSound from "../../public/assets/sounds/ui-selection-sound.mp3";
import defeatSound from "../../public/assets/sounds/defeat-sound.mp3";
import generating from "../../public/assets/sounds/generating-maze-sound.mp3";
import heartbeat from "../../public/assets/sounds/heart-beat-sound.mp3";
import bounceSound from "../../public/assets/sounds/bouncing-sound.mp3";
import generating2 from "../../public/assets/sounds/generating-maze-sound-2.mp3";
import playerMovementSound from "../../public/assets/sounds/player-movement-sound.wav";
import roundStartSound from "../../public/assets/sounds/round-start.mp3";

// Stylized 3D computer keyboard focusing on WASD keys. The keys are pressed one by one, smoothly going down and up, with a subtle glow when pressed. Simple materials, low realism, old-school video game style (early 2010s). Soft lighting, dark game-like background, slightly angled camera. Clear tutorial animation, short looping video.

const baseUrl = import.meta.env.VITE_PUBLIC_URL || "";

function index(i, j, cols, rows) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return i + j * cols;
}

function removeWalls(current, next) {
  const x = current.i - next.i;
  const y = current.j - next.j;

  if (x === 1) { current.walls[3] = false; next.walls[1] = false; }
  else if (x === -1) { current.walls[1] = false; next.walls[3] = false; }

  if (y === 1) { current.walls[0] = false; next.walls[2] = false; }
  else if (y === -1) { current.walls[2] = false; next.walls[0] = false; }
}

function findNeighborsBFS(cell, cells) {
  const neighbors = [];
  const { i, j, cols, rows } = cell;
  const getCell = (c, r) => cells[index(c, r, cols, rows)];

  const top = cell.walls[0] ? null : getCell(i, j - 1);
  const right = cell.walls[1] ? null : getCell(i + 1, j);
  const bottom = cell.walls[2] ? null : getCell(i, j + 1);
  const left = cell.walls[3] ? null : getCell(i - 1, j);

  if (top) neighbors.push(top);
  if (right) neighbors.push(right);
  if (bottom) neighbors.push(bottom);
  if (left) neighbors.push(left);

  return neighbors;
}

function bfs(startCell, cells) {
  for (let cell of cells) {
    cell.distanceToStart = Infinity;
    cell.isExit = false;
  }
  const queue = [startCell];
  const localVisited = new Set([startCell]);
  startCell.distanceToStart = 0;

  while (queue.length > 0) {
    const currentCell = queue.shift();
    for (let neighbor of findNeighborsBFS(currentCell, cells)) {
      if (!localVisited.has(neighbor)) {
        localVisited.add(neighbor);
        queue.push(neighbor);
        neighbor.distanceToStart = currentCell.distanceToStart + 1;
      }
    }
  }
}

function findLongestPath(cells) {
  let maxDistance = -1;
  let exitCell = null;
  for (let cell of cells) {
    if (cell.distanceToStart !== Infinity && cell.distanceToStart > maxDistance) {
      maxDistance = cell.distanceToStart;
      exitCell = cell;
    }
  }
  return exitCell;
}

function Cell(i, j, size, cols, rows) {
  this.i = i;
  this.j = j;
  this.x = i * size;
  this.y = j * size;
  this.size = size;
  this.cols = cols;
  this.rows = rows;
  this.walls = [true, true, true, true];
  this.visited = false;
  this.distanceToStart = Infinity;
  this.isStart = false;
  this.isExit = false;

  this.draw = function (ctx) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const { x, y, size } = this;

    if (this.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
    if (this.walls[1]) { ctx.moveTo(x + size, y); ctx.lineTo(x + size, y + size); }
    if (this.walls[2]) { ctx.moveTo(x + size, y + size); ctx.lineTo(x, y + size); }
    if (this.walls[3]) { ctx.moveTo(x, y + size); ctx.lineTo(x, y); }
    ctx.stroke();

    if (this.visited) {
      ctx.fillStyle = "rgba(1, 113, 227, 0.5)";
      ctx.fillRect(x, y, size, size);
    }

    if (this.isStart) {
      ctx.fillStyle = "rgb(1, 113, 227)";
      this.drawRect(ctx, x, y, size);
    }

    if (this.isExit) {
      ctx.fillStyle = "rgba(255, 165, 0, 0.9)";
      this.drawRect(ctx, x, y, size);
    }
  };

  this.drawRect = function (ctx, x, y, size) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x + 2.5, y + 2.5, size - 5, size - 5, 4);
      ctx.fill();
    } else {
      ctx.fillRect(x + 2.5, y + 2.5, size - 5, size - 5);
    }
  };

  this.checkNeighbors = function (cells) {
    const neighbors = [];
    const idx = (c, r) => index(c, r, this.cols, this.rows);

    const top = cells[idx(this.i, this.j - 1)];
    const right = cells[idx(this.i + 1, this.j)];
    const bottom = cells[idx(this.i, this.j + 1)];
    const left = cells[idx(this.i - 1, this.j)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) return neighbors[Math.floor(Math.random() * neighbors.length)];
    return undefined;
  };
}

const Maze = () => {
  const { t, i18n } = useTranslation();

  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const listeningPopupRef = useRef(null);
  const confettiRef = useRef(null);
  const ctxRef = useRef(null);

  const cells = useRef([]);
  const stack = useRef([]);
  const currentCell = useRef(null);
  const playerCellRef = useRef(null);
  const exitCell = useRef(null);
  const playerRef = useRef(null);

  const mazeAnimationFrameId = useRef(null);
  const playerAnimationFrameId = useRef(null);
  const lastUpdateTime = useRef(0);
  const isGeneratingMazeRef = useRef(false);
  const suppressAutoResizeRef = useRef(false);
  const isMenuOpenRef = useRef(false);

  const dimsRef = useRef({ width: 500, height: 500, cellSize: 50, cols: 15, rows: 10 });

  const commandQueueRef = useRef([]);
  const processingQueueRef = useRef(false);

  const [currentLang, setCurrentLanguage] = useState(i18n.language || "de-DE");
  const [transcript, setTranscript] = useState("");
  const [dots, setDots] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [time, setTime] = useState(60000);
  const [initialTime, setInitialTime] = useState(60000);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStatus, setGameStatus] = useState("playing");
  const [gridSize, setGridSize] = useState({ cols: 15, rows: 10 });
  const [isListening, setIsListening] = useState(false);
  const [isManualControls, setManualControls] = useState(false);
  const [isHeartbeatPlaying, setIsHeartbeatPlaying] = useState(false);
  
  const gameStatusRef = useRef(gameStatus);
  const isRunningRef = useRef(isRunning);
  const audioUnlockedRef = useRef(false);
  
  // Refs para los sonidos problemáticos
  const roundStartSoundRef = useRef(null);
  const bounceSoundRef = useRef(null);
  const movementSoundRef = useRef(null);
  
  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning, gameStatus]);

  // Función para desbloquear audio - llamar síncronamente, luego reproducir
  const ensureAudioUnlocked = useCallback(() => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  }, []);

  const [playWin] = useSound(winSound, { volume: 1.0 });
  const [playElementSelected] = useSound(uiElementSelectionSound, { volume: 1.0 });
  const [playDefeat] = useSound(defeatSound, { volume: 0.8 });
  const [playGenerating, { stop: stopGenerating }] = useSound(generating, { loop: true, volume: 0.8 });
  const [playGenerating2, { stop: stopGenerating2 }] = useSound(generating2, { loop: true, volume: 0.8 });
  const [playHeartbeat, { stop: stopHeartbeat }] = useSound(heartbeat, { loop: true, volume: 1.5 });
  const [, { sound: roundStartHowl }] = useSound(roundStartSound, { volume: 1.0 });
  const [, { sound: bounceHowl }] = useSound(bounceSound, { volume: 1.0 });
  const [, { sound: movementHowl }] = useSound(playerMovementSound, { volume: 0.2 });

  // Guardar los howls en refs cuando se cargan
  useEffect(() => {
    if (roundStartHowl) roundStartSoundRef.current = roundStartHowl;
  }, [roundStartHowl]);
  
  useEffect(() => {
    if (bounceHowl) bounceSoundRef.current = bounceHowl;
  }, [bounceHowl]);
  
  useEffect(() => {
    if (movementHowl) movementSoundRef.current = movementHowl;
  }, [movementHowl]);

  // Funciones wrapper para reproducir usando refs
  const playRoundStart = useCallback(() => {
    if (roundStartSoundRef.current) {
      roundStartSoundRef.current.play();
    }
  }, []);

  const playBounce = useCallback(() => {
    if (bounceSoundRef.current) {
      bounceSoundRef.current.play();
    }
  }, []);

  const playPlayerMovement = useCallback(() => {
    if (movementSoundRef.current) {
      movementSoundRef.current.play();
    }
  }, []);

  const updateInterval = 5;

  const computeCellSize = useCallback((cols, rows) => {
    const container = containerRef.current;
    if (!container) return 20;

    const containerRect = container.getBoundingClientRect();
    const availableWidth = Math.max(100, containerRect.width);
    const viewportHeight = window.innerHeight;
    const availableHeight = containerRect.height > 0 ? containerRect.height : Math.floor(viewportHeight * 0.65);

    const maxCellSize = 45;
    const minCellSize = 5;
    const padding = 2;

    const sizeFromWidth = Math.floor((availableWidth - padding) / cols);
    const sizeFromHeight = Math.floor((availableHeight - padding) / rows);

    let newCellSize = Math.min(maxCellSize, sizeFromWidth, sizeFromHeight);
    return Math.max(minCellSize, newCellSize);
  }, []);

  const applyCanvasSize = useCallback((cellSize, cols, rows) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const targetWidth = cellSize * cols;
    const targetHeight = cellSize * rows;

    canvas.width = Math.max(1, Math.floor(targetWidth * ratio));
    canvas.height = Math.max(1, Math.floor(targetHeight * ratio));
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctxRef.current = ctx;

    dimsRef.current = { width: targetWidth, height: targetHeight, cellSize, cols, rows };
  }, []);

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width, height } = dimsRef.current;

    ctx.clearRect(0, 0, width, height);
    if (offscreenCanvasRef.current) {
      ctx.drawImage(offscreenCanvasRef.current, 0, 0, width, height);
    }
  }, []);

  const drawMazeToOffscreen = useCallback((cols, rows, cellsArray) => {
    if (!offscreenCanvasRef.current) return;

    const cellSize = dimsRef.current.cellSize;
    const ratio = window.devicePixelRatio || 1;
    const w = cellSize * cols;
    const h = cellSize * rows;

    const off = offscreenCanvasRef.current;
    off.width = Math.max(1, Math.floor(w * ratio));
    off.height = Math.max(1, Math.floor(h * ratio));
    off.style.width = `${w}px`;
    off.style.height = `${h}px`;

    const offCtx = off.getContext("2d");
    offCtx.setTransform(ratio, 0, 0, ratio, 0, 0);

    offCtx.fillStyle = "#c6c6c6";
    offCtx.fillRect(0, 0, w, h);

    for (const cell of cellsArray) {
      cell.draw(offCtx);
    }
  }, []);

  const playerdrawMazeLoop = useCallback(() => {
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);

    const ctx = ctxRef.current;
    redrawAll(); // Dibuja fondo

    if (!playerdrawMazeLoop._last) playerdrawMazeLoop._last = performance.now();
    const now = performance.now();
    let delta = now - playerdrawMazeLoop._last;
    if (delta > 100) delta = 100;
    playerdrawMazeLoop._last = now;

    const player = playerRef.current;
    if (player) {
      if (player.update) player.update(delta);
      if (player.draw) player.draw(ctx);
    }
  }, [redrawAll]);

  const generatePlayer = useCallback(() => {
    if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);

    const startCell = cells.current[0];
    if (!startCell) return;

    startCell.isStart = true;
    playerRef.current = new Player(startCell, dimsRef.current.cellSize, { emoji: "👾" });
    playerCellRef.current = startCell;

    playerdrawMazeLoop._last = performance.now();
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);
  }, [playerdrawMazeLoop]);

  const createDrawMazeLoop = useCallback((frozenCols, frozenRows) => {
    const loop = () => {
      mazeAnimationFrameId.current = requestAnimationFrame(loop);

      const now = performance.now();
      const delta = now - lastUpdateTime.current;
      const ctx = ctxRef.current;
      const localCells = cells.current;
      let localCurrent = currentCell.current;
      const localStack = stack.current;

      const { width, height, cellSize } = dimsRef.current;

      ctx.fillStyle = "#c6c6c6";
      ctx.fillRect(0, 0, width, height);

      for (let cell of localCells) {
        cell.draw(ctx);
      }

      if (localCurrent) {
        ctx.fillStyle = "rgb(1, 113, 227)";
        localCurrent.drawRect(ctx, localCurrent.x, localCurrent.y, localCurrent.size);
      }

      if (delta < updateInterval) return;
      lastUpdateTime.current = now;

      // Algoritmo DFS
      if (localCurrent) {
        const next = localCurrent.checkNeighbors(localCells);
        if (next) {
          next.visited = true;
          localStack.push(localCurrent);
          removeWalls(localCurrent, next);
          localCurrent = next;
        } else if (localStack.length > 0) {
          localCurrent = localStack.pop();
        } else {
          bfs(localCells[0], localCells);
          exitCell.current = findLongestPath(localCells);
          if (exitCell.current) exitCell.current.isExit = true;
          if (localCells[0]) localCells[0].isStart = true;

          if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement("canvas");

          // Guardar a imagen estática
          drawMazeToOffscreen(frozenCols, frozenRows, localCells);

          if (mazeAnimationFrameId.current) cancelAnimationFrame(mazeAnimationFrameId.current);

          redrawAll();
          currentCell.current = localCurrent;
          setIsGenerated(true);
          isGeneratingMazeRef.current = false;
          stopGenerating2();

          generatePlayer();
          return;
        }
      }
      currentCell.current = localCurrent;
    };
    return loop;
  }, [updateInterval, drawMazeToOffscreen, redrawAll, generatePlayer, stopGenerating]);

  const generateMaze = useCallback((requestedCols, requestedRows) => {
    const cols = requestedCols ?? gridSize.cols;
    const rows = requestedRows ?? gridSize.rows;

    if (mazeAnimationFrameId.current) cancelAnimationFrame(mazeAnimationFrameId.current);
    if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);
    playerRef.current = null;

    setIsGenerated(false);
    setGameStatus("playing");
    isGeneratingMazeRef.current = true;
    playGenerating2();
    cells.current = [];
    stack.current = [];

    const cellSizeToUse = computeCellSize(cols, rows);

    applyCanvasSize(cellSizeToUse, cols, rows);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        cells.current.push(new Cell(i, j, cellSizeToUse, cols, rows));
      }
    }

    currentCell.current = cells.current[0];
    currentCell.current.visited = true;
    stack.current.push(currentCell.current);

    lastUpdateTime.current = 0; // Reset timer para dibujar frame 1 inmediatamente
    const loop = createDrawMazeLoop(cols, rows);
    mazeAnimationFrameId.current = requestAnimationFrame(loop);

  }, [createDrawMazeLoop, gridSize, computeCellSize, applyCanvasSize, playGenerating]);

  const resetGame = useCallback((cols, rows) => {
    console.log("Resetting game...");
    setIsRunning(false);
    setGameStatus("playing");
    setIsGenerated(false);
    stopHeartbeat();
    setIsHeartbeatPlaying(false);

    if (popupRef.current) {
      popupRef.current.classList.remove("visible");
      popupRef.current.classList.add("hidden");
    }
    generateMaze(cols, rows);
  }, [generateMaze, stopHeartbeat]);

  const movePlayerBy = (deltaX, deltaY) => {
    // console.log(`Moving player by (${deltaX}, ${deltaY}), gameStatus: ${gameStatus}, isRunning: ${isRunning}`);

    if (gameStatusRef.current !== "playing") return;
    if (!isRunningRef.current) {
      setIsRunning(true);
      isRunningRef.current = true; // Actualizar inmediatamente para evitar múltiples llamadas
      ensureAudioUnlocked();
      playRoundStart();
    }
    const player = playerRef.current;
    const playerCell = playerCellRef.current;

    if (!player || !playerCell) return;

    const nextIndexI = playerCell.i + deltaX;
    const nextIndexJ = playerCell.j + deltaY;
    const nextCellIndex = index(nextIndexI, nextIndexJ, dimsRef.current.cols, dimsRef.current.rows);

    if (nextCellIndex === -1) {
      ensureAudioUnlocked();
      playBounce();
      player.triggerBounce({ x: deltaX, y: deltaY });
      return;
    }

    const nextCell = cells.current[nextCellIndex];
    let wallBlocking = false;

    if (deltaX === 1 && playerCell.walls[1]) wallBlocking = true;
    if (deltaX === -1 && playerCell.walls[3]) wallBlocking = true;
    if (deltaY === 1 && playerCell.walls[2]) wallBlocking = true;
    if (deltaY === -1 && playerCell.walls[0]) wallBlocking = true;

    if (wallBlocking) {
      ensureAudioUnlocked();
      playBounce();
      player.triggerBounce({ x: deltaX, y: deltaY });
      return;
    }

    player.moveTo(nextCell);
    playerCellRef.current = nextCell;
    ensureAudioUnlocked();
    playPlayerMovement();

    if (nextCell.isExit) {
      setIsRunning(false);
      setGameStatus("won");
    }
  };

  useEffect(() => {
    // Fix browser audio policy - unlock on first user interaction
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      if (Howler.ctx) {
        if (Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().then(() => {
            audioUnlockedRef.current = true;
            console.log('Audio context unlocked');
          });
        } else {
          audioUnlockedRef.current = true;
        }
      }
    };
    
    // Intentar desbloquear inmediatamente si ya hubo interacción
    unlockAudio();
    
    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
    document.addEventListener('touchend', unlockAudio, { once: false });
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (isGeneratingMazeRef.current) return;
      if (suppressAutoResizeRef.current) { suppressAutoResizeRef.current = false; return; }

      const container = containerRef.current;
      if (!container || !canvasRef.current) return;

      // Recalcular tamaño basado en la grid actual
      const { cols, rows } = dimsRef.current; // Usamos la grid "viva" en el canvas
      const newCellSize = computeCellSize(cols, rows);

      applyCanvasSize(newCellSize, cols, rows);

      if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement("canvas");

      // Actualizar celdas con nuevas coordenadas
      cells.current.forEach(cell => {
        cell.size = newCellSize;
        cell.x = cell.i * newCellSize;
        cell.y = cell.j * newCellSize;
      });

      drawMazeToOffscreen(cols, rows, cells.current);
      redrawAll();

      if (confettiRef.current?.resize) confettiRef.current.resize();
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Init

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mazeAnimationFrameId.current) cancelAnimationFrame(mazeAnimationFrameId.current);
      if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);
    };
  }, [computeCellSize, applyCanvasSize, redrawAll, drawMazeToOffscreen]);

  // Keyboard
  useEffect(() => {
    function handleKeyDown(e) {
      if (isVoiceListeningRef.current || isMenuOpenRef.current) return;
      if (!playerRef.current) return;
      switch (e.key) {
        case "ArrowUp": case "w": movePlayerBy(0, -1); break;
        case "ArrowDown": case "s": movePlayerBy(0, 1); break;
        case "ArrowLeft": case "a": movePlayerBy(-1, 0); break;
        case "ArrowRight": case "d": movePlayerBy(1, 0); break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Voice Control
  const handleVoiceCommand = ({ transcript: recognized, confidence }) => {
    if (confidence && confidence < 0.5) return;
    setTranscript(String(recognized || ""));

    const commands = interpretSequence(recognized);
    if (commands.length === 0) {
      const one = interpretVoiceCommand(recognized);
      if (one) commands.push(one);
    }
    if (commands.length > 0) {
      enqueueCommands(commands);
      processQueue();
    }
  };

  function enqueueCommands(commands = []) {
    if (!Array.isArray(commands)) commands = [commands];
    commandQueueRef.current.push(...commands);
  }

  function processQueue() {
    if (processingQueueRef.current) return;
    if (commandQueueRef.current.length === 0) return;
    processingQueueRef.current = true;

    const firstCmd = commandQueueRef.current.shift();
    executeCommand(firstCmd);

    if (commandQueueRef.current.length > 0) {
      const next = () => {
        const cmd = commandQueueRef.current.shift();
        if (!cmd) { processingQueueRef.current = false; return; }
        executeCommand(cmd);
        requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    } else {
      processingQueueRef.current = false;
    }
  }

  function executeCommand(command) {
    switch (command) {
      case 'UP': movePlayerBy(0, -1); break;
      case 'DOWN': movePlayerBy(0, 1); break;
      case 'LEFT': movePlayerBy(-1, 0); break;
      case 'RIGHT': movePlayerBy(1, 0); break;
      case 'GENERATE': resetGame(); break; // Reset sin argumentos usa defaults
      case 'STOP': if (isListening) voiceControl?.stop?.(); break;
    }
  }

  const voiceControl = useVoiceControl({ onResult: handleVoiceCommand, lang: currentLang || "en-US" });

  const isVoiceListeningRef = useRef(false);

  useEffect(() => {
    isVoiceListeningRef.current = voiceControl.isListening;
  }, [voiceControl.isListening]);

  useEffect(() => {
    if (!voiceControl.isListening) {
      setDots("");
      const tId = setTimeout(() => setTranscript(""), 300);
      return () => clearTimeout(tId);
    }
    const id = setInterval(() => setDots(p => (p.length < 3 ? p + "." : "")), 800);
    return () => clearInterval(id);
  }, [voiceControl.isListening]);

  useEffect(() => {
    if (gameStatus === "playing") return;
    const popup = popupRef.current;

    if (voiceControl?.isListening) try { voiceControl.stop(); } catch (e) { console.warn(e); }
    if (listeningPopupRef.current) {
      listeningPopupRef.current.classList.remove("visible");
      listeningPopupRef.current.classList.add("hidden");
    }

    if (gameStatus === "won") {
      popup.classList.remove("defeat");
      popup.classList.add("victory");
      playWin();
      confettiRef.current?.start(3500, { initialCount: 140, streamInterval: 220 });
    } else if (gameStatus === "lost") {
      popup.classList.remove("victory");
      popup.classList.add("defeat");
      playDefeat();
    }

    if (popup) {
      popup.classList.remove("hidden");
      popup.classList.add("visible");
    }

    console.log(`Game ended with status: ${gameStatus}`);
  }, [gameStatus, voiceControl]);

  useEffect(() => {
    if (isRunning && time > 0 && time <= initialTime * 0.2) {
      if (!isHeartbeatPlaying) {
        playHeartbeat();
        setIsHeartbeatPlaying(true);
      }
    } else {
      if (isHeartbeatPlaying) {
        stopHeartbeat();
        setIsHeartbeatPlaying(false);
      }
    }
  }, [time, isRunning, initialTime, playHeartbeat, stopHeartbeat, isHeartbeatPlaying]);

  return (
    <div className="maze-container" ref={containerRef}>
      <LanguageSelector
        currentLanguage={currentLang}
        onLanguageChange={(lang) => {
          const map = { 'es': 'es-CO', 'en': 'en-US', 'de': 'de-DE' };
          setCurrentLanguage(map[lang] || lang);
          if (voiceControl?.isListening) try { voiceControl.stop(); } catch (e) { }
        }}
      />
      <Menu
        isOpen={false}
        onClose={() => { }}
        initialTime={initialTime}
        onSetInitialTime={setInitialTime}
        gridSize={gridSize}
        onMenuStateChange={(isOpen) => { isMenuOpenRef.current = isOpen; }}
        onSetGridSize={(newSize) => {
          const cols = Math.max(3, Math.min(100, parseInt(newSize.cols ?? gridSize.cols, 10)));
          const rows = Math.max(3, Math.min(100, parseInt(newSize.rows ?? gridSize.rows, 10)));

          setGridSize({ cols, rows });

          resetGame(cols, rows);
        }}
      />

      <div className="game-status-popup-container hidden" ref={popupRef}>
        <div className="game-status-popup">
          <img className="close" src={`${baseUrl}assets/icons/close.svg`} onClick={() => { playElementSelected(); popupRef.current?.classList.add("hidden"); }} alt="close" />
          {gameStatus === "won" ? (
            <>
              <h2>{t('victory')}</h2>
              <img src={`${baseUrl}assets/icons/trophy.svg`} alt="Win" />
              <p>{t('time')}</p>
              <div className="timer">{formatTime(time).minutes}:{formatTime(time).seconds}</div>
            </>
          ) : gameStatus === "lost" ? (
            <>
              <h2>{t('defeat')}</h2>
              <p>{t('defeat_message')}</p>
              <img src={`${baseUrl}assets/icons/defeat.svg`} alt="Lost" />
            </>
          ) : null}
          {/* Al hacer retry sin argumentos, usa el estado actual (memoria) */}
          <button onClick={() => { playElementSelected(); resetGame(); }}>{t('retry')}</button>
        </div>
      </div>

      <div className={`listening-popup ${voiceControl.isListening ? "visible" : "hidden"}`} ref={listeningPopupRef}>
        <h3>{`${t('listening')}${dots}`}</h3>
        <img src={`${baseUrl}assets/icons/listening.svg`} alt="listening" />
        <p>{t('recognized_command')}: {transcript}</p>
      </div>

      <h2>{t('main_title')}</h2>

      <Timer
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        isGenerated={isGenerated}
        time={time}
        setTime={setTime}
        gameStatus={gameStatus}
        onTimeUp={() => setGameStatus("lost")}
        initialTime={initialTime}
      />

      <canvas ref={canvasRef}></canvas>

      <div className="generate-button-voice-control-container">
        <button className="action-button generateButton" onClick={() => { playElementSelected(); generateMaze(); }}>{t('generate_maze')}</button>
        <button
          className="action-button activate-controls"
          onClick={() => { playElementSelected(); setManualControls(!isManualControls); }}
          disabled={!isGenerated || voiceControl.isListening || gameStatus !== "playing"}>
          {isManualControls ? t('deactivate_manual_controls') : t('activate_manual_controls')}
        </button>
        <button
          type="button"
          className={`mic-button ${voiceControl.isListening ? "active" : ""}`}
          onClick={() => { playElementSelected(); voiceControl.toggle?.(); }}
          disabled={!voiceControl.isSupported || isManualControls || !isGenerated || gameStatus !== "playing"}
        >
          <img src={`${baseUrl}assets/icons/${voiceControl.isListening ? 'mic-on.svg' : 'mic-off.svg'}`} alt="mic" />
          <span>{voiceControl.isListening ? t('deactivate_voice_control') : t('activate_voice_control')}</span>
        </button>
      </div>

      <div className={`maze-controls ${isManualControls ? "visible" : "hidden"}`}>
        <button className="control-button up" onClick={() => { playElementSelected(); movePlayerBy(0, -1); }}><img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Up" /></button>
        <button className="control-button left" onClick={() => { playElementSelected(); movePlayerBy(-1, 0); }}><img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Left" /></button>
        <button className="control-button right" onClick={() => { playElementSelected(); movePlayerBy(1, 0); }}><img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Right" /></button>
        <button className="control-button down" onClick={() => { playElementSelected(); movePlayerBy(0, 1); }}><img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Down" /></button>
      </div>

      <Confetti ref={confettiRef} />
    </div>
  );
};

export default Maze;