(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const effectTabs = [...document.querySelectorAll('[data-effect]')];
  let activeEffect = 'compare';
  let labVisible = true;

  // Deterministic synthetic values: a shared grid and scale in both scenarios.
  function makeScenario(which) {
    let markup = '<rect width="720" height="400" fill="#081321"/>';
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 22; col++) {
        const x = col / 21;
        const y = row / 10;
        const cx = which === 'a' ? .3 : .66;
        const cy = which === 'a' ? .5 : .4;
        const distance = Math.pow((x - cx) / .27, 2) + Math.pow((y - cy) / .4, 2);
        const value = Math.round(clamp(12 + 84 * Math.exp(-distance) + 11 * Math.sin(col * .6 + row * .4), 0, 100));
        const color = value <= 33 ? '#3be0c8' : value <= 66 ? '#ffc45c' : '#ff668b';
        markup += `<rect x="${30 + col * 30}" y="${47 + row * 27}" width="26" height="23" rx="3" fill="${color}"><title>Grid ${col + 1}, ${row + 1}: ${value}</title></rect>`;
      }
    }
    markup += '<text x="32" y="369" fill="#9fb6c8" font-size="11" font-family="sans-serif">SHARED GRID / SHARED 0–100 SCALE</text>';
    return markup;
  }
  $('map-a').innerHTML = makeScenario('a');
  $('map-b').innerHTML = makeScenario('b');

  const split = $('compare-split');
  const comparison = $('comparison-stage');
  function updateSplit(value) {
    const next = Math.round(clamp(Number(value), 0, 100));
    split.value = String(next);
    comparison.style.setProperty('--split', `${next}%`);
    $('split-value').value = `${next}%`;
    split.setAttribute('aria-valuetext', `${next}% of scenario A visible`);
  }
  split.addEventListener('input', () => updateSplit(split.value));
  $('reset-compare').addEventListener('click', () => updateSplit(50));
  function splitAtPointer(event) {
    const bounds = comparison.getBoundingClientRect();
    updateSplit((event.clientX - bounds.left) / bounds.width * 100);
  }
  comparison.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    comparison.setPointerCapture(event.pointerId);
    splitAtPointer(event);
  });
  comparison.addEventListener('pointermove', event => {
    if (comparison.hasPointerCapture(event.pointerId)) splitAtPointer(event);
  });
  const stopDrag = event => {
    if (comparison.hasPointerCapture(event.pointerId)) comparison.releasePointerCapture(event.pointerId);
  };
  comparison.addEventListener('pointerup', stopDrag);
  comparison.addEventListener('pointercancel', stopDrag);
  updateSplit(50);

  // A contour diagram generated for this lesson, not geographic terrain.
  let contours = '<rect width="360" height="250" fill="#102b36" rx="7"/>';
  for (let level = 0; level < 12; level++) {
    const radius = 12 + level * 12;
    let path = '';
    for (let point = 0; point <= 90; point++) {
      const angle = point / 90 * Math.PI * 2;
      const shape = radius * (1 + .14 * Math.sin(angle * 3 + level * .08));
      const x = 178 + Math.cos(angle) * shape;
      const y = 119 + Math.sin(angle) * shape * .69;
      path += `${point ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    contours += `<path d="${path}Z" fill="none" stroke="${level % 3 === 0 ? '#3be0c8' : '#427b82'}" stroke-width="${level % 3 === 0 ? 1.5 : 1}"/>`;
  }
  $('contour-map').innerHTML = contours;
  const depthStage = $('depth-stage');
  const depthCard = $('depth-card');
  let rotateX = 35;
  let rotateY = -16;
  function rotateDepth(x, y) {
    rotateX = clamp(x, -30, 45);
    rotateY = clamp(y, -35, 35);
    depthCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(-8deg)`;
  }
  depthStage.addEventListener('pointermove', event => {
    if (reducedMotion.matches && event.buttons !== 1) return;
    const box = depthStage.getBoundingClientRect();
    rotateDepth(35 - (event.clientY - box.top - box.height / 2) / box.height * 40,
      (event.clientX - box.left - box.width / 2) / box.width * 60);
  });
  depthStage.addEventListener('pointerleave', () => rotateDepth(35, -16));
  $('depth-spacing').addEventListener('input', event => {
    const value = Number(event.target.value);
    depthCard.style.setProperty('--spacing', `${value}px`);
    $('depth-value').value = `${value} px`;
  });
  $('rotate-left').addEventListener('click', () => rotateDepth(rotateX, rotateY - 12));
  $('rotate-right').addEventListener('click', () => rotateDepth(rotateX, rotateY + 12));
  $('reset-depth').addEventListener('click', () => {
    rotateDepth(35, -16);
    $('depth-spacing').value = '44';
    $('depth-value').value = '44 px';
    depthCard.style.setProperty('--spacing', '44px');
  });

  const canvas = $('wave-canvas');
  const context = canvas.getContext('2d');
  const waveStage = $('wave-stage');
  let width = 0;
  let height = 0;
  let phase = 0;
  let amplitude = 24;
  let speed = .8;
  let playing = !reducedMotion.matches;
  let pointer = null;
  let frame = 0;
  let lastTime = 0;
  let lastDraw = 0;
  function drawWaves() {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#081321';
    context.fillRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#3be0c8');
    gradient.addColorStop(.55, '#86c5d9');
    gradient.addColorStop(1, '#ff668b');
    context.strokeStyle = gradient;
    context.lineWidth = 1.1;
    const rows = 26;
    for (let row = 0; row < rows; row++) {
      const baseline = 40 + row * (height - 80) / (rows - 1);
      context.beginPath();
      for (let step = 0; step <= 90; step++) {
        const x = step * width / 90;
        let y = baseline + Math.sin(x / 90 + phase + row * .15) * amplitude
          + Math.cos(x / 150 - phase * .65 + row * .21) * amplitude * .5;
        if (pointer) {
          const dx = x - pointer.x;
          const dy = baseline - pointer.y;
          y += Math.exp(-(dx * dx + dy * dy) / 14000) * Math.sin(dx / 30 + phase) * 35;
        }
        if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  function resizeWaves() {
    const box = waveStage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawWaves();
  }
  function animate(time) {
    if (!playing || activeEffect !== 'waves' || !labVisible || document.hidden) {
      frame = 0;
      lastTime = 0;
      return;
    }
    if (lastTime) phase += Math.min((time - lastTime) / 1000, .05) * speed;
    lastTime = time;
    if (time - lastDraw >= 32) { drawWaves(); lastDraw = time; }
    frame = requestAnimationFrame(animate);
  }
  function syncWaves() {
    $('toggle-waves').textContent = playing ? 'Pause motion' : 'Play motion';
    $('toggle-waves').setAttribute('aria-pressed', String(playing));
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    lastTime = 0;
    if (playing && activeEffect === 'waves' && labVisible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  $('toggle-waves').addEventListener('click', () => { playing = !playing; syncWaves(); });
  $('wave-amplitude').addEventListener('input', event => {
    amplitude = Number(event.target.value);
    $('amplitude-value').value = `${amplitude} px`;
    drawWaves();
  });
  $('wave-speed').addEventListener('input', event => {
    speed = Number(event.target.value);
    $('speed-value').value = `${speed.toFixed(1)}×`;
  });
  waveStage.addEventListener('pointermove', event => {
    const box = waveStage.getBoundingClientRect();
    pointer = { x:event.clientX - box.left, y:event.clientY - box.top };
    if (playing) drawWaves();
  });
  waveStage.addEventListener('pointerleave', () => { pointer = null; if (playing) drawWaves(); });
  reducedMotion.addEventListener('change', () => { playing = !reducedMotion.matches; syncWaves(); });
  document.addEventListener('visibilitychange', syncWaves);
  new ResizeObserver(resizeWaves).observe(waveStage);
  new IntersectionObserver(records => {
    labVisible = records[0].isIntersecting;
    syncWaves();
  }, {threshold:0}).observe($('effect-lab'));

  function chooseEffect(key, focus = false) {
    if (!effectTabs.some(tab => tab.dataset.effect === key)) return;
    activeEffect = key;
    effectTabs.forEach(tab => {
      const selected = tab.dataset.effect === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(`panel-${tab.dataset.effect}`).hidden = !selected;
      if (selected && focus) tab.focus();
    });
    if (key === 'waves') resizeWaves();
    syncWaves();
  }
  effectTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseEffect(tab.dataset.effect));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % effectTabs.length;
      else if (event.key === 'ArrowLeft') next = (index + effectTabs.length - 1) % effectTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = effectTabs.length - 1;
      else return;
      event.preventDefault();
      chooseEffect(effectTabs[next].dataset.effect, true);
    });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-open-demo]');
    if (!link) return;
    chooseEffect(link.dataset.openDemo, true);
  });
  syncWaves();
})();
