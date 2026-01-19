function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}

export default class Player {
  constructor(startCell, cellSize, options = {}) {
    this.cellSize = cellSize;
    this.radiusMultiplier = options.radiusMultiplier ?? 0.6;

    this.setPositionFromCell(startCell);

    this.startPos = { x: this.x, y: this.y };
    this.endPos = { x: this.x, y: this.y };
    this.progress = 1;
    this.moveDuration = options.moveDuration ?? 220; // ms
    this.elapsed = 0;

    this.bouncing = false;
    this.bounceDuration = 280; // ms
    this.bounceElapsed = 0;
    this.bounceDistance = Math.max(6, Math.round(this.cellSize * 0.12));
    this.bounceDir = { x: 0, y: 0 };
    this.bounceStart = { x: this.x, y: this.y };

    this.useEmoji = false;
    this.emoji = null;

    this.img = null;
    this.imgLoaded = false;

    if (options.emoji && typeof options.emoji === "string" && options.emoji.trim() !== "") {
      this.useEmoji = true;
      this.emoji = options.emoji;
    } else if (options.imageSrc && typeof options.imageSrc === "string") {
      this.img = new Image();
      if (options.crossOrigin) this.img.crossOrigin = options.crossOrigin;
      this.img.onload = () => {
        this.imgLoaded = true;
      };
      this.img.onerror = () => {
        this.imgLoaded = false;
        this.img = null;
      };
      this.img.src = options.imageSrc;
    }
  }

  setPositionFromCell(cell) {
    if (!cell) {
      this.x = 0;
      this.y = 0;
      return;
    }

    this.x = cell.x + this.cellSize / 2;
    this.y = cell.y + this.cellSize / 2;
  }

  moveTo(targetCell) {
    if (!targetCell) return;

    this.startPos = { x: this.x, y: this.y };
    this.endPos = { x: targetCell.x + this.cellSize / 2, y: targetCell.y + this.cellSize / 2 };
    this.elapsed = 0;
    this.progress = 0;
  }

  triggerBounce(directionVec = { x: 0, y: 0 }) {
    if (this.progress < 1) return; // no interferir con el movimiento en curso

    this.x = this.endPos.x;
    this.y = this.endPos.y;

    this.bounceDir = { x: directionVec.x || 0, y: directionVec.y || 0 };
    this.bouncing = true;
    this.bounceElapsed = 0;
    this.bounceStart = { x: this.x, y: this.y };
  }

  // update: dt en ms. Llamar cada frame con el delta de tiempo.
  update(dt) {
    // movimiento principal entre startPos y endPos con easing
    if (this.progress < 1) {
      this.elapsed += dt;
      const t = Math.min(1, this.elapsed / this.moveDuration);
      const eased = easeOutSine(t);
      this.x = lerp(this.startPos.x, this.endPos.x, eased);
      this.y = lerp(this.startPos.y, this.endPos.y, eased);
      this.progress = t;
    }

    // bounce (independiente) — permite overshoot y volver.
    if (this.bouncing) {
      this.bounceElapsed += dt;
      const t = Math.min(1, this.bounceElapsed / this.bounceDuration);

      // sin curve para 0 -> 1 -> 0 (overshoot y regreso)
      const bounceT = Math.sin(t * Math.PI);
      this.x = this.bounceStart.x + this.bounceDir.x * this.bounceDistance * bounceT;
      this.y = this.bounceStart.y + this.bounceDir.y * this.bounceDistance * bounceT;

      if (t >= 1) {
        this.bouncing = false;

        // asegurar regresar exactamente al punto base
        this.x = this.bounceStart.x;
        this.y = this.bounceStart.y;
      }
    }
  }

  draw(ctx) {
    const drawSize = this.cellSize * this.radiusMultiplier;
    const half = drawSize / 2;

    // Si hay emoji: dibujar con fillText, centrado
    if (this.useEmoji && this.emoji) {
      ctx.save();

      ctx.font = `${Math.round(drawSize)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

			ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 6;
      ctx.fillText(this.emoji, this.x, this.y);

      ctx.restore();
      return;
    }

    if (this.img && this.imgLoaded) {
      ctx.drawImage(this.img, this.x - half, this.y - half, drawSize, drawSize);
      return;
    }

    ctx.beginPath();
    ctx.fillStyle = "#d9534f";
    ctx.arc(this.x, this.y, Math.max(4, drawSize / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}
