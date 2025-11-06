import React, { useEffect, useRef, useCallback } from "react";
import Player from "./Player";

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

    if(this.isStart) {
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

const Maze = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

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
    cols: 10,
    rows: 15,
  });

  const updateInterval = 10;
  const lastUpdateTime = useRef(0);

  const numCols = 15;
  const numRows = 10;

  const playerRef = useRef(null);

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

          // console.log("Exit cell", exitCell.current);

          exitCell.current.draw(ctx);
        }

        if (mazeAnimationFrameId.current) {
          cancelAnimationFrame(mazeAnimationFrameId.current);
        }
        currentCell.current = localCurrent;

        generatePlayer();
        return;
      }
    }

    currentCell.current = localCurrent;

    // mazeAnimationFrameId.current = requestAnimationFrame(drawMazeLoop);
  }, [updateInterval]);

  const generateMaze = useCallback((newCellSize) => {
    if (mazeAnimationFrameId.current) cancelAnimationFrame(mazeAnimationFrameId.current);

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

    lastUpdateTime.current = performance.now();
    mazeAnimationFrameId.current = requestAnimationFrame(drawMazeLoop);
  }, [drawMazeLoop]);

  const playerdrawMazeLoop = useCallback(() => {
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);

    const ctx = ctxRef.current;
    const { width, height } = dimsRef.current;

    ctx.fillStyle = "#c6c6c6";
    ctx.fillRect(0, 0, width, height);

    for (let cell of cells.current) {
      cell.draw(ctx);
    }

    if (!playerdrawMazeLoop._last) playerdrawMazeLoop._last = performance.now();

    const now = performance.now();

    let delta = now - playerdrawMazeLoop._last;
    if (delta > 100) delta = 100; // avoid large jumps

    playerdrawMazeLoop._last = now;

    const player = playerRef.current;

    if (player) {
      if (player.update) player.update(delta);
      if (player.draw) player.draw(ctx);
    }
  }, []);

  const generatePlayer = useCallback(() => {
    if (playerAnimationFrameId.current) cancelAnimationFrame(playerAnimationFrameId.current);

    const startCell = cells?.current[0];
    if (!startCell) return;

    startCell.isStart = true;

    playerRef.current = new Player(startCell, dimsRef.current.cellSize, { emoji: "🚀" });

    playerCellRef.current = startCell;

    playerdrawMazeLoop._last = performance.now();
    playerAnimationFrameId.current = requestAnimationFrame(playerdrawMazeLoop);
  }, [playerdrawMazeLoop]);

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { width, height, cellSize } = dimsRef.current;


    ctx.fillStyle = "#c6c6c6";
    ctx.fillRect(0, 0, width, height);


    for (let cell of cells.current) {
      cell.size = cellSize;
      cell.x = cell.i * cellSize;
      cell.y = cell.j * cellSize;
      cell.draw(ctx);
    }

    if (currentCell.current) {
      ctx.fillStyle = "rgb(1, 113, 227)";
      if (ctx.roundRect) {
        ctx.roundRect(
          currentCell.current.x + 5,
          currentCell.current.y + 5,
          cellSize - 10,
          cellSize - 10,
          8
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          currentCell.current.x + 5,
          currentCell.current.y + 5,
          cellSize - 10,
          cellSize - 10
        );
      }
    }

    if (playerRef.current && playerCellRef.current) {
      playerRef.current.cellSize = cellSize;
      playerRef.current.setPositionFromCell(playerCellRef.current);
      playerRef.current.draw(ctx);
    }
  }, []);

  function movePlayerBy(deltaX, deltaY) {
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
      const minCellSize = 10;
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

      redrawAll();

      ctx.fillStyle = "#c6c6c6";
      ctx.fillRect(0, 0, dimsRef.current.width, dimsRef.current.height);

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

  return (
    <div className="maze-container" ref={containerRef}>
      <h2>Voice controlled Maze!</h2>
      <canvas ref={canvasRef}></canvas>
      <button onClick={() => generateMaze(dimsRef.current.cellSize)}>Generate Maze</button>

      <div className="maze-controls">
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

    </div>
  );
};

export default Maze;

