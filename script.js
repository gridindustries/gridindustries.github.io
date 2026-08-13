const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const ORB_MOTION = {
  collisionLagSeconds: 1.65,
  collisionBufferPx: 34,
  maxFrameDeltaSeconds: 0.05
};

const ORB_CONFIG = [
  { role: 'large',  sizeMin: 0.28, sizeMax: 0.38, minPx: 120, maxPx: 360, opacity: 0.18, settle: 9.8, retargetMin: 24, retargetMax: 34 },
  { role: 'medium', sizeMin: 0.16, sizeMax: 0.22, minPx: 60,  maxPx: 190, opacity: 0.23, settle: 8.8, retargetMin: 21, retargetMax: 31 },
  { role: 'small',  sizeMin: 0.09, sizeMax: 0.13, minPx: 36,  maxPx: 110, opacity: 0.30, settle: 7.9, retargetMin: 19, retargetMax: 28 },
  { role: 'small',  sizeMin: 0.06, sizeMax: 0.09, minPx: 26,  maxPx: 78,  opacity: 0.34, settle: 7.2, retargetMin: 17, retargetMax: 26 },
  { role: 'tiny',   sizeMin: 0.035,sizeMax: 0.055,minPx: 18,  maxPx: 48,  opacity: 0.40, settle: 6.6, retargetMin: 15, retargetMax: 23 },
  { role: 'dot',    sizeMin: 0.022,sizeMax: 0.035,minPx: 12,  maxPx: 30,  opacity: 0.48, settle: 6.0, retargetMin: 13, retargetMax: 21 }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function viewportMetrics(width, height) {
  const basis = Math.min(width, height);
  return {
    gap: clamp(basis * 0.022, 10, 24),
    margin: clamp(basis * 0.014, 7, 16)
  };
}

function overlaps(candidate, others, gap) {
  return others.some((other) => {
    const dx = candidate.x - other.x;
    const dy = candidate.y - other.y;
    return Math.hypot(dx, dy) < candidate.r + other.r + gap;
  });
}

function clampCircleToViewport(circle, width, height, margin) {
  const minX = circle.r + margin;
  const maxX = Math.max(minX, width - circle.r - margin);
  const minY = circle.r + margin;
  const maxY = Math.max(minY, height - circle.r - margin);
  circle.x = clamp(circle.x, minX, maxX);
  circle.y = clamp(circle.y, minY, maxY);
}

function resolveCircleCollisions(circles, width, height, extraGap = 0) {
  const { gap, margin } = viewportMetrics(width, height);
  const minimumGap = gap + extraGap;

  for (let iteration = 0; iteration < 72; iteration += 1) {
    let adjusted = false;

    for (let i = 0; i < circles.length; i += 1) {
      for (let j = i + 1; j < circles.length; j += 1) {
        const a = circles[i];
        const b = circles[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minimum = a.r + b.r + minimumGap;

        if (distance >= minimum) continue;
        adjusted = true;

        if (distance < 0.001) {
          const angle = ((i + 1) * 1.71 + (j + 1) * 0.83) % TAU;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minimum - distance + 0.5;
        const aWeight = b.r / (a.r + b.r);
        const bWeight = a.r / (a.r + b.r);

        a.x -= nx * overlap * aWeight;
        a.y -= ny * overlap * aWeight;
        b.x += nx * overlap * bWeight;
        b.y += ny * overlap * bWeight;

        clampCircleToViewport(a, width, height, margin);
        clampCircleToViewport(b, width, height, margin);
      }
    }

    if (!adjusted) break;
  }
}

function pickTarget(item, others, width, height) {
  const { gap, margin } = viewportMetrics(width, height);
  const r = item.r;
  const minX = r + margin;
  const maxX = Math.max(minX, width - r - margin);
  const minY = r + margin;
  const maxY = Math.max(minY, height - r - margin);

  for (let attempt = 0; attempt < 280; attempt += 1) {
    const candidate = {
      x: randomBetween(minX, maxX),
      y: randomBetween(minY, maxY),
      r
    };
    if (!overlaps(candidate, others, gap + 10)) return candidate;
  }

  /* Deterministic scan fallback for narrow/tall mobile viewports. */
  const step = Math.max(14, r * 0.34);
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const candidate = { x, y, r };
      if (!overlaps(candidate, others, gap)) return candidate;
    }
  }

  const fallback = {
    x: clamp(width * (0.14 + (item.index % 3) * 0.36), minX, maxX),
    y: clamp(height * (0.16 + Math.floor(item.index / 3) * 0.62), minY, maxY),
    r
  };
  return fallback;
}

function buildOrbs() {
  const field = document.getElementById('orbField');
  if (!field) return [];

  field.replaceChildren();

  const width = window.innerWidth;
  const height = window.innerHeight;
  const basis = Math.min(width, height);
  const items = ORB_CONFIG.map((config, index) => {
    const viewportMax = Math.max(18, basis - Math.max(24, basis * 0.08));
    const diameter = clamp(
      basis * randomBetween(config.sizeMin, config.sizeMax),
      Math.min(config.minPx, viewportMax),
      Math.min(config.maxPx, viewportMax)
    );
    const el = document.createElement('div');
    el.className = `orb orb--${config.role}`;
    el.style.width = `${diameter}px`;
    el.style.height = `${diameter}px`;
    el.style.opacity = String(config.opacity);
    field.appendChild(el);

    return {
      el,
      config,
      index,
      r: diameter / 2,
      baseX: width / 2,
      baseY: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      collisionX: 0,
      collisionY: 0,
      nextTargetAt: 0
    };
  });

  const placed = [];
  items.forEach((item) => {
    const target = pickTarget(item, placed, width, height);
    item.baseX = target.x;
    item.baseY = target.y;
    item.targetX = target.x;
    item.targetY = target.y;
    placed.push(target);
  });

  return items;
}

function chooseNewTarget(item, items, nowSeconds, width, height) {
  const others = items
    .filter((other) => other !== item)
    .map((other) => ({ x: other.targetX, y: other.targetY, r: other.r }));
  const target = pickTarget(item, others, width, height);
  item.targetX = target.x;
  item.targetY = target.y;
  item.nextTargetAt = nowSeconds + randomBetween(item.config.retargetMin, item.config.retargetMax);
}

function startOrbMotion(items) {
  if (items.length === 0) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let previousTime = performance.now();
  let lastCollisionTime = previousTime;

  items.forEach((item, index) => {
    item.nextTargetAt = previousTime / 1000 + 4 + index * 2.2;
  });

  function frame(timeMs) {
    const dt = clamp((timeMs - previousTime) / 1000, 0, ORB_MOTION.maxFrameDeltaSeconds);
    previousTime = timeMs;
    const nowSeconds = timeMs / 1000;
    const { margin } = viewportMetrics(width, height);

    items.forEach((item) => {
      if (!prefersReducedMotion && nowSeconds >= item.nextTargetAt) {
        chooseNewTarget(item, items, nowSeconds, width, height);
      }

      const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-dt / item.config.settle);
      item.baseX += (item.targetX - item.baseX) * alpha;
      item.baseY += (item.targetY - item.baseY) * alpha;

      const baseState = { x: item.baseX, y: item.baseY, r: item.r };
      clampCircleToViewport(baseState, width, height, margin);
      item.baseX = baseState.x;
      item.baseY = baseState.y;
    });

    /* Predictive collision steering. Work out where a buffered collision solve wants each circle to be, then ease toward that offset. */
    const rawStates = items.map((item) => ({
      x: item.baseX,
      y: item.baseY,
      r: item.r
    }));
    const collisionTargets = rawStates.map((state) => ({ ...state }));
    resolveCircleCollisions(collisionTargets, width, height, ORB_MOTION.collisionBufferPx);

    const collisionDt = clamp((timeMs - lastCollisionTime) / 1000, 0, ORB_MOTION.maxFrameDeltaSeconds);
    lastCollisionTime = timeMs;
    const collisionAlpha = prefersReducedMotion
      ? 1
      : 1 - Math.exp(-collisionDt / ORB_MOTION.collisionLagSeconds);

    const visibleStates = rawStates.map((state, index) => {
      const item = items[index];
      const desiredX = collisionTargets[index].x - state.x;
      const desiredY = collisionTargets[index].y - state.y;
      item.collisionX += (desiredX - item.collisionX) * collisionAlpha;
      item.collisionY += (desiredY - item.collisionY) * collisionAlpha;

      const visible = {
        x: state.x + item.collisionX,
        y: state.y + item.collisionY,
        r: state.r
      };
      clampCircleToViewport(visible, width, height, margin);
      return visible;
    });

    /* Strict final safety pass. Predictive steering should make this almost idle, but it guarantees circles never overlap during path crossings. */
    resolveCircleCollisions(visibleStates, width, height, 0);

    visibleStates.forEach((state, index) => {
      const item = items[index];
      item.el.style.transform = `translate3d(${(state.x - state.r).toFixed(2)}px, ${(state.y - state.r).toFixed(2)}px, 0)`;
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const { margin } = viewportMetrics(width, height);

    const placed = [];
    items.forEach((item) => {
      /* Keep the current circle safely inside the resized viewport immediately,then give it a fresh non-overlapping destination. */
      const current = { x: item.baseX, y: item.baseY, r: item.r };
      clampCircleToViewport(current, width, height, margin);
      item.baseX = current.x;
      item.baseY = current.y;
      item.collisionX = 0;
      item.collisionY = 0;

      const target = pickTarget(item, placed, width, height);
      item.targetX = target.x;
      item.targetY = target.y;
      item.nextTargetAt = performance.now() / 1000 + randomBetween(5, 10);
      placed.push(target);
    });
  }, { passive: true });
}

function initPendingLinks() {
  document.querySelectorAll('[data-pending-link]').forEach((link) => {
    link.addEventListener('click', (event) => event.preventDefault());
  });
}

function initYear() {
  document.querySelectorAll('#year, [data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const orbs = buildOrbs();
  startOrbMotion(orbs);
  initPendingLinks();
  initYear();
});
