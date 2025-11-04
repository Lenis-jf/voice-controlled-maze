import React, { useEffect, useRef, useCallback } from "react";

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

  const top = cell.walls[0] ? null : localCells[index(cell.i, cell.j -1, cell.cols, cell.rows)];
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
  for(let cell of cells) {
    cell.distanceToStart = Infinity;
    cell.isExit = false;
  }

  const queue = [startCell];
  const localVisited = new Set();
  localVisited.add(startCell);

  var distanceToStart = 0;
  startCell.distanceToStart = distanceToStart;

  var currentCell = null;
  while(queue.length > 0) {
    currentCell = queue.shift();

    for(let neighbor of findNeighborsBFS(currentCell, cells)) {
      if(!localVisited.has(neighbor)) {
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

  for(let cell of cells) {
    if(cell.distanceToStart !== Infinity)
      if(cell.distanceToStart > maxDistance) {
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

    if(this.isExit) {
      ctx.fillStyle = "rgba(255, 165, 0, 0.9)";
      ctx.fillRect(this.x, this.y, this.size, this.size);
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
  const exitCell = useRef(null);
  const animationFrameId = useRef(null);
  const ctxRef = useRef(null);

  const dimsRef = useRef({
    width: 500,
    height: 500,
    cellSize: 50,
    cols: 10,
    rows: 10,
  });

  const updateInterval = 30;
  const lastUpdateTime = useRef(0);

  const numCols = 10;
  const numRows = 10;

  const drawLoop = useCallback(() => {
    animationFrameId.current = requestAnimationFrame(drawLoop);

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
      ctx.fillRect(localCurrent.x, localCurrent.y, cellSize, cellSize);
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

          console.log("Exit cell", exitCell.current);

          exitCell.current.draw(ctx);
        }

        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        currentCell.current = localCurrent;
        return;
      }
    }

    currentCell.current = localCurrent;

    animationFrameId.current = requestAnimationFrame(drawLoop);
  }, [updateInterval]);

  const generate = useCallback((newCellSize) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

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
    animationFrameId.current = requestAnimationFrame(drawLoop);
  }, [drawLoop]);


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

      ctx.fillStyle = "#c6c6c6";
      ctx.fillRect(0, 0, dimsRef.current.width, dimsRef.current.height);
    };

    window.addEventListener("resize", canvasResizing);
    canvasResizing();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      window.removeEventListener("resize", canvasResizing);
    };
  }, []);


  return (
    <div className="maze-container" ref={containerRef}>
      <h2>Voice controlled Maze!</h2>
      <canvas ref={canvasRef}></canvas>
      <button onClick={() => generate(dimsRef.current.cellSize)}>Generate</button>
    </div>
  );
};

export default Maze;

