// 页面可见性状态。隐藏时各 rAF 循环彻底 cancelAnimationFrame 停帧、回前台再恢复
// （见各循环处的 runXxx）：主流浏览器对隐藏页签本就不派发 rAF，这里防的是
// 非标准 webview 与隐藏瞬间已排队帧的空转。
let isPageVisible = !document.hidden
// Set 而非数组：注册方用 .add（若是数组，add 不存在，rAF 启动后抛 TypeError 被
// requestIdleCallback 吞掉——9b8c0b5 曾因此让停帧/重估皮肤整体失效）
const visibilityWatchers = new Set()
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden
  visibilityWatchers.forEach(fn => fn(isPageVisible))
})

// 效果容器
function getEffectsLayer() {
  let layer = document.getElementById('effects-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'effects-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

// 背景渐变
function initBgGradient() {
  const layer = getEffectsLayer();
  const bg = document.createElement('div');
  bg.className = 'bg-gradient';
  layer.appendChild(bg);
}

// 粒子系统
function initParticles() {
  const layer = getEffectsLayer();
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  layer.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = -1000, mouseY = -1000;

  // —— 皮肤：按月份/明暗/时刻/实时天气给粒子换装，全部 canvas 2D 现场绘制，零图片 ——
  // 优先级：深夜星空（23 点后且暗色）> 实时雨/雪（weather.js，晴/多云/雾不干预）> 季节飘落物 > 素净微粒（5/9 月兜底）。
  const isDark = () => document.documentElement.classList.contains('dark');
  const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 5; };
  // Open-Meteo weather_code → 皮肤意图：雨系（毛毛雨 51-57 / 雨 61-67 / 阵雨 80-82 / 雷暴 95+）→ rain，
  // 雪系（雪 71-77 / 阵雪 85-86）→ snow；其余返回 null 走季节逻辑。霜无对应代码，按定案不做。
  function weatherSkin(code) {
    if (code == null) return null;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    return null;
  }
  let weatherCode = null;
  function pickSkin() {
    if (isNight() && isDark()) return 'stars';
    const w = weatherSkin(weatherCode);
    if (w) return w;
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 4) return 'sakura';
    if (m >= 6 && m <= 8) return isDark() ? 'firefly' : 'plain';
    if (m >= 10 && m <= 11) return 'leaves';
    if (m === 12 || m <= 2) return 'snow';
    return 'plain';
  }
  let skin = pickSkin();
  let shootingStars = [];
  let shootAt = 0;

  // DPR 适配：物理像素 = CSS 像素 * dpr，避免 retina 上模糊。dpr 上限 2 防止 4K 屏过度膨胀。
  // 粒子坐标一律用 CSS 像素（vw/vh），物理像素映射交给 setTransform；鼠标坐标也是 CSS 像素。
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let vw = 0, vh = 0;

  function resize() {
    vw = window.innerWidth
    vh = window.innerHeight
    canvas.style.width = vw + 'px'
    canvas.style.height = vh + 'px'
    canvas.width = Math.floor(vw * dpr)
    canvas.height = Math.floor(vh * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // 漂落类皮肤重建分布；素净微粒维持原行为（出界自复位，不重建）
    if (skin !== 'plain') buildParticles();
  }

  // 数量随屏幕面积缩放，上下限按粒子的视觉重量各自定
  function countFor(divisor, min, max) {
    return Math.max(min, Math.min(max, Math.floor(vw * vh / divisor)));
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * vw;
      this.y = Math.random() * vh;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        this.x += dx * 0.002;
        this.y += dy * 0.002;
      }
      if (this.x < 0 || this.x > vw || this.y < 0 || this.y > vh) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 92, 231, ${this.opacity})`;
      ctx.fill();
    }
  }

  // 漂落类共通运动：正弦横摆 + 匀速下落 + 横向出界回绕 + 落底重生。
  // topPad/edgePad 由子类在 reset 里先设，setPos 用它们决定出屏距离。
  class Faller {
    setPos(fromTop) {
      this.x = Math.random() * vw;
      this.y = fromTop ? -this.topPad : Math.random() * vh;
      this.phase = Math.random() * Math.PI * 2;
    }
    update() {
      this.phase += this.swayFreq;
      this.y += this.speedY;
      this.x += Math.sin(this.phase) * this.swayAmp;
      if (this.y > vh + this.topPad) this.reset(true);
      if (this.x < -this.edgePad) this.x = vw + this.edgePad;
      else if (this.x > vw + this.edgePad) this.x = -this.edgePad;
    }
  }

  // 樱花瓣：贝塞尔尖椭圆，摇摆下落 + 自转（3-4 月）
  class Petal extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 12;
      this.edgePad = 12;
      this.size = Math.random() * 2.5 + 3.5;
      this.speedY = Math.random() * 0.55 + 0.3;
      this.swayAmp = Math.random() * 0.35 + 0.15;
      this.swayFreq = Math.random() * 0.02 + 0.015;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.04;
      this.opacity = Math.random() * 0.3 + 0.45;
      // 首屏 hero 本身带粉色渐变，花瓣明度压到 56-66 才不致融进背景
      this.light = 56 + Math.random() * 10;
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = `hsla(342, 80%, ${this.light}%, ${this.opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.quadraticCurveTo(this.size * 0.85, 0, 0, this.size);
      ctx.quadraticCurveTo(-this.size * 0.85, 0, 0, -this.size);
      ctx.fill();
      ctx.restore();
    }
  }

  // 落叶：秋色小叶 + 主叶脉，摆幅与翻滚都比花瓣强（10-11 月）
  const LEAF_COLORS = ['#c9764b', '#d89a3e', '#b65440', '#94a04a'];
  class Leaf extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 14;
      this.edgePad = 14;
      this.size = Math.random() * 2.5 + 4;
      this.speedY = Math.random() * 0.7 + 0.35;
      this.swayAmp = Math.random() * 0.5 + 0.2;
      this.swayFreq = Math.random() * 0.018 + 0.01;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.06;
      this.opacity = Math.random() * 0.25 + 0.45;
      this.color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.quadraticCurveTo(this.size, -this.size * 0.15, 0, this.size);
      ctx.quadraticCurveTo(-this.size, -this.size * 0.15, 0, -this.size);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.7);
      ctx.lineTo(0, this.size * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // 雪：暗色下纯白、亮色下降为灰蓝（白底上白点不可见）（12-2 月）
  class Snowflake extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 6;
      this.edgePad = 6;
      this.r = Math.random() * 1.8 + 1;
      this.speedY = Math.random() * 0.5 + 0.25;
      this.swayAmp = Math.random() * 0.4 + 0.15;
      this.swayFreq = Math.random() * 0.012 + 0.008;
      this.opacity = Math.random() * 0.45 + 0.35;
      this.setPos(fromTop);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark()
        ? `rgba(255, 255, 255, ${this.opacity})`
        : `rgba(112, 138, 168, ${this.opacity * 0.85})`;
      ctx.fill();
    }
  }

  // 雨丝：细线段沿固定风向快速斜落，无横摆（实时下雨/雷暴时覆盖季节皮肤）
  class Raindrop extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 30;
      this.edgePad = 30;
      this.len = Math.random() * 9 + 9;
      this.speedY = Math.random() * 4.5 + 5.5;
      this.slant = Math.random() * 0.5 + 0.7;
      this.opacity = Math.random() * 0.22 + 0.18;
      this.setPos(fromTop);
    }
    update() {
      this.y += this.speedY;
      this.x += this.slant;
      if (this.y > vh + this.topPad) this.reset(true);
      if (this.x < -this.edgePad) this.x = vw + this.edgePad;
      else if (this.x > vw + this.edgePad) this.x = -this.edgePad;
    }
    draw() {
      // 线段沿速度方向：尾端 = 头部 - 单位速度 * 线长
      const k = this.len / Math.hypot(this.slant, this.speedY);
      ctx.strokeStyle = isDark()
        ? `rgba(174, 194, 224, ${this.opacity})`
        : `rgba(96, 118, 150, ${this.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.slant * k, this.y - this.speedY * k);
      ctx.stroke();
    }
  }

  // 流萤：径向渐变光晕 + 呼吸明灭，缓速漂移（6-8 月、仅暗色下被选中）
  class Firefly {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * vw;
      this.y = Math.random() * vh;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.glowR = Math.random() * 5 + 6;
      this.coreR = Math.random() * 0.8 + 1.2;
      this.freq = Math.random() * 0.025 + 0.015;
      this.phase = Math.random() * Math.PI * 2;
    }
    update() {
      this.phase += this.freq;
      this.x += this.vx;
      this.y += Math.sin(this.phase * 0.5) * 0.15;
      if (this.x < -20) this.x = vw + 18;
      else if (this.x > vw + 20) this.x = -18;
      if (this.y < -20) this.y = vh + 18;
      else if (this.y > vh + 20) this.y = -18;
    }
    draw() {
      const blink = 0.5 + 0.5 * Math.sin(this.phase);
      const glow = blink * blink;
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowR);
      g.addColorStop(0, `rgba(255, 226, 130, ${0.34 * glow})`);
      g.addColorStop(1, 'rgba(255, 226, 130, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 240, 190, ${0.35 + 0.6 * glow})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.coreR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 星空：静态微星呼吸闪烁；流星由调度器另行生成（深夜 + 暗色专属）
  class Star {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * vw;
      this.y = Math.random() * vh;
      this.r = Math.random() * 0.7 + 0.4;
      this.freq = Math.random() * 0.02 + 0.006;
      this.phase = Math.random() * Math.PI * 2;
      this.base = Math.random() * 0.45 + 0.25;
    }
    update() { this.phase += this.freq; }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.base * (0.55 + 0.45 * Math.sin(this.phase))})`;
      ctx.fill();
    }
  }
  class ShootingStar {
    constructor() {
      this.x = Math.random() * vw * 0.7 + vw * 0.15;
      this.y = Math.random() * vh * 0.3;
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.vx = dir * (Math.random() * 4 + 5);
      this.vy = Math.random() * 2 + 1.5;
      this.tail = Math.random() * 50 + 70;
      this.life = 1;
      this.decay = Math.random() * 0.015 + 0.02;
      this.len = Math.hypot(this.vx, this.vy);
      this.alive = true;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      if (this.life <= 0 || this.x < -this.tail || this.x > vw + this.tail || this.y > vh + this.tail) this.alive = false;
    }
    draw() {
      const nx = this.x - (this.vx / this.len) * this.tail;
      const ny = this.y - (this.vy / this.len) * this.tail;
      const g = ctx.createLinearGradient(this.x, this.y, nx, ny);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.8 * this.life})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
  }

  function buildParticles() {
    switch (skin) {
      case 'sakura':
        particles = Array.from({ length: countFor(24000, 20, 55) }, () => new Petal());
        break;
      case 'leaves':
        particles = Array.from({ length: countFor(30000, 14, 40) }, () => new Leaf());
        break;
      case 'snow':
        particles = Array.from({ length: countFor(18000, 30, 90) }, () => new Snowflake());
        break;
      case 'rain':
        particles = Array.from({ length: countFor(14000, 40, 120) }, () => new Raindrop());
        break;
      case 'firefly':
        particles = Array.from({ length: countFor(45000, 8, 26) }, () => new Firefly());
        break;
      case 'stars':
        particles = Array.from({ length: countFor(9500, 50, 140) }, () => new Star());
        break;
      default:
        particles = Array.from({ length: Math.min(80, Math.floor(vw * vh / 15000)) }, () => new Particle());
    }
    shootAt = performance.now() + 2500 + Math.random() * 5000;
  }

  // 先 resize 拿到 vw/vh（非 plain 皮肤在 resize 内部完成首次 build），plain 再手动 build
  resize();
  if (skin === 'plain') buildParticles();
  window.addEventListener('resize', resize);

  const LINE_DIST = 120;
  function drawLines() {
    const cellSize = LINE_DIST;
    const cols = Math.ceil(vw / cellSize) + 1;
    const grid = new Map();
    particles.forEach((p, i) => {
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = cy * cols + cx;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    });
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    grid.forEach((indices, key) => {
      const cx = key % cols;
      const cy = (key - cx) / cols;
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx <= 0) continue;
          const nKey = (cy + dy) * cols + (cx + dx);
          const neighbors = grid.get(nKey);
          if (!neighbors) continue;
          for (const i of indices) {
            for (const j of neighbors) {
              const ddx = particles[i].x - particles[j].x;
              const ddy = particles[i].y - particles[j].y;
              const dist = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dist < LINE_DIST) {
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
              }
            }
          }
        }
      }
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const ddx = particles[indices[a]].x - particles[indices[b]].x;
          const ddy = particles[indices[a]].y - particles[indices[b]].y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < LINE_DIST) {
            ctx.moveTo(particles[indices[a]].x, particles[indices[a]].y);
            ctx.lineTo(particles[indices[b]].x, particles[indices[b]].y);
          }
        }
      }
    });
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.08)';
    ctx.stroke();
  }

  let particleRaf = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (skin === 'stars') {
      const now = performance.now();
      if (now >= shootAt) {
        shootingStars.push(new ShootingStar());
        shootAt = now + 4000 + Math.random() * 5000;
      }
    }
    particles.forEach(p => { p.update(); p.draw(); });
    if (skin === 'stars') {
      shootingStars.forEach(s => { s.update(); s.draw(); });
      shootingStars = shootingStars.filter(s => s.alive);
    }
    if (skin === 'plain') drawLines();
    particleRaf = requestAnimationFrame(animate);
  }
  function runParticles(run) {
    cancelAnimationFrame(particleRaf);
    if (run) particleRaf = requestAnimationFrame(animate);
  }
  runParticles(isPageVisible);
  visibilityWatchers.add(run => runParticles(run));

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // 明暗切换 / 回到前台时重估皮肤（切主题、跨过 23 点都能当场换装）
  new MutationObserver(() => {
    const next = pickSkin();
    if (next !== skin) { skin = next; buildParticles(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const next = pickSkin();
    if (next !== skin) { skin = next; buildParticles(); }
  });

  // weather.js 独立成 chunk，运行时动态加载：静态 import 会在部署缺该文件时连带
  // effects 整个模块加载失败（粒子/光晕/进度条/灯箱全灭）。catch 后最坏只是没有天气层
  import('./weather.js')
    .then(({ watchWeather }) => {
      // 天气数据到达/30 分钟刷新时重估皮肤（weather.js 已有缓存会立即回调一次）；
      // 请求失败不回调，weatherCode 维持 null，等价于无天气 → 纯季节逻辑
      watchWeather(w => {
        weatherCode = w ? w.code : null;
        const next = pickSkin();
        if (next !== skin) { skin = next; buildParticles(); }
      });
    })
    .catch(() => {});
}

// 鼠标光晕
function initCursorGlow() {
  const layer = getEffectsLayer();

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  layer.appendChild(glow);

  let glowX = 0, glowY = 0, mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glow.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  let glowRaf = 0;
  function animate() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    // transform 合成层动画，不走 left/top 布局重排
    glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
    glowRaf = requestAnimationFrame(animate);
  }
  function runGlow(run) {
    cancelAnimationFrame(glowRaf);
    if (run) glowRaf = requestAnimationFrame(animate);
  }
  runGlow(isPageVisible);
  visibilityWatchers.add(run => runGlow(run));
}

// 阅读进度条
function initReadingProgress() {
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  document.body.appendChild(progress);

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = pct + '%'; // 用闭包里的引用，避免每帧 querySelector
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// 卡片 Spotlight：把指针相对坐标写进 --spot-x/--spot-y，供边框追光层用。
// 委托到 document，Teleport 注入的动态卡片也能命中；非触摸设备无 hover 时不显示，无需分支
function initSpotlight() {
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.VPFeature, .related-card, .bento-card, .about-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  });
}

// 回到顶部按钮
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
  btn.setAttribute('aria-label', '回到顶部');
  document.body.appendChild(btn);

  function toggleVisibility() {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();
}

// 图片灯箱：点击 .vp-doc 里的图片全屏查看，整层任意点击 / Esc 关闭。
// 委托到 document（SPA 换页监听不丢，VitePress 的 <a> 跳转不受影响）。
// 打开期间锁 body 滚动，防止底下页面跟着滚。样式在 a11y.css。
function initLightbox() {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '图片预览');
  const img = document.createElement('img');
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  let isOpen = false;

  function close() {
    isOpen = false;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    if (isOpen) {
      close();
      return;
    }
    const photo = e.target.closest?.('.vp-doc img');
    if (!photo) return;
    img.src = photo.currentSrc || photo.src;
    img.alt = photo.alt || '';
    isOpen = true;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });

  // SPA 的前进/后退不产生 click（点链接开灯箱时点击本身就会关）：
  // 路由换了遮罩还开着会把滚动锁死在新页面上，跟着 popstate 关掉
  window.addEventListener('popstate', () => {
    if (isOpen) close();
  });
}

// 初始化（SSR 安全 + 可访问性检查）
if (typeof window !== 'undefined') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth <= 768;

  // 关键 UI 立即初始化（不影响首屏渲染的滚动条/回到顶部/spotlight/灯箱）
  initReadingProgress();
  initBackToTop();
  initSpotlight();
  initLightbox();

  // 重效果延后到 idle 时间窗，避免抢占主线程
  const startHeavy = () => {
    if (prefersReducedMotion) return;
    initBgGradient();
    if (!isMobile) {
      initParticles();
      initCursorGlow();
    }
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startHeavy, { timeout: 800 });
  } else {
    setTimeout(startHeavy, 150);
  }
}

// 本文件是动态 import() 加载的纯副作用模块。显式标成 ES 模块，
// 否则 tsc 会报 TS2306「File is not a module」（影响 npm run typecheck）。
export {}

