import React, { useEffect, useRef, useCallback, useState } from "react";

import Confetti from "./Confetti";
import Player from "./Player";
import LanguageSelector from "./LanguageSelector";
import Timer from "./Timer";
import { formatTime } from "./Timer";

import { useTranslation } from 'react-i18next';

import useVoiceControl from "../hooks/useVoiceControl";
import { interpretVoiceCommand, interpretSequence } from "../utils/voiceCommandsMap";

const baseUrl = import.meta.env.VITE_PUBLIC_URL || "";

function index(i, j, cols, rows) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) {
    return -1;
  }
  return i + j * cols;
}

function removeWalls(current, next) {
  var x = (current.i - next.i);
  var y = (current.j - next.j);

  if (x === 1) {
    current.walls[3] = false;
    next.walls[1] = false;
  } else if (x === -1) {
    current.walls[1] = false;
    next.walls[3] = false;
  }

  if (y === 1) {
    current.walls[0] = false;
    next.walls[2] = false;
  } else if (y === -1) {
    current.walls[2] = false;
    next.walls[0] = false;
  }
}

function findNeighborsBFS(cell, cells) {
  const localCells = cells;
  const neighbors = [];

  const top = cell.walls[0] ? null : localCells[index(cell.i, cell.j - 1, cell.cols, cell.rows)];
  const right = cell.walls[1] ? null : localCells[index(cell.i + 1, cell.j, cell.cols, cell.rows)];
  const bottom = cell.walls[2] ? null : localCells[index(cell.i, cell.j + 1, cell.cols, cell.rows)];
  const left = cell.walls[3] ? null : localCells[index(cell.i - 1, cell.j, cell.cols, cell.rows)];

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
  const localVisited = new Set();
  localVisited.add(startCell);

  var distanceToStart = 0;
  startCell.distanceToStart = distanceToStart;

  var currentCell = null;
  while (queue.length > 0) {
    currentCell = queue.shift();

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
    if (cell.distanceToStart !== Infinity)
      if (cell.distanceToStart > maxDistance) {
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
  this.walls = [true, true, true, true]; // top, right, bottom, left
  this.visited = false;
  this.distanceToStart = Infinity;
  this.distanceToStart = false;
  this.isExit = false;

  this.draw = function (ctx) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.walls[0]) {
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.size, this.y);
    }
    if (this.walls[1]) {
      ctx.moveTo(this.x + this.size, this.y);
      ctx.lineTo(this.x + this.size, this.y + this.size);
    }
    if (this.walls[2]) {
      ctx.moveTo(this.x + this.size, this.y + this.size);
      ctx.lineTo(this.x, this.y + this.size);
    }
    if (this.walls[3]) {
      ctx.moveTo(this.x, this.y + this.size);
      ctx.lineTo(this.x, this.y);
    }
    ctx.stroke();

    if (this.visited) {
      ctx.fillStyle = "rgba(1, 113, 227, 0.5)";
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    if (this.isStart) {
      ctx.fillStyle = "rgb(1, 113, 227)";

      if (ctx.roundRect) {
        ctx.roundRect(this.x + 2.5, this.y + 2.5, this.size - 5, this.size - 5, 4);
        ctx.fill();
      } else {
        ctx.fillRect(this.x + 2.5, this.y + 2.5, this.size - 5, this.size - 5);
      }
    }

    if (this.isExit) {
      ctx.fillStyle = "rgba(255, 165, 0, 0.9)";

      if (ctx.roundRect) {
        ctx.roundRect(this.x + 2.5, this.y + 2.5, this.size - 5, this.size - 5, 4);
        ctx.fill();
      } else {
        ctx.fillRect(this.x + 2.5, this.y + 2.5, this.size - 5, this.size - 5);
      }
    }
  };

  this.checkNeighbors = function (cells) {
    var neighbors = [];

    var top = cells[index(this.i, this.j - 1, this.cols, this.rows)];
    var right = cells[index(this.i + 1, this.j, this.cols, this.rows)];
    var bottom = cells[index(this.i, this.j + 1, this.cols, this.rows)];
    var left = cells[index(this.i - 1, this.j, this.cols, this.rows)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
      var r = Math.floor(Math.random() * neighbors.length);
      return neighbors[r];
    } else {
      return undefined;
    }
  };
}

function handleClosePopup() {
  const popup = document.querySelector(".game-status-popup-container");

  if (popup) {
    popup.classList.remove("visible");
    popup.classList.add("hidden");
  }
}

const Maze = () => {
  const { t } = useTranslation();

  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const listeningPopupRef = useRef(null);
  const [currentLang, setCurrentLanguage] = useState("en-US");
  
  const [transcript, setTranscript] = useState("");
  const [dots, setDots] = useState("");

  const commandQueueRef = useRef([]);
  const processingQueueRef = useRef(false);

  const [isGenerated, setIsGenerated] = useState(false);
  const [time, setTime] = useState(60000);
  const [isRunning, setIsRunning] = useState(false);

  const [gameStatus, setGameStatus] = useState("playing");
  const confettiRef = useRef(null);

  const cells = useRef([]);
  const stack = useRef([]);
  const currentCell = useRef(null);
  const playerCellRef = useRef(null);
  const exitCell = useRef(null);
  const mazeAnimationFrameId = useRef(null);
  const playerAnimationFrameId = useRef(null);
  const ctxRef = useRef(null);

  const dimsRef = useRef({
    width: 500,
    height: 500,
    cellSize: 50,
    cols: 15,
    rows: 10,
  });

  const updateInterval = 5;
  const lastUpdateTime = useRef(0);

  const numCols = 15;
  const numRows = 10;

  const playerRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [isManualControls, setManualControls] = useState(false);

  const drawMazeLoop = useCallback(() => {
    mazeAnimationFrameId.current = requestAnimationFrame(drawMazeLoop);

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

      if (ctx.roundRect) {
        ctx.roundRect(localCurrent.x + 2.5, localCurrent.y + 2.5, localCurrent.size - 5, localCurrent.size - 5, 4);
        ctx.fill();
      } else {
        ctx.fillRect(localCurrent.x + 2.5, localCurrent.y + 2.5, localCurrent.size - 5, localCurrent.size - 5);
      }
    }

    if (delta < updateInterval) {
      return;
    }

    lastUpdateTime.current = now;

    if (localCurrent) {
      var next = localCurrent.checkNeighbors(localCells);
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

        if (exitCell.current) {
          exitCell.current.isExit = true;
        }

        if (localCells[0]) {
          localCells[0].isStart = true;
        }

        if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement("canvas");

        drawMazeToOffscreen(dimsRef.current.cellSize, numCols, numRows, localCells);

        redrawAll();

        if (mazeAnimationFrameId.current) {
          cancelAnimationFrame(mazeAnimationFrameId.current);
        }
        currentCell.current = localCurrent;

        setIsGenerated(true);
        generatePlayer();
        return;
      }
    }

    currentCell.current = localCurrent;
  }, [updateInterval]);

  const generateMaze = useCallback((newCellSize) => {
    if (mazeAnimationFrameId.current) cancelAnimationFrame(mazeAnimationFrameId.current);

    setIsGenerated(false);
    setGameStatus("playing");

    cells.current = [];
    stack.current = [];

    for (let j = 0; j < numRows; j++) {
      for (let i = 0; i < numCols; i++) {
        const cell = new Cell(i, j, newCellSize, numCols, numRows);
        cells.current.push(cell);
      }
    }

    currentCell.current = cells.current[0];
    currentCell.current.visited = true;
    stack.current.push(currentCell.current);

    redrawAll();

    lastUpdateTime.current = performance.now();
    mazeAnimationFrameId.current = requestAnimationFrame(drawMazeLoop);
  }, [drawMazeLoop]);

  const resetGame = useCallback((cellSize) => {
    setIsRunning(false);
    setGameStatus("playing");
    setIsGenerated(false);

    const popup = popupRef.current;
    if (popup) {
      popup.classList.remove("visible");
      popup.classList.add("hidden");
    }

    if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);
    generateMaze(cellSize);
  }, [generateMaze]);

  const playerdrawMazeLoop = useCallback(() => {
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);

    const ctx = ctxRef.current;

    redrawAll()

    if (!playerdrawMazeLoop._last) playerdrawMazeLoop._last = performance.now();

    const now = performance.now();

    let delta = now - playerdrawMazeLoop._last;
    if (delta > 100) delta = 100; // avoid large jumps

    playerdrawMazeLoop._last = now;

    const player = playerRef.current;

    if (player) {
      if (player.update) player.update(delta);
      if (player.draw) player.draw(ctx);

      if (gameStatus === "won" && popupRef.current) {
        const finished = (typeof player.progress !== "undefined" ? player.progress >= 1 : true);
        const notBouncing = (typeof player.bouncing !== "undefined" ? !player.bouncing : true);

        if (finished && notBouncing) {
          if (playerAnimationFrameId.current) {
            cancelAnimationFrame(playerAnimationFrameId.current);
            playerAnimationFrameId.current = null;
          }
        }
      }
    }
  }, []);
  const generatePlayer = useCallback(() => {
    if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);

    const startCell = cells?.current[0];
    if (!startCell) return;

    startCell.isStart = true;

    playerRef.current = new Player(startCell, dimsRef.current.cellSize, { emoji: "👾" });

    playerCellRef.current = startCell;

    playerdrawMazeLoop._last = performance.now();
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);
  }, [playerdrawMazeLoop]);

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width, height, cellSize } = dimsRef.current;

    ctx.clearRect(0, 0, width, height);

    if (offscreenCanvasRef.current) {
      ctx.drawImage(offscreenCanvasRef.current, 0, 0, width, height);
    }
  }, []);

  function movePlayerBy(deltaX, deltaY) {
    if(!isRunning) setIsRunning(true);

    const player = playerRef.current;
    const playerCell = playerCellRef.current;

    if (!player || !playerCell) return;

    const nextIndexI = playerCell.i + deltaX;
    const nextIndexJ = playerCell.j + deltaY;
    const nextCellIndex = index(nextIndexI, nextIndexJ, dimsRef.current.cols, dimsRef.current.rows);

    if (nextCellIndex === -1) {
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
      player.triggerBounce({ x: deltaX, y: deltaY });
      return;
    }

    player.moveTo(nextCell);
    playerCellRef.current = nextCell;

    if (nextCell.isExit) {
      console.log("Player reached the exit!");
      setIsRunning(false);
      setGameStatus("won");
    }
  }

  function drawMazeToOffscreen(cellSize, cols, rows, cellsArray) {
    if (!offscreenCanvasRef.current || !canvasRef.current) return;

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

    // limpiar
    offCtx.fillStyle = "#c6c6c6";
    offCtx.fillRect(0, 0, w, h);

    // dibujar cada celda usando la misma lógica que usas en Cell.draw
    offCtx.strokeStyle = "#ffffff";
    offCtx.lineWidth = 2;

    for (const cell of cellsArray) {
      const x = cell.i * cellSize;
      const y = cell.j * cellSize;
      const size = cellSize;

      // walls
      offCtx.beginPath();
      if (cell.walls[0]) { offCtx.moveTo(x, y); offCtx.lineTo(x + size, y); }
      if (cell.walls[1]) { offCtx.moveTo(x + size, y); offCtx.lineTo(x + size, y + size); }
      if (cell.walls[2]) { offCtx.moveTo(x + size, y + size); offCtx.lineTo(x, y + size); }
      if (cell.walls[3]) { offCtx.moveTo(x, y + size); offCtx.lineTo(x, y); }
      offCtx.stroke();

      // visited fill
      if (cell.visited) {
        offCtx.fillStyle = "rgba(1, 113, 227, 0.5)";
        offCtx.fillRect(x, y, size, size);
      }

      // start/exit if needed
      if (cell.isStart) {
        offCtx.fillStyle = "rgb(1, 113, 227)";
        offCtx.fillRect(x + 2.5, y + 2.5, size - 5, size - 5);
      }
      if (cell.isExit) {
        offCtx.fillStyle = "rgba(255, 165, 0, 0.9)";
        offCtx.fillRect(x + 2.5, y + 2.5, size - 5, size - 5);
      }
    }
  }


  useEffect(() => {
    const canvasResizing = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      ctxRef.current = ctx;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const availableWidth = Math.max(100, containerRect.width); // ancho disponible en CSS px

      const containerHeight = containerRect.height;
      const viewportHeight = window.innerHeight;
      const availableHeight = containerHeight > 0 ? containerHeight : Math.floor(viewportHeight * 0.65);

      const maxCellSize = 45;
      const minCellSize = 5;
      const padding = 2;

      const sizeFromWidth = Math.floor((availableWidth - padding) / numCols);
      const sizeFromHeight = Math.floor((availableHeight - padding) / numRows);
      let newCellSize = Math.min(maxCellSize, sizeFromWidth, sizeFromHeight);
      newCellSize = Math.max(minCellSize, newCellSize);

      const newWidth = newCellSize * numCols;
      const newHeight = newCellSize * numRows;

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(newWidth * ratio));
      canvas.height = Math.max(1, Math.floor(newHeight * ratio));

      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      dimsRef.current = {
        width: newWidth,
        height: newHeight,
        cellSize: newCellSize,
        cols: numCols,
        rows: numRows,
      };

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      drawMazeToOffscreen(newCellSize, numCols, numRows, cells.current);

      redrawAll();

      if (confettiRef.current && typeof confettiRef.current.resize === "function") {
        try {
          confettiRef.current.resize();
        } catch (e) {
          // seguridad: si algo falla no interrumpimos el resize principal
          console.warn("confetti resize failed", e);
        }
      }

      ctx.fillStyle = "#000000";
    };

    window.addEventListener("resize", canvasResizing);
    canvasResizing();

    return () => {
      if (mazeAnimationFrameId.current) {
        cancelAnimationFrame(mazeAnimationFrameId.current);
      }

      window.removeEventListener("resize", canvasResizing);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!playerRef.current) return;

      const pressedKey = e.key;

      switch (pressedKey) {
        case "ArrowUp":
        case "w":
          movePlayerBy(0, -1);
          break;
        case "ArrowDown":
        case "s":
          movePlayerBy(0, 1);
          break;
        case "ArrowLeft":
        case "a":
          movePlayerBy(-1, 0);
          break;
        case "ArrowRight":
        case "d":
          movePlayerBy(1, 0);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

    // processQueue();
  }

  function processQueue() {
    if(processingQueueRef.current) return;
    if(commandQueueRef.current.length === 0) return;
    processingQueueRef.current = true;

    const firstCmd = commandQueueRef.current.shift();
    executeCommand(firstCmd);

    if(commandQueueRef.current.length > 0) {      
      const next = () => {
        const cmd = commandQueueRef.current.shift();
        if (!cmd) {
          processingQueueRef.current = false;
          return;
        }

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
      case 'UP':
        movePlayerBy(0, -1);
        break;
      case 'DOWN':
        movePlayerBy(0, 1);
        break;
      case 'LEFT':
        movePlayerBy(-1, 0);
        break;
      case 'RIGHT':
        movePlayerBy(1, 0);
        break;
      case 'GENERATE':
        resetGame(dimsRef.current.cellSize);
        break;
      case 'STOP':
        if (isListening) {
          voiceControl?.stop?.();
          // setIsListening(false);
        }
        break;
      default:
        break;
    }
  }

  const voiceControl = useVoiceControl({ onResult: handleVoiceCommand, lang: currentLang || "en-US" });

  useEffect(() => {
    if (!voiceControl.isListening) {
      setDots("");
      return;
    }
    const id = setInterval(() => setDots(prev => (prev.length < 3 ? prev + "." : "")), 800);
    return () => clearInterval(id);
  }, [voiceControl.isListening]);

  useEffect(() => {
    if(gameStatus === "playing") return;

    const popup = popupRef.current;

    if(voiceControl.isListening) {
      voiceControlRef.current.stop();
    }

    listeningPopupRef.current?.classList.remove("visible");
    listeningPopupRef.current?.classList.add("hidden");

    if(gameStatus === "won") {
      popup.classList.remove("defeat");
      popup.classList.add("victory");
    } else if(gameStatus === "lost") {
      popup.classList.remove("victory");
      popup.classList.add("defeat");
    }

    if(popup) {
      popup.classList.remove("hidden");
      popup.classList.add("visible");
    }

    if(gameStatus !== "won") return;
    confettiRef.current?.start(3500, { initialCount: 140, streamInterval: 220 });
  }, [gameStatus, voiceControl]);

  useEffect(() => {
    let timeoutId;

    if(!voiceControl.isListening) {
      timeoutId = setTimeout(() => {
        setTranscript("");
      }, 300);
    }

    return () => clearTimeout(timeoutId);
  }, [voiceControl.isListening]);

  return (
    <div className="maze-container" ref={containerRef}>
      <LanguageSelector currentLanguage={currentLang.split("-")[0]} onLanguageChange={(lang) => {
        const languageMap = {
          'es': 'es-CO',
          'en': 'en-US',
          'de': 'de-DE',
        };

        setCurrentLanguage(lang);

        if(voiceControl.isListening) {
          voiceControl.stop();
        }
      }} />
      <div className="game-status-popup-container hidden" ref={popupRef}>
        <div className="game-status-popup">
          <img className="close" src={`${baseUrl}assets/icons/close.svg`} onClick={handleClosePopup} alt="close popup" />
          {
            gameStatus === "won" ? (
            <>
              <h2>{t('victory')}</h2>
              <img src={`${baseUrl}assets/icons/trophy.svg`} alt="You Win! trophy-icon" />
              <p>{t('time')}</p>
              <div className="timer">{formatTime(time).minutes}:{formatTime(time).seconds}</div>
            </>) : gameStatus === "lost" ? (
              <>
                <h2>{t('defeat')}</h2>
                <p>{t('defeat_message')}</p>
                <img src={`${baseUrl}assets/icons/defeat.svg`} alt="You lost! defeat-icon" />
              </>
            ) : null
          }
          <button onClick={() => { resetGame(dimsRef.current.cellSize) }}>{t('retry')}</button>
        </div>
      </div>
      <div className={`listening-popup ${voiceControl.isListening ? "visible" : "hidden"}`} ref={listeningPopupRef}>
        <h3>{`${t('listening')}${dots}`}</h3>
        <img src={`${baseUrl}assets/icons/listening.svg`} alt="listening icon" />
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
      />
      <canvas ref={canvasRef}></canvas>
      <div className="generate-button-voice-control-container">
        <button className="action-button generateButton" onClick={() => generateMaze(dimsRef.current.cellSize)}>{t('generate_maze')}</button>
        <button
          className="action-button activate-controls"
          onClick={() => setManualControls(!isManualControls)}
          disabled={!isGenerated || voiceControl.isListening}>
          {isManualControls ? t('deactivate_manual_controls') : t('activate_manual_controls')}
        </button>
        <button
          type="button"
          className={`mic-button ${voiceControl.isListening ? "active" : ""}`}
          aria-pressed={voiceControl.isListening}
          onClick={() => {
            voiceControl.toggle?.();
          }}
          disabled={!voiceControl.isSupported || isManualControls || !isGenerated}
        >
          <img
            src={`${voiceControl.isListening ? `${baseUrl}assets/icons/mic-on.svg` : `${baseUrl}assets/icons/mic-off.svg`}`}
            alt="active voice control icon" />
          <span>{voiceControl.isListening ? t('deactivate_voice_control') : t('activate_voice_control')}</span>
        </button>
      </div>

      <div className={`maze-controls ${isManualControls ? "visible" : "hidden"}`}>
        <button
          className="control-button up"
          onClick={() => movePlayerBy(0, -1)}
          aria-label="Move Up"
        >
          <img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Up" />
        </button>
        <button
          className="control-button left"
          onClick={() => movePlayerBy(-1, 0)}
          aria-label="Move Left"
        >
          <img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Left" />
        </button>
        <button
          className="control-button right"
          onClick={() => movePlayerBy(1, 0)}
          aria-label="Move Right"
        >
          <img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Right" />
        </button>
        <button
          className="control-button down"
          onClick={() => movePlayerBy(0, 1)}
          aria-label="Move Down"
        >
          <img src={`${baseUrl}assets/icons/arrow-up.svg`} alt="Down" />
        </button>
      </div>
      <Confetti ref={confettiRef} />
    </div>
  );
};

export default Maze;

