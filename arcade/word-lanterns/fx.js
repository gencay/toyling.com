// Sweet-style particle effects drawn on one full-screen canvas.

const CANDY = ["#ff6fa3", "#ffd84d", "#6fd6ff", "#8ef07a", "#c49bff", "#ff9a4d"];

export class Fx {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.parts = [];
    this.running = false;
    this.enabled = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
    addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x, y, count = 14, power = 1) {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (2 + Math.random() * 4) * power;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 2,
        size: 4 + Math.random() * 5,
        color: CANDY[(Math.random() * CANDY.length) | 0],
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        spin: Math.random() * 0.4 - 0.2,
        rot: Math.random() * Math.PI,
        star: Math.random() < 0.35,
      });
    }
    this.start();
  }

  confetti() {
    if (!this.enabled) return;
    for (let i = 0; i < 120; i++) {
      this.parts.push({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * innerHeight * 0.5,
        vx: Math.random() * 2 - 1,
        vy: 2 + Math.random() * 3,
        size: 6 + Math.random() * 6,
        color: CANDY[i % CANDY.length],
        life: 1,
        decay: 0.006,
        spin: Math.random() * 0.3 - 0.15,
        rot: Math.random() * Math.PI,
        star: i % 4 === 0,
        fall: true,
      });
    }
    this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      this.parts = this.parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of this.parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.fall ? 0.03 : 0.22;
        p.vx *= 0.98;
        p.rot += p.spin;
        p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.star) {
          const s = p.size;
          ctx.fillRect(-s / 2, -s / 6, s, s / 3);
          ctx.fillRect(-s / 6, -s / 2, s / 3, s);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size / 2.5, p.size / 2.5);
        }
        ctx.restore();
      }
      if (this.parts.length) requestAnimationFrame(tick);
      else {
        this.running = false;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    };
    requestAnimationFrame(tick);
  }
}
