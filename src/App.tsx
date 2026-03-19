import React, { useEffect, useRef, useState, useCallback } from 'react';

const CORPUS = `人工智能（AI）是计算机科学的一个分支，旨在创造能够执行通常需要人类智能的任务的系统。RWKV（Receptance Weighted Key Value）是一种创新的线性RNN架构，它巧妙地结合了RNN的高效推理和Transformer的并行训练优势。在处理长序列时，RWKV展现出了恒定的内存占用和线性计算复杂度，这使得它在边缘设备和大规模并发场景下极具潜力。本演示展示了RWKV模型在单张RTX 4090显卡上同时处理320路并发生成的能力。每一路都在独立生成文本，互不干扰。这种极高的吞吐量得益于其无注意力机制（Attention-free）的设计，避免了传统大模型中KV Cache带来的显存瓶颈。通过优化CUDA算子和显存管理，RWKV能够将硬件性能发挥到极致。在实际应用中，这种并发能力可以用于支撑海量用户的实时对话、NPC行为生成、大规模数据处理等场景。Token生成速度稳定，延迟极低，真正实现了"多快好省"的AI推理。自然语言处理（NLP）技术正在快速演进，从早期的规则系统到统计模型，再到如今的深度学习大语言模型（LLM）。RWKV作为开源社区的杰出代表，正在为AI的普及和民主化贡献力量。让我们期待更加智能、高效的未来！`;

const NUM_BLOCKS = 320;
const COLS = 20;
const ROWS = 16;
const MAX_CHARS = 120;

type ThemeKey = 'matrix' | 'amber' | 'cyberpunk' | 'ocean' | 'bloodmoon' | 'rain';

interface ThemeConfig {
  label: string;
  description: string;
  renderMode: 'grid' | 'rain';
  bg: string;
  gridBg: string;
  primary: string;
  secondary: string;
  rwkvColor: string;
  rwkvGlow: string;
  buttonStop: string;
  palette: string[];
  swatch: string;
  headerFont: string;
  gridFont: string;
  gridFontSize: string;
  gridLineHeight: string;
  headerLetterSpacing: string;
  cursor: string;
  cursorBlinkSpeed: number;
  scanlineColor: string;
  scanlineSize: string;
  scanlineEnabled: boolean;
  glowStrength: string;
  cellGlow: string;
  cellOpacity: number;
  gridBorder: string;
  gridGap: string;
  vignette: boolean;
  noise: boolean;
  crtBlur: boolean;
}

interface RainColumn {
  x: number;
  y: number;
  lastDrawY: number;
  fontSize: number;
  speed: number;
  charIndex: number;
  greenValue: number;
  driftPhase: number;
  driftRate: number;
  fallVariance: number;
  generationVariance: number;
  spacingVariance: number;
}

interface RainSettings {
  density: number;
  fallSpeed: number;
  generationSpeed: number;
  lineSpacing: number;
  organicVariation: boolean;
}

const DEFAULT_RAIN_SETTINGS: RainSettings = {
  density: 1,
  fallSpeed: 1,
  generationSpeed: 1,
  lineSpacing: 1,
  organicVariation: true,
};

function getRainColumnCount(width: number, density: number): number {
  return Math.max(24, Math.floor((width / 14) * density));
}

function createRainColumn(x: number, h: number, stagger: boolean, settings: RainSettings): RainColumn {
  const fontSize = 10 + Math.random() * 24;
  const depthRatio = (fontSize - 10) / 24;
  const t = depthRatio * depthRatio;
  const greenValue = Math.floor(12 + t * 243);
  const speed = (0.3 + t * 3) * settings.fallSpeed;

  return {
    x,
    y: stagger ? -(Math.random() * h * 2) : -(fontSize + Math.random() * 40),
    lastDrawY: -Infinity,
    fontSize,
    speed,
    charIndex: Math.floor(Math.random() * CORPUS.length),
    greenValue,
    driftPhase: Math.random() * Math.PI * 2,
    driftRate: 0.00045 + Math.random() * 0.00075,
    fallVariance: 0.05 + Math.random() * 0.12,
    generationVariance: 0.08 + Math.random() * 0.18,
    spacingVariance: 0.04 + Math.random() * 0.12,
  };
}

function createRainColumns(w: number, h: number, settings: RainSettings): RainColumn[] {
  const count = getRainColumnCount(w, settings.density);
  const spacing = w / count;

  return Array.from({ length: count }, (_, index) => {
    const jitter = Math.max(2, spacing - 2);
    const x = Math.min(w - 2, index * spacing + Math.random() * jitter);
    return createRainColumn(x, h, true, settings);
  });
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  matrix: {
    label: 'MATRIX',
    description: 'Classic terminal',
    renderMode: 'grid',
    bg: '#000000',
    gridBg: '#002200',
    primary: '#00FF41',
    secondary: '#008F11',
    rwkvColor: '#FFFFFF',
    rwkvGlow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)',
    buttonStop: '#FF003C',
    palette: ['#00FF41', '#008F11', '#03A062', '#2E8B57', '#3CB371', '#00FA9A'],
    swatch: '#00FF41',
    headerFont: '"Courier New", Courier, Consolas, monospace',
    gridFont: '"Courier New", Courier, Consolas, monospace',
    gridFontSize: '10px',
    gridLineHeight: '1.2',
    headerLetterSpacing: '0.15em',
    cursor: '█',
    cursorBlinkSpeed: 400,
    scanlineColor: 'rgba(0,255,65,0.03)',
    scanlineSize: '4px',
    scanlineEnabled: true,
    glowStrength: '0 0 3px currentColor',
    cellGlow: '',
    cellOpacity: 0.8,
    gridBorder: '1px solid rgba(0,255,65,0.2)',
    gridGap: '1px',
    vignette: false,
    noise: false,
    crtBlur: false,
  },
  amber: {
    label: 'AMBER_CRT',
    description: 'Retro phosphor',
    renderMode: 'grid',
    bg: '#0a0600',
    gridBg: '#1a0f00',
    primary: '#FFB000',
    secondary: '#996600',
    rwkvColor: '#FFFBE6',
    rwkvGlow: '0 0 12px rgba(255,200,50,0.9), 0 0 24px rgba(255,176,0,0.5)',
    buttonStop: '#FF003C',
    palette: ['#FFB000', '#FF8C00', '#FFA500', '#CC7700', '#E69500', '#FFCC33'],
    swatch: '#FFB000',
    headerFont: '"VT323", "Courier New", monospace',
    gridFont: '"VT323", "Courier New", monospace',
    gridFontSize: '12px',
    gridLineHeight: '1.15',
    headerLetterSpacing: '0.2em',
    cursor: '▮',
    cursorBlinkSpeed: 500,
    scanlineColor: 'rgba(255,176,0,0.05)',
    scanlineSize: '3px',
    scanlineEnabled: true,
    glowStrength: '0 0 6px currentColor, 0 0 2px currentColor',
    cellGlow: '',
    cellOpacity: 0.85,
    gridBorder: '1px solid rgba(255,176,0,0.15)',
    gridGap: '1px',
    vignette: true,
    noise: false,
    crtBlur: true,
  },
  cyberpunk: {
    label: 'CYBERPUNK',
    description: 'Neon dystopia',
    renderMode: 'grid',
    bg: '#0a0015',
    gridBg: '#120020',
    primary: '#FF00FF',
    secondary: '#8B008B',
    rwkvColor: '#00FFFF',
    rwkvGlow: '0 0 10px rgba(0,255,255,0.9), 0 0 30px rgba(0,255,255,0.4)',
    buttonStop: '#FFFF00',
    palette: ['#FF00FF', '#FF1493', '#00FFFF', '#DA70D6', '#FF69B4', '#9370DB'],
    swatch: '#FF00FF',
    headerFont: '"Orbitron", "Segoe UI", sans-serif',
    gridFont: '"Fira Code", "Courier New", Consolas, monospace',
    gridFontSize: '9px',
    gridLineHeight: '1.25',
    headerLetterSpacing: '0.25em',
    cursor: '▊',
    cursorBlinkSpeed: 300,
    scanlineColor: 'transparent',
    scanlineSize: '0px',
    scanlineEnabled: false,
    glowStrength: '0 0 5px currentColor, 0 0 10px currentColor',
    cellGlow: 'inset 0 0 8px rgba(255,0,255,0.06)',
    cellOpacity: 0.9,
    gridBorder: '1px solid rgba(255,0,255,0.25)',
    gridGap: '1px',
    vignette: false,
    noise: true,
    crtBlur: false,
  },
  ocean: {
    label: 'DEEP_SEA',
    description: 'Abyssal depth',
    renderMode: 'grid',
    bg: '#000810',
    gridBg: '#001020',
    primary: '#00BFFF',
    secondary: '#005F8F',
    rwkvColor: '#E0F8FF',
    rwkvGlow: '0 0 10px rgba(100,200,255,0.8), 0 0 20px rgba(0,191,255,0.4)',
    buttonStop: '#FF6347',
    palette: ['#00BFFF', '#1E90FF', '#00CED1', '#4682B4', '#5F9EA0', '#48D1CC'],
    swatch: '#00BFFF',
    headerFont: '"Fira Code", "Consolas", monospace',
    gridFont: '"Fira Code", "Consolas", monospace',
    gridFontSize: '9px',
    gridLineHeight: '1.3',
    headerLetterSpacing: '0.12em',
    cursor: '|',
    cursorBlinkSpeed: 500,
    scanlineColor: 'rgba(0,191,255,0.02)',
    scanlineSize: '6px',
    scanlineEnabled: true,
    glowStrength: '0 0 2px currentColor',
    cellGlow: '',
    cellOpacity: 0.75,
    gridBorder: '1px solid rgba(0,191,255,0.12)',
    gridGap: '1px',
    vignette: false,
    noise: false,
    crtBlur: false,
  },
  bloodmoon: {
    label: 'BLOODMOON',
    description: 'Crimson wrath',
    renderMode: 'grid',
    bg: '#050000',
    gridBg: '#1a0000',
    primary: '#FF003C',
    secondary: '#8B0000',
    rwkvColor: '#FFE0E0',
    rwkvGlow: '0 0 10px rgba(255,100,100,0.8), 0 0 20px rgba(255,0,60,0.4)',
    buttonStop: '#FFB000',
    palette: ['#FF003C', '#FF4444', '#DC143C', '#B22222', '#FF6347', '#FF1744'],
    swatch: '#FF003C',
    headerFont: '"IBM Plex Mono", "Courier New", monospace',
    gridFont: '"IBM Plex Mono", "Courier New", monospace',
    gridFontSize: '9px',
    gridLineHeight: '1.2',
    headerLetterSpacing: '0.18em',
    cursor: '_',
    cursorBlinkSpeed: 350,
    scanlineColor: 'rgba(255,0,60,0.03)',
    scanlineSize: '3px',
    scanlineEnabled: true,
    glowStrength: '0 0 4px currentColor',
    cellGlow: '',
    cellOpacity: 0.85,
    gridBorder: '1px solid rgba(255,0,60,0.2)',
    gridGap: '1px',
    vignette: true,
    noise: false,
    crtBlur: false,
  },
  rain: {
    label: 'DIGITAL_RAIN',
    description: 'Depth parallax',
    renderMode: 'rain',
    bg: '#000000',
    gridBg: '#000000',
    primary: '#00FF41',
    secondary: '#008F11',
    rwkvColor: '#FFFFFF',
    rwkvGlow: '',
    buttonStop: '#FF003C',
    palette: ['#00FF41'],
    swatch: '#00FF41',
    headerFont: '"Courier New", Courier, Consolas, monospace',
    gridFont: 'monospace',
    gridFontSize: '10px',
    gridLineHeight: '1.2',
    headerLetterSpacing: '0.15em',
    cursor: '█',
    cursorBlinkSpeed: 400,
    scanlineColor: '',
    scanlineSize: '0px',
    scanlineEnabled: false,
    glowStrength: '',
    cellGlow: '',
    cellOpacity: 1,
    gridBorder: 'none',
    gridGap: '0px',
    vignette: false,
    noise: false,
    crtBlur: false,
  },
};

const THEME_KEYS: ThemeKey[] = ['matrix', 'amber', 'cyberpunk', 'ocean', 'bloodmoon', 'rain'];

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [themeKey, setThemeKey] = useState<ThemeKey>('matrix');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [rainSettingsOpen, setRainSettingsOpen] = useState(false);
  const [rainSettings, setRainSettings] = useState<RainSettings>(DEFAULT_RAIN_SETTINGS);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const rainSettingsRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const themeRef = useRef(THEMES[themeKey]);
  const rainCanvasRef = useRef<HTMLCanvasElement>(null);

  const theme = THEMES[themeKey];
  const isRainMode = theme.renderMode === 'rain';

  const RWKV_INDICES = new Set([
    // R
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(r => r*20+0),
    1*20+1, 1*20+2,
    ...[2,3,4,5,6].map(r => r*20+3),
    7*20+1, 7*20+2,
    8*20+1, 9*20+1, 10*20+2, 11*20+2, 12*20+3, 13*20+3, 14*20+3,
    // W
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(r => r*20+5),
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(r => r*20+9),
    ...[7,8,9,10,11,12].map(r => r*20+7),
    13*20+6, 14*20+6, 13*20+8, 14*20+8,
    // K
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(r => r*20+11),
    ...[1,2,3,4,5].map(r => r*20+13),
    ...[6,7,8,9].map(r => r*20+12),
    ...[10,11,12,13,14].map(r => r*20+13),
    // V
    ...[1,2,3,4,5,6].map(r => r*20+15),
    ...[1,2,3,4,5,6].map(r => r*20+19),
    ...[7,8,9,10,11,12].map(r => r*20+16),
    ...[7,8,9,10,11,12].map(r => r*20+18),
    13*20+17, 14*20+17
  ]);

  const stateRefs = useRef(Array.from({ length: NUM_BLOCKS }).map((_, i) => {
    const isRWKV = RWKV_INDICES.has(i);
    return {
      index: Math.floor(Math.random() * CORPUS.length),
      text: '',
      speed: 0.015 + Math.random() * 0.01,
      accumulated: 0,
      isRWKV,
      colorIndex: Math.floor(Math.random() * 6),
      colorCycleInterval: 800 + Math.random() * 1200,
      lastColorChange: performance.now() + Math.random() * 2000
    };
  }));

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const applyThemeToBlocks = useCallback((t: ThemeConfig) => {
    if (t.renderMode !== 'grid') return;
    for (let i = 0; i < NUM_BLOCKS; i++) {
      const ref = textRefs.current[i];
      if (!ref) continue;
      const state = stateRefs.current[i];
      if (state.isRWKV) {
        ref.style.color = t.rwkvColor;
        ref.style.textShadow = t.rwkvGlow;
      } else {
        ref.style.color = t.palette[state.colorIndex % t.palette.length];
        ref.style.textShadow = t.glowStrength;
      }
      ref.style.fontFamily = t.gridFont;
      ref.style.fontSize = t.gridFontSize;
      ref.style.lineHeight = t.gridLineHeight;
      ref.style.filter = t.crtBlur ? 'blur(0.3px)' : 'none';
    }
  }, []);

  useEffect(() => {
    applyThemeToBlocks(theme);
  }, [theme, applyThemeToBlocks]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }

      if (rainSettingsRef.current && !rainSettingsRef.current.contains(e.target as Node)) {
        setRainSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isRainMode) {
      setRainSettingsOpen(false);
    }
  }, [isRainMode]);

  // Grid animation
  useEffect(() => {
    if (!isRunning || THEMES[themeKey].renderMode !== 'grid') return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = time - lastTime;
      const t = themeRef.current;

      if (deltaTime > 40) {
        lastTime = time;

        for (let i = 0; i < NUM_BLOCKS; i++) {
          const state = stateRefs.current[i];
          const ref = textRefs.current[i];

          if (ref) {
            if (!state.isRWKV && time - state.lastColorChange > state.colorCycleInterval) {
              state.colorIndex = (state.colorIndex + 1) % t.palette.length;
              state.lastColorChange = time;
              ref.style.color = t.palette[state.colorIndex];
            }

            const charsToAddFloat = state.speed * deltaTime + state.accumulated;
            const charsToAdd = Math.floor(charsToAddFloat);
            state.accumulated = charsToAddFloat - charsToAdd;

            for (let c = 0; c < charsToAdd; c++) {
              state.text += CORPUS[state.index];
              state.index = (state.index + 1) % CORPUS.length;
            }

            if (state.text.length > MAX_CHARS) {
              state.text = state.text.slice(-MAX_CHARS);
            }

            const showCursor = Math.floor(time / t.cursorBlinkSpeed) % 2 === 0;
            ref.textContent = state.text + (showCursor ? t.cursor : '');
          }
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, themeKey]);

  // Rain animation
  useEffect(() => {
    if (!isRunning || THEMES[themeKey].renderMode !== 'rain') return;

    const canvas = rainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const columns = createRainColumns(w, h, rainSettings);

    let animId: number;
    let frameCount = 0;
    let lastFrameTime = performance.now();

    const animate = (time: number) => {
      const deltaTime = Math.min(40, time - lastFrameTime || 16.67);
      lastFrameTime = time;
      frameCount++;

      // Semi-transparent overlay creates trailing fade.
      // Bright (close) chars take longer to fade = longer trails.
      // Dim (far) chars fade fast = short trails. Natural parallax.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.014)';
      ctx.fillRect(0, 0, w, h);

      // Every 120 frames (~2 seconds), clean up very dim pixels to prevent permanent ghosting
      if (frameCount % 120 === 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // If pixel is very dim (green channel < 8), make it fully black
          if (data[i + 1] < 8) {
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      for (const col of columns) {
        const driftWave = rainSettings.organicVariation
          ? Math.sin(time * col.driftRate + col.driftPhase)
          : 0;
        const spacingWave = rainSettings.organicVariation
          ? Math.cos(time * col.driftRate * 0.72 + col.driftPhase * 1.31)
          : 0;
        const effectiveFallSpeed = col.speed * (1 + driftWave * col.fallVariance);
        const effectiveGenerationSpeed = Math.max(
          0.35,
          rainSettings.generationSpeed * (1 + driftWave * col.generationVariance),
        );
        const effectiveLineSpacing = Math.max(
          0.35,
          rainSettings.lineSpacing * (1 + spacingWave * col.spacingVariance),
        );

        col.y += (effectiveFallSpeed * deltaTime) / 16.67;

        const glyphStep = Math.max(
          2,
          (col.fontSize * effectiveLineSpacing) / effectiveGenerationSpeed,
        );

        if (col.y - col.lastDrawY >= glyphStep) {
          col.lastDrawY = col.y;
          col.charIndex = (col.charIndex + 1) % CORPUS.length;

          if (col.y > 0 && col.y < h + col.fontSize) {
            const char = CORPUS[col.charIndex];

            const headGreen = Math.min(255, col.greenValue + 60);
            const headRed = col.greenValue > 180 ? Math.floor((col.greenValue - 180) * 1.5) : 0;
            const glowRadius = Math.max(1, col.fontSize * 0.3);

            ctx.font = `${col.fontSize}px "Cascadia Code", "Cascadia Mono", "Noto Sans Mono", "Microsoft YaHei", sans-serif`;
            ctx.shadowColor = `rgb(0, ${col.greenValue}, 0)`;
            ctx.shadowBlur = glowRadius;
            ctx.fillStyle = `rgb(${headRed}, ${headGreen}, ${Math.floor(headGreen * 0.12)})`;
            ctx.fillText(char, col.x, col.y);
            ctx.shadowBlur = 0;
          }
        }

        if (col.y > h + 80) {
          Object.assign(col, createRainColumn(Math.floor(Math.random() * w), h, false, rainSettings));
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw === 0 || nh === 0) return;
      const ndpr = window.devicePixelRatio || 1;
      canvas.width = nw * ndpr;
      canvas.height = nh * ndpr;
      ctx.setTransform(ndpr, 0, 0, ndpr, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, nw, nh);
      columns.splice(0, columns.length, ...createRainColumns(nw, nh, rainSettings));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [isRunning, themeKey, rainSettings]);

  const updateRainSetting = useCallback(
    (key: keyof RainSettings, value: number) => {
      setRainSettings((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const estimatedRainColumns = getRainColumnCount(
    rainCanvasRef.current?.clientWidth || window.innerWidth,
    rainSettings.density,
  );

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: theme.headerFont,
        backgroundColor: theme.bg,
        color: theme.primary,
      }}
    >
      <header
        className="relative flex items-center justify-between px-6 py-4 shrink-0"
        style={{
          zIndex: 50,
          backgroundColor: theme.bg,
          borderBottom: `1px solid ${theme.primary}30`,
          boxShadow: `0 4px 20px ${theme.primary}1a`,
          fontFamily: theme.headerFont,
        }}
      >
        <div className="flex flex-col">
          <h1
            className="text-[18px] font-bold uppercase"
            style={{
              color: theme.primary,
              textShadow: `0 0 8px ${theme.primary}99`,
              letterSpacing: theme.headerLetterSpacing,
            }}
          >
            RWKV_CONCURRENCY.EXE
          </h1>
          <p
            className="text-[12px] font-bold mt-1 uppercase"
            style={{
              color: theme.secondary,
              letterSpacing: theme.headerLetterSpacing,
            }}
          >
            SYS.THREAD_COUNT = 320
          </p>
        </div>

        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="hidden md:flex items-center space-x-6 text-[13px] font-bold uppercase" style={{ letterSpacing: theme.headerLetterSpacing }}>
            {[
              { label: 'Hardware', value: 'RTX_4090' },
              { label: 'Throughput', value: '~6,400 T/S' },
              { label: 'Memory', value: '11.8_GB' },
            ].map((m, idx) => (
              <React.Fragment key={m.label}>
                {idx > 0 && (
                  <div className="w-px h-6" style={{ backgroundColor: `${theme.primary}30` }} />
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] mb-0.5" style={{ color: theme.secondary }}>
                    {m.label}
                  </span>
                  <span style={{ color: theme.primary, textShadow: `0 0 5px ${theme.primary}66` }}>
                    {m.value}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold uppercase transition-all duration-150 border"
              style={{
                borderColor: `${theme.primary}50`,
                color: theme.primary,
                backgroundColor: `${theme.primary}0d`,
                letterSpacing: theme.headerLetterSpacing,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.primary}1a`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.primary}0d`;
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: theme.swatch, boxShadow: `0 0 6px ${theme.swatch}` }}
              />
              <span>{theme.label}</span>
              <span className="text-[10px] ml-0.5">{themeMenuOpen ? '▴' : '▾'}</span>
            </button>

            {themeMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 min-w-48 border"
                style={{
                  zIndex: 100,
                  backgroundColor: theme.bg,
                  borderColor: `${theme.primary}40`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 1px ${theme.primary}40`,
                }}
              >
                {THEME_KEYS.map((key) => {
                  const t = THEMES[key];
                  const isActive = key === themeKey;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setThemeKey(key);
                        setThemeMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-100"
                      style={{
                        fontFamily: t.headerFont,
                        color: isActive ? t.swatch : `${theme.primary}99`,
                        backgroundColor: isActive ? `${t.swatch}1a` : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = `${theme.primary}0d`;
                          e.currentTarget.style.color = t.swatch;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = `${theme.primary}99`;
                        }
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.swatch, boxShadow: `0 0 4px ${t.swatch}` }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold tracking-widest">{t.label}</span>
                        <span className="text-[9px] tracking-wider" style={{ opacity: 0.6 }}>{t.description}</span>
                      </div>
                      {isActive && <span className="ml-auto text-[10px]">●</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isRainMode && (
            <div className="relative" ref={rainSettingsRef}>
              <button
                onClick={() => setRainSettingsOpen(!rainSettingsOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold uppercase transition-all duration-150 border"
                style={{
                  borderColor: `${theme.primary}50`,
                  color: theme.primary,
                  backgroundColor: rainSettingsOpen ? `${theme.primary}1a` : `${theme.primary}0d`,
                  letterSpacing: theme.headerLetterSpacing,
                  boxShadow: rainSettingsOpen ? `0 0 14px ${theme.primary}33` : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${theme.primary}1a`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = rainSettingsOpen ? `${theme.primary}1a` : `${theme.primary}0d`;
                }}
              >
                <span>RAIN_SETTINGS</span>
                <span className="text-[10px]">{rainSettingsOpen ? '▴' : '▾'}</span>
              </button>

              {rainSettingsOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-80 border p-4"
                  style={{
                    zIndex: 100,
                    backgroundColor: `${theme.bg}f2`,
                    borderColor: `${theme.primary}40`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 1px ${theme.primary}40`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div
                        className="text-[12px] font-bold uppercase"
                        style={{ letterSpacing: theme.headerLetterSpacing, color: theme.primary }}
                      >
                        Digital Rain Config
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: `${theme.primary}99` }}>
                        当前约 {estimatedRainColumns} 列字符雨
                      </div>
                    </div>
                    <button
                      onClick={() => setRainSettings(DEFAULT_RAIN_SETTINGS)}
                      className="px-2 py-1 text-[10px] font-bold uppercase border transition-colors duration-150"
                      style={{
                        borderColor: `${theme.primary}40`,
                        color: theme.primary,
                        letterSpacing: theme.headerLetterSpacing,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.primary}14`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  <div
                    className="mb-4 flex items-center justify-between gap-4 border px-3 py-3"
                    style={{
                      borderColor: `${theme.primary}30`,
                      backgroundColor: `${theme.primary}08`,
                    }}
                  >
                    <div>
                      <div className="text-[12px] font-bold" style={{ color: theme.primary }}>
                        随机波动
                      </div>
                      <div className="text-[10px]" style={{ color: `${theme.primary}80` }}>
                        让每列的下落速度、生成节奏和字距轻微起伏
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setRainSettings((current) => ({
                          ...current,
                          organicVariation: !current.organicVariation,
                        }))
                      }
                      className="min-w-16 px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors duration-150"
                      style={{
                        borderColor: `${theme.primary}40`,
                        color: rainSettings.organicVariation ? theme.bg : theme.primary,
                        backgroundColor: rainSettings.organicVariation ? theme.primary : 'transparent',
                        letterSpacing: theme.headerLetterSpacing,
                        boxShadow: rainSettings.organicVariation ? `0 0 12px ${theme.primary}33` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!rainSettings.organicVariation) {
                          e.currentTarget.style.backgroundColor = `${theme.primary}14`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = rainSettings.organicVariation ? theme.primary : 'transparent';
                      }}
                    >
                      {rainSettings.organicVariation ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {[
                    {
                      key: 'density' as const,
                      label: '文字密度',
                      hint: '控制同时下落的列数',
                      min: 0.4,
                      max: 2.4,
                      step: 0.1,
                      value: `${estimatedRainColumns} 列`,
                    },
                    {
                      key: 'fallSpeed' as const,
                      label: '下落速度',
                      hint: '控制字符雨整体下降速度',
                      min: 0.4,
                      max: 3,
                      step: 0.1,
                      value: `${rainSettings.fallSpeed.toFixed(1)}x`,
                    },
                    {
                      key: 'generationSpeed' as const,
                      label: '文字生成速度',
                      hint: '控制新字符出现的频率',
                      min: 0.5,
                      max: 3,
                      step: 0.1,
                      value: `${rainSettings.generationSpeed.toFixed(1)}x`,
                    },
                    {
                      key: 'lineSpacing' as const,
                      label: '纵向间距',
                      hint: '控制同一列字符之间的上下距离',
                      min: 0.5,
                      max: 3,
                      step: 0.1,
                      value: `${rainSettings.lineSpacing.toFixed(1)}x`,
                    },
                  ].map((control) => (
                    <label key={control.key} className="block mb-4 last:mb-0">
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <div>
                          <div className="text-[12px] font-bold" style={{ color: theme.primary }}>
                            {control.label}
                          </div>
                          <div className="text-[10px]" style={{ color: `${theme.primary}80` }}>
                            {control.hint}
                          </div>
                        </div>
                        <div
                          className="text-[10px] px-2 py-1 border min-w-16 text-center"
                          style={{
                            borderColor: `${theme.primary}30`,
                            color: theme.primary,
                            backgroundColor: `${theme.primary}0d`,
                          }}
                        >
                          {control.value}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={rainSettings[control.key]}
                        onChange={(e) => updateRainSetting(control.key, Number(e.target.value))}
                        className="w-full accent-green-500"
                        style={{ accentColor: theme.primary }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="relative overflow-hidden px-6 py-2 text-[14px] font-bold uppercase transition-all duration-150 border-2"
            style={{
              letterSpacing: theme.headerLetterSpacing,
              ...(isRunning
                ? {
                    borderColor: theme.buttonStop,
                    color: theme.buttonStop,
                    boxShadow: `0 0 10px ${theme.buttonStop}4d`,
                  }
                : {
                    borderColor: theme.primary,
                    color: theme.primary,
                    boxShadow: `0 0 10px ${theme.primary}66`,
                  }),
            }}
            onMouseEnter={(e) => {
              if (isRunning) {
                e.currentTarget.style.backgroundColor = `${theme.buttonStop}1a`;
              } else {
                e.currentTarget.style.backgroundColor = theme.primary;
                e.currentTarget.style.color = theme.bg;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isRunning ? theme.buttonStop : theme.primary;
            }}
          >
            {isRunning ? 'SIGINT (STOP)' : 'EXECUTE (START)'}
          </button>
        </div>
      </header>

      {/* Content area */}
      <div
        className="flex-1 w-full h-full overflow-hidden relative"
        style={{ backgroundColor: theme.bg }}
      >
        {theme.renderMode === 'grid' ? (
          <>
            {theme.scanlineEnabled && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 20,
                  background: `linear-gradient(${theme.scanlineColor} 50%, rgba(0,0,0,0.1) 50%)`,
                  backgroundSize: `100% ${theme.scanlineSize}`,
                }}
              />
            )}

            {theme.vignette && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 21,
                  background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
                }}
              />
            )}

            {theme.noise && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  zIndex: 21,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px 128px',
                }}
              />
            )}

            <div
              className="w-full h-full grid p-px m-1 sm:m-2"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                gap: theme.gridGap,
                backgroundColor: theme.gridBg,
                border: theme.gridBorder,
              }}
            >
              {Array.from({ length: NUM_BLOCKS }).map((_, i) => {
                const state = stateRefs.current[i];
                return (
                  <div
                    key={i}
                    className="overflow-hidden relative p-1 sm:p-1.5 flex flex-col justify-end"
                    style={{
                      backgroundColor: theme.bg,
                      boxShadow: theme.cellGlow || 'none',
                    }}
                  >
                    <div
                      ref={(el) => {
                        textRefs.current[i] = el;
                        if (el && !el.dataset.init) {
                          el.dataset.init = '1';
                          const t = themeRef.current;
                          el.style.fontFamily = t.gridFont;
                          el.style.fontSize = t.gridFontSize;
                          el.style.lineHeight = t.gridLineHeight;
                          el.style.filter = t.crtBlur ? 'blur(0.3px)' : 'none';
                          if (state.isRWKV) {
                            el.style.color = t.rwkvColor;
                            el.style.textShadow = t.rwkvGlow;
                            el.style.fontWeight = 'bold';
                          } else {
                            el.style.color = t.palette[state.colorIndex % t.palette.length];
                            el.style.textShadow = t.glowStrength;
                          }
                        }
                      }}
                      className="break-all transition-colors duration-500 ease-in-out"
                      style={{
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                        opacity: state.isRWKV ? 1 : theme.cellOpacity,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <canvas
            ref={rainCanvasRef}
            className="w-full h-full block"
            style={{ backgroundColor: '#000000' }}
          />
        )}
      </div>
    </div>
  );
}
