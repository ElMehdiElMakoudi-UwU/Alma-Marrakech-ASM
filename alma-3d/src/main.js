import './style.css';
import Lenis from 'lenis';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const lenis = reducedMotion ? null : new Lenis({ lerp: 0.09, anchors: { offset: 0 } });
if (lenis) {
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y }));

// Fades on arrival
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      reveal.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px' });
$$('[data-reveal]').forEach((el) => reveal.observe(el));

// Header colour follows the section under it
const header = $('.top');
const sections = $$('main [data-theme]');
function updateHeader() {
  const hit = sections.find((s) => {
    const r = s.getBoundingClientRect();
    return r.top <= 30 && r.bottom > 30;
  });
  if (!hit) return;
  const stageNight = hit.id === 'maquette' && hit.classList.contains('is-night');
  header.dataset.theme = stageNight ? 'dark' : hit.dataset.theme;
  header.classList.toggle('is-solid', hit.id !== 'maquette' && hit.dataset.theme === 'light');
}

// Plans: choose a drawing
for (const group of $$('[data-tabs]')) {
  const buttons = $$('button', group);
  const panes = $$('[data-pane]', group.parentElement);
  const show = (name) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === name)));
    panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
  };
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
}

// 3D stage
const stageEl = $('#maquette');
const panels = $$('.panel', stageEl);
const railButtons = $$('[data-go]', stageEl);
const counter = $('[data-counter]', stageEl);
const nightButton = $('[data-night]', stageEl);

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function showStep(i) {
  panels.forEach((p, k) => p.classList.toggle('is-on', k === i));
  railButtons.forEach((b, k) => {
    b.classList.toggle('is-on', k === i);
    if (k === i) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  stageEl.dataset.step = i;
  if (counter) counter.textContent = String(i).padStart(2, '0');
}

function finishLoading() {
  root.classList.add('is-ready');
}

async function startStage() {
  const { createStage } = await import('./stage.js');
  const stage = createStage({
    root: stageEl,
    canvas: $('[data-canvas]', stageEl),
    labelsEl: $('[data-labels]', stageEl),
    onStep: showStep,
    reducedMotion,
  });

  const stageProgress = () => {
    const r = stageEl.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? -r.top / span : 0;
  };
  const onScroll = () => {
    stage.setProgress(stageProgress());
    updateHeader();
  };
  if (lenis) lenis.on('scroll', onScroll);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  railButtons.forEach((b, i) => {
    b.addEventListener('click', () => {
      const top = stageEl.getBoundingClientRect().top + scrollY;
      scrollToY(top + stage.goToProgress(i) * (stageEl.offsetHeight - innerHeight));
    });
  });

  nightButton?.addEventListener('click', () => {
    nightButton.setAttribute('aria-pressed', String(stage.toggleNight()));
  });
  stageEl.addEventListener('alma:night', (e) => {
    nightButton?.setAttribute('aria-pressed', String(e.detail > 0.5));
    updateHeader();
  });

  $('[data-turn="left"]', stageEl)?.addEventListener('click', () => stage.rotate(Math.PI / 4));
  $('[data-turn="right"]', stageEl)?.addEventListener('click', () => stage.rotate(-Math.PI / 4));

  // The first frame is drawn behind the loader, then the layers settle.
  requestAnimationFrame(() => {
    finishLoading();
    stage.playIntro();
  });
}

showStep(0);
addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

if (supportsWebGL()) {
  startStage()
    .catch((err) => {
      console.error(err);
      root.classList.add('no-webgl');
    })
    .finally(finishLoading);
} else {
  root.classList.add('no-webgl');
  finishLoading();
}
