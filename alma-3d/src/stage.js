// The 3D stage: scene, lights, scroll-driven camera, drag to rotate, day and
// night, and the labels pinned to the model.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildVilla, at } from './villa.js';
import { STEPS, LABELS } from './steps.js';

const HOLD = 0.45; // Share of each step spent still, before moving to the next
const TAU = Math.PI * 2;
const rad = THREE.MathUtils.degToRad;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
const out = (t) => 1 - (1 - t) ** 3;

const SKY = {
  dayTop: new THREE.Color('#f1e8da'),
  dayBottom: new THREE.Color('#e4cfb2'),
  nightTop: new THREE.Color('#14162b'),
  nightBottom: new THREE.Color('#34304d'),
};

export function createStage({ root, canvas, labelsEl, onStep, reducedMotion }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  let pixelRatio = Math.min(devicePixelRatio, touch ? 1.5 : 2);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);

  // Model
  const { groups, mats } = buildVilla();
  for (const g of Object.values(groups)) scene.add(g);
  const layers = { roof: groups.toit, up: groups.etage };

  // Lights
  const hemi = new THREE.HemisphereLight(0xfff3e0, 0xc4a988, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd8ae, 1);
  sun.position.set(-20, 19, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3.5;
  scene.add(sun);

  // Warm lamps for the evening, always present so shaders don't recompile.
  const lamps = [
    { p: [1040, 400], y: 2.3, power: 26, layer: 'down' },
    { p: [610, 480], y: 2.3, power: 20, layer: 'down' },
    { p: [600, 210], y: 2.3, power: 20, layer: 'down' },
    { p: [820, 500], y: 2.3, power: 18, layer: 'down' },
    { p: [610, 200], y: 5.5, power: 18, layer: 'up' },
    { p: [1040, 530], y: 5.5, power: 18, layer: 'up' },
    { p: [1040, 200], y: 5.5, power: 18, layer: 'up' },
    { p: [287, 490], y: 0.9, power: 3, color: 0x9fe8e6, layer: 'site' },
  ].slice(0, touch ? 4 : 8).map((d) => {
    const light = new THREE.PointLight(d.color ?? 0xffb56b, 0, 15, 1.8);
    light.position.copy(at(d.p[0], d.p[1], d.y));
    scene.add(light);
    return { ...d, light, baseY: d.y };
  });

  // Labels and dimension lines
  const labelMap = {};
  const dimMaterial = new THREE.LineBasicMaterial({ color: 0x8d4524, depthTest: false, transparent: true });
  const dimNight = new THREE.Color(0xf4d9b5);
  const dimDay = new THREE.Color(0x8d4524);
  for (const [id, d] of Object.entries(LABELS)) {
    const el = document.createElement('span');
    el.className = `pin${d.big ? ' pin--big' : ''}${d.dim ? ' pin--dim' : ''}${d.minor ? ' pin--minor' : ''}`;
    el.innerHTML = `<i></i><b>${d.text}</b>`;
    labelsEl.append(el);
    let point;
    let line = null;
    if (d.dim) {
      const a = at(d.dim[0][0], d.dim[0][1], d.y);
      const b = at(d.dim[1][0], d.dim[1][1], d.y);
      point = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a).normalize();
      const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.28);
      const geo = new THREE.BufferGeometry().setFromPoints([
        a, b,
        a.clone().add(n), a.clone().sub(n),
        b.clone().add(n), b.clone().sub(n),
      ]);
      line = new THREE.LineSegments(geo, dimMaterial);
      line.visible = false;
      line.renderOrder = 10;
      scene.add(line);
    } else {
      point = at(d.p[0], d.p[1], d.y);
    }
    labelMap[id] = { el, point, line, layer: d.layer, x: 0, y: 0 };
  }

  // State
  const state = { ...STEPS[0] };
  let progress = 0; // In steps
  let lastProgress = -1;
  let yaw = 0;
  let yawTarget = 0;
  let pitch = 0;
  let pitchTarget = 0;
  let nightOverride = null;
  let nightShown = 0;
  let intro = reducedMotion ? 1 : 0;
  let introStart = 0;
  let introQueued = false;
  let width = 1;
  let height = 1;
  let visible = true;
  let dirty = true;
  let shadowsDirty = true;
  let activeStep = -1;
  let labelsOn = false;
  let dragging = false;
  let touched = false;
  let px = 0;
  let py = 0;
  const projected = new THREE.Vector3();

  function setLayer(group, materials, y, opacity) {
    group.position.y = y;
    group.visible = opacity > 0.01;
    const fading = opacity < 0.999;
    for (const m of Object.values(materials)) {
      const base = m.userData.baseOpacity;
      m.opacity = base * opacity;
      m.transparent = fading || base < 1;
      m.depthWrite = base === 1;
    }
  }

  function sample(p) {
    const last = STEPS.length - 1;
    const i = Math.min(Math.floor(p), last);
    const frac = p - i;
    const a = STEPS[i];
    const b = STEPS[Math.min(i + 1, last)];
    const t = smooth(clamp((frac - HOLD) / (1 - HOLD), 0, 1));
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'number') state[k] = lerp(a[k], b[k], t);
    }
    return { nearest: t < 0.5 ? i : Math.min(i + 1, last), settled: t < 0.002 || t > 0.998 };
  }

  function applyNight(n) {
    const f = smooth(n);
    sun.intensity = lerp(3.3, 0.16, f);
    sun.color.setRGB(lerp(1, 0.55, f), lerp(0.84, 0.64, f), lerp(0.66, 0.95, f), THREE.SRGBColorSpace);
    hemi.intensity = lerp(1.35, 0.42, f);
    hemi.color.setRGB(lerp(1, 0.48, f), lerp(0.95, 0.52, f), lerp(0.88, 0.78, f), THREE.SRGBColorSpace);
    scene.environmentIntensity = lerp(0.38, 0.06, f);
    for (const set of Object.values(mats)) {
      set.glass.emissiveIntensity = f * 0.95;
      set.water.emissiveIntensity = f * 0.5;
    }
    for (const l of lamps) l.light.userData.level = f;
    dimMaterial.color.lerpColors(dimDay, dimNight, f);

    const top = SKY.dayTop.clone().lerp(SKY.nightTop, f);
    const bottom = SKY.dayBottom.clone().lerp(SKY.nightBottom, f);
    root.style.setProperty('--sky-top', `#${top.getHexString()}`);
    root.style.setProperty('--sky-bottom', `#${bottom.getHexString()}`);
    root.classList.toggle('is-night', f > 0.5);
    root.dispatchEvent(new CustomEvent('alma:night', { bubbles: true, detail: f }));
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    dirty = true;
  }

  function placeCamera() {
    const narrow = width < 760;
    const aspect = width / height;
    // Keep the whole model in frame on tall screens.
    const fit = aspect < 1.25 ? 1.25 / Math.max(aspect, 0.42) : 1;
    const r = state.r * (narrow ? Math.min(fit, 2.1) : Math.min(fit, 1.5));
    const theta = rad(state.theta) + yaw;
    const phi = clamp(rad(state.phi) + pitch, 0.08, Math.PI / 2 - 0.02);
    camera.position.set(
      state.tx + r * Math.sin(phi) * Math.sin(theta),
      state.ty + r * Math.cos(phi),
      state.tz + r * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(state.tx, state.ty, state.tz);
    // Slide the picture aside so it clears the text.
    const dx = narrow ? 0 : -state.shift * width;
    const dy = narrow ? state.shift * 0.9 * height : 0;
    camera.setViewOffset(width, height, dx, dy, width, height);
    camera.updateProjectionMatrix();
  }

  function layerOffset(name) {
    if (name === 'roof') return layers.roof.position.y;
    if (name === 'up') return layers.up.position.y;
    return 0;
  }

  function placeLabels() {
    const list = STEPS[activeStep]?.labels ?? [];
    for (const [id, l] of Object.entries(labelMap)) {
      const on = labelsOn && list.includes(id);
      if (l.on !== on) {
        l.on = on;
        l.el.classList.toggle('is-on', on);
        if (l.line) l.line.visible = on;
        dirty = true;
      }
      if (!on) continue;
      projected.copy(l.point);
      projected.y += layerOffset(l.layer);
      if (l.line) l.line.position.y = layerOffset(l.layer);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  // Scroll position from main.js, 0 to 1 across the stage.
  function setProgress(t) {
    const end = STEPS.length - 1 + HOLD;
    let p = clamp(t, 0, 1) * end;
    if (reducedMotion) {
      // Without motion, jump from step to step instead of flying the camera.
      p = Math.round(p - HOLD / 2 + 0.001);
    }
    progress = Math.min(p, STEPS.length - 1);
    if (progress !== lastProgress) {
      // Scrolling on eases the view back from wherever it was dragged to.
      const moved = Math.abs(progress - Math.max(lastProgress, 0));
      const k = Math.exp(-moved * 3.2);
      yawTarget *= k;
      pitchTarget *= k;
      dirty = true;
    }
  }

  function toggleNight() {
    const base = state.night > 0.5;
    const current = nightOverride ?? (base ? 1 : 0);
    nightOverride = current > 0.5 ? 0 : 1;
    dirty = true;
    return nightOverride === 1;
  }

  function rotate(by) {
    yawTarget += by;
    touched = true;
    dirty = true;
  }

  function goToProgress(step) {
    return clamp(step / (STEPS.length - 1 + HOLD), 0, 1);
  }

  // Drag to rotate. Vertical swipes on phones still scroll the page.
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    touched = true;
    px = e.clientX;
    py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yawTarget -= (e.clientX - px) * 0.0075;
    if (e.pointerType !== 'touch') pitchTarget = clamp(pitchTarget - (e.clientY - py) * 0.004, -0.6, 0.6);
    px = e.clientX;
    py = e.clientY;
    dirty = true;
  });
  const endDrag = () => {
    dragging = false;
    root.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) dirty = true;
  }).observe(root);

  // Falls back to a lighter resolution if this device can't keep up.
  let frames = 0;
  let sampleStart = 0;
  function watchSpeed(now) {
    if (frames === 0) sampleStart = now;
    if (++frames === 40) {
      const avg = (now - sampleStart) / 39;
      if (avg > 34 && pixelRatio > 1) {
        pixelRatio = 1;
        resize();
      }
      frames = 0;
    }
  }

  let prevTime = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) {
      prevTime = now;
      return;
    }
    const dt = Math.min((now - prevTime) / 1000 || 0.016, 0.1);
    prevTime = now;
    let animating = false;

    if (intro < 1 && introQueued) {
      if (!introStart) introStart = now;
      intro = Math.min((now - introStart) / 2400, 1);
      animating = true;
    }

    if (progress !== lastProgress) {
      const { nearest, settled } = sample(progress);
      if (nearest !== activeStep) {
        activeStep = nearest;
        nightOverride = null;
        onStep?.(nearest);
      }
      labelsOn = settled || progress >= STEPS.length - 1;
      lastProgress = progress;
      dirty = true;
    }

    // Damped drag
    const damp = 1 - Math.exp(-dt * 7);
    if (Math.abs(yawTarget - yaw) > 0.0004 || Math.abs(pitchTarget - pitch) > 0.0004) {
      yaw += (yawTarget - yaw) * damp;
      pitch += (pitchTarget - pitch) * damp;
      animating = true;
    }

    // A slow drift on the opening view, until the visitor takes over.
    if (!reducedMotion && !touched && !dragging && progress < 0.02) {
      yawTarget = Math.sin(now * 0.00016) * 0.2;
      animating = true;
    }

    // Night follows the story, unless the visitor flipped the switch.
    const nightTarget = nightOverride ?? state.night;
    if (Math.abs(nightTarget - nightShown) > 0.002) {
      nightShown += (nightTarget - nightShown) * (nightOverride === null ? 1 : 1 - Math.exp(-dt * 3.2));
      if (Math.abs(nightTarget - nightShown) <= 0.002) nightShown = nightTarget;
      applyNight(nightShown);
      shadowsDirty = true;
      animating = true;
    }

    if (animating) dirty = true;
    if (!dirty) return;
    dirty = false;

    // Opening: the layers come down onto the plinth.
    const a = out(clamp(intro / 0.7, 0, 1));
    const c = out(clamp((intro - 0.25) / 0.75, 0, 1));
    const roofY = state.roofY + (1 - c) * 9;
    const upY = state.upY + (1 - a) * 5;
    const roofO = state.roofO * clamp(intro * 9 - 2.25, 0, 1);
    const upO = state.upO * clamp(intro * 9, 0, 1);

    if (layers.roof.position.y !== roofY || layers.up.position.y !== upY
      || mats.toit.plaster.opacity !== roofO || mats.etage.plaster.opacity !== upO) {
      shadowsDirty = true;
    }
    setLayer(layers.roof, mats.toit, roofY, roofO);
    setLayer(layers.up, mats.etage, upY, upO);

    const f = smooth(nightShown);
    for (const l of lamps) {
      const on = l.layer === 'up' ? upO : 1;
      l.light.intensity = l.power * f * on;
      l.light.position.y = l.baseY + (l.layer === 'up' ? upY : 0);
    }

    placeCamera();
    placeLabels();
    if (shadowsDirty) {
      renderer.shadowMap.needsUpdate = true;
      shadowsDirty = false;
    }
    renderer.render(scene, camera);
    watchSpeed(now);
  }

  resize();
  sample(0);
  applyNight(0);
  requestAnimationFrame(frame);

  const playIntro = () => {
    introQueued = true;
    dirty = true;
  };

  return { setProgress, toggleNight, rotate, goToProgress, playIntro };
}
