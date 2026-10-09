import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownRight, ArrowUpRight, Github, Linkedin, Instagram, Mail, MapPin, Sun, Moon } from 'lucide-react';
import './style.css';

const FRAME_COUNT = 64;
const ANGLE_OFFSET = 16;
const lerpAngle = (from, to, amount) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;

function Hero() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('portfolio-theme') || 'light');
  const [transitioning, setTransitioning] = React.useState(false);
  const transitionTimers = React.useRef({ swap: 0, clear: 0 });
  const paperColors = React.useRef({ light: '#47a5ea', dark: '#122344' });
  const canvasRef = React.useRef(null);
  const pointer = React.useRef({ x: innerWidth * .72, y: innerHeight * .46, angle: -Math.PI / 2 });
  const [hover, setHover] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [loaderVisible, setLoaderVisible] = React.useState(true);
  const [assetsReady, setAssetsReady] = React.useState(false);
  const [canvasReady, setCanvasReady] = React.useState(false);
  const [cursorReady, setCursorReady] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(0);
  const loadStartedAt = React.useRef(performance.now());

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--paper', paperColors.current[theme]);
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  React.useEffect(() => () => {
    window.clearTimeout(transitionTimers.current.swap);
    window.clearTimeout(transitionTimers.current.clear);
  }, []);

  React.useEffect(() => {
    if (!assetsReady || !canvasReady || !cursorReady) return undefined;
    // Keep a short branded intro even when browser cache makes all frames instant.
    const delay = Math.max(0, 1450 - (performance.now() - loadStartedAt.current));
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [assetsReady, canvasReady, cursorReady]);

  React.useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setTimeout(() => setLoaderVisible(false), 1320);
    return () => window.clearTimeout(timer);
  }, [ready]);

  React.useEffect(() => {
    if (ready) document.documentElement.dataset.pageAwake = 'true';
  }, [ready]);

  const toggleTheme = () => {
    window.clearTimeout(transitionTimers.current.swap);
    window.clearTimeout(transitionTimers.current.clear);
    setTransitioning(true);
    transitionTimers.current.swap = window.setTimeout(() => setTheme(value => value === 'light' ? 'dark' : 'light'), 260);
    transitionTimers.current.clear = window.setTimeout(() => setTransitioning(false), 760);
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image(); img.decoding = 'async'; img.src = `/frames/frame-${String(i).padStart(2, '0')}.webp`; return img;
    });
    const center = new Image(); center.decoding = 'async'; center.src = '/frames/center.webp';
    const darkFrames = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image(); img.decoding = 'async'; img.src = `/frames-dark/frame-${String(i).padStart(2, '0')}.webp`; return img;
    });
    const darkCenter = new Image(); darkCenter.decoding = 'async'; darkCenter.src = '/frames-dark/center.webp';
    let raf, current = pointer.current.angle, lastFrame = -1, lastTheme = '', width = 0, height = 0, dpr = 1, lastTime = 0, canvasSignaled = false;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2); width = innerWidth; height = innerHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = paperColors.current[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']; ctx.fillRect(0, 0, width, height);
    };
    const faceCenter = () => {
      if (width <= 760) {
        const scale = Math.max(width / 3840, height / 2160) * .48;
        const dw = 3840 * scale, dh = 2160 * scale;
        return [(width - dw) / 2 + dw * .52, dh * .28];
      }
      return [width * .52, height * .28];
    };
    const move = e => {
      pointer.current.x = e.clientX; pointer.current.y = e.clientY;
      const [faceX, faceY] = faceCenter();
      pointer.current.angle = Math.atan2(e.clientY - faceY, e.clientX - faceX);
    };
    const drawCover = image => {
      if (!image?.complete || !image.naturalWidth) return;
      let scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      if (width <= 760) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#47a5ea';
        ctx.fillRect(0, 0, width, height); scale *= .48;
      }
      const dw = image.naturalWidth * scale, dh = image.naturalHeight * scale;
      ctx.drawImage(image, (width - dw) / 2, width <= 760 ? 0 : (height - dh) / 2, dw, dh);
      if (!canvasSignaled) { canvasSignaled = true; setCanvasReady(true); }
    };
    const frame = time => {
      // Time-based exponential damping keeps the same response on 60/120/144Hz displays.
      const elapsed = lastTime ? Math.min(time - lastTime, 40) : 16.67; lastTime = time;
      const activeTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const response = activeTheme === 'dark' ? .26 : .42;
      current = lerpAngle(current, pointer.current.angle, 1 - Math.pow(1 - response, elapsed / 16.67));
      if (activeTheme !== lastTheme) { lastTheme = activeTheme; lastFrame = -1; }
      const activeFrames = activeTheme === 'dark' ? darkFrames : frames;
      const activeCenter = activeTheme === 'dark' ? darkCenter : center;
      const [faceX, faceY] = faceCenter();
      const dx = pointer.current.x - faceX, dy = pointer.current.y - faceY;
      const useCenter = Math.hypot(dx, dy) < Math.min(width, height) * .12;
      if (useCenter && activeCenter.complete && activeCenter.naturalWidth) { if (lastFrame !== -2) { drawCover(activeCenter); lastFrame = -2; } }
      else {
        const angle = ((current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // The atlas proceeds clockwise from UP: each compass step spans eight frames.
        const index = (Math.round(angle / (Math.PI * 2) * FRAME_COUNT) + ANGLE_OFFSET) % FRAME_COUNT;
        // The dark clip's measured head poses run counter-clockwise: LEFT is frame 16,
        // RIGHT is frame 48. Mirror the compass index so the gaze follows the pointer.
        const frameIndex = activeTheme === 'dark' ? (FRAME_COUNT - index) % FRAME_COUNT : index;
        if (frameIndex !== lastFrame && activeFrames[frameIndex].complete && activeFrames[frameIndex].naturalWidth) { drawCover(activeFrames[frameIndex]); lastFrame = frameIndex; }
      }
      raf = requestAnimationFrame(frame);
    };
    resize(); window.addEventListener('resize', resize); window.addEventListener('pointermove', move, { passive: true });
    Promise.all([
      fetch('/frames/metadata.json').then(r => r.ok ? r.json() : null),
      fetch('/frames-dark/metadata.json').then(r => r.ok ? r.json() : null),
    ]).then(([lightMeta, darkMeta]) => {
      if (lightMeta?.background) paperColors.current.light = lightMeta.background;
      if (darkMeta?.background) paperColors.current.dark = darkMeta.background;
      document.documentElement.style.setProperty('--paper', paperColors.current[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']);
    }).catch(() => {});
    const allPortraitImages = [...frames, center, ...darkFrames, darkCenter];
    let settledImages = 0;
    const imagePromises = allPortraitImages.map(img => new Promise(resolve => {
      const settle = () => {
        settledImages += 1;
        const progress = Math.round(settledImages / allPortraitImages.length * 100);
        if (progress === 100 || progress % 5 === 0) setLoadProgress(progress);
        resolve();
      };
      const decodeAndSettle = () => img.decode ? img.decode().catch(() => {}).finally(settle) : settle();
      if (img.complete) decodeAndSettle();
      else { img.addEventListener('load', decodeAndSettle, { once: true }); img.addEventListener('error', settle, { once: true }); }
    }));
    Promise.all(imagePromises).then(() => setAssetsReady(true));
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); };
  }, []);

  React.useEffect(() => {
    const cursor = document.querySelector('.cursor'), ring = document.querySelector('.cursor-ring');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf;
    const move = e => { x = e.clientX; y = e.clientY; };
    let cursorSignaled = false;
    const tick = () => { rx += (x - rx) * .18; ry += (y - ry) * .18; cursor.style.transform = `translate(${x}px,${y}px)`; ring.style.transform = `translate(${rx}px,${ry}px)`; if (!cursorSignaled) { cursorSignaled = true; setCursorReady(true); } raf = requestAnimationFrame(tick); };
    const over = e => setHover(Boolean(e.target.closest('a,button')));
    window.addEventListener('pointermove', move); document.addEventListener('pointerover', over); tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.removeEventListener('pointerover', over); };
  }, []);

  React.useEffect(() => {
    const revealItems = [...document.querySelectorAll('.reveal')];
    const orbSection = document.querySelector('.stack-section');
    const orbs = [...document.querySelectorAll('.skill-orb')];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealItems.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    }, { threshold: .16, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach(item => observer.observe(item));

    const field = orbSection?.querySelector('.stack-cloud');
    let pointer = null, raf = 0, bodies = [], clusterZone = null;
    const layoutCluster = () => {
      if (!field) return;
      const mobile = innerWidth <= 760;
      const cols = mobile ? 4 : 8;
      const clusterWidth = Math.min(mobile ? 230 : 870, field.clientWidth * .88);
      const stepX = clusterWidth / (cols - 1);
      const stepY = mobile ? 58 : 75;
      const rows = Math.ceil(orbs.length / cols);
      const startX = (field.clientWidth - clusterWidth) / 2;
      const startY = (field.clientHeight - ((rows - 1) * stepY + 100)) / 2;
      clusterZone = { left: startX - 70, right: startX + clusterWidth + 70, top: startY - 70, bottom: startY + (rows - 1) * stepY + 170 };
      bodies = orbs.map((orb, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const size = orb.offsetWidth;
        const homeX = startX + col * stepX - size / 2 + ((row + col) % 2 ? 7 : -7);
        const homeY = startY + row * stepY - size / 2 + ((row * 3 + col) % 3 - 1) * 6;
        orb.style.left = `${homeX}px`; orb.style.top = `${homeY}px`; orb.style.zIndex = String(i + 1);
        return { orb, homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0, size, mass: (size / 90) ** 2 };
      });
    };
    layoutCluster();
    const animateCluster = () => {
      raf = 0;
      let unsettled = false;
      const dt = 1;
      const rect = field?.getBoundingClientRect();
      const px = pointer && rect ? pointer.x - rect.left : 0;
      const py = pointer && rect ? pointer.y - rect.top : 0;
      const forces = bodies.map(() => ({ x: 0, y: 0 }));
      // Soft body collisions keep the glossy skill spheres from passing through one another.
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        let dx = b.x + b.size / 2 - (a.x + a.size / 2), dy = b.y + b.size / 2 - (a.y + a.size / 2);
        const distance = Math.hypot(dx, dy) || .001, min = (a.size + b.size) * .43;
        if (distance < min) {
          const nx = dx / distance, ny = dy / distance, overlap = min - distance;
          const total = a.mass + b.mass;
          a.x -= nx * overlap * (b.mass / total) * .72; a.y -= ny * overlap * (b.mass / total) * .72;
          b.x += nx * overlap * (a.mass / total) * .72; b.y += ny * overlap * (a.mass / total) * .72;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relative < 0) {
            const impulse = -(1.48 * relative) / (1 / a.mass + 1 / b.mass);
            a.vx -= impulse * nx / a.mass; a.vy -= impulse * ny / a.mass;
            b.vx += impulse * nx / b.mass; b.vy += impulse * ny / b.mass;
          }
        }
      }
      for (const body of bodies) {
        const cx = body.x + body.size / 2, cy = body.y + body.size / 2;
        let ax = (body.homeX - body.x) * (pointer ? .002 : .018) - body.vx * (pointer ? .055 : .19);
        let ay = (body.homeY - body.y) * (pointer ? .002 : .018) - body.vy * (pointer ? .055 : .19);
        if (pointer) {
          const dx = cx - px, dy = cy - py, distance = Math.hypot(dx, dy) || 1;
          const reach = innerWidth <= 760 ? 175 : 295;
          const influence = Math.max(0, 1 - distance / reach);
          const force = influence * (innerWidth <= 760 ? 4.8 : 6.2);
          ax += dx / distance * force; ay += dy / distance * force;
        }
        body.vx += ax * dt; body.vy += ay * dt;
        body.x += body.vx * dt; body.y += body.vy * dt;
        const maxX = field.clientWidth - body.size, maxY = field.clientHeight - body.size;
        if (body.x < 0 || body.x > maxX) { body.x = Math.max(0, Math.min(maxX, body.x)); body.vx *= -.38; }
        if (body.y < 0 || body.y > maxY) { body.y = Math.max(0, Math.min(maxY, body.y)); body.vy *= -.38; }
        body.orb.style.left = `${body.x}px`; body.orb.style.top = `${body.y}px`;
        unsettled ||= Math.abs(body.x - body.homeX) > .5 || Math.abs(body.y - body.homeY) > .5 || Math.abs(body.vx) > .12 || Math.abs(body.vy) > .12;
      }
      if (pointer || unsettled) raf = requestAnimationFrame(animateCluster);
    };
    const move = event => {
      const rect = field?.getBoundingClientRect();
      const x = rect ? event.clientX - rect.left : 0, y = rect ? event.clientY - rect.top : 0;
      pointer = clusterZone && x >= clusterZone.left && x <= clusterZone.right && y >= clusterZone.top && y <= clusterZone.bottom
        ? { x: event.clientX, y: event.clientY } : null;
      if (!raf) raf = requestAnimationFrame(animateCluster);
    };
    const reset = () => {
      pointer = null;
      if (!raf) raf = requestAnimationFrame(animateCluster);
    };
    const resize = () => { pointer = null; layoutCluster(); if (!raf) raf = requestAnimationFrame(animateCluster); };
    orbSection?.addEventListener('pointermove', move, { passive: true });
    orbSection?.addEventListener('pointerleave', reset, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      orbSection?.removeEventListener('pointermove', move);
      orbSection?.removeEventListener('pointerleave', reset);
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <>
    <main className={`hero${transitioning ? ' is-transitioning' : ''}`} id="home" style={{ '--transition-cover': theme === 'light' ? '#07101f' : '#eaf6fc' }}>
      <canvas ref={canvasRef} className="portrait" aria-label="Interactive character portrait" />
      <div className={`cursor${hover ? ' is-hover' : ''}`} /><div className={`cursor-ring${hover ? ' is-hover' : ''}`} />
      <header className="topbar"><a className="brand" href="#home" aria-label="Kaustuv home">K<span>.</span></a><nav aria-label="Main navigation"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav><span className="availability"><i /> Available for work</span></header>
      <section className="intro"><p className="eyebrow"><span /> AI ENGINEER · INDIA</p><h1><span className="greeting">Hi, I’m</span><span className="name">Kaustuv<span className="period">.</span></span></h1><p className="bio">I build intelligent products and thoughtful digital experiences, bringing AI research into useful, human-centered software.</p><div className="actions"><a className="button button-light" href="https://drive.google.com/file/d/1FD0imwktGZEtk8351x2MYiZl9czUo4Wr/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume <ArrowUpRight size={15} strokeWidth={1.8} /></a><a className="button button-glass" href="mailto:kaustuvmail@gmail.com">Let’s talk <ArrowUpRight size={15} strokeWidth={1.8} /></a></div></section>
      <div className="side-note"><span>01 / 05</span><span className="line" /><span>SCROLL TO EXPLORE</span></div>
      <aside className="social-rail" aria-label="Social links"><a href="https://github.com/helloKaustuv" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={15}/><span>@helloKaustuv</span></a><a href="https://www.linkedin.com/in/kaustuv-gupta-21796b202" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={15}/><span>Kaustuv Gupta</span></a><a href="https://www.instagram.com/kaustuvguptaa?stkn=cTFlc2M1YmVzZ2tn" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={15}/><span>@kaustuvguptaa</span></a></aside>
      <footer className="hero-footer"><span>DESIGNING WITH INTENTION</span><span className="coordinates">DEOGHAR · INDIA</span><a href="#about">EXPLORE <ArrowDownRight size={12}/></a></footer>
    </main>
    {loaderVisible && <div className={`site-loader${ready ? ' is-exiting' : ''}`} aria-hidden={ready}>
      <div className="loader-topline"><span><b>KG.</b><small>PORTFOLIO / 2026</small></span><span><b>AI ENGINEER</b><small>DEOGHAR, INDIA</small></span></div>
      <div className="loader-center">
        <div className="loader-marquee" aria-label="Kaustuv Gupta"><div className="loader-marquee-track"><span>KAUSTUV GUPTA <i>•</i> KAUSTUV GUPTA <i>•</i> </span><span aria-hidden="true">KAUSTUV GUPTA <i>•</i> KAUSTUV GUPTA <i>•</i> </span></div></div>
        <div className="loader-status"><i />{ready ? 'WELCOME' : 'LOADING'}{!ready && <small>{loadProgress}%</small>}</div>
      </div>
      <div className="loader-bottomline"><span>AN INTERACTIVE PORTFOLIO</span><span>{ready ? 'WELCOME' : 'PLEASE WAIT'}</span></div>
      <div className="loader-progress"><span style={{ width: `${loadProgress}%` }} /></div>
    </div>}
    <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}<span>{theme === 'light' ? 'DARK' : 'LIGHT'}</span></button>
    <section className="section about-section" id="about"><div className="section-label"><span>01 — ABOUT</span><MapPin size={14}/> DEOGHAR, JHARKHAND</div><div className="about-grid"><h2>Curious by nature.<br/><em>Engineer by craft.</em></h2><div className="about-copy"><p>I’m Kaustuv, an AI engineer interested in building technology that feels both capable and clear. My work spans machine learning, generative AI, data visualization, and the web.</p><p>Currently exploring how foundation models can become practical, reliable tools for real people and real workflows.</p><div className="education"><span>EDUCATION</span><strong>B.Tech, Computer Science — AI &amp; ML</strong><small>Vellore Institute of Technology · 2023—2025 · CGPA 8.04</small></div></div></div></section>
    <section className="section capabilities" id="capabilities"><div className="section-label"><span>02 — WHAT I DO</span><span>IDEAS TO WORKING SOFTWARE</span></div><h2>Curiosity into<br/><em>capability.</em></h2><div className="skill-grid"><article><b>01 / AI</b><h3>Generative AI</h3><p>Foundation models, prompt engineering, RAG, and LLM applications with an eye toward practical, responsible use.</p></article><article><b>02 / ML</b><h3>Machine Learning</h3><p>Deep learning and computer vision, including image classification, model inference, and data analysis.</p></article><article><b>03 / BUILD</b><h3>Web &amp; Data</h3><p>Interactive web projects, document analysis, data visualization, and full-stack experimentation.</p></article></div><div className="toolkit"><span>SKILLSET &amp; TOOLS</span><p>Python · Java · C++ · C · JavaScript · HTML · MySQL · R · MQL · TensorFlow · PyTorch · Pandas · NumPy · WordPress · Git &amp; GitHub · Excel · Power BI · Matplotlib</p></div></section>
    <section className="section career" id="career"><div className="section-label"><span>03 — CAREER &amp; EXPERIENCE</span><span>LEARNING BY BUILDING</span></div><h2 className="career-heading reveal">Experience<span className="blue-dot">.</span></h2><div className="career-timeline"><article className="career-role reveal reveal-left"><span className="role-kicker">IBM · WATSONX.AI</span><h3>Generative AI<br/><em>Intern</em></h3><p>Jun — Aug 2025</p></article><div className="timeline-year reveal">2025</div><div className="timeline-marker reveal"/><article className="career-card reveal reveal-right"><span className="experience-index">01 / EXPERIENCE</span><h3>Generative AI at IBM</h3><p className="experience-line">Explored foundation models and LLM-based applications with IBM watsonx.ai.</p><p className="experience-line">Applied prompt engineering to improve the quality and relevance of AI-generated outputs.</p><p className="experience-line">Developed and evaluated GenAI solutions for enterprise use cases.</p><p className="experience-line">Built practical knowledge of Python, LLMs, Generative AI, and IBM watsonx through project-based learning.</p><div className="tags"><span>FOUNDATION MODELS</span><span>PROMPT ENGINEERING</span><span>LLMs</span><span>PYTHON</span></div></article></div><div className="certifications reveal"><span className="line-reveal">COURSEWORK &amp; CERTIFICATIONS</span><p className="line-reveal">Generative AI using IBM watsonx · NVIDIA AI for All: From Basics to GenAI Practice · Deep Learning, IIT Ropar (NPTEL)<br/>Data Visualization · Data Analysis · Generative AI · Deep Learning · Machine Learning · RAG · NLP · Agentic AI · Cloud Computing</p></div></section>
    <section className="section projects" id="work"><div className="section-label reveal"><span>04 — SELECTED WORK</span><span>PROJECTS &amp; EXPERIMENTS</span></div><h2 className="reveal">Built to make ideas useful<span className="blue-dot">.</span></h2><div className="project-list"><article className="project reveal"><div className="project-visual docu-visual"><div className="preview-top"><span>DOCULENS</span><span>DOCUMENT INTELLIGENCE</span><i>↗</i></div><div className="document-sheet"><div className="document-heading">Research overview</div><div className="document-lines"><i/><i/><i/><i/><i/></div><div className="document-score"><span>READABILITY REPORT</span><div className="document-lines"><i/><i/><i/></div></div></div><div className="scan-caption">DOCUMENT REPORT PREVIEW <span>DOCULENS</span></div></div><div className="project-index line-reveal">01</div><div className="project-copy"><h3 className="line-reveal">DocuLens</h3><p className="line-reveal">DocuLens is a privacy-first document analysis suite for exploring a document’s originality, content, and clarity. It brings together plagiarism checks, AI-content detection, concise summarization, and readability analysis in one workflow, helping users review text from multiple angles before sharing or publishing. Built with JavaScript, TF-IDF, PDF.js, and JSZip.</p><div className="tags line-reveal"><span>JAVASCRIPT</span><span>TF-IDF</span><span>PDF.JS</span><span>JSZIP</span></div></div><a className="project-link line-reveal" href="https://hellokaustuv.github.io/DocuLens/" target="_blank" rel="noreferrer" aria-label="Open DocuLens project"><ArrowUpRight/></a><span className="project-date line-reveal">JUN 2026</span></article><article className="project reveal"><div className="project-visual vision-visual"><div className="preview-top"><span>FRAMECHECK</span><span>AI IMAGE &amp; VIDEO DETECTOR</span><i>↗</i></div><div className="vision-comparison"><div className="vision-image real-image"><span>HUMAN-MADE</span><b>PHOTO_2048.JPG</b></div><div className="vision-image generated-image"><span>AI-GENERATED</span><b>SYNTH_091.PNG</b></div></div><div className="model-result"><div><span>MODEL OUTPUT</span><b>REAL / AI</b></div><span className="score-track"><i/></span><small>SDXL DETECTOR · IMAGE &amp; VIDEO ANALYSIS</small></div></div><div className="project-index line-reveal">02</div><div className="project-copy"><h3 className="line-reveal">FrameCheck — AI Image &amp; Video Detector</h3><p className="line-reveal">Built a Streamlit app that analyzes images and sampled video frames with the Organika/sdxl-detector model to estimate whether media is AI-generated or human-made. Added image metadata and EXIF inspection, SHA-256 hashing, and JPEG Error Level Analysis (ELA). Deployed publicly on Streamlit Community Cloud.</p><div className="tags line-reveal"><span>STREAMLIT</span><span>SDXL DETECTOR</span><span>EXIF · SHA-256</span><span>VIDEO FRAMES · ELA</span></div></div><a className="project-link line-reveal" href="https://framecheck-kaustuv.streamlit.app/" target="_blank" rel="noreferrer" aria-label="Open FrameCheck AI image and video detector"><ArrowUpRight/></a><span className="project-date line-reveal">OCT 2025</span></article></div></section>
    <section className="stack-section" id="stack"><div className="section-label reveal"><span>05 — MY TECHSTACK</span><span>TOOLS I USE TO EXPLORE &amp; BUILD</span></div><h2 className="stack-heading reveal">My Techstack<span className="blue-dot">.</span></h2><div className="stack-cloud reveal"><span className="skill-orb" key="0"><span className="orb-label">Python</span></span><span className="skill-orb" key="1"><span className="orb-label">Generative AI</span></span><span className="skill-orb" key="2"><span className="orb-label">TensorFlow</span></span><span className="skill-orb" key="3"><span className="orb-label">JavaScript</span></span><span className="skill-orb" key="4"><span className="orb-label">PyTorch</span></span><span className="skill-orb" key="5"><span className="orb-label">RAG</span></span><span className="skill-orb" key="6"><span className="orb-label">OpenCV</span></span><span className="skill-orb" key="7"><span className="orb-label">Data Visualization</span></span><span className="skill-orb" key="8"><span className="orb-label">Git &amp; GitHub</span></span><span className="skill-orb" key="9"><span className="orb-label">MySQL</span></span><span className="skill-orb" key="10"><span className="orb-label">NumPy</span></span><span className="skill-orb" key="11"><span className="orb-label">Power BI</span></span><span className="skill-orb" key="12"><span className="orb-label">Cloud Computing</span></span><span className="skill-orb" key="13"><span className="orb-label">Agentic AI</span></span><span className="skill-orb" key="14"><span className="orb-label">HTML</span></span><span className="skill-orb" key="15"><span className="orb-label">WordPress</span></span><span className="skill-orb" key="16"><span className="orb-label">Pandas</span></span><span className="skill-orb" key="17"><span className="orb-label">NLP</span></span><span className="skill-orb" key="18"><span className="orb-label">Matplotlib</span></span><span className="skill-orb" key="19"><span className="orb-label">Deep Learning</span></span><span className="skill-orb" key="20"><span className="orb-label">Java</span></span><span className="skill-orb" key="21"><span className="orb-label">C++</span></span><span className="skill-orb" key="22"><span className="orb-label">C</span></span><span className="skill-orb" key="23"><span className="orb-label">R</span></span><span className="skill-orb" key="24"><span className="orb-label">MQL</span></span><span className="skill-orb" key="25"><span className="orb-label">Excel</span></span><span className="skill-orb" key="26"><span className="orb-label">Foundation Models</span></span><span className="skill-orb" key="27"><span className="orb-label">Prompt Engineering</span></span><span className="skill-orb" key="28"><span className="orb-label">LLMs</span></span><span className="skill-orb" key="29"><span className="orb-label">Computer Vision</span></span><span className="skill-orb" key="30"><span className="orb-label">Data Analysis</span></span><span className="skill-orb" key="31"><span className="orb-label">Jupyter</span></span></div></section>
    <section className="contact-section" id="contact"><div className="section-label"><span>06 — CONTACT</span><span>OPEN TO GOOD CONVERSATIONS</span></div><div className="contact-grid"><div><h2>Have a good<br/><em>idea?</em></h2><p className="contact-intro">Let’s connect and build something thoughtful together.</p><a className="contact-email" href="mailto:kaustuvmail@gmail.com">kaustuvmail@gmail.com <ArrowUpRight/></a></div><div className="contact-details"><div><span>LOCATION</span><p>Deoghar, Jharkhand<br/>India</p></div><div><span>ELSEWHERE</span><div className="socials"><a href="https://github.com/helloKaustuv" target="_blank" rel="noreferrer"><Github size={16}/> GitHub</a><a href="https://www.linkedin.com/in/kaustuv-gupta-21796b202" target="_blank" rel="noreferrer"><Linkedin size={16}/> LinkedIn</a><a href="https://www.instagram.com/kaustuvguptaa?stkn=cTFlc2M1YmVzZ2tn" target="_blank" rel="noreferrer"><Instagram size={16}/> Instagram</a></div></div></div></div><footer className="site-footer"><span>© 2026 KAUSTUV GUPTA</span><a href="#home">BACK TO TOP ↑</a><span>DESIGNED &amp; BUILT WITH INTENTION</span></footer></section>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Hero /></React.StrictMode>);
