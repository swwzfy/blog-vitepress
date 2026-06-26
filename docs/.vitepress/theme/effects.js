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
  let isVisible = true;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Page Visibility API
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
  });

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
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
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 92, 231, ${this.opacity})`;
      ctx.fill();
    }
  }

  const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 15000));
  particles = Array.from({ length: count }, () => new Particle());

  const LINE_DIST = 120;
  function drawLines() {
    const cellSize = LINE_DIST;
    const cols = Math.ceil(canvas.width / cellSize) + 1;
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

  function animate() {
    // 页面不可见时暂停动画
    if (!isVisible) {
      requestAnimationFrame(animate);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(animate);
  }
  animate();

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

// 鼠标光晕
function initCursorGlow() {
  const layer = getEffectsLayer();

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  layer.appendChild(glow);

  let glowX = 0, glowY = 0, mouseX = 0, mouseY = 0;
  let isVisible = true;

  // Page Visibility API
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
  });

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glow.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  function animate() {
    // 页面不可见时暂停动画
    if (!isVisible) {
      requestAnimationFrame(animate);
      return;
    }

    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';

    requestAnimationFrame(animate);
  }
  animate();
}

// 阅读进度条
function initReadingProgress() {
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  document.body.appendChild(progress);

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    document.querySelector('.reading-progress').style.width = progress + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
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

// 初始化（SSR 安全 + 可访问性检查）
if (typeof window !== 'undefined') {
  // 检查用户是否偏好减少动画
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 检查是否为移动设备
  const isMobile = window.innerWidth <= 768;

  if (!prefersReducedMotion) {
    initBgGradient();
    if (!isMobile) {
      initParticles();
      initCursorGlow();
    }
  }

  // 阅读进度条和回到顶部按钮始终初始化
  initReadingProgress();
  initBackToTop();
}
