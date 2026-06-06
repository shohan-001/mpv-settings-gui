/**
 * MPV Settings Manager — Renderer Process (app.js)
 * 
 * Handles all UI rendering, interactive events, state management,
 * and calls exposed electron APIs via the preload bridge.
 */

// Retrieve data and parsers from preload exposure
const { SETTINGS_CATEGORIES, PRESET_PROFILES, DEFAULT_KEYBINDINGS } = window.mpvSettingsData;
const configParser = window.mpvConfigParser;
const inputParser = window.mpvInputParser;
const api = window.mpvConfig;

// State management
let currentConfig = { settings: {}, profiles: [], comments: [], rawLines: [] };
let currentInputConfig = [];
let activeTab = 'video';
let isDirty = false;
let systemInfo = null;
let currentPlaylist = [];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  setupSidebar();
  setupEventListeners();
  await loadConfigs();
  await loadSystemInfo();
  switchTab('video');
  initUpdateChecker();
});


// ── Setup Functions ──────────────────────────────────────────────────────────

function setupSidebar() {
  const sidebarNav = document.getElementById('sidebar-nav');
  sidebarNav.innerHTML = '';

  // Render settings categories
  SETTINGS_CATEGORIES.forEach(category => {
    const li = document.createElement('li');
    li.innerHTML = `
      <a href="#" class="sidebar-link" data-tab="${category.id}">
        <span class="sidebar-icon">${category.title.split(' ')[0]}</span>
        <span class="sidebar-label">${category.title.split(' ').slice(1).join(' ')}</span>
      </a>
    `;
    sidebarNav.appendChild(li);
  });

  // Attach click handlers to all sidebar links (categories and tools)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function setupEventListeners() {
  // Save button
  document.getElementById('btn-save').addEventListener('click', saveConfigs);

  // Launch MPV button
  document.getElementById('btn-launch-mpv').addEventListener('click', launchMpvFlow);

  // Search input
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', handleGlobalSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      document.getElementById('search-results').classList.remove('hidden');
    }
  });

  // Close search list on clicking outside
  document.addEventListener('click', (e) => {
    if (!document.getElementById('search-container').contains(e.target)) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });

  // Modal close buttons
  document.getElementById('modal-close').addEventListener('click', closeModal);

  // Listen for Menu Shortcuts (Ctrl+S / Ctrl+R) from main process
  api.onMenuSave(saveConfigs);
  api.onMenuReload(async () => {
    if (isDirty) {
      const confirmReload = confirm('You have unsaved changes. Are you sure you want to reload?');
      if (!confirmReload) return;
    }
    await loadConfigs();
    showToast('Configuration reloaded from disk.');
  });

  // Add Keyboard shortcuts in UI
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveConfigs();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
  });
}

// ── Load / Read Operations ───────────────────────────────────────────────────

async function loadConfigs() {
  try {
    // 1. Load mpv.conf
    const configRes = await api.readConfig();
    if (configRes.success) {
      currentConfig = configParser.parse(configRes.content);
    } else {
      showToast('Error loading mpv.conf: ' + configRes.error, 'error');
    }

    // 2. Load input.conf
    const inputRes = await api.readInputConfig();
    if (inputRes.success) {
      currentInputConfig = inputParser.parse(inputRes.content);
    } else {
      showToast('Error loading input.conf: ' + inputRes.error, 'error');
    }

    // Update config paths in footer
    const paths = await api.getConfigPaths();
    document.querySelector('.config-path').setAttribute('title', paths.mpvConf);
    document.querySelector('.config-path span').textContent = '~' + paths.mpvConf.split(paths.mpvDir)[1] || 'mpv.conf';

    isDirty = false;
    updateSaveButtonState();
  } catch (err) {
    showToast('Failed to initialize configuration: ' + err.message, 'error');
  }
}

async function loadSystemInfo() {
  try {
    const res = await api.getSystemInfo();
    if (res.success) {
      systemInfo = res.info;
    }
  } catch (err) {
    console.error('System info load failed:', err);
  }
}

// ── Tab Navigation ────────────────────────────────────────────────────────────

function switchTab(tabId) {
  activeTab = tabId;

  // Update Sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Render content based on tab
  renderContent();
}

function renderContent() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = '';

  // Check if it's a settings category
  const category = SETTINGS_CATEGORIES.find(c => c.id === activeTab);
  if (category) {
    renderSettingsCategory(category);
    return;
  }

  // Handle Tool tabs
  switch (activeTab) {
    case 'guide':
      renderGuide();
      break;
    case 'keybindings':
      renderKeyBindings();
      break;
    case 'playlist':
      renderPlaylist();
      break;
    case 'profiles':
      renderProfiles();
      break;
    case 'presets':
      renderPresets();
      break;
    case 'preview':
      renderPreview();
      break;
    case 'backups':
      renderBackups();
      break;
  }
}

// ── Render Category Settings ──────────────────────────────────────────────────

function renderSettingsCategory(category) {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">${category.title}</h2>
    <p class="tab-desc">${category.description}</p>
  `;
  container.appendChild(header);

  // Settings Grid
  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  category.settings.forEach(setting => {
    const card = document.createElement('div');
    card.className = 'setting-card';
    card.setAttribute('id', `setting-card-${setting.name}`);

    // Resolve value (config -> default)
    let val = currentConfig.settings[setting.name];
    if (val === undefined) {
      val = setting.default;
    }

    // Card Left: Description
    const info = document.createElement('div');
    info.className = 'setting-info';
    info.innerHTML = `
      <div class="setting-label">
        <span>${setting.label}</span>
        <span class="setting-name">${setting.name}</span>
      </div>
      <p class="setting-description">${setting.description}</p>
    `;

    // Highlight save-position-on-quit
    if (setting.name === 'save-position-on-quit') {
      card.style.border = '1px solid var(--accent-purple)';
      card.style.background = 'rgba(168, 85, 247, 0.05)';
      card.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.1)';
      
      const badge = document.createElement('div');
      badge.style.alignSelf = 'flex-start';
      badge.style.background = 'var(--accent-purple)';
      badge.style.color = '#000';
      badge.style.fontSize = '9px';
      badge.style.fontWeight = '800';
      badge.style.padding = '2px 6px';
      badge.style.borderRadius = '4px';
      badge.style.textTransform = 'uppercase';
      badge.style.letterSpacing = '0.5px';
      badge.style.marginBottom = '6px';
      badge.textContent = '💡 Resume Playback Mode';
      info.insertBefore(badge, info.firstChild);
    }

    card.appendChild(info);

    // Card Right: Control Element
    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';

    let controlEl;
    if (setting.type === 'toggle') {
      const isChecked = val === 'yes' ? 'checked' : '';
      controlEl = document.createElement('label');
      controlEl.className = 'switch';
      controlEl.innerHTML = `
        <input type="checkbox" data-setting="${setting.name}" ${isChecked}>
        <span class="slider-toggle"></span>
      `;
      controlEl.querySelector('input').addEventListener('change', (e) => {
        updateSettingValue(setting.name, e.target.checked ? 'yes' : 'no');
      });
    } 
    else if (setting.type === 'select') {
      controlEl = document.createElement('div');
      controlEl.className = 'select-wrapper';
      const select = document.createElement('select');
      select.className = 'control-select';
      select.setAttribute('data-setting', setting.name);

      setting.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === val) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        updateSettingValue(setting.name, e.target.value);
      });
      controlEl.appendChild(select);
    } 
    else if (setting.type === 'slider') {
      controlEl = document.createElement('div');
      controlEl.className = 'slider-container';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'control-slider';
      slider.min = setting.min;
      slider.max = setting.max;
      slider.step = setting.step || 1;
      slider.value = val;
      slider.setAttribute('data-setting', setting.name);

      const valDisplay = document.createElement('span');
      valDisplay.className = 'slider-value';
      valDisplay.textContent = val;

      slider.addEventListener('input', (e) => {
        valDisplay.textContent = e.target.value;
        updateSettingValue(setting.name, e.target.value);
      });

      controlEl.appendChild(slider);
      controlEl.appendChild(valDisplay);
    } 
    else if (setting.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'control-text';
      input.value = val;
      input.setAttribute('data-setting', setting.name);
      input.addEventListener('input', (e) => {
        updateSettingValue(setting.name, e.target.value);
      });
      controlEl = input;
    } 
    else if (setting.type === 'color') {
      controlEl = document.createElement('div');
      controlEl.className = 'color-picker-container';

      // Parse standard hex color (MPV supports #RRGGBBAA or #RRGGBB)
      let hexColor = val;
      if (!hexColor.startsWith('#')) {
        hexColor = '#' + hexColor;
      }
      // Trim to #RRGGBB for HTML color picker
      const pickerVal = hexColor.substring(0, 7);

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'control-color';
      picker.value = pickerVal;

      const txt = document.createElement('input');
      txt.type = 'text';
      txt.className = 'color-value';
      txt.value = val;
      txt.setAttribute('data-setting', setting.name);

      picker.addEventListener('input', (e) => {
        // Keep existing alpha suffix from text box if it exists
        const currentText = txt.value.replace('#', '');
        const alpha = currentText.length === 8 ? currentText.substring(6, 8) : 'FF';
        const newColor = e.target.value.toUpperCase() + alpha;
        txt.value = newColor;
        updateSettingValue(setting.name, newColor);
      });

      txt.addEventListener('input', (e) => {
        let textVal = e.target.value;
        if (!textVal.startsWith('#')) textVal = '#' + textVal;
        
        // If it matches a valid hex color format, update the picker
        if (/^#[0-9A-F]{6}$/i.test(textVal) || /^#[0-9A-F]{8}$/i.test(textVal)) {
          picker.value = textVal.substring(0, 7);
          updateSettingValue(setting.name, textVal.toUpperCase());
        } else {
          updateSettingValue(setting.name, textVal);
        }
      });

      controlEl.appendChild(picker);
      controlEl.appendChild(txt);
    } 
    else if (setting.type === 'directory' || setting.type === 'file') {
      controlEl = document.createElement('div');
      controlEl.className = 'picker-container';

      const pathInput = document.createElement('div');
      pathInput.className = 'picker-path';
      pathInput.textContent = val || 'Not set';
      pathInput.setAttribute('title', val || '');

      const btn = document.createElement('button');
      btn.className = 'picker-btn';
      btn.textContent = 'Browse';

      btn.addEventListener('click', async () => {
        let res;
        if (setting.type === 'directory') {
          res = await api.selectDirectory();
        } else {
          res = await api.selectFile();
        }

        if (res.success && res.path) {
          pathInput.textContent = res.path;
          pathInput.setAttribute('title', res.path);
          updateSettingValue(setting.name, res.path);
        }
      });

      controlEl.appendChild(pathInput);
      controlEl.appendChild(btn);
    }

    card.appendChild(controlContainer);
    controlContainer.appendChild(controlEl);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function updateSettingValue(key, value) {
  currentConfig.settings[key] = value;
  isDirty = true;
  updateSaveButtonState();
}

function updateSaveButtonState() {
  const saveBtn = document.getElementById('btn-save');
  if (isDirty) {
    saveBtn.style.opacity = '1';
    saveBtn.classList.add('pulse');
  } else {
    saveBtn.style.opacity = '0.7';
    saveBtn.classList.remove('pulse');
  }
}

// ── Playlist Manager ──────────────────────────────────────────────────────────

function renderPlaylist() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <div class="playlist-header-row">
      <div>
        <h2 class="tab-title">📋 Playlist Manager</h2>
        <p class="tab-desc">Add multiple files to create a play queue, reorder tracks, and launch MPV to play them sequentially.</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="header-btn" id="btn-playlist-add" style="height:38px; border-radius:8px; background:var(--accent-purple); color:#000; font-weight:600; border:none; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <span>+ Add File(s)</span>
        </button>
        <button class="header-btn" id="btn-playlist-clear" style="height:38px; border-radius:8px; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <span>Clear Queue</span>
        </button>
        <button class="header-btn" id="btn-playlist-play" style="height:38px; border-radius:8px; background:var(--accent-gradient); color:#000; font-weight:600; border:none; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Play Queue</span>
        </button>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Playlist list element
  const listWrapper = document.createElement('div');
  listWrapper.className = 'playlist-list';
  container.appendChild(listWrapper);

  // Event Listeners for Toolbar
  document.getElementById('btn-playlist-add').addEventListener('click', addFilesToPlaylist);
  document.getElementById('btn-playlist-clear').addEventListener('click', clearPlaylist);
  document.getElementById('btn-playlist-play').addEventListener('click', playPlaylist);

  // Draw list
  drawPlaylist();
}

function drawPlaylist() {
  const container = document.querySelector('.playlist-list');
  if (!container) return;

  container.innerHTML = '';

  if (currentPlaylist.length === 0) {
    container.innerHTML = `
      <div class="playlist-empty-card">
        <span class="playlist-empty-icon">🎬</span>
        <h3 class="playlist-empty-title">Queue is empty</h3>
        <p class="playlist-empty-desc">Add video or audio tracks to build your playlist. Reorder them at any time and launch MPV to start streaming.</p>
      </div>
    `;
    return;
  }

  currentPlaylist.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.innerHTML = `
      <div class="playlist-item-left">
        <div class="playlist-item-index">${index + 1}</div>
        <div class="playlist-item-details">
          <span class="playlist-item-name" title="${file.name}">${file.name}</span>
          <span class="playlist-item-path" title="${file.path}">${file.path}</span>
        </div>
      </div>
      <div class="playlist-item-actions">
        <button class="action-btn btn-playlist-up" data-index="${index}" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="action-btn btn-playlist-down" data-index="${index}" title="Move Down" ${index === currentPlaylist.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button class="action-btn delete btn-playlist-remove" data-index="${index}" title="Remove file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Reorder event listeners
    if (index > 0) {
      item.querySelector('.btn-playlist-up').onclick = () => movePlaylistItem(index, -1);
    }
    if (index < currentPlaylist.length - 1) {
      item.querySelector('.btn-playlist-down').onclick = () => movePlaylistItem(index, 1);
    }
    item.querySelector('.btn-playlist-remove').onclick = () => removePlaylistItem(index);

    container.appendChild(item);
  });
}

async function addFilesToPlaylist() {
  const res = await api.selectFile({
    title: 'Select video/audio files to add to queue',
    properties: ['openFile', 'multiSelections']
  });

  if (res.success && res.paths && res.paths.length > 0) {
    res.paths.forEach(filePath => {
      const parts = filePath.split('/');
      const name = parts[parts.length - 1];
      
      // Prevent duplicates in queue
      if (!currentPlaylist.some(item => item.path === filePath)) {
        currentPlaylist.push({
          name: name,
          path: filePath
        });
      }
    });

    drawPlaylist();
    showToast(`Added ${res.paths.length} file(s) to play queue.`);
  }
}

function clearPlaylist() {
  if (currentPlaylist.length === 0) return;
  const confirmClear = confirm('Are you sure you want to clear the playlist queue?');
  if (!confirmClear) return;

  currentPlaylist = [];
  drawPlaylist();
  showToast('Playlist queue cleared.');
}

async function playPlaylist() {
  if (currentPlaylist.length === 0) {
    showToast('Add some files to the queue first!', 'error');
    return;
  }

  const filePaths = currentPlaylist.map(item => item.path);
  
  const resumePlayback = currentConfig.settings['save-position-on-quit'] === 'yes';
  let launchArgs = [...filePaths];
  if (resumePlayback) {
    launchArgs.unshift('--save-position-on-quit=yes');
  } else {
    launchArgs.unshift('--save-position-on-quit=no');
  }

  try {
    showToast(`Launching MPV with ${currentPlaylist.length} playlist files...`);
    const res = await api.launchMpv(launchArgs);
    if (!res.success) {
      showToast('Failed to launch MPV: ' + res.error, 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function movePlaylistItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentPlaylist.length) return;

  const temp = currentPlaylist[index];
  currentPlaylist[index] = currentPlaylist[targetIndex];
  currentPlaylist[targetIndex] = temp;

  drawPlaylist();
}

function removePlaylistItem(index) {
  currentPlaylist.splice(index, 1);
  drawPlaylist();
  showToast('Item removed from queue.');
}

// ── Controls Guide ────────────────────────────────────────────────────────────

let activeGuideSubTab = 'basic';

function renderGuide() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">🎮 Controls Guide</h2>
    <p class="tab-desc">Quickly reference the default keyboard shortcuts for controlling the MPV player. Customize these at any time in the <strong>Key Bindings</strong> tab.</p>
  `;
  container.appendChild(header);

  // Sub-tabs navigation
  const subtabs = document.createElement('div');
  subtabs.style.display = 'flex';
  subtabs.style.gap = '10px';
  subtabs.style.marginBottom = '20px';
  subtabs.innerHTML = `
    <button class="header-btn" id="guide-subtab-basic" style="height:36px; border-radius:8px;">Most Used (Basic)</button>
    <button class="header-btn" id="guide-subtab-advanced" style="height:36px; border-radius:8px;">Advanced Controls</button>
  `;
  container.appendChild(subtabs);

  // Guide Grid Container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'tab-content';
  gridContainer.style.gap = '24px';
  container.appendChild(gridContainer);

  const btnBasic = document.getElementById('guide-subtab-basic');
  const btnAdvanced = document.getElementById('guide-subtab-advanced');

  const selectSubTab = (subTab) => {
    activeGuideSubTab = subTab;
    gridContainer.innerHTML = '';

    if (subTab === 'basic') {
      btnBasic.classList.add('active');
      btnBasic.style.borderColor = 'var(--accent-cyan)';
      btnAdvanced.classList.remove('active');
      btnAdvanced.style.borderColor = 'var(--border-color)';
    } else {
      btnAdvanced.classList.add('active');
      btnAdvanced.style.borderColor = 'var(--accent-cyan)';
      btnBasic.classList.remove('active');
      btnBasic.style.borderColor = 'var(--border-color)';
    }

    // Render group cards
    const groups = window.mpvSettingsData.CONTROLS_GUIDE[subTab];
    
    // Create section grid
    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'settings-grid';
    gridContainer.appendChild(sectionGrid);

    groups.forEach(group => {
      const card = document.createElement('div');
      card.className = 'setting-card';
      card.style.gap = '14px';
      card.style.justifyContent = 'flex-start';

      card.innerHTML = `
        <div class="setting-label" style="font-size:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:4px;">
          <span>${group.category}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${group.items.map(item => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
              <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${item.label}</span>
                <span style="font-size:11px; color:var(--text-secondary);">${item.desc}</span>
              </div>
              <kbd class="binding-kbd" style="font-family:var(--font-mono); font-size:11px; background:rgba(6, 182, 212, 0.1); border:1px solid rgba(6, 182, 212, 0.2); border-radius:4px; padding:3px 8px; font-weight:600; color:var(--accent-cyan); white-space:nowrap;">${item.key}</kbd>
            </div>
          `).join('')}
        </div>
      `;
      sectionGrid.appendChild(card);
    });

    // Helper tip card at bottom of grid
    const tipCard = document.createElement('div');
    tipCard.className = 'setting-card';
    tipCard.style.gridColumn = '1 / -1';
    tipCard.style.background = 'rgba(168, 85, 247, 0.08)';
    tipCard.style.borderColor = 'rgba(168, 85, 247, 0.2)';
    tipCard.style.flexDirection = 'row';
    tipCard.style.alignItems = 'center';
    tipCard.style.justifyContent = 'space-between';
    tipCard.innerHTML = `
      <div style="display:flex; gap:12px; align-items:center;">
        <span style="font-size:24px;">💡</span>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-size:14px; font-weight:600; color:var(--text-primary);">Need custom shortcuts?</span>
          <span style="font-size:12px; color:var(--text-secondary);">You can customize any key or combine hotkeys in the Key Bindings editor to match VLC layout.</span>
        </div>
      </div>
      <button class="picker-btn" id="btn-guide-go-to-bindings" style="background:var(--accent-purple); color:#000; font-weight:600; border:none; padding:0 16px; height:34px;">Go to Key Bindings</button>
    `;
    gridContainer.appendChild(tipCard);

    document.getElementById('btn-guide-go-to-bindings').addEventListener('click', () => {
      switchTab('keybindings');
    });
  };

  btnBasic.onclick = () => selectSubTab('basic');
  btnAdvanced.onclick = () => selectSubTab('advanced');

  // Trigger default selection
  selectSubTab(activeGuideSubTab);
}

// ── Key Bindings Editor ───────────────────────────────────────────────────────

function renderKeyBindings() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">⌨️ Key Bindings</h2>
    <p class="tab-desc">Visual hotkey manager for input.conf. Change mappings, add commands, and configure controls.</p>
  `;
  container.appendChild(header);

  // Bindings Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'bindings-toolbar';
  toolbar.innerHTML = `
    <div class="bindings-search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" id="bindings-filter" placeholder="Search bindings..." style="width:100%; height:38px; border-radius:8px; border:1px solid var(--border-color); background:rgba(255,255,255,0.03); padding-left:36px; padding-right:12px; outline:none;">
    </div>
    <div style="display:flex; gap:10px;">
      <button class="header-btn" id="btn-add-binding" style="height:38px; border-radius:8px; background:var(--accent-purple); color:#000; font-weight:600; border:none; display:flex; align-items:center; gap:6px; cursor:pointer;">
        <span>+ Add Binding</span>
      </button>
      <button class="header-btn" id="btn-restore-default-bindings" style="height:38px; border-radius:8px; display:flex; align-items:center; gap:6px; cursor:pointer;">
        <span>Restore Defaults</span>
      </button>
    </div>
  `;
  container.appendChild(toolbar);

  // Table Container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'bindings-table-container';
  
  const table = document.createElement('table');
  table.className = 'bindings-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width: 25%">Hotkey</th>
        <th style="width: 35%">MPV Command</th>
        <th style="width: 30%">Description / Comment</th>
        <th style="width: 10%; text-align: right;">Actions</th>
      </tr>
    </thead>
    <tbody id="bindings-tbody">
      <!-- Populated dynamically -->
    </tbody>
  `;
  tableContainer.appendChild(table);
  container.appendChild(tableContainer);

  // Event handlers for bindings actions
  document.getElementById('bindings-filter').addEventListener('input', filterKeyBindings);
  document.getElementById('btn-add-binding').addEventListener('click', openAddBindingModal);
  document.getElementById('btn-restore-default-bindings').addEventListener('click', confirmRestoreDefaultBindings);

  // Initial bindings draw
  drawBindingsTable();
}

function drawBindingsTable(filterText = '') {
  const tbody = document.getElementById('bindings-tbody');
  tbody.innerHTML = '';

  const cleanFilter = filterText.toLowerCase().trim();

  // Filter and render
  const bindings = currentInputConfig.filter(b => b.type === 'binding');

  if (bindings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="search-no-results">No hotkeys defined. Click "+ Add Binding" to create one.</td></tr>`;
    return;
  }

  let matchesCount = 0;

  bindings.forEach((binding, index) => {
    const key = binding.key || '';
    const command = binding.command || '';
    const comment = binding.comment || '';

    // Filter match
    if (cleanFilter && 
        !key.toLowerCase().includes(cleanFilter) && 
        !command.toLowerCase().includes(cleanFilter) && 
        !comment.toLowerCase().includes(cleanFilter)) {
      return;
    }

    matchesCount++;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="binding-key-cell">
        <kbd class="binding-kbd">${key}</kbd>
      </td>
      <td class="binding-cmd-cell">${command}</td>
      <td class="binding-comment-cell">${comment || '<span style="color:var(--text-muted); font-style:italic;">No description</span>'}</td>
      <td class="binding-actions" style="text-align: right;">
        <button class="action-btn btn-edit-binding" data-index="${index}" title="Edit hotkey">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="action-btn delete btn-delete-binding" data-index="${index}" title="Delete hotkey">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </td>
    `;

    // Attach actions
    row.querySelector('.btn-edit-binding').addEventListener('click', () => openEditBindingModal(index));
    row.querySelector('.btn-delete-binding').addEventListener('click', () => deleteBinding(index));

    tbody.appendChild(row);
  });

  if (matchesCount === 0 && cleanFilter) {
    tbody.innerHTML = `<tr><td colspan="4" class="search-no-results">No hotkeys match your search.</td></tr>`;
  }
}

function filterKeyBindings(e) {
  drawBindingsTable(e.target.value);
}

function openAddBindingModal() {
  const bodyHTML = `
    <div class="form-group">
      <label for="modal-bind-key">Key / Hotkey Combination</label>
      <input type="text" id="modal-bind-key" class="form-input" placeholder="e.g. Ctrl+p or Shift+UP" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-bind-cmd">MPV Command</label>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <input type="text" id="modal-bind-cmd" class="form-input" placeholder="e.g. cycle pause or seek 5" autocomplete="off">
        <select id="modal-bind-cmd-suggest" class="control-select" style="width:100%; height:36px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:8px; padding:0 10px; font-size:12px;">
          <option value="">-- Choose a template / suggestion --</option>
          <optgroup label="Playback">
            <option value="cycle pause" data-comment="Toggle pause/playback">cycle pause (Play/Pause)</option>
            <option value="quit" data-comment="Close player instantly">quit (Quit Player)</option>
            <option value="quit-watch-later" data-comment="Quit and save position">quit-watch-later (Quit & Resume)</option>
          </optgroup>
          <optgroup label="Volume & Audio">
            <option value="add volume 2" data-comment="Increase volume by 2%">add volume 2 (Volume Up)</option>
            <option value="add volume -2" data-comment="Decrease volume by 2%">add volume -2 (Volume Down)</option>
            <option value="cycle mute" data-comment="Toggle mute state">cycle mute (Mute/Unmute)</option>
            <option value="cycle audio" data-comment="Next audio track">cycle audio (Next Audio Track)</option>
            <option value="add audio-delay -0.1" data-comment="Shift audio 100ms earlier">add audio-delay -0.1 (Audio 100ms early)</option>
            <option value="add audio-delay 0.1" data-comment="Shift audio 100ms later">add audio-delay 0.1 (Audio 100ms late)</option>
          </optgroup>
          <optgroup label="Seeking (Navigation)">
            <option value="seek 5" data-comment="Seek 5s forward">seek 5 (Skip 5s Forward)</option>
            <option value="seek -5" data-comment="Seek 5s backward">seek -5 (Skip 5s Backward)</option>
            <option value="seek 60" data-comment="Seek 1m forward">seek 60 (Skip 1m Forward)</option>
            <option value="seek -60" data-comment="Seek 1m backward">seek -60 (Skip 1m Backward)</option>
            <option value="seek 86" data-comment="Seek 86s forward (skip anime OP)">seek 86 (Skip Anime OP)</option>
          </optgroup>
          <optgroup label="Subtitles">
            <option value="cycle sub" data-comment="Cycle subtitle tracks forward">cycle sub (Next Subtitle)</option>
            <option value="cycle sub-visibility" data-comment="Toggle subtitle visibility">cycle sub-visibility (Show/Hide Subs)</option>
            <option value="add sub-pos -1" data-comment="Move subtitles up">add sub-pos -1 (Move Subs Up)</option>
            <option value="add sub-pos 1" data-comment="Move subtitles down">add sub-pos 1 (Move Subs Down)</option>
            <option value="add sub-delay -0.1" data-comment="Shift subtitles 100ms earlier">add sub-delay -0.1 (Subs 100ms early)</option>
            <option value="add sub-delay 0.1" data-comment="Shift subtitles 100ms later">add sub-delay 0.1 (Subs 100ms late)</option>
          </optgroup>
          <optgroup label="Fullscreen & Window">
            <option value="cycle fullscreen" data-comment="Toggle fullscreen">cycle fullscreen (Fullscreen)</option>
            <option value="set fullscreen no" data-comment="Exit fullscreen mode">set fullscreen no (Exit Fullscreen)</option>
            <option value="cycle ontop" data-comment="Toggle always on top window float">cycle ontop (Toggle Always-on-Top)</option>
          </optgroup>
          <optgroup label="Screenshots">
            <option value="screenshot" data-comment="Take screenshot with subtitles">screenshot (Screenshot with Subs)</option>
            <option value="screenshot video" data-comment="Take screenshot without subtitles">screenshot video (Clean Screenshot)</option>
            <option value="screenshot window" data-comment="Take screenshot of window dimensions">screenshot window (Window Screenshot)</option>
          </optgroup>
          <optgroup label="Playback Speed">
            <option value="multiply speed 1.1" data-comment="Increase speed by 10%">multiply speed 1.1 (Speed Up 10%)</option>
            <option value="multiply speed 1/1.1" data-comment="Decrease speed by 10%">multiply speed 1/1.1 (Slow Down 10%)</option>
            <option value="set speed 1.0" data-comment="Reset speed to 1.0x">set speed 1.0 (Reset Speed)</option>
          </optgroup>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="modal-bind-comment">Description / Comment (Optional)</label>
      <input type="text" id="modal-bind-comment" class="form-input" placeholder="e.g. Pause playback" autocomplete="off">
    </div>
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Cancel</button>
    <button class="modal-btn primary" id="modal-btn-save">Add Hotkey</button>
  `;

  openModal('Add Key Binding', bodyHTML, footerHTML);

  const suggestSelect = document.getElementById('modal-bind-cmd-suggest');
  const cmdInput = document.getElementById('modal-bind-cmd');
  const commentInput = document.getElementById('modal-bind-comment');

  suggestSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      cmdInput.value = val;
      const selectedOpt = suggestSelect.options[suggestSelect.selectedIndex];
      const comment = selectedOpt.getAttribute('data-comment');
      if (comment && commentInput.value.trim() === '') {
        commentInput.value = comment;
      }
    }
  });

  document.getElementById('modal-btn-cancel').onclick = closeModal;
  document.getElementById('modal-btn-save').onclick = () => {
    const key = document.getElementById('modal-bind-key').value.trim();
    const command = document.getElementById('modal-bind-cmd').value.trim();
    const comment = document.getElementById('modal-bind-comment').value.trim();

    if (!key || !command) {
      alert('Key and Command are both required.');
      return;
    }

    currentInputConfig.push({
      type: 'binding',
      key,
      command,
      comment,
      raw: `${key} ${command} # ${comment}`
    });

    isDirty = true;
    updateSaveButtonState();
    closeModal();
    drawBindingsTable();
    showToast('Hotkey added to memory.');
  };
}

function openEditBindingModal(index) {
  // Find index relative to total array
  let count = -1;
  let targetIndexInArray = -1;
  for (let i = 0; i < currentInputConfig.length; i++) {
    if (currentInputConfig[i].type === 'binding') {
      count++;
      if (count === index) {
        targetIndexInArray = i;
        break;
      }
    }
  }

  if (targetIndexInArray === -1) return;

  const binding = currentInputConfig[targetIndexInArray];

  const bodyHTML = `
    <div class="form-group">
      <label for="modal-bind-key">Key / Hotkey Combination</label>
      <input type="text" id="modal-bind-key" class="form-input" value="${binding.key || ''}" placeholder="e.g. Ctrl+p" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-bind-cmd">MPV Command</label>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <input type="text" id="modal-bind-cmd" class="form-input" value="${binding.command || ''}" placeholder="e.g. cycle pause" autocomplete="off">
        <select id="modal-bind-cmd-suggest" class="control-select" style="width:100%; height:36px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:8px; padding:0 10px; font-size:12px;">
          <option value="">-- Choose a template / suggestion --</option>
          <optgroup label="Playback">
            <option value="cycle pause" data-comment="Toggle pause/playback">cycle pause (Play/Pause)</option>
            <option value="quit" data-comment="Close player instantly">quit (Quit Player)</option>
            <option value="quit-watch-later" data-comment="Quit and save position">quit-watch-later (Quit & Resume)</option>
          </optgroup>
          <optgroup label="Volume & Audio">
            <option value="add volume 2" data-comment="Increase volume by 2%">add volume 2 (Volume Up)</option>
            <option value="add volume -2" data-comment="Decrease volume by 2%">add volume -2 (Volume Down)</option>
            <option value="cycle mute" data-comment="Toggle mute state">cycle mute (Mute/Unmute)</option>
            <option value="cycle audio" data-comment="Next audio track">cycle audio (Next Audio Track)</option>
            <option value="add audio-delay -0.1" data-comment="Shift audio 100ms earlier">add audio-delay -0.1 (Audio 100ms early)</option>
            <option value="add audio-delay 0.1" data-comment="Shift audio 100ms later">add audio-delay 0.1 (Audio 100ms late)</option>
          </optgroup>
          <optgroup label="Seeking (Navigation)">
            <option value="seek 5" data-comment="Seek 5s forward">seek 5 (Skip 5s Forward)</option>
            <option value="seek -5" data-comment="Seek 5s backward">seek -5 (Skip 5s Backward)</option>
            <option value="seek 60" data-comment="Seek 1m forward">seek 60 (Skip 1m Forward)</option>
            <option value="seek -60" data-comment="Seek 1m backward">seek -60 (Skip 1m Backward)</option>
            <option value="seek 86" data-comment="Seek 86s forward (skip anime OP)">seek 86 (Skip Anime OP)</option>
          </optgroup>
          <optgroup label="Subtitles">
            <option value="cycle sub" data-comment="Cycle subtitle tracks forward">cycle sub (Next Subtitle)</option>
            <option value="cycle sub-visibility" data-comment="Toggle subtitle visibility">cycle sub-visibility (Show/Hide Subs)</option>
            <option value="add sub-pos -1" data-comment="Move subtitles up">add sub-pos -1 (Move Subs Up)</option>
            <option value="add sub-pos 1" data-comment="Move subtitles down">add sub-pos 1 (Move Subs Down)</option>
            <option value="add sub-delay -0.1" data-comment="Shift subtitles 100ms earlier">add sub-delay -0.1 (Subs 100ms early)</option>
            <option value="add sub-delay 0.1" data-comment="Shift subtitles 100ms later">add sub-delay 0.1 (Subs 100ms late)</option>
          </optgroup>
          <optgroup label="Fullscreen & Window">
            <option value="cycle fullscreen" data-comment="Toggle fullscreen">cycle fullscreen (Fullscreen)</option>
            <option value="set fullscreen no" data-comment="Exit fullscreen mode">set fullscreen no (Exit Fullscreen)</option>
            <option value="cycle ontop" data-comment="Toggle always on top window float">cycle ontop (Toggle Always-on-Top)</option>
          </optgroup>
          <optgroup label="Screenshots">
            <option value="screenshot" data-comment="Take screenshot with subtitles">screenshot (Screenshot with Subs)</option>
            <option value="screenshot video" data-comment="Take screenshot without subtitles">screenshot video (Clean Screenshot)</option>
            <option value="screenshot window" data-comment="Take screenshot of window dimensions">screenshot window (Window Screenshot)</option>
          </optgroup>
          <optgroup label="Playback Speed">
            <option value="multiply speed 1.1" data-comment="Increase speed by 10%">multiply speed 1.1 (Speed Up 10%)</option>
            <option value="multiply speed 1/1.1" data-comment="Decrease speed by 10%">multiply speed 1/1.1 (Slow Down 10%)</option>
            <option value="set speed 1.0" data-comment="Reset speed to 1.0x">set speed 1.0 (Reset Speed)</option>
          </optgroup>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="modal-bind-comment">Description / Comment (Optional)</label>
      <input type="text" id="modal-bind-comment" class="form-input" value="${binding.comment || ''}" placeholder="e.g. Pause playback" autocomplete="off">
    </div>
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Cancel</button>
    <button class="modal-btn primary" id="modal-btn-save">Update Hotkey</button>
  `;

  openModal('Edit Key Binding', bodyHTML, footerHTML);

  const suggestSelect = document.getElementById('modal-bind-cmd-suggest');
  const cmdInput = document.getElementById('modal-bind-cmd');
  const commentInput = document.getElementById('modal-bind-comment');

  suggestSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      cmdInput.value = val;
      const selectedOpt = suggestSelect.options[suggestSelect.selectedIndex];
      const comment = selectedOpt.getAttribute('data-comment');
      if (comment && commentInput.value.trim() === '') {
        commentInput.value = comment;
      }
    }
  });

  document.getElementById('modal-btn-cancel').onclick = closeModal;
  document.getElementById('modal-btn-save').onclick = () => {
    const key = document.getElementById('modal-bind-key').value.trim();
    const command = document.getElementById('modal-bind-cmd').value.trim();
    const comment = document.getElementById('modal-bind-comment').value.trim();

    if (!key || !command) {
      alert('Key and Command are both required.');
      return;
    }

    currentInputConfig[targetIndexInArray] = {
      type: 'binding',
      key,
      command,
      comment,
      raw: `${key} ${command} # ${comment}`
    };

    isDirty = true;
    updateSaveButtonState();
    closeModal();
    drawBindingsTable();
    showToast('Hotkey updated.');
  };
}

function deleteBinding(index) {
  let count = -1;
  let targetIndexInArray = -1;
  for (let i = 0; i < currentInputConfig.length; i++) {
    if (currentInputConfig[i].type === 'binding') {
      count++;
      if (count === index) {
        targetIndexInArray = i;
        break;
      }
    }
  }

  if (targetIndexInArray === -1) return;

  const binding = currentInputConfig[targetIndexInArray];
  const confirmDelete = confirm(`Are you sure you want to remove hotkey mapping for "${binding.key}"?`);
  if (!confirmDelete) return;

  currentInputConfig.splice(targetIndexInArray, 1);
  isDirty = true;
  updateSaveButtonState();
  drawBindingsTable();
  showToast('Hotkey deleted.');
}

function confirmRestoreDefaultBindings() {
  const confirmRestore = confirm('Restore ALL hotkeys back to standard MPV defaults? This will overwrite your current bindings.');
  if (!confirmRestore) return;

  // Re-build input config array with default bindings
  const newBindings = [];
  newBindings.push({ type: 'comment', comment: 'MPV Default Hotkeys (Restored)', raw: '# MPV Default Hotkeys (Restored)' });
  newBindings.push({ type: 'blank', raw: '' });

  DEFAULT_KEYBINDINGS.forEach(def => {
    newBindings.push({
      type: 'binding',
      key: def.key,
      command: def.command,
      comment: def.comment,
      raw: `${def.key} ${def.command}   # ${def.comment}`
    });
  });

  currentInputConfig = newBindings;
  isDirty = true;
  updateSaveButtonState();
  drawBindingsTable();
  showToast('Restored default keybindings to memory.');
}

// ── Profiles Manager ──────────────────────────────────────────────────────────

function renderProfiles() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <div class="profiles-toolbar">
      <div>
        <h2 class="tab-title">📦 Config Profiles</h2>
        <p class="tab-desc">Manage profiles within your mpv.conf file. Profiles allow grouping configuration changes that can be loaded on-demand or conditionally.</p>
      </div>
      <button class="header-btn" id="btn-add-profile" style="height:38px; border-radius:8px; background:var(--accent-purple); color:#000; font-weight:600; border:none; display:flex; align-items:center; gap:6px; cursor:pointer;">
        <span>+ Create Profile</span>
      </button>
    </div>
  `;
  container.appendChild(header);

  // Profile List Grid
  const profileList = document.createElement('div');
  profileList.className = 'tab-content';
  profileList.style.gap = '20px';

  const profiles = currentConfig.profiles || [];

  if (profiles.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'setting-card';
    emptyState.innerHTML = `
      <div class="setting-info" style="text-align: center; padding: 20px;">
        <span style="font-size: 24px;">📦</span>
        <h3 style="margin-top: 10px;">No custom profiles found</h3>
        <p class="setting-description" style="margin-top: 5px;">Profiles are custom config blocks starting with [profile-name] inside mpv.conf. Create one to get started.</p>
      </div>
    `;
    profileList.appendChild(emptyState);
    container.appendChild(profileList);
    document.getElementById('btn-add-profile').addEventListener('click', openAddProfileModal);
    return;
  }

  profiles.forEach((profile, index) => {
    const card = document.createElement('div');
    card.className = 'profile-card';

    // Settings tags list HTML
    let tagsHTML = '';
    const keys = Object.keys(profile.settings || {});
    if (keys.length === 0) {
      tagsHTML = '<span style="color:var(--text-muted); font-size:12px; font-style:italic;">No settings defined in this profile</span>';
    } else {
      keys.forEach(k => {
        tagsHTML += `
          <div class="profile-tag" data-profile-idx="${index}" data-setting-key="${k}">
            <span class="profile-tag-key">${k}</span> = <span class="profile-tag-val">${profile.settings[k]}</span>
            <span class="profile-tag-remove" style="color:var(--error); margin-left:6px; cursor:pointer; font-weight:700;">&times;</span>
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="profile-header-row">
        <div class="profile-title-group">
          <span style="font-size: 20px;">📦</span>
          <span class="profile-badge">[${profile.name}]</span>
        </div>
        <div class="binding-actions">
          <button class="action-btn btn-add-profile-setting" data-index="${index}" title="Add setting to profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <button class="action-btn btn-edit-profile" data-index="${index}" title="Edit profile settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="action-btn delete btn-delete-profile" data-index="${index}" title="Delete profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      
      ${profile.desc ? `<div class="profile-desc-text"><strong>Description:</strong> ${profile.desc}</div>` : ''}

      <div class="profile-meta">
        ${profile.cond ? `<div class="profile-meta-item"><span class="profile-meta-label">Condition:</span><span class="profile-meta-val">${profile.cond}</span></div>` : ''}
        ${profile.restore ? `<div class="profile-meta-item"><span class="profile-meta-label">Restore mode:</span><span class="profile-meta-val">${profile.restore}</span></div>` : ''}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">Settings inside Profile:</span>
        <div class="profile-settings-preview">
          ${tagsHTML}
        </div>
      </div>
    `;

    // Event listeners
    card.querySelector('.btn-add-profile-setting').addEventListener('click', () => openAddProfileSettingModal(index));
    card.querySelector('.btn-edit-profile').addEventListener('click', () => openEditProfileModal(index));
    card.querySelector('.btn-delete-profile').addEventListener('click', () => deleteProfile(index));

    // Remove setting inside profile listeners
    card.querySelectorAll('.profile-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.target.parentElement;
        const profileIdx = parseInt(tag.getAttribute('data-profile-idx'));
        const settingKey = tag.getAttribute('data-setting-key');
        removeSettingFromProfile(profileIdx, settingKey);
      });
    });

    profileList.appendChild(card);
  });

  container.appendChild(profileList);

  document.getElementById('btn-add-profile').addEventListener('click', openAddProfileModal);
}

function openAddProfileModal() {
  const bodyHTML = `
    <div class="form-group">
      <label for="modal-prof-name">Profile Name (no spaces)</label>
      <input type="text" id="modal-prof-name" class="form-input" placeholder="e.g. anime-hdr" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-prof-desc">Profile Description (Optional)</label>
      <input type="text" id="modal-prof-desc" class="form-input" placeholder="e.g. Optimized HDR values for animation" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-prof-cond">Conditional Auto-Apply (Optional)</label>
      <input type="text" id="modal-prof-cond" class="form-input" placeholder="e.g. filename.includes('HDR')" autocomplete="off">
      <span style="font-size:11px; color:var(--text-muted);">Uses lua-style properties (e.g. width >= 1920) to auto-apply.</span>
    </div>
    <div class="form-group">
      <label for="modal-prof-restore">Restore Mode (Optional)</label>
      <select id="modal-prof-restore" class="control-select" style="width:100%;">
        <option value="">Default (yes)</option>
        <option value="yes">Yes (revert values when condition ends)</option>
        <option value="no">No (stick values permanently)</option>
      </select>
    </div>
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Cancel</button>
    <button class="modal-btn primary" id="modal-btn-save">Create Profile</button>
  `;

  openModal('Create Profile', bodyHTML, footerHTML);

  document.getElementById('modal-btn-cancel').onclick = closeModal;
  document.getElementById('modal-btn-save').onclick = () => {
    let name = document.getElementById('modal-prof-name').value.trim();
    const desc = document.getElementById('modal-prof-desc').value.trim();
    const cond = document.getElementById('modal-prof-cond').value.trim();
    const restore = document.getElementById('modal-prof-restore').value;

    if (!name) {
      alert('Profile name is required.');
      return;
    }

    // Strip brackets if entered
    name = name.replace('[', '').replace(']', '');

    // Check duplicate
    if (currentConfig.profiles.some(p => p.name === name)) {
      alert('A profile with this name already exists.');
      return;
    }

    currentConfig.profiles.push({
      name,
      desc,
      cond,
      restore,
      settings: {}
    });

    isDirty = true;
    updateSaveButtonState();
    closeModal();
    renderProfiles();
    showToast(`Profile [${name}] created in memory.`);
  };
}

function openEditProfileModal(index) {
  const profile = currentConfig.profiles[index];

  const bodyHTML = `
    <div class="form-group">
      <label for="modal-prof-name">Profile Name</label>
      <input type="text" id="modal-prof-name" class="form-input" value="${profile.name}" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-prof-desc">Profile Description (Optional)</label>
      <input type="text" id="modal-prof-desc" class="form-input" value="${profile.desc || ''}" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-prof-cond">Conditional Auto-Apply (Optional)</label>
      <input type="text" id="modal-prof-cond" class="form-input" value="${profile.cond || ''}" autocomplete="off">
    </div>
    <div class="form-group">
      <label for="modal-prof-restore">Restore Mode</label>
      <select id="modal-prof-restore" class="control-select" style="width:100%;">
        <option value="" ${profile.restore === '' ? 'selected' : ''}>Default (yes)</option>
        <option value="yes" ${profile.restore === 'yes' ? 'selected' : ''}>Yes</option>
        <option value="no" ${profile.restore === 'no' ? 'selected' : ''}>No</option>
      </select>
    </div>
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Cancel</button>
    <button class="modal-btn primary" id="modal-btn-save">Update Profile</button>
  `;

  openModal('Edit Profile', bodyHTML, footerHTML);

  document.getElementById('modal-btn-cancel').onclick = closeModal;
  document.getElementById('modal-btn-save').onclick = () => {
    let name = document.getElementById('modal-prof-name').value.trim().replace('[', '').replace(']', '');
    const desc = document.getElementById('modal-prof-desc').value.trim();
    const cond = document.getElementById('modal-prof-cond').value.trim();
    const restore = document.getElementById('modal-prof-restore').value;

    if (!name) {
      alert('Profile name is required.');
      return;
    }

    // Check duplicate (exclude current index)
    if (currentConfig.profiles.some((p, idx) => p.name === name && idx !== index)) {
      alert('A profile with this name already exists.');
      return;
    }

    // Update profile
    profile.name = name;
    profile.desc = desc;
    profile.cond = cond;
    profile.restore = restore;

    isDirty = true;
    updateSaveButtonState();
    closeModal();
    renderProfiles();
    showToast(`Profile [${name}] updated.`);
  };
}

function deleteProfile(index) {
  const profile = currentConfig.profiles[index];
  const confirmDelete = confirm(`Are you sure you want to completely delete profile [${profile.name}]?`);
  if (!confirmDelete) return;

  currentConfig.profiles.splice(index, 1);
  isDirty = true;
  updateSaveButtonState();
  renderProfiles();
  showToast('Profile deleted.');
}

function openAddProfileSettingModal(profileIdx) {
  const profile = currentConfig.profiles[profileIdx];

  // Build key selections (all registered keys in settings-data)
  let optHTML = '<option value="">-- Select Option --</option>';
  SETTINGS_CATEGORIES.forEach(cat => {
    cat.settings.forEach(s => {
      // Don't show options already set in profile
      if (!(s.name in profile.settings)) {
        optHTML += `<option value="${s.name}">${s.name} (${s.label})</option>`;
      }
    });
  });

  const bodyHTML = `
    <div class="form-group">
      <label for="modal-setting-key">Setting Key</label>
      <select id="modal-setting-key" class="control-select" style="width:100%;">
        ${optHTML}
      </select>
    </div>
    <div class="form-group">
      <label for="modal-setting-val">Setting Value</label>
      <input type="text" id="modal-setting-val" class="form-input" placeholder="e.g. yes or 55 or gpu-next" autocomplete="off">
    </div>
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Cancel</button>
    <button class="modal-btn primary" id="modal-btn-save">Add Setting</button>
  `;

  openModal(`Add Setting to [${profile.name}]`, bodyHTML, footerHTML);

  const selectEl = document.getElementById('modal-setting-key');
  const valInput = document.getElementById('modal-setting-val');

  selectEl.addEventListener('change', () => {
    const key = selectEl.value;
    if (!key) return;

    // Prefill default value if available
    let defVal = '';
    SETTINGS_CATEGORIES.forEach(cat => {
      const match = cat.settings.find(s => s.name === key);
      if (match) defVal = match.default;
    });
    valInput.value = defVal;
  });

  document.getElementById('modal-btn-cancel').onclick = closeModal;
  document.getElementById('modal-btn-save').onclick = () => {
    const key = selectEl.value;
    const val = valInput.value.trim();

    if (!key || val === '') {
      alert('Both Setting Key and Value are required.');
      return;
    }

    profile.settings[key] = val;
    isDirty = true;
    updateSaveButtonState();
    closeModal();
    renderProfiles();
    showToast(`Setting ${key}=${val} added to [${profile.name}].`);
  };
}

function removeSettingFromProfile(profileIdx, key) {
  const profile = currentConfig.profiles[profileIdx];
  delete profile.settings[key];
  isDirty = true;
  updateSaveButtonState();
  renderProfiles();
  showToast(`Setting ${key} removed from [${profile.name}].`);
}

// ── Presets ──────────────────────────────────────────────────────────────────

function renderPresets() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">✨ Config Presets</h2>
    <p class="tab-desc">Apply preset templates to set up video, cache, and audio settings in one click. (Click 'Save' in the header to write changes to disk).</p>
  `;
  container.appendChild(header);

  // Presets Grid
  const grid = document.createElement('div');
  grid.className = 'presets-grid';

  PRESET_PROFILES.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card';

    // Generate preview list
    let listHTML = '';
    const keys = Object.keys(preset.settings);
    keys.slice(0, 5).forEach(k => {
      listHTML += `<li><code style="font-family:var(--font-mono); font-size:11px;">${k}=${preset.settings[k]}</code></li>`;
    });
    if (keys.length > 5) {
      listHTML += `<li><span style="color:var(--text-muted); font-size:11px;">...and ${keys.length - 5} more</span></li>`;
    }

    card.innerHTML = `
      <div class="preset-header">
        <h3 class="preset-name">${preset.name}</h3>
      </div>
      <p class="preset-desc">${preset.description}</p>
      <div style="font-size:12px; margin-bottom:8px;">
        <span style="font-weight:600; color:var(--text-secondary);">Key changes:</span>
        <ul style="padding-left:18px; margin-top:4px; display:flex; flex-direction:column; gap:2px; color:var(--text-secondary);">
          ${listHTML}
        </ul>
      </div>
      <button class="preset-btn" data-preset-id="${preset.id}">Apply Preset</button>
    `;

    card.querySelector('.preset-btn').addEventListener('click', () => applyPreset(preset));

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function applyPreset(preset) {
  const confirmApply = confirm(`Are you sure you want to apply the "${preset.name}" preset? This will overwrite existing keys.`);
  if (!confirmApply) return;

  // Merge preset values
  Object.keys(preset.settings).forEach(key => {
    currentConfig.settings[key] = preset.settings[key];
  });

  isDirty = true;
  updateSaveButtonState();
  showToast(`Applied "${preset.name}" settings to memory. Press Save in header.`);
}

// ── Config Live Preview ───────────────────────────────────────────────────────

function renderPreview() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">👁️ Live Configuration Preview</h2>
    <p class="tab-desc">Preview the exact file content that will be written to disk for mpv.conf and input.conf.</p>
  `;
  container.appendChild(header);

  // Generate current string previews
  const mpvText = configParser.stringify(currentConfig);
  const inputText = inputParser.stringify(currentInputConfig);

  // Tabs structure inside preview
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <button class="header-btn" id="preview-tab-conf" style="height:36px; border-radius:8px;">mpv.conf</button>
      <button class="header-btn" id="preview-tab-input" style="height:36px; border-radius:8px;">input.conf</button>
    </div>
    <div class="preview-container">
      <div class="preview-header">
        <span class="preview-tab-label" id="preview-filename-label">mpv.conf</span>
        <button class="picker-btn" id="btn-copy-preview" style="height:28px; font-size:11px;">Copy Code</button>
      </div>
      <div class="preview-body">
        <pre><code class="preview-code" id="preview-code-block"></code></pre>
      </div>
    </div>
  `;
  container.appendChild(wrapper);

  const btnConf = document.getElementById('preview-tab-conf');
  const btnInput = document.getElementById('preview-tab-input');
  const label = document.getElementById('preview-filename-label');
  const codeBlock = document.getElementById('preview-code-block');
  const copyBtn = document.getElementById('btn-copy-preview');

  let activePreview = 'mpv';
  const selectPreview = (type) => {
    activePreview = type;
    if (type === 'mpv') {
      btnConf.classList.add('active');
      btnConf.style.borderColor = 'var(--accent-cyan)';
      btnInput.classList.remove('active');
      btnInput.style.borderColor = 'var(--border-color)';
      label.textContent = '~/.config/mpv/mpv.conf';
      codeBlock.textContent = mpvText || '# mpv.conf (Empty)';
    } else {
      btnInput.classList.add('active');
      btnInput.style.borderColor = 'var(--accent-cyan)';
      btnConf.classList.remove('active');
      btnConf.style.borderColor = 'var(--border-color)';
      label.textContent = '~/.config/mpv/input.conf';
      codeBlock.textContent = inputText || '# input.conf (Empty)';
    }
  };

  btnConf.onclick = () => selectPreview('mpv');
  btnInput.onclick = () => selectPreview('input');

  copyBtn.onclick = () => {
    const textToCopy = activePreview === 'mpv' ? mpvText : inputText;
    navigator.clipboard.writeText(textToCopy);
    showToast('Copied to clipboard!');
  };

  // Default selection
  selectPreview('mpv');
}

// ── Backups ──────────────────────────────────────────────────────────────────

async function renderBackups() {
  const container = document.getElementById('content-area');

  // Header
  const header = document.createElement('div');
  header.className = 'tab-header';
  header.innerHTML = `
    <h2 class="tab-title">💾 Backup & Restore</h2>
    <p class="tab-desc">View configuration backup history. Restoring a backup will revert settings to that point, saving a timestamped backup of your current config beforehand.</p>
  `;
  container.appendChild(header);

  const listContainer = document.createElement('div');
  listContainer.className = 'backups-list';

  try {
    const res = await api.getBackups();
    if (!res.success || !res.backups || res.backups.length === 0) {
      listContainer.innerHTML = `
        <div class="setting-card">
          <div class="setting-info" style="text-align: center; padding: 20px;">
            <span style="font-size: 24px;">💾</span>
            <h3 style="margin-top: 10px;">No backups available</h3>
            <p class="setting-description" style="margin-top: 5px;">Backups are created automatically every time you click "Save".</p>
          </div>
        </div>
      `;
      container.appendChild(listContainer);
      return;
    }

    res.backups.forEach(backup => {
      const item = document.createElement('div');
      item.className = 'backup-item';

      const sizeKB = (backup.size / 1024).toFixed(2);
      const dateStr = new Date(backup.modified).toLocaleString();

      item.innerHTML = `
        <div class="backup-info">
          <span class="backup-icon">📄</span>
          <div class="backup-details">
            <span class="backup-filename">${backup.name}</span>
            <div class="backup-meta-row">
              <span>Size: ${sizeKB} KB</span>
              <span>•</span>
              <span>Saved on: ${dateStr}</span>
            </div>
          </div>
        </div>
        <button class="btn-restore" data-file="${backup.name}">Restore</button>
      `;

      item.querySelector('.btn-restore').addEventListener('click', () => triggerRestore(backup.name));

      listContainer.appendChild(item);
    });
  } catch (err) {
    listContainer.innerHTML = `<div class="toast error">${err.message}</div>`;
  }

  container.appendChild(listContainer);
}

async function triggerRestore(filename) {
  const confirmRestore = confirm(`Are you sure you want to restore the backup file "${filename}"? Your current file will be backed up.`);
  if (!confirmRestore) return;

  try {
    const res = await api.restoreBackup(filename);
    if (res.success) {
      showToast('Config backup restored successfully!');
      // Reload in memory
      await loadConfigs();
      // Rerender active tab if we are on backups
      renderContent();
    } else {
      showToast('Restore failed: ' + res.error, 'error');
    }
  } catch (err) {
    showToast('Failed to restore: ' + err.message, 'error');
  }
}

// ── Save Operation ────────────────────────────────────────────────────────────

async function saveConfigs() {
  try {
    // 1. Write mpv.conf
    const confString = configParser.stringify(currentConfig);
    const confRes = await api.writeConfig(confString);
    
    // 2. Write input.conf
    const inputString = inputParser.stringify(currentInputConfig);
    const inputRes = await api.writeInputConfig(inputString);

    if (confRes.success && inputRes.success) {
      isDirty = false;
      updateSaveButtonState();
      
      const backupText = confRes.backup ? `Backup created: ${confRes.backup}` : 'Saved!';
      showToast(`Configurations saved! ${backupText}`);
    } else {
      const err = (!confRes.success ? confRes.error : '') + ' ' + (!inputRes.success ? inputRes.error : '');
      showToast('Error saving: ' + err, 'error');
    }
  } catch (err) {
    showToast('Failed to save configuration: ' + err.message, 'error');
  }
}

// ── Launch MPV Flow ───────────────────────────────────────────────────────────

async function launchMpvFlow() {
  const isResumeEnabled = currentConfig.settings['save-position-on-quit'] === 'yes';

  const bodyHTML = `
    <div style="font-size:14px; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
      Launch MPV to test your current saved configuration settings immediately.
    </div>
    <div class="form-group" style="margin-bottom:12px;">
      <label>Play Mode</label>
      <div style="display:flex; gap:16px; margin-top:4px;">
        <label style="display:flex; align-items:center; gap:6px; font-weight:normal; cursor:pointer;">
          <input type="radio" name="launch-mode" id="launch-mode-empty" checked> Launch Empty Player
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-weight:normal; cursor:pointer;">
          <input type="radio" name="launch-mode" id="launch-mode-file"> Select file to play...
        </label>
      </div>
    </div>
    <div class="form-group" style="margin-bottom:12px; margin-top:14px;">
      <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
        <input type="checkbox" id="launch-resume-playback" ${isResumeEnabled ? 'checked' : ''}> 
        <span style="font-size:13px; font-weight:500;">Resume Playback (Start where video last stopped)</span>
      </label>
    </div>
    
    ${systemInfo ? `
      <div class="profile-meta" style="margin-top:16px;">
        <div style="font-weight:600; color:var(--text-primary); font-size:12px; margin-bottom:4px;">Detected System Info:</div>
        <div class="profile-meta-item"><span class="profile-meta-label" style="width:120px;">GPU:</span><span class="profile-meta-val" style="word-break:break-all;">${systemInfo.gpu}</span></div>
        <div class="profile-meta-item"><span class="profile-meta-label" style="width:120px;">MPV Version:</span><span class="profile-meta-val">${systemInfo.mpvVersion.split('\n')[0]}</span></div>
        <div class="profile-meta-item"><span class="profile-meta-label" style="width:120px;">OS Platform:</span><span class="profile-meta-val">${systemInfo.platform}</span></div>
      </div>
    ` : ''}
  `;

  const footerHTML = `
    <button class="modal-btn" id="modal-btn-cancel">Close</button>
    <button class="modal-btn primary" id="modal-btn-launch">Launch MPV</button>
  `;

  openModal('Quick Launch Player', bodyHTML, footerHTML);

  document.getElementById('modal-btn-cancel').onclick = closeModal;

  const btnLaunch = document.getElementById('modal-btn-launch');
  btnLaunch.onclick = async () => {
    const isEmptyMode = document.getElementById('launch-mode-empty').checked;
    const resumePlayback = document.getElementById('launch-resume-playback').checked;
    let launchArgs = [];

    // Sync back to config settings
    const newResumeState = resumePlayback ? 'yes' : 'no';
    if (currentConfig.settings['save-position-on-quit'] !== newResumeState) {
      currentConfig.settings['save-position-on-quit'] = newResumeState;
      isDirty = true;
      updateSaveButtonState();
    }

    if (resumePlayback) {
      launchArgs.push('--save-position-on-quit=yes');
    } else {
      launchArgs.push('--save-position-on-quit=no');
    }

    if (!isEmptyMode) {
      closeModal(); // Hide modal during picker
      const fileRes = await api.selectFile({
        title: 'Select video/audio file to play',
      });

      if (!fileRes.success || !fileRes.path) {
        // Picker canceled or failed, return
        showToast('Playback canceled: No file selected');
        return;
      }
      launchArgs.push(fileRes.path);
    }

    try {
      showToast('Launching MPV player...');
      const res = await api.launchMpv(launchArgs);
      if (res.success) {
        closeModal();
      } else {
        showToast('Failed to launch MPV: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
}

// ── Global Search and Highlights ──────────────────────────────────────────────

function handleGlobalSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsDiv = document.getElementById('search-results');

  if (!query) {
    resultsDiv.classList.add('hidden');
    resultsDiv.innerHTML = '';
    return;
  }

  const matches = [];

  SETTINGS_CATEGORIES.forEach(cat => {
    cat.settings.forEach(s => {
      if (s.name.toLowerCase().includes(query) || 
          s.label.toLowerCase().includes(query) || 
          s.description.toLowerCase().includes(query)) {
        matches.push({
          categoryName: cat.title,
          categoryId: cat.id,
          setting: s
        });
      }
    });
  });

  // Limit to 6 results
  const sliced = matches.slice(0, 6);

  if (sliced.length === 0) {
    resultsDiv.innerHTML = `<div class="search-no-results">No settings match "${query}"</div>`;
  } else {
    resultsDiv.innerHTML = '';
    sliced.forEach(match => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="search-result-title">
          <span>${match.setting.label} <code style="font-family:var(--font-mono); font-size:11px; background:rgba(255,255,255,0.06); padding:1px 4px; border-radius:3px;">${match.setting.name}</code></span>
          <span class="search-result-category">${match.categoryName.replace(/[^\w\s]/g, '').trim()}</span>
        </div>
        <div class="search-result-desc">${match.setting.description}</div>
      `;

      item.addEventListener('click', () => {
        resultsDiv.classList.add('hidden');
        document.getElementById('search-input').value = '';
        
        // Switch tab to category
        switchTab(match.categoryId);

        // Highlight card
        setTimeout(() => {
          const card = document.getElementById(`setting-card-${match.setting.name}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Modern Web Animations flash effect
            card.animate([
              { boxShadow: '0 0 0px transparent', borderColor: 'var(--border-color)', background: 'var(--bg-card)' },
              { boxShadow: '0 0 30px var(--accent-purple)', borderColor: 'var(--accent-purple)', background: 'rgba(168, 85, 247, 0.15)' },
              { boxShadow: '0 0 0px transparent', borderColor: 'var(--border-color)', background: 'var(--bg-card)' }
            ], {
              duration: 2000,
              easing: 'ease-in-out'
            });
          }
        }, 100);
      });

      resultsDiv.appendChild(item);
    });
  }

  resultsDiv.classList.remove('hidden');
}

// ── Helper UI Elements ────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-msg">${message}</span>
    <span class="toast-close">&times;</span>
  `;
  container.appendChild(toast);

  // Trigger animation slide-in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Auto-remove toast after 4s
  const removeTimer = setTimeout(() => {
    fadeAndRemove(toast);
  }, 4500);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(removeTimer);
    fadeAndRemove(toast);
  });
}

function fadeAndRemove(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(15px)';
  setTimeout(() => {
    el.remove();
  }, 400);
}

function openModal(title, bodyHTML, footerHTML, onClose = null) {
  const overlay = document.getElementById('modal-overlay');
  
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;

  overlay.classList.remove('hidden');

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
      if (onClose) onClose();
    }
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
  document.getElementById('modal-footer').innerHTML = '';
}

// ── Update Checker ───────────────────────────────────────────────────────────
async function initUpdateChecker() {
  const btnCheck = document.getElementById('btn-update-check');
  const indicator = document.getElementById('update-indicator');
  const currentVersion = '1.0.0'; // Current release tag

  if (!btnCheck || !indicator) return;

  // Click handler for manual check
  btnCheck.addEventListener('click', async () => {
    btnCheck.disabled = true;
    btnCheck.textContent = 'Checking...';
    
    try {
      const result = await api.checkForUpdates();
      
      btnCheck.disabled = false;
      btnCheck.textContent = 'Check for updates';

      if (result.success && result.latestVersion) {
        const isNew = isNewerVersion(currentVersion, result.latestVersion);
        if (isNew) {
          showUpdateIndicator(result.latestVersion, result.releaseUrl);
          showToast(`New version available: ${result.latestVersion}!`, 'success');
        } else {
          showToast(`You are running the latest version (v${currentVersion}).`, 'info');
        }
      } else {
        showToast('Could not check for updates. Please check connection.', 'error');
      }
    } catch (err) {
      btnCheck.disabled = false;
      btnCheck.textContent = 'Check for updates';
      showToast('Error checking for updates: ' + err.message, 'error');
    }
  });

  // Click handler for the update indicator badge
  indicator.addEventListener('click', () => {
    const url = indicator.getAttribute('data-url');
    if (url) {
      api.openExternal(url);
    }
  });

  // Run a quiet check on startup
  try {
    const result = await api.checkForUpdates();
    if (result.success && result.latestVersion) {
      if (isNewerVersion(currentVersion, result.latestVersion)) {
        showUpdateIndicator(result.latestVersion, result.releaseUrl);
      }
    }
  } catch (err) {
    console.error('Quiet update check failed:', err);
  }
}

function showUpdateIndicator(version, url) {
  const btnCheck = document.getElementById('btn-update-check');
  const indicator = document.getElementById('update-indicator');
  
  if (btnCheck) btnCheck.classList.add('hidden');
  if (indicator) {
    indicator.classList.remove('hidden');
    indicator.setAttribute('data-url', url);
    indicator.title = `New version ${version} available! Click to download.`;
    indicator.textContent = `✨ Update to ${version}`;
  }
}

function isNewerVersion(current, latest) {
  const clean = (v) => v.replace(/^v/, '').split('.').map(Number);
  const cParts = clean(current);
  const lParts = clean(latest);
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const cVal = cParts[i] || 0;
    const lVal = lParts[i] || 0;
    if (lVal > cVal) return true;
    if (cVal > lVal) return false;
  }
  return false;
}

