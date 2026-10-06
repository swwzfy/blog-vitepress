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
  // 优先级：深夜星空（23 点后且暗色）> 实时雨/雪（weather.js，晴/多云/雾不干预）> 季节 > 素净微粒（5/9 月兜底）。
  // 季节即四季花历：3-4 月樱花、6-8 月荷塘（暗色流萤）、10-11 月枫+银杏、12-2 月梅+冰晶（实际雨雪由降水皮肤接管）。
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
    if (m >= 6 && m <= 8) return isDark() ? 'firefly' : 'lotus';
    if (m >= 10 && m <= 11) return 'foliage';
    if (m === 12 || m <= 2) return 'winter';
    return 'plain';
  }
  let skin = pickSkin();
  let shootingStars = [];
  let shootAt = 0;
  let lotusRipples = [];
  let rippleAt = 0;
  let lotusPetals = [];
  let petalAt = 0;

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

  // 樱花瓣：尖端带标志性缺刻的贝塞尔花瓣，摇摆下落 + 自转（3-4 月）
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
      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.95);
      ctx.quadraticCurveTo(s * 0.62, s * 0.62, s * 0.6, -s * 0.1);
      ctx.quadraticCurveTo(s * 0.58, -s * 0.42, s * 0.3, -s * 0.62);
      ctx.quadraticCurveTo(s * 0.12, -s * 0.72, 0, -s * 0.52);
      ctx.quadraticCurveTo(-s * 0.12, -s * 0.72, -s * 0.3, -s * 0.62);
      ctx.quadraticCurveTo(-s * 0.58, -s * 0.42, -s * 0.6, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.62, s * 0.62, 0, s * 0.95);
      ctx.fill();
      ctx.restore();
    }
  }

  // 桃花：整朵五瓣、灼灼深粉、瓣形略尖，与樱花瓣混飘（3-4 月）
  class PeachBlossom extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 16;
      this.edgePad = 16;
      this.r = Math.random() * 0.9 + 1.9;
      this.speedY = Math.random() * 0.3 + 0.25;
      this.swayAmp = Math.random() * 0.45 + 0.2;
      this.swayFreq = Math.random() * 0.014 + 0.008;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.opacity = Math.random() * 0.25 + 0.6;
      this.light = Math.random() * 6 + 72;
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = `hsla(345, 68%, ${this.light}%, 1)`;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -this.r * 1.2, this.r * 0.72, this.r * 1.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 桃花花心偏紫红，缀几枚黄色花丝
      ctx.fillStyle = 'rgba(140, 35, 55, 0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244, 202, 120, 0.9)';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 4 + i * ((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.r * 0.5, Math.sin(a) * this.r * 0.5, this.r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // 枫叶：参考真实红枫轮廓——顶裂 + 左右上裂 + 两枚下小裂，裂瓣宽厚、裂缘带锯齿、主脉五出（10-11 月）
  // 轮廓按 (角度°, 半径系数) 手调，左半程序镜像
  const MAPLE_PTS = [
    [-90, 1.0], [-74, 0.62], [-60, 0.3], [-46, 0.62], [-30, 0.97], [-14, 0.58],
    [4, 0.28], [22, 0.46], [38, 0.7], [56, 0.42], [88, 0.2],
  ];
  class Maple extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 18;
      this.edgePad = 18;
      this.size = Math.random() * 3.5 + 5;
      this.speedY = Math.random() * 0.6 + 0.45;
      this.swayAmp = Math.random() * 0.5 + 0.2;
      this.swayFreq = Math.random() * 0.016 + 0.01;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.09;
      this.opacity = Math.random() * 0.25 + 0.5;
      this.color = ['#c0392b', '#b03024', '#9e2b20'][Math.floor(Math.random() * 3)];
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      const R = this.size * 1.7;
      const pts = [];
      MAPLE_PTS.forEach(([a, r]) => {
        const rad = (a * Math.PI) / 180;
        pts.push([Math.cos(rad) * r * R, Math.sin(rad) * r * R]);
      });
      for (let i = MAPLE_PTS.length - 2; i >= 0; i--) {
        const rad = ((180 - MAPLE_PTS[i][0]) * Math.PI) / 180;
        pts.push([Math.cos(rad) * MAPLE_PTS[i][1] * R, Math.sin(rad) * MAPLE_PTS[i][1] * R]);
      }
      // 裂瓣宽厚的诀窍：顶点做尖角，每条边的中点沿径向外推 25%，让边缘向外鼓
      const m = pts.length;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < m; i++) {
        const a1 = pts[i], a2 = pts[(i + 1) % m];
        ctx.quadraticCurveTo(((a1[0] + a2[0]) / 2) * 1.25, ((a1[1] + a2[1]) / 2) * 1.25, a2[0], a2[1]);
      }
      ctx.closePath();
      ctx.fill();
      // 主脉五出
      ctx.strokeStyle = 'rgba(60, 8, 8, 0.28)';
      ctx.lineWidth = 0.7;
      for (const [a, r] of [[-90, 0.88], [-30, 0.85], [-150, 0.85], [38, 0.62], [142, 0.62]]) {
        const rad = (a * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(0, 0.12 * R);
        ctx.lineTo(Math.cos(rad) * r * R, Math.sin(rad) * r * R);
        ctx.stroke();
      }
      // 叶柄从底部凹口伸出
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0.2 * R);
      ctx.lineTo(0, 1.25 * R);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // 银杏：扇面外缘波浪起伏、顶部中央缺刻、放射叶脉，摆幅大、落得慢（10-11 月）
  class Ginkgo extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 16;
      this.edgePad = 16;
      this.size = Math.random() * 3 + 4;
      this.speedY = Math.random() * 0.35 + 0.25;
      this.swayAmp = Math.random() * 0.7 + 0.35;
      this.swayFreq = Math.random() * 0.014 + 0.008;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.04;
      this.opacity = Math.random() * 0.25 + 0.5;
      this.color = Math.random() < 0.5 ? '#e6b94d' : '#f2c94c';
      this.wobble = Math.random() * Math.PI * 2;
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      const R = this.size * 2;
      const spread = Math.PI * 0.85;
      const base = -Math.PI / 2 - spread / 2;
      // 扇面：外缘按角度采点，正弦波浪 + 顶部中央高斯缺刻
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = base + (spread * i) / steps;
        const wave = 1 + 0.05 * Math.sin(a * 6 + this.wobble);
        const taper = i === 0 || i === steps ? 0.72 : 1;
        const notch = R * 0.12 * Math.exp(-Math.pow((a + Math.PI / 2) / 0.18, 2));
        const r = R * wave * taper - notch;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      // 放射叶脉
      ctx.strokeStyle = 'rgba(120, 84, 20, 0.3)';
      ctx.lineWidth = 0.5;
      for (let k = 1; k < 9; k++) {
        const a = base + (spread * k) / 9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(150, 110, 40, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, R * 0.5);
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

  // 梅花：整朵五瓣小花，浅粉近白，疏落慢落（12-2 月晴日；实际下雪由 weather-snow 接管）
  class PlumBlossom extends Faller {
    constructor() { super(); this.reset(false); }
    reset(fromTop) {
      this.topPad = 14;
      this.edgePad = 14;
      this.r = Math.random() * 1.3 + 1.4;
      this.speedY = Math.random() * 0.25 + 0.2;
      this.swayAmp = Math.random() * 0.4 + 0.15;
      this.swayFreq = Math.random() * 0.012 + 0.007;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.02;
      this.opacity = Math.random() * 0.3 + 0.55;
      this.light = Math.random() * 6 + 82;
      this.setPos(fromTop);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = isDark()
        ? `hsla(350, 72%, ${this.light - 6}%, 0.95)`
        : `hsla(350, 62%, ${this.light}%, 1)`;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.r * 1.1, Math.sin(a) * this.r * 1.1, this.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // 花蕊：一点雌蕊 + 六枚雄蕊
      ctx.fillStyle = isDark() ? 'rgba(214, 170, 88, 0.95)' : 'rgba(200, 148, 62, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isDark() ? 'rgba(244, 208, 128, 0.95)' : 'rgba(238, 196, 108, 0.95)';
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 3 + i * ((Math.PI * 2) / 6);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.r * 0.42, Math.sin(a) * this.r * 0.42, this.r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // 冰晶：四角星芒（复用 logo 星点几何），原地明灭不下落，与梅花同拼冬季晴日皮肤
  class IceCrystal {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * vw;
      this.y = Math.random() * vh;
      this.s = Math.random() * 2.2 + 1.6;
      this.freq = Math.random() * 0.02 + 0.008;
      this.phase = Math.random() * Math.PI * 2;
    }
    update() { this.phase += this.freq; }
    draw() {
      // 2.5 次方缓动出「偶尔一闪」：大部分帧接近透明，直接跳过绘制
      const tw = Math.max(0, Math.sin(this.phase));
      const a = Math.pow(tw, 2.5) * 0.95;
      if (a < 0.02) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = isDark()
        ? `rgba(214, 232, 255, ${a})`
        : `rgba(126, 156, 196, ${a})`;
      const s = this.s * (0.6 + 0.4 * tw);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.16, -s * 0.16, s, 0);
      ctx.quadraticCurveTo(s * 0.16, s * 0.16, 0, s);
      ctx.quadraticCurveTo(-s * 0.16, s * 0.16, -s, 0);
      ctx.quadraticCurveTo(-s * 0.16, -s * 0.16, 0, -s);
      ctx.fill();
      ctx.restore();
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

  // 荷叶：带缺口的扁平椭圆 + 放射叶脉，青绿半透明，锚在画面底缘缓慢摇摆（夏季亮色专属）
  // 只住左右两簇边角，页面中间留白给内容
  class LotusLeaf {
    constructor(i, n) {
      const zone = i % 2 === 0
        ? 0.03 + Math.random() * 0.2
        : 0.77 + Math.random() * 0.2;
      this.x = (n > 6 && i === n - 1 ? 0.45 + Math.random() * 0.1 : zone) * vw;
      this.y = vh * (0.86 + Math.random() * 0.13);
      this.rx = Math.random() * 34 + 40;
      this.ry = this.rx * (Math.random() * 0.1 + 0.34);
      this.rot = (Math.random() - 0.5) * 0.5;
      this.freq = Math.random() * 0.01 + 0.012;
      this.phase = Math.random() * Math.PI * 2;
      this.notch = Math.random() < 0.5 ? -0.5 : 0.6;
      this.green = Math.random() < 0.5 ? '90, 148, 96' : '66, 128, 88';
    }
    // 蜻蜓的落脚点：叶面偏上的随机位置
    landSpot() {
      return { x: this.x + (Math.random() - 0.5) * this.rx * 0.8, y: this.y - this.ry * 0.85 };
    }
    update() { this.phase += this.freq; }
    draw() {
      const sway = Math.sin(this.phase) * 0.07;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot + sway);
      // 中心深、边缘浅的径向渐变
      const g = ctx.createRadialGradient(0, 0, this.rx * 0.12, 0, 0, this.rx);
      g.addColorStop(0, `rgba(${this.green}, 0.26)`);
      g.addColorStop(1, `rgba(${this.green}, 0.1)`);
      ctx.fillStyle = g;
      // 波浪缘参数化椭圆描一圈，缺口由首尾弦切出
      const steps = 26;
      const span = Math.PI * 2 - 0.56;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = this.notch + 0.28 + (span * i) / steps;
        const wave = 1 + 0.035 * Math.sin(a * 7 + this.phase * 3);
        const x = Math.cos(a) * this.rx * wave;
        const y = Math.sin(a) * this.ry * wave;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // 主脉八出，近缘各分两枝
      ctx.strokeStyle = `rgba(${this.green}, 0.26)`;
      ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        const a = this.notch + 0.28 + (span * (k + 0.5)) / 8;
        const bx = Math.cos(a), by = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(bx * this.rx * 0.85, by * this.ry * 0.85);
        ctx.moveTo(bx * this.rx * 0.52, by * this.ry * 0.52);
        ctx.lineTo(bx * this.rx * 0.7 - by * 7, by * this.ry * 0.7 + bx * 7);
        ctx.moveTo(bx * this.rx * 0.52, by * this.ry * 0.52);
        ctx.lineTo(bx * this.rx * 0.7 + by * 7, by * this.ry * 0.7 - bx * 7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 荷花：内外两圈花瓣，粉白渐变，比荷叶更淡，随呼吸极缓开合（夏季亮色专属）
  class LotusFlower {
    constructor() {
      const side = Math.random() < 0.5 ? 0.1 + Math.random() * 0.1 : 0.8 + Math.random() * 0.1;
      this.x = side * vw;
      this.y = vh * (0.8 + Math.random() * 0.1);
      this.s = Math.random() * 5 + 10;
      this.freq = Math.random() * 0.006 + 0.006;
      this.phase = Math.random() * Math.PI * 2;
    }
    update() { this.phase += this.freq; }
    draw() {
      const breathe = 1 + Math.sin(this.phase) * 0.08;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(-0.35);
      ctx.scale(breathe, breathe);
      for (let ring = 0; ring < 2; ring++) {
        const petals = ring === 0 ? 9 : 6;
        const len = this.s * (ring === 0 ? 1 : 0.55);
        const w = len * (ring === 0 ? 0.3 : 0.38);
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * Math.PI * 2 + (ring === 1 ? 0.35 : 0);
          ctx.save();
          ctx.rotate(a);
          // 花瓣：基部白、瓣尖粉的尖瓣
          const g = ctx.createLinearGradient(0, 0, 0, -len);
          g.addColorStop(0, 'rgba(252, 234, 240, 0.55)');
          g.addColorStop(1, 'rgba(246, 178, 203, 0.62)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(w, -len * 0.42, 0, -len);
          ctx.quadraticCurveTo(-w, -len * 0.42, 0, 0);
          ctx.fill();
          ctx.restore();
        }
      }
      // 莲蓬：小圆盘 + 数枚莲子
      ctx.fillStyle = 'rgba(196, 200, 108, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, this.s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140, 148, 72, 0.6)';
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 4 + i * ((Math.PI * 2) / 4);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.s * 0.07, Math.sin(a) * this.s * 0.07, this.s * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 涟漪：从荷塘荡开双圈扁圆环，一两秒一圈，让水面动起来（夏季亮色专属）
  class Ripple {
    constructor() {
      this.x = (Math.random() < 0.5 ? 0.06 + Math.random() * 0.18 : 0.76 + Math.random() * 0.18) * vw;
      this.y = vh * (0.86 + Math.random() * 0.1);
      this.max = Math.random() * 40 + 50;
      this.r = 4;
      this.alive = true;
    }
    update() {
      this.r += 0.45;
      if (this.r >= this.max) this.alive = false;
    }
    draw() {
      const a = (1 - this.r / this.max) * 0.2;
      ctx.strokeStyle = `rgba(96, 148, 128, ${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r, this.r * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(96, 148, 128, ${a * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 0.55, this.r * 0.176, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 落英：偶尔一片花瓣落上水面，缓缓横漂、随波轻点（夏季亮色专属）
  class PetalDrift {
    constructor() {
      const fromLeft = Math.random() < 0.5;
      this.x = fromLeft ? -12 : vw + 12;
      this.dir = fromLeft ? 1 : -1;
      this.y = vh * (0.84 + Math.random() * 0.12);
      this.speed = (Math.random() * 0.4 + 0.5) * this.dir;
      this.len = Math.random() * 2.5 + 3.5;
      this.rot = (Math.random() - 0.5) * 0.6;
      this.freq = Math.random() * 0.05 + 0.04;
      this.phase = Math.random() * Math.PI * 2;
      this.alive = true;
    }
    update() {
      this.x += this.speed;
      this.phase += this.freq;
      this.y += Math.sin(this.phase) * 0.1;
      if (this.x < -20 || this.x > vw + 20) this.alive = false;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot + Math.sin(this.phase) * 0.25);
      ctx.fillStyle = 'rgba(248, 205, 220, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.len, this.len * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 蜻蜓：在荷叶间起落——停时翅膀收拢微沉浮，飞时走弧线、翅膀扑动（夏季亮色专属）
  class Dragonfly {
    constructor(spots) {
      this.spots = spots;
      this.phase = Math.random() * Math.PI * 2;
      this.x = vw * 0.5;
      this.y = vh * 0.6;
      this.state = 'rest';
      this.timer = 60 + Math.random() * 120;
      this.from = null;
      this.to = null;
      this.t = 0;
      this.flyDur = 60;
      this.wing = 0;
      this.dir = 1;
    }
    pickSpot() {
      const s = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.from = { x: this.x, y: this.y };
      this.to = s.landSpot();
      this.t = 0;
      this.flyDur = 50 + Math.random() * 40;
      this.dir = this.to.x >= this.from.x ? 1 : -1;
    }
    update() {
      if (this.state === 'rest') {
        this.phase += 0.06;
        this.y += Math.sin(this.phase) * 0.06;
        this.timer -= 1;
        if (this.timer <= 0) {
          this.state = 'fly';
          this.pickSpot();
        }
      } else {
        this.t += 1;
        const k = Math.min(1, this.t / this.flyDur);
        const e = k * k * (3 - 2 * k);
        this.x = this.from.x + (this.to.x - this.from.x) * e;
        this.y = this.from.y + (this.to.y - this.from.y) * e - Math.sin(k * Math.PI) * 16;
        this.wing += 1.1;
        if (k >= 1) {
          this.state = 'rest';
          this.timer = 160 + Math.random() * 260;
        }
      }
    }
    draw() {
      const flying = this.state === 'fly';
      const flutter = flying ? Math.sin(this.wing) : 0;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.dir, 1);
      // 身体：细长腹 + 头
      ctx.strokeStyle = 'rgba(46, 92, 84, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(3, -1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(46, 92, 84, 0.65)';
      ctx.beginPath();
      ctx.arc(4.5, -1.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      // 四片翅：停时向后收拢，飞时绕根部扑动
      const baseA = flying ? -1.25 + flutter * 0.35 : -1.05;
      const baseB = flying ? -0.65 + flutter * 0.35 : -0.75;
      for (const [ang, alpha] of [[baseA, 0.18], [baseA + 0.2, 0.32], [baseB, 0.16], [baseB + 0.18, 0.3]]) {
        ctx.save();
        ctx.translate(1, -1.5);
        ctx.rotate(ang);
        ctx.fillStyle = `rgba(196, 222, 228, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(5, 0, 5, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
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
        particles = Array.from({ length: countFor(24000, 20, 55) }, () =>
          Math.random() < 0.62 ? new Petal() : new PeachBlossom());
        break;
      case 'foliage':
        particles = Array.from({ length: countFor(30000, 14, 40) }, () =>
          Math.random() < 0.6 ? new Maple() : new Ginkgo());
        break;
      case 'winter': {
        particles = [
          ...Array.from({ length: countFor(38000, 8, 22) }, () => new PlumBlossom()),
          ...Array.from({ length: countFor(30000, 10, 26) }, () => new IceCrystal()),
        ];
        break;
      }
      case 'lotus': {
        const leaves = countFor(38000, 5, 9);
        particles = Array.from({ length: leaves }, (_, i) => new LotusLeaf(i, leaves));
        particles.push(new LotusFlower());
        if (Math.random() < 0.6) particles.push(new LotusFlower());
        particles.push(new Dragonfly(particles.filter(p => p.landSpot)));
        break;
      }
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
    rippleAt = performance.now() + 800 + Math.random() * 1200;
    petalAt = performance.now() + 2000 + Math.random() * 3000;
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
    if (skin === 'lotus') {
      const now = performance.now();
      if (now >= rippleAt) {
        lotusRipples.push(new Ripple());
        rippleAt = now + 1400 + Math.random() * 1800;
      }
      if (now >= petalAt && lotusPetals.length < 3) {
        lotusPetals.push(new PetalDrift());
        petalAt = now + 3000 + Math.random() * 5000;
      }
    }
    particles.forEach(p => { p.update(); p.draw(); });
    if (skin === 'lotus') {
      lotusRipples.forEach(r => { r.update(); r.draw(); });
      lotusRipples = lotusRipples.filter(r => r.alive);
      lotusPetals.forEach(p => { p.update(); p.draw(); });
      lotusPetals = lotusPetals.filter(p => p.alive);
    }
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

