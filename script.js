const STORAGE_ITEMS_KEY = 'wheel.items.v1';
const STORAGE_SETTINGS_KEY = 'wheel.settings.v1';

const fonts = ['Arial', 'Verdana', 'Tahoma', 'Times New Roman', 'Georgia', 'Courier New', 'Trebuchet MS', 'Impact', 'system-ui', 'sans-serif', 'serif', 'monospace'];
const defaultThemes = {
  'mode-autumn': ['#433f56', '#029bfb', '#11f56b', '#f4a261', '#e76f51'],
  'mode-classic': ['#ffcc00', '#ff6600', '#cc3300', '#ff9900'],
  'mode-cool': ['#264653', '#2a9d8f', '#8ab17d', '#457b9d']
};

let themes = { ...defaultThemes };
let state = {
  items: [],
  settings: {
    backgroundColor: '#00ff00',
    themeName: 'mode-autumn',
    borderEnabled: true,
    borderColor: '#ffffff',
    borderWidth: 1,
    fontFamily: 'Arial',
    fontSize: 14,
    truncateText: true,
    wheelSizeVh: 80,
    spinDurationSec: 5,
    centerImagePath: '',
    pointerType: 'system',
    pointerImagePath: ''
  },
  isSpinning: false,
  rotation: 0,
  centerImageObj: null
};

const el = {
  wheelCanvas: document.getElementById('wheelCanvas'),
  spinBtn: document.getElementById('spinBtn'),
  emptyState: document.getElementById('emptyState'),
  itemForm: document.getElementById('itemForm'),
  itemText: document.getElementById('itemText'),
  itemModifier: document.getElementById('itemModifier'),
  itemList: document.getElementById('itemList'),
  togglePanelBtn: document.getElementById('togglePanelBtn'),
  itemPanel: document.getElementById('itemPanel'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  winnerOverlay: document.getElementById('winnerOverlay'),
  winnerText: document.getElementById('winnerText'),
  pointer: document.getElementById('pointer'),
  exportItemsBtn: document.getElementById('exportItemsBtn'),
  importItemsInput: document.getElementById('importItemsInput'),
  exportSettingsBtn: document.getElementById('exportSettingsBtn'),
  importSettingsInput: document.getElementById('importSettingsInput'),
  bgColor: document.getElementById('bgColor'),
  themeName: document.getElementById('themeName'),
  borderEnabled: document.getElementById('borderEnabled'),
  borderColor: document.getElementById('borderColor'),
  borderWidth: document.getElementById('borderWidth'),
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  truncateText: document.getElementById('truncateText'),
  wheelSize: document.getElementById('wheelSize'),
  wheelSizeValue: document.getElementById('wheelSizeValue'),
  spinDuration: document.getElementById('spinDuration'),
  centerImage: document.getElementById('centerImage'),
  pointerType: document.getElementById('pointerType'),
  pointerImage: document.getElementById('pointerImage')
};
const ctx = el.wheelCanvas.getContext('2d');

init();

async function init() {
  loadState();
  await loadThemesFromJson();
  initSettingsForm();
  bindEvents();
  applySettingsUI();
  updateLayout();
  renderAll();
}

function loadState() {
  try {
    const savedItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS_KEY) || '[]');
    if (Array.isArray(savedItems)) state.items = sanitizeItems(savedItems);
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
    state.settings = { ...state.settings, ...sanitizeSettings(savedSettings) };
  } catch {
    // keep defaults
  }
}

async function loadThemesFromJson() {
  try {
    const response = await fetch('colors.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object') {
        themes = data;
      }
    }
  } catch {
    themes = { ...defaultThemes };
  }
  if (!themes[state.settings.themeName]) {
    state.settings.themeName = Object.keys(themes)[0];
  }
}

function initSettingsForm() {
  el.fontFamily.innerHTML = fonts.map((f) => `<option value="${f}">${f}</option>`).join('');
  el.themeName.innerHTML = Object.keys(themes).map((name) => `<option value="${name}">${name}</option>`).join('');
}

function applySettingsUI() {
  const s = state.settings;
  document.body.style.background = s.backgroundColor;
  el.bgColor.value = s.backgroundColor;
  el.themeName.value = s.themeName;
  el.borderEnabled.checked = s.borderEnabled;
  el.borderColor.value = s.borderColor;
  el.borderWidth.value = s.borderWidth;
  el.fontFamily.value = s.fontFamily;
  el.fontSize.value = s.fontSize;
  el.truncateText.checked = s.truncateText;
  el.wheelSize.value = s.wheelSizeVh;
  el.wheelSizeValue.textContent = `${s.wheelSizeVh}vh`;
  el.spinDuration.value = s.spinDurationSec;
  el.centerImage.value = s.centerImagePath;
  el.pointerType.value = s.pointerType;
  el.pointerImage.value = s.pointerImagePath;
  updatePointerUI();
  loadCenterImage();
}

function bindEvents() {
  el.itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el.itemText.value.trim();
    if (!text) return;
    state.items.push({ text, modifier: el.itemModifier.value || '' });
    el.itemForm.reset();
    saveItems();
    renderAll();
  });

  el.spinBtn.addEventListener('click', startSpin);

  el.togglePanelBtn.addEventListener('click', () => {
    el.itemPanel.classList.toggle('collapsed');
    el.togglePanelBtn.textContent = el.itemPanel.classList.contains('collapsed') ? '⟩' : '⟨';
  });

  el.settingsBtn.addEventListener('click', () => el.settingsModal.classList.remove('hidden'));
  el.closeSettingsBtn.addEventListener('click', () => el.settingsModal.classList.add('hidden'));

  document.addEventListener('click', (e) => {
    if (e.target.dataset.close === 'true') {
      el.settingsModal.classList.add('hidden');
      el.winnerOverlay.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      el.winnerOverlay.classList.add('hidden');
      el.settingsModal.classList.add('hidden');
    }
  });

  const settingHandlers = [
    ['bgColor', (v) => (state.settings.backgroundColor = v)],
    ['themeName', (v) => (state.settings.themeName = v)],
    ['borderEnabled', (_, checked) => (state.settings.borderEnabled = checked)],
    ['borderColor', (v) => (state.settings.borderColor = v)],
    ['borderWidth', (v) => (state.settings.borderWidth = clamp(parseFloat(v) || 1, 0.5, 8))],
    ['fontFamily', (v) => (state.settings.fontFamily = v)],
    ['fontSize', (v) => (state.settings.fontSize = clamp(parseInt(v, 10) || 14, 10, 24))],
    ['truncateText', (_, checked) => (state.settings.truncateText = checked)],
    ['wheelSize', (v) => (state.settings.wheelSizeVh = clamp(parseInt(v, 10) || 80, 30, 100))],
    ['spinDuration', (v) => (state.settings.spinDurationSec = clamp(parseInt(v, 10) || 5, 1, 15))],
    ['centerImage', (v) => (state.settings.centerImagePath = v.trim())],
    ['pointerType', (v) => (state.settings.pointerType = v)],
    ['pointerImage', (v) => (state.settings.pointerImagePath = v.trim())]
  ];

  settingHandlers.forEach(([key, setter]) => {
    const node = el[key];
    node.addEventListener('input', () => {
      setter(node.value, node.checked);
      onSettingsChanged();
    });
    node.addEventListener('change', () => {
      setter(node.value, node.checked);
      onSettingsChanged();
    });
  });

  el.exportItemsBtn.addEventListener('click', () => downloadJson('items.json', state.items));
  el.exportSettingsBtn.addEventListener('click', () => downloadJson('settings.json', state.settings));

  el.importItemsInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = await parseJsonFile(file);
    if (Array.isArray(parsed)) {
      state.items = sanitizeItems(parsed);
      saveItems();
      renderAll();
    }
    e.target.value = '';
  });

  el.importSettingsInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = await parseJsonFile(file);
    state.settings = { ...state.settings, ...sanitizeSettings(parsed || {}) };
    saveSettings();
    applySettingsUI();
    updateLayout();
    renderAll();
    e.target.value = '';
  });

  window.addEventListener('resize', updateLayout);
}

function onSettingsChanged() {
  saveSettings();
  applySettingsUI();
  updateLayout();
  renderAll();
}

function renderAll() {
  renderItemList();
  drawWheel();
  const noItems = state.items.length === 0;
  el.spinBtn.disabled = noItems || state.isSpinning;
  el.emptyState.style.display = noItems ? 'flex' : 'none';
}

function renderItemList() {
  el.itemList.innerHTML = '';
  state.items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item-row';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = item.text;

    const modSelect = document.createElement('select');
    ['', '🤬', '🔀', '🇬🇧'].forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m || 'None';
      if (m === item.modifier) opt.selected = true;
      modSelect.appendChild(opt);
    });

    textInput.addEventListener('input', () => {
      state.items[index].text = textInput.value;
      saveItems();
      drawWheel();
    });
    modSelect.addEventListener('change', () => {
      state.items[index].modifier = modSelect.value;
      saveItems();
      drawWheel();
    });

    const controls = document.createElement('div');
    controls.className = 'item-row-controls';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      state.items.splice(index, 1);
      saveItems();
      renderAll();
    });

    controls.appendChild(removeBtn);
    li.appendChild(textInput);
    li.appendChild(modSelect);
    li.appendChild(controls);
    el.itemList.appendChild(li);
  });
}

function updateLayout() {
  const vh = state.settings.wheelSizeVh;
  const sizePx = Math.min((window.innerHeight * vh) / 100, window.innerWidth - 160);
  const finalSize = Math.max(300, sizePx);
  const wrap = document.querySelector('.wheel-wrap');
  wrap.style.width = `${finalSize}px`;
  wrap.style.height = `${finalSize}px`;

  const dpr = window.devicePixelRatio || 1;
  el.wheelCanvas.width = finalSize * dpr;
  el.wheelCanvas.height = finalSize * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWheel();
}

function drawWheel() {
  const w = el.wheelCanvas.clientWidth;
  const h = el.wheelCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 6;

  ctx.clearRect(0, 0, w, h);
  if (state.items.length === 0) return;

  const slice = (Math.PI * 2) / state.items.length;
  const palette = themes[state.settings.themeName] || defaultThemes['mode-autumn'];

  state.items.forEach((item, i) => {
    const start = state.rotation + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    if (state.settings.borderEnabled) {
      ctx.strokeStyle = state.settings.borderColor;
      ctx.lineWidth = state.settings.borderWidth;
      ctx.stroke();
    }

    const label = `${item.text}${item.modifier ? ` ${item.modifier}` : ''}`;
    const text = state.settings.truncateText ? truncateLabel(label, 18) : label;
    const angle = start + slice / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111';
    ctx.font = `${state.settings.fontSize}px ${state.settings.fontFamily}`;
    ctx.fillText(text, radius - 20, 5);
    ctx.restore();
  });

  if (state.settings.centerImagePath && state.centerImageObj) {
    const size = radius * 0.38;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(state.centerImageObj, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
  }
}

function startSpin() {
  if (state.isSpinning || state.items.length === 0) return;
  state.isSpinning = true;
  renderAll();

  const selectedIndex = Math.floor(Math.random() * state.items.length);
  const slice = (Math.PI * 2) / state.items.length;
  const pointerAngle = 0;
  const selectedCenterAtZeroRotation = selectedIndex * slice + slice / 2;
  const spins = 6 + Math.floor(Math.random() * 3);
  const finalRotation = pointerAngle - selectedCenterAtZeroRotation + spins * Math.PI * 2;

  const start = state.rotation;
  const delta = finalRotation - start;
  const duration = state.settings.spinDurationSec * 1000;
  const t0 = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    state.rotation = start + delta * eased;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      state.rotation = normalizedAngle(state.rotation);
      state.isSpinning = false;
      renderAll();
      showWinner(state.items[selectedIndex]);
    }
  }

  requestAnimationFrame(frame);
}

function showWinner(item) {
  el.winnerText.textContent = `${item.text}${item.modifier ? ` ${item.modifier}` : ''}`;
  el.winnerOverlay.classList.remove('hidden');
}

function updatePointerUI() {
  if (state.settings.pointerType === 'image' && state.settings.pointerImagePath) {
    el.pointer.className = 'pointer pointer-image';
    el.pointer.style.backgroundImage = `url('${state.settings.pointerImagePath}')`;
  } else {
    el.pointer.className = 'pointer pointer-system';
    el.pointer.style.backgroundImage = '';
  }
}

function loadCenterImage() {
  if (!state.settings.centerImagePath) {
    state.centerImageObj = null;
    drawWheel();
    return;
  }

  const img = new Image();
  img.onload = () => {
    state.centerImageObj = img;
    drawWheel();
  };
  img.onerror = () => {
    state.centerImageObj = null;
    drawWheel();
  };
  img.src = state.settings.centerImagePath;
}

function sanitizeItems(list) {
  return list
    .filter((it) => it && typeof it.text === 'string')
    .map((it) => ({ text: it.text, modifier: ['', '🤬', '🔀', '🇬🇧'].includes(it.modifier) ? it.modifier : '' }));
}

function sanitizeSettings(raw) {
  return {
    backgroundColor: isColor(raw.backgroundColor) ? raw.backgroundColor : state.settings.backgroundColor,
    themeName: typeof raw.themeName === 'string' ? raw.themeName : state.settings.themeName,
    borderEnabled: typeof raw.borderEnabled === 'boolean' ? raw.borderEnabled : state.settings.borderEnabled,
    borderColor: isColor(raw.borderColor) ? raw.borderColor : state.settings.borderColor,
    borderWidth: clamp(parseFloat(raw.borderWidth) || state.settings.borderWidth, 0.5, 8),
    fontFamily: fonts.includes(raw.fontFamily) ? raw.fontFamily : state.settings.fontFamily,
    fontSize: clamp(parseInt(raw.fontSize, 10) || state.settings.fontSize, 10, 24),
    truncateText: typeof raw.truncateText === 'boolean' ? raw.truncateText : state.settings.truncateText,
    wheelSizeVh: clamp(parseInt(raw.wheelSizeVh, 10) || state.settings.wheelSizeVh, 30, 100),
    spinDurationSec: clamp(parseInt(raw.spinDurationSec, 10) || state.settings.spinDurationSec, 1, 15),
    centerImagePath: typeof raw.centerImagePath === 'string' ? raw.centerImagePath : state.settings.centerImagePath,
    pointerType: raw.pointerType === 'image' ? 'image' : 'system',
    pointerImagePath: typeof raw.pointerImagePath === 'string' ? raw.pointerImagePath : state.settings.pointerImagePath
  };
}

function saveItems() {
  localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(state.items));
}

function saveSettings() {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(state.settings));
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function parseJsonFile(file) {
  try {
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function truncateLabel(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function normalizedAngle(a) {
  const twoPi = Math.PI * 2;
  let n = a % twoPi;
  if (n < 0) n += twoPi;
  return n;
}

function isColor(v) {
  return typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
