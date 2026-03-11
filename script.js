const STORAGE_ITEMS_KEY = 'wheel.items.v1';
const STORAGE_SETTINGS_KEY = 'wheel.settings.v1';

const fonts = ['Arial', 'Verdana', 'Tahoma', 'Times New Roman', 'Georgia', 'Courier New', 'Trebuchet MS', 'Impact', 'system-ui', 'sans-serif', 'serif', 'monospace'];
const defaultThemes = {
  'mode-autumn': ['#433f56', '#029bfb', '#11f56b', '#f4a261', '#e76f51'],
  'mode-classic': ['#ffcc00', '#ff6600', '#cc3300', '#ff9900'],
  'mode-cool': ['#264653', '#2a9d8f', '#8ab17d', '#457b9d']
};
const MODIFIERS = ['', '🤬', '🔀', '🇬🇧'];

let themes = { ...defaultThemes };
let state = {
  itemModel: {
    baseItems: [],
    modifiersById: {}
  },
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
  centerImageObj: null,
  winnerCardMode: 'dock-under-wheel'
};

const el = {
  wheelCanvas: document.getElementById('wheelCanvas'),
  spinBtn: document.getElementById('spinBtn'),
  emptyState: document.getElementById('emptyState'),
  itemsTextarea: document.getElementById('itemsTextarea'),
  modifierMatrix: document.getElementById('modifierMatrix'),
  togglePanelBtn: document.getElementById('togglePanelBtn'),
  expandPanelBtn: document.getElementById('expandPanelBtn'),
  itemPanel: document.getElementById('itemPanel'),
  itemsCardToggle: document.getElementById('itemsCardToggle'),
  itemsCardBody: document.getElementById('itemsCardBody'),
  modifiersCardToggle: document.getElementById('modifiersCardToggle'),
  modifiersCardBody: document.getElementById('modifiersCardBody'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  winnerHitArea: document.getElementById('winnerHitArea'),
  resultCard: document.getElementById('resultCard'),
  resultSlotPrev: document.getElementById('resultSlotPrev'),
  resultSlotCurrent: document.getElementById('resultSlotCurrent'),
  resultSlotNext: document.getElementById('resultSlotNext'),
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
    state.itemModel = sanitizeItemModel(savedItems);
    rebuildDerivedItems();
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
  el.itemsTextarea.addEventListener('input', () => {
    syncBaseItemsFromTextarea();
    saveItems();
    renderAll();
  });

  el.spinBtn.addEventListener('click', startSpin);

  el.togglePanelBtn.addEventListener('click', () => {
    el.itemPanel.classList.add('collapsed');
    el.expandPanelBtn.classList.remove('hidden');
  });

  el.expandPanelBtn.addEventListener('click', () => {
    el.itemPanel.classList.remove('collapsed');
    el.expandPanelBtn.classList.add('hidden');
  });

  el.itemsCardToggle.addEventListener('click', () => toggleCard(el.itemsCardToggle, el.itemsCardBody));
  el.modifiersCardToggle.addEventListener('click', () => toggleCard(el.modifiersCardToggle, el.modifiersCardBody));

  el.settingsBtn.addEventListener('click', () => el.settingsModal.classList.remove('hidden'));
  el.closeSettingsBtn.addEventListener('click', () => el.settingsModal.classList.add('hidden'));

  document.addEventListener('click', (e) => {
    if (e.target.dataset.close === 'true') {
      el.settingsModal.classList.add('hidden');
    }
    if (e.target.dataset.close === 'winner') {
      dockWinnerCard();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dockWinnerCard();
      el.settingsModal.classList.add('hidden');
    }
  });

  [
    'bgColor', 'themeName', 'borderEnabled', 'borderColor', 'borderWidth',
    'fontFamily', 'fontSize', 'truncateText', 'wheelSize', 'spinDuration',
    'centerImage', 'pointerType', 'pointerImage'
  ].forEach((id) => {
    el[id].addEventListener('input', () => {
      state.settings.backgroundColor = el.bgColor.value;
      state.settings.themeName = el.themeName.value;
      state.settings.borderEnabled = el.borderEnabled.checked;
      state.settings.borderColor = el.borderColor.value;
      state.settings.borderWidth = clamp(parseFloat(el.borderWidth.value) || 1, 0.5, 8);
      state.settings.fontFamily = el.fontFamily.value;
      state.settings.fontSize = clamp(parseInt(el.fontSize.value, 10) || 14, 10, 48);
      state.settings.truncateText = el.truncateText.checked;
      state.settings.wheelSizeVh = clamp(parseInt(el.wheelSize.value, 10) || 80, 30, 100);
      state.settings.spinDurationSec = clamp(parseInt(el.spinDuration.value, 10) || 5, 1, 15);
      state.settings.centerImagePath = el.centerImage.value.trim();
      state.settings.pointerType = el.pointerType.value === 'image' ? 'image' : 'system';
      state.settings.pointerImagePath = el.pointerImage.value.trim();
      onSettingsChanged();
    });
  });

  el.exportItemsBtn.addEventListener('click', () => {
    downloadJson('items.json', exportItemModel());
  });

  el.importItemsInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = await parseJsonFile(file);
    const imported = sanitizeItemModel(parsed || []);
    state.itemModel = imported;
    rebuildDerivedItems();
    saveItems();
    renderAll();
    e.target.value = '';
  });

  el.exportSettingsBtn.addEventListener('click', () => {
    downloadJson('settings.json', state.settings);
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

function toggleCard(toggleEl, bodyEl) {
  const isExpanded = toggleEl.getAttribute('aria-expanded') === 'true';
  toggleEl.setAttribute('aria-expanded', String(!isExpanded));
  bodyEl.classList.toggle('hidden', isExpanded);
}

function onSettingsChanged() {
  saveSettings();
  applySettingsUI();
  updateLayout();
  renderAll();
}

function renderAll() {
  renderItemsTextarea();
  renderModifierMatrix();
  drawWheel();
  updateResultCardFromPointer();
  const noItems = state.items.length === 0;
  el.spinBtn.disabled = noItems || state.isSpinning;
  el.emptyState.style.display = noItems ? 'flex' : 'none';
}

function renderItemsTextarea() {
  const lines = state.itemModel.baseItems.map((item) => item.text);
  const joined = lines.join('\n');
  if (el.itemsTextarea.value !== joined) {
    el.itemsTextarea.value = joined;
  }
}

function renderModifierMatrix() {
  el.modifierMatrix.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'matrix-header';
  header.innerHTML = '<span>item</span><span>default</span><span>🤬</span><span>🔀</span><span>🇬🇧</span><span></span>';
  el.modifierMatrix.appendChild(header);

  state.itemModel.baseItems.forEach((base) => {
    const row = document.createElement('div');
    row.className = 'matrix-row';
    if (base.visible === false) {
      row.classList.add('hidden-item');
    }
    const config = state.itemModel.modifiersById[base.id] || defaultModifierConfig();

    const itemLabel = document.createElement('span');
    itemLabel.className = 'matrix-col-item';
    itemLabel.textContent = base.text;
    row.appendChild(itemLabel);

    MODIFIERS.forEach((modifier) => {
      const wrap = document.createElement('span');
      wrap.className = 'matrix-col-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(config[modifierKey(modifier)]);
      checkbox.addEventListener('change', () => {
        state.itemModel.modifiersById[base.id][modifierKey(modifier)] = checkbox.checked;
        rebuildDerivedItems();
        saveItems();
        renderAll();
      });
      wrap.appendChild(checkbox);
      row.appendChild(wrap);
    });

    const visibilityWrap = document.createElement('span');
    visibilityWrap.className = 'matrix-col-visibility';
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'matrix-visibility-btn';
    visibilityBtn.type = 'button';
    const isVisible = base.visible !== false;
    visibilityBtn.setAttribute('aria-label', `${isVisible ? 'Hide' : 'Show'} ${base.text}`);
    visibilityBtn.innerHTML = `<img src="${isVisible ? 'imgs/view-on.svg' : 'imgs/view-off.svg'}" alt="" />`;
    visibilityBtn.addEventListener('click', () => {
      base.visible = base.visible === false;
      rebuildDerivedItems();
      saveItems();
      renderAll();
    });
    visibilityWrap.appendChild(visibilityBtn);
    row.appendChild(visibilityWrap);

    el.modifierMatrix.appendChild(row);
  });
}

function syncBaseItemsFromTextarea() {
  const lines = el.itemsTextarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const updatedBaseItems = [];
  const nextModifiers = {};
  const usedIds = new Set();

  lines.forEach((line) => {
    const existing = state.itemModel.baseItems.find((it) => it.text === line && !usedIds.has(it.id));
    if (existing) {
      usedIds.add(existing.id);
      updatedBaseItems.push(existing);
      nextModifiers[existing.id] = state.itemModel.modifiersById[existing.id] || defaultModifierConfig();
      return;
    }
    const newItem = { id: makeId(), text: line, visible: true };
    updatedBaseItems.push(newItem);
    nextModifiers[newItem.id] = defaultModifierConfig();
  });

  state.itemModel.baseItems = updatedBaseItems;
  state.itemModel.modifiersById = nextModifiers;
  rebuildDerivedItems();
}

function rebuildDerivedItems() {
  const derived = [];
  state.itemModel.baseItems.forEach((base) => {
    if (base.visible === false) return;
    const config = state.itemModel.modifiersById[base.id] || defaultModifierConfig();
    MODIFIERS.forEach((modifier) => {
      if (config[modifierKey(modifier)]) {
        derived.push({ text: base.text, modifier });
      }
    });
  });
  state.items = derived;
}

function exportItemModel() {
  return {
    baseItems: state.itemModel.baseItems.map((it) => ({ text: it.text, visible: it.visible !== false })),
    modifiers: state.itemModel.baseItems.map((it) => ({
      item: it.text,
      visible: it.visible !== false,
      enabled: enabledModifiers(state.itemModel.modifiersById[it.id])
    }))
  };
}

function sanitizeItemModel(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.baseItems) && Array.isArray(raw.modifiers)) {
    const baseItems = raw.baseItems
      .map((entry, idx) => {
        const modifierEntry = raw.modifiers[idx];
        if (typeof entry === 'string') {
          return { text: entry.trim(), visible: typeof modifierEntry?.visible === 'boolean' ? modifierEntry.visible : true };
        }
        if (entry && typeof entry === 'object') {
          return { text: typeof entry.text === 'string' ? entry.text.trim() : '', visible: typeof entry.visible === 'boolean' ? entry.visible : true };
        }
        return { text: '', visible: true };
      })
      .filter((entry) => Boolean(entry.text))
      .map((entry) => ({ id: makeId(), text: entry.text, visible: entry.visible }));

    const modifiersById = {};
    baseItems.forEach((base, idx) => {
      const modifierEntry = raw.modifiers[idx];
      const enabled = Array.isArray(modifierEntry?.enabled) ? modifierEntry.enabled : [];
      modifiersById[base.id] = {
        default: enabled.includes('default'),
        angry: enabled.includes('🤬'),
        random: enabled.includes('🔀'),
        english: enabled.includes('🇬🇧')
      };
    });
    return { baseItems, modifiersById };
  }

  const sanitizedList = sanitizeLegacyItems(Array.isArray(raw) ? raw : []);
  const grouped = [];
  const keyMap = new Map();

  sanitizedList.forEach((entry) => {
    if (!keyMap.has(entry.text)) {
      const id = makeId();
      keyMap.set(entry.text, id);
      grouped.push({ id, text: entry.text, visible: true, config: defaultModifierConfig() });
    }
    const found = grouped.find((it) => it.text === entry.text);
    found.config[modifierKey(entry.modifier)] = true;
  });

  const baseItems = grouped.map((it) => ({ id: it.id, text: it.text, visible: it.visible }));
  const modifiersById = {};
  grouped.forEach((it) => {
    modifiersById[it.id] = it.config;
  });

  return { baseItems, modifiersById };
}

function sanitizeLegacyItems(list) {
  return list
    .filter((it) => it && typeof it.text === 'string')
    .map((it) => ({ text: it.text.trim(), modifier: MODIFIERS.includes(it.modifier) ? it.modifier : '' }))
    .filter((it) => Boolean(it.text));
}

function defaultModifierConfig() {
  return {
    default: true,
    angry: false,
    random: false,
    english: false
  };
}

function modifierKey(modifier) {
  if (modifier === '🤬') return 'angry';
  if (modifier === '🔀') return 'random';
  if (modifier === '🇬🇧') return 'english';
  return 'default';
}

function enabledModifiers(config = defaultModifierConfig()) {
  return [
    config.default ? 'default' : null,
    config.angry ? '🤬' : null,
    config.random ? '🔀' : null,
    config.english ? '🇬🇧' : null
  ].filter(Boolean);
}

function makeId() {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function updateLayout() {
  const vh = state.settings.wheelSizeVh;
  const viewportBound = Math.min(window.innerWidth - 80, window.innerHeight - 180);
  const sizePx = Math.min((window.innerHeight * vh) / 100, viewportBound);
  const finalSize = Math.max(300, sizePx);
  const wrap = document.querySelector('.wheel-wrap');
  document.documentElement.style.setProperty('--wheel-size', `${finalSize}px`);
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
  dockWinnerCard();
  state.isSpinning = true;
  el.resultCard.classList.add('slot-cycling');
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
    updateResultCardFromPointer();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      state.rotation = normalizedAngle(state.rotation);
      state.isSpinning = false;
      el.resultCard.classList.remove('slot-cycling');
      renderAll();
      showWinner(state.items[selectedIndex]);
    }
  }

  requestAnimationFrame(frame);
}

function showWinner(item) {
  updateResultCard(item);
  state.winnerCardMode = 'center-on-wheel';
  el.resultCard.classList.remove('dock-under-wheel');
  el.resultCard.classList.add('center-on-wheel');
  el.winnerHitArea.classList.remove('hidden');
}

function dockWinnerCard() {
  state.winnerCardMode = 'dock-under-wheel';
  el.resultCard.classList.remove('center-on-wheel');
  el.resultCard.classList.add('dock-under-wheel');
  el.winnerHitArea.classList.add('hidden');
}

function updateResultCardFromPointer() {
  if (state.winnerCardMode === 'center-on-wheel' && !state.isSpinning) return;
  if (state.items.length === 0) {
    el.resultSlotPrev.textContent = '';
    el.resultSlotCurrent.textContent = 'No active items';
    el.resultSlotNext.textContent = '';
    return;
  }
  const index = currentPointerIndex();
  updateResultCard(state.items[index], index);
}

function updateResultCard(item, index = -1) {
  if (!item) return;
  const currentIndex = index >= 0 ? index : state.items.findIndex((entry) => entry.text === item.text && entry.modifier === item.modifier);
  const total = state.items.length;
  const prev = total > 0 ? state.items[(currentIndex - 1 + total) % total] : null;
  const next = total > 0 ? state.items[(currentIndex + 1) % total] : null;
  el.resultSlotPrev.textContent = formatItem(prev);
  el.resultSlotCurrent.textContent = formatItem(item);
  el.resultSlotNext.textContent = formatItem(next);
}

function currentPointerIndex() {
  if (state.items.length === 0) return -1;
  const slice = (Math.PI * 2) / state.items.length;
  const angleLocal = normalizedAngle(-state.rotation);
  return Math.floor(angleLocal / slice) % state.items.length;
}

function formatItem(item) {
  if (!item) return '';
  return `${item.text}${item.modifier ? ` ${item.modifier}` : ''}`;
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

function sanitizeSettings(raw) {
  return {
    backgroundColor: isColor(raw.backgroundColor) ? raw.backgroundColor : state.settings.backgroundColor,
    themeName: typeof raw.themeName === 'string' ? raw.themeName : state.settings.themeName,
    borderEnabled: typeof raw.borderEnabled === 'boolean' ? raw.borderEnabled : state.settings.borderEnabled,
    borderColor: isColor(raw.borderColor) ? raw.borderColor : state.settings.borderColor,
    borderWidth: clamp(parseFloat(raw.borderWidth) || state.settings.borderWidth, 0.5, 8),
    fontFamily: fonts.includes(raw.fontFamily) ? raw.fontFamily : state.settings.fontFamily,
    fontSize: clamp(parseInt(raw.fontSize, 10) || state.settings.fontSize, 10, 48),
    truncateText: typeof raw.truncateText === 'boolean' ? raw.truncateText : state.settings.truncateText,
    wheelSizeVh: clamp(parseInt(raw.wheelSizeVh, 10) || state.settings.wheelSizeVh, 30, 100),
    spinDurationSec: clamp(parseInt(raw.spinDurationSec, 10) || state.settings.spinDurationSec, 1, 15),
    centerImagePath: typeof raw.centerImagePath === 'string' ? raw.centerImagePath : state.settings.centerImagePath,
    pointerType: raw.pointerType === 'image' ? 'image' : 'system',
    pointerImagePath: typeof raw.pointerImagePath === 'string' ? raw.pointerImagePath : state.settings.pointerImagePath
  };
}

function saveItems() {
  localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(exportItemModel()));
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
