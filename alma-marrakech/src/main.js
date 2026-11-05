import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { palmShadow } from './palm.js';
import { initCompare, initMasse, initMenu, initTabs } from './ui.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const CURTAIN = 'cubic-bezier(.7,0,.4,1)';
const SETTLE = 'cubic-bezier(.25,.74,.22,.99)';
const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;

if (!motionOK) document.documentElement.classList.add('no-motion');

// Section titles: real text for screen readers, separate letters for the eye.
function explodeTitles() {
  $$('[data-explode]').forEach((title) => {
    const text = title.textContent.trim();
    const letters = [...text].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    title.innerHTML = `<span class="sr">${text}</span><span class="xt__row" aria-hidden="true" style="--n:${text.length}">${letters}</span>`;
  });
}

// Which point of the box shows a given point of an object-fit: cover image.
function coverOrigin(img, fx, fy) {
  const box = img.getBoundingClientRect();
  const natural = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
  const [posX, posY] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const scale = Math.max(box.width / natural, box.height);
  const shownW = natural * scale;
  const x = (box.width - shownW) * posX + fx * shownW;
  const y = (box.height - scale) * posY + fy * scale;
  return `${(x / box.width) * 100}% ${(y / box.height) * 100}%`;
}

// Scroll-linked state that informs rather than decorates, so it runs for everyone.
function initScrollState() {
  // Header colour follows the section underneath it.
  const header = $('.site-header');
  $$('[data-theme]', $('main')).forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 40px',
      end: 'bottom 40px',
      onToggle: (self) => {
        if (self.isActive) header.dataset.theme = section.dataset.theme;
      },
    });
  });
  ScrollTrigger.create({
    trigger: '#residence',
    start: 'top 70px',
    end: 'max',
    toggleClass: { targets: header, className: 'is-solid' },
  });

  // Sticky diagram, swapped by the step in view.
  const media = $$('[data-steps-media] img');
  $$('[data-step]').forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 60%',
      end: 'bottom 60%',
      onToggle: (self) => {
        if (self.isActive) media.forEach((img, k) => img.classList.toggle('is-on', k === i));
      },
    });
  });
}

function initScroll() {
  const mm = gsap.matchMedia();

  mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767.98px)' }, (context) => {
    const { desktop } = context.conditions;

    // Text arrives word by word, line after line.
    $$('[data-reveal]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines,words',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 60,
            autoAlpha: 0,
            filter: desktop ? 'blur(14px)' : 'none',
            duration: 1.6,
            ease: SETTLE,
            stagger: 0.018,
            clearProps: 'filter',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }),
      });
    });

    gsap.utils.toArray('[data-fade]').forEach((el) => {
      gsap.from(el, {
        y: 24,
        autoAlpha: 0,
        duration: 1.2,
        ease: SETTLE,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });

    // Hero sinks as the next section slides over it.
    gsap.timeline({
      scrollTrigger: { trigger: '.hero-wrap', start: 'top top', end: 'bottom bottom', scrub: true },
    })
      .to('.hero__img', { yPercent: 12, scale: 1.06, ease: 'none' }, 0)
      .to('.hero__content', { yPercent: -18, autoAlpha: 0.15, ease: 'none' }, 0);

    // Slit in the wall: the image opens from a narrow strip to full width.
    gsap.fromTo('[data-slit]',
      { clipPath: desktop ? 'inset(14% 36% 14% 36%)' : 'inset(10% 24% 10% 24%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'power1.out',
        scrollTrigger: { trigger: '[data-slit]', start: 'top 85%', end: 'top 5%', scrub: true },
      });
    gsap.fromTo('[data-slit] img', { scale: 1.3 }, {
      scale: 1,
      ease: 'power1.out',
      scrollTrigger: { trigger: '[data-slit]', start: 'top 85%', end: 'top 5%', scrub: true },
    });

    // Façade: from dusk to night, the night render is the same camera.
    gsap.set('[data-duo-b]', { autoAlpha: 0, y: 20 });
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.duo', start: 'top top', end: 'bottom bottom', scrub: true },
    })
      .to({}, { duration: 0.14 })
      .to('.pair__night', { opacity: 1, duration: 0.66 }, 0.14)
      .to('[data-duo-meter]', { scaleX: 1, duration: 0.66 }, 0.14)
      .to('[data-duo-a]', { autoAlpha: 0, y: -20, duration: 0.14 }, 0.34)
      .to('[data-duo-b]', { autoAlpha: 1, y: 0, duration: 0.14 }, 0.5)
      .to({}, { duration: 0.2 }, 0.8);

    // Situation: fly from the city down to the site.
    const mapA = $('[data-map-a]');
    const mapB = $('[data-map-b]');
    const setOrigins = () => {
      gsap.set(mapA, { transformOrigin: coverOrigin(mapA, 0.64, 0.81) });
      gsap.set(mapB, { transformOrigin: coverOrigin(mapB, 0.52, 0.486) });
    };
    setOrigins();
    ScrollTrigger.addEventListener('refreshInit', setOrigins);
    mapA.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    gsap.set('[data-map-step-b]', { autoAlpha: 0, y: 24 });
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.map-story', start: 'top top', end: 'bottom bottom', scrub: true },
    })
      .to(mapA, { scale: 2.4, duration: 0.62, ease: 'power1.in' }, 0.08)
      .fromTo(mapB, { scale: 0.72 }, { scale: 1, duration: 0.5, ease: 'power1.out' }, 0.45)
      .to(mapB, { opacity: 1, duration: 0.2 }, 0.45)
      .to('[data-map-step-a]', { autoAlpha: 0, y: -24, duration: 0.1 }, 0.42)
      .to('[data-map-step-b]', { autoAlpha: 1, y: 0, duration: 0.1 }, 0.56)
      .to({}, { duration: 0.05 }, 0.95);

    // Exploded titles open up as they arrive.
    $$('[data-explode]').forEach((title) => {
      const letters = $$('.xt__row > span', title);
      const mid = (letters.length - 1) / 2;
      letters.forEach((letter, i) => {
        gsap.fromTo(letter,
          { x: () => (mid - i) * (innerWidth / letters.length) * 0.82, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: title,
              start: 'top 98%',
              end: desktop ? 'top 42%' : 'top 62%',
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
      });
    });

    // Photo drifts inside its frame.
    $$('[data-drift]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -15 }, {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Intérieurs: vertical scroll drives a horizontal run on large screens.
    let cleanupGallery = () => {};
    if (desktop) {
      const gallery = $('[data-gallery]');
      const track = $('[data-track]');
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      const setHeight = () => { gallery.style.height = `${distance() + innerHeight * 1.15}px`; };
      setHeight();
      ScrollTrigger.addEventListener('refreshInit', setHeight);
      const run = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: gallery,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      $$('[data-card-img]').forEach((img) => {
        gsap.fromTo(img, { xPercent: 0 }, {
          xPercent: -12,
          ease: 'none',
          scrollTrigger: {
            trigger: img.closest('.card'),
            containerAnimation: run,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        });
      });
      cleanupGallery = () => {
        ScrollTrigger.removeEventListener('refreshInit', setHeight);
        gallery.style.height = '';
      };
    }

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', setOrigins);
      cleanupGallery();
    };
  });

  // Slider sweeps once on arrival, to show that it can be moved.
  const compare = initCompare();
  if (compare) {
    const state = { pos: 88 };
    compare.range.value = 88;
    compare.update();
    let touched = false;
    compare.range.addEventListener('pointerdown', () => { touched = true; }, { once: true });
    gsap.to(state, {
      pos: 50,
      duration: 2.4,
      ease: CURTAIN,
      scrollTrigger: { trigger: compare.figure, start: 'top 65%', once: true },
      onUpdate: () => {
        if (touched) return;
        compare.range.value = state.pos;
        compare.update();
      },
    });
  }
}

function runIntro(lenis) {
  const preloader = $('.preloader');
  const counter = $('.preloader__count');
  // Stop the CSS safety net now that the script is in charge.
  preloader.style.animation = 'none';
  lenis.stop();
  scrollTo(0, 0);

  gsap.set('.hl', { yPercent: 110 });
  gsap.set('[data-hero-meta]', { autoAlpha: 0, y: 12 });
  gsap.set('.hero__img', { scale: 1.14 });

  const images = ['.hero__img', '.pair img'].map((s) => $(s));
  const waitFor = (img) =>
    img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {});
  const shown = { value: 0 };
  const paint = () => { counter.textContent = `${Math.round(shown.value)}%`; };
  let done = 0;
  const bump = () => {
    done += 1;
    gsap.to(shown, { value: (done / images.length) * 100, duration: 0.6, ease: 'power2.out', onUpdate: paint, overwrite: true });
  };

  const minimum = new Promise((resolve) => setTimeout(resolve, 1100));
  // The hero must not hold the page hostage on a slow connection.
  const limit = new Promise((resolve) => setTimeout(resolve, 3500));
  const loaded = Promise.all(images.map((img) => waitFor(img).then(bump)));

  Promise.all([minimum, Promise.race([loaded, limit])]).then(() => {
    gsap.timeline()
      .to(shown, { value: 100, duration: 0.3, onUpdate: paint, overwrite: true })
      .to(preloader, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 1.2,
        ease: CURTAIN,
        // Hand scrolling back as soon as the page is uncovered.
        onComplete: () => {
          preloader.remove();
          lenis.start();
          ScrollTrigger.refresh();
        },
      }, '+=.15')
      .to('.hero__img', { scale: 1, duration: 2.4, ease: SETTLE }, '<')
      .to('.hl', { yPercent: 0, duration: 1.6, ease: SETTLE, stagger: 0.09 }, '<.35')
      .to('[data-hero-meta]', { autoAlpha: 1, y: 0, duration: 1.1, ease: SETTLE, stagger: 0.1 }, '<.5');
  });
}

function boot() {
  const lenis = motionOK ? new Lenis({ lerp: 0.1 }) : null;
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  initMenu(lenis);
  initMasse();
  initTabs(() => ScrollTrigger.refresh());
  $$('[data-palm]').forEach((canvas) => palmShadow(canvas, { animate: motionOK }));

  explodeTitles();
  initScrollState();
  if (lenis) {
    initScroll();
    runIntro(lenis);
  } else {
    initCompare();
  }

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}

boot();
