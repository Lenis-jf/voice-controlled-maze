import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

/**
 * Confetti component
 * - expose methods via ref: start(durationMs = 3000), burst(count = 100)
 * - draws confetti particles in a full-screen fixed canvas overlay
 */

const Confetti = forwardRef(function Confetti(_, ref) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const runningRef = useRef(false);
  const lastTimeRef = useRef(0);

  // device pixel ratio helper
  function resizeCanvasToDisplaySize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // simple random helpers
  const rand = (a, b) => a + Math.random() * (b - a);
  const colors = ["#ff4d4f", "#ffb64d", "#ffd86b", "#7bd389", "#69c0ff", "#d3a4ff", "#ffd6e7"];

  // create a particle object
  function makeParticle(originX, originY) {
    const size = rand(6, 14);
    const angle = rand(-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7); // upwards-ish
    const speed = rand(180, 520); // px / s initial
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const lifetime = rand(1200, 2600); // ms
    return {
      x: originX + rand(-30, 30),
      y: originY + rand(-10, 10),
      vx,
      vy,
      size,
      rotation: rand(0, Math.PI * 2),
      vr: rand(-6, 6), // rotation speed deg/s
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      lifetime,
      tilt: rand(-0.6, 0.6),
      gravity: rand(800, 1600), // px / s^2
      drag: 0.995 + Math.random() * 0.003,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    };
  }

  function spawnBurst(count = 80, originX = window.innerWidth / 2, originY = window.innerHeight * 0.15) {
    const arr = particlesRef.current;
    for (let i = 0; i < count; i++) arr.push(makeParticle(originX, originY));
  }

  function updateAndDraw(dt) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // clear (semi-transparent for a little trail is possible, but full clear works)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const arr = particlesRef.current;
    // update
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dt;
      const t = dt / 1000;

      // physics
      p.vy += p.gravity * t;
      p.vx *= Math.pow(p.drag, t * 60); // frame-rate independent-ish drag
      p.vy *= Math.pow(p.drag, t * 60);

      p.x += p.vx * t;
      p.y += p.vy * t;

      p.rotation += (p.vr * Math.PI / 180) * t;
      p.tilt = Math.sin((p.life / 100) + i) * 0.7;

      // draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = 1 - p.life / p.lifetime; // fade out

      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        const w = p.size;
        const h = p.size * 0.6;
        ctx.fillRect(-w / 2, -h / 2 + p.tilt * 6, w, h);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0 + p.tilt * 4, p.size / 2, p.size / 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // remove if life ended or out of bounds
      if (p.life > p.lifetime || p.y > window.innerHeight + 200) {
        arr.splice(i, 1);
      }
    }
  }

  function loop(time) {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = Math.min(50, time - lastTimeRef.current); // clamp
    lastTimeRef.current = time;

    updateAndDraw(dt);

    if (runningRef.current || particlesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // stop RAF
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = 0;
    }
  }

  // public API via ref
  useImperativeHandle(ref, () => ({
    start(durationMs = 3000, options = {}) {
      if (!canvasRef.current) return;
      resizeCanvasToDisplaySize();
      runningRef.current = true;
      spawnBurst(options.initialCount ?? 120, window.innerWidth / 2, window.innerHeight * 0.08);
      const interval = setInterval(() => {
        spawnBurst(Math.floor(rand(12, 30)), rand(50, window.innerWidth - 50), rand(window.innerHeight * 0.02, window.innerHeight * 0.25));
      }, options.streamInterval ?? 250);
      setTimeout(() => {
        clearInterval(interval);
        runningRef.current = false;
      }, durationMs);
      if (!rafRef.current) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    },

    burst(count = 80, x = window.innerWidth / 2, y = window.innerHeight * 0.15) {
      if (!canvasRef.current) return;
      resizeCanvasToDisplaySize();
      spawnBurst(count, x, y);
      if (!rafRef.current) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    },

    clear() {
      particlesRef.current = [];
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    },

    // <--- new: expose resize so parent can call it
    resize() {
      resizeCanvasToDisplaySize();
    }
  }), []);

  useEffect(() => {
    // inicializamos tamaño una vez
    resizeCanvasToDisplaySize();
    // no registramos window.resize aquí: lo hará Maze
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />
  );
});

export default Confetti;
