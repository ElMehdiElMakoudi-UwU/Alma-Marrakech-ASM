// Interactions that do not depend on scroll: menu, plan hotspots, tabs, slider.

export function initMenu(lenis) {
  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.site-header__toggle');
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Fermer' : 'Menu';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      setOpen(false);
      if (lenis) {
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.6 });
      }
    });
  });
}

export function initMasse() {
  const figure = document.querySelector('[data-masse]');
  if (!figure) return;

  // On phones the plan is wider than the screen: start centred on the residence.
  const scroller = document.querySelector('[data-masse-scroll]');
  const centre = () => { scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * 0.5; };
  centre();
  addEventListener('resize', centre);

  const dots = figure.querySelectorAll('[data-spot]');
  const legend = document.querySelectorAll('[data-legend]');
  const light = (id) => {
    dots.forEach((d) => d.classList.toggle('is-on', d.dataset.spot === id));
    legend.forEach((l) => l.classList.toggle('is-on', l.dataset.legend === id));
  };
  legend.forEach((button) => {
    button.addEventListener('mouseenter', () => light(button.dataset.legend));
    button.addEventListener('mouseleave', () => light(null));
    button.addEventListener('focus', () => light(button.dataset.legend));
    button.addEventListener('blur', () => light(null));
    button.addEventListener('click', () => light(button.dataset.legend));
  });
  dots.forEach((dot) => dot.addEventListener('click', () => light(dot.dataset.spot)));

  const toggle = document.querySelector('[data-masse-toggle]');
  toggle.addEventListener('click', () => {
    const night = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(night));
    figure.classList.toggle('is-night', night);
  });
}

export function initTabs(onChange) {
  const buttons = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');
  const show = (id) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === id)));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== id; });
    onChange?.();
  };
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show('t1');
}

export function initCompare() {
  const figure = document.querySelector('[data-compare]');
  if (!figure) return null;
  const range = figure.querySelector('input');
  const update = () => figure.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', update);
  update();
  return { figure, range, update };
}
