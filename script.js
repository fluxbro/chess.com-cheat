(function () {
  if (document.getElementById('__chess-hack-root')) return;

  const state = {
    running: false,
    depth: 15,
    maxElo: 3200,
    autoMove: false,
    moveDelay: 500,
    maxRandomDelay: 300,
    side: 'auto',
    intervalId: null,
    engine: null,
    pendingMove: null,
    lastFen: '',
    searching: false,
  };

  const root = document.createElement('div');
  root.id = '__chess-hack-root';
  root.innerHTML = `
<style>
  #__chess-hack-root * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
  #chh-panel {
    position: fixed; top: 60px; left: 20px; z-index: 999999;
    background: rgba(18,22,30,0.95); border: 1px solid rgba(100,140,220,0.35);
    border-radius: 10px; width: 320px; color: #ccd6f6;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6); user-select: none;
  }
  #chh-titlebar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; cursor: grab; background: rgba(255,255,255,0.04);
    border-radius: 10px 10px 0 0; border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  #chh-titlebar:active { cursor: grabbing; }
  #chh-title { font-size: 13px; font-weight: 600; letter-spacing: .5px; color: #7eb3ff; }
  #chh-close {
    background: none; border: none; color: #7eb3ff; cursor: pointer;
    font-size: 16px; line-height: 1; padding: 0 2px; opacity: .7;
  }
  #chh-close:hover { opacity: 1; }
  #chh-body { padding: 10px 14px; }
  .chh-row { display: flex; align-items: center; margin-bottom: 9px; gap: 8px; }
  .chh-label { font-size: 12px; color: #8899bb; white-space: nowrap; width: 110px; flex-shrink: 0; }
  .chh-value { font-size: 12px; color: #ccd6f6; width: 42px; text-align: right; flex-shrink: 0; }
  .chh-range { flex: 1; accent-color: #7eb3ff; cursor: pointer; min-width: 0; }
  .chh-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .chh-toggle input { opacity: 0; width: 0; height: 0; }
  .chh-toggle-slider {
    position: absolute; inset: 0; background: #2a3a52; border-radius: 20px; cursor: pointer; transition: background .2s;
  }
  .chh-toggle-slider:before {
    content: ''; position: absolute; width: 14px; height: 14px;
    left: 3px; top: 3px; background: #5a7aaa; border-radius: 50%; transition: transform .2s, background .2s;
  }
  .chh-toggle input:checked + .chh-toggle-slider { background: #2a5cad; }
  .chh-toggle input:checked + .chh-toggle-slider:before { transform: translateX(16px); background: #7eb3ff; }
  .chh-radios { display: flex; gap: 8px; }
  .chh-radio-label { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #8899bb; cursor: pointer; }
  .chh-radio-label input { accent-color: #7eb3ff; cursor: pointer; }
  #chh-status {
    margin-top: 6px; padding: 7px 10px; border-radius: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  }
  #chh-bestmove { font-size: 13px; color: #7eb3ff; font-weight: 600; }
  #chh-eval { font-size: 11px; color: #8899bb; margin-top: 3px; }
  #chh-start {
    margin-top: 10px; width: 100%; padding: 8px;
    background: #1a3a6a; border: 1px solid #2a5cad; color: #7eb3ff;
    border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
    letter-spacing: .3px; transition: background .15s;
  }
  #chh-start:hover { background: #1f4a8a; }
  #chh-start.running { background: #3a1a1a; border-color: #8a3a2a; color: #ff8877; }
  #chh-start.running:hover { background: #4a2020; }
  hr.chh-hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 8px 0; }
  .cheat-sq-from { background: rgba(0,200,100,0.55) !important; }
  .cheat-sq-to   { background: rgba(0,160,255,0.55) !important; }
</style>
<div id="chh-panel">
  <div id="chh-titlebar">
    <span id="chh-title">♟ Chess Hack</span>
    <button id="chh-close">✕</button>
  </div>
  <div id="chh-body">
    <div class="chh-row">
      <span class="chh-label">Enabled</span>
      <label class="chh-toggle"><input type="checkbox" id="chh-enabled"><span class="chh-toggle-slider"></span></label>
    </div>
    <div class="chh-row">
      <span class="chh-label">Side</span>
      <div class="chh-radios">
        <label class="chh-radio-label"><input type="radio" name="side" value="auto" checked> Auto</label>
        <label class="chh-radio-label"><input type="radio" name="side" value="w"> White</label>
        <label class="chh-radio-label"><input type="radio" name="side" value="b"> Black</label>
      </div>
    </div>
    <hr class="chh-hr">
    <div class="chh-row">
      <span class="chh-label">Depth</span>
      <input type="range" id="chh-depth" class="chh-range" min="1" max="30" step="1" value="15">
      <span class="chh-value" id="chh-depth-v">15</span>
    </div>
    <div class="chh-row">
      <span class="chh-label">Max Elo</span>
      <input type="range" id="chh-elo" class="chh-range" min="500" max="3200" step="50" value="3200">
      <span class="chh-value" id="chh-elo-v">∞</span>
    </div>
    <hr class="chh-hr">
    <div class="chh-row">
      <span class="chh-label">Auto Move</span>
      <label class="chh-toggle"><input type="checkbox" id="chh-auto"><span class="chh-toggle-slider"></span></label>
    </div>
    <div class="chh-row">
      <span class="chh-label">Move Delay</span>
      <input type="range" id="chh-delay" class="chh-range" min="0" max="5000" step="100" value="500">
      <span class="chh-value" id="chh-delay-v">0.5s</span>
    </div>
    <div class="chh-row">
      <span class="chh-label">Max Rand Delay</span>
      <input type="range" id="chh-rdel" class="chh-range" min="0" max="3000" step="100" value="300">
      <span class="chh-value" id="chh-rdel-v">0.3s</span>
    </div>
    <hr class="chh-hr">
    <div id="chh-status">
      <div id="chh-bestmove">—</div>
      <div id="chh-eval">Waiting…</div>
    </div>
    <button id="chh-start">▶ Start</button>
  </div>
</div>`;

  document.body.appendChild(root);

  const panel      = root.querySelector('#chh-panel');
  const titlebar   = root.querySelector('#chh-titlebar');
  const enabledChk = root.querySelector('#chh-enabled');
  const startBtn   = root.querySelector('#chh-start');
  const depthEl    = root.querySelector('#chh-depth');
  const depthV     = root.querySelector('#chh-depth-v');
  const eloEl      = root.querySelector('#chh-elo');
  const eloV       = root.querySelector('#chh-elo-v');
  const autoEl     = root.querySelector('#chh-auto');
  const delayEl    = root.querySelector('#chh-delay');
  const delayV     = root.querySelector('#chh-delay-v');
  const rdelEl     = root.querySelector('#chh-rdel');
  const rdelV      = root.querySelector('#chh-rdel-v');
  const bestMoveEl = root.querySelector('#chh-bestmove');
  const evalEl     = root.querySelector('#chh-eval');

  let drag = { on: false, ox: 0, oy: 0 };
  titlebar.addEventListener('mousedown', e => {
    drag.on = true;
    const r = panel.getBoundingClientRect();
    drag.ox = e.clientX - r.left;
    drag.oy = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!drag.on) return;
    panel.style.left = (e.clientX - drag.ox) + 'px';
    panel.style.top  = (e.clientY - drag.oy) + 'px';
  });
  document.addEventListener('mouseup', () => { drag.on = false; });
  root.querySelector('#chh-close').addEventListener('click', () => { stopHack(); root.remove(); });

  depthEl.addEventListener('input', () => { state.depth = +depthEl.value; depthV.textContent = state.depth; });
  eloEl.addEventListener('input', () => { state.maxElo = +eloEl.value; eloV.textContent = state.maxElo >= 3200 ? '∞' : state.maxElo; });
  autoEl.addEventListener('change', () => { state.autoMove = autoEl.checked; });
  delayEl.addEventListener('input', () => { state.moveDelay = +delayEl.value; delayV.textContent = (state.moveDelay/1000).toFixed(1)+'s'; });
  rdelEl.addEventListener('input', () => { state.maxRandomDelay = +rdelEl.value; rdelV.textContent = (state.maxRandomDelay/1000).toFixed(1)+'s'; });
  root.querySelectorAll('input[name="side"]').forEach(r => r.addEventListener('change', () => { state.side = r.value; }));
  enabledChk.addEventListener('change', () => { enabledChk.checked ? startHack() : stopHack(); });
  startBtn.addEventListener('click', () => { state.running ? stopHack() : startHack(); });

  const COL = { a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8 };

  function getColour() {
    if (state.side !== 'auto') return state.side;
    const cb = document.querySelector('wc-chess-board');
    return cb && cb.classList.contains('flipped') ? 'b' : 'w';
  }

  function getFen() {
    let fen = '';
    for (let i = 8; i >= 1; i--) {
      for (let j = 1; j <= 8; j++) {
        if (j === 1 && i !== 8) fen += '/';
        let piece = null;
        const el = document.querySelector(`.piece.square-${j}${i}`);
        if (el) for (const c of el.classList) if (c.length === 2) piece = c;
        if (!piece) {
          const last = fen.slice(-1);
          fen = !isNaN(+last) ? fen.slice(0,-1)+(+last+1) : fen+'1';
        } else {
          fen += piece[0]==='w' ? piece[1].toUpperCase() : piece[1];
        }
      }
    }
    return fen;
  }

  function clearHighlights() {
    document.querySelectorAll('.cheat-sq-from,.cheat-sq-to').forEach(e => e.remove());
  }

  function showHighlights(move) {
    const cb = document.querySelector('wc-chess-board');
    if (!cb) return;
    clearHighlights();
    const a = move.split('');
    const h1 = document.createElement('div');
    h1.className = `highlight cheat-sq-from square-${COL[a[0]]}${a[1]}`;
    const h2 = document.createElement('div');
    h2.className = `highlight cheat-sq-to square-${COL[a[2]]}${a[3]}`;
    cb.appendChild(h1);
    cb.appendChild(h2);
  }

  function squareCenter(col, row) {
    const cb = document.querySelector('wc-chess-board');
    if (!cb) return null;
    const r = cb.getBoundingClientRect();
    const sq = r.width / 8;
    const flipped = cb.classList.contains('flipped');
    return {
      x: flipped ? r.left+(8-col+0.5)*sq : r.left+(col-0.5)*sq,
      y: flipped ? r.top+(row-0.5)*sq    : r.top+(8-row+0.5)*sq,
    };
  }

  function clickAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(type =>
      el.dispatchEvent(new MouseEvent(type, { bubbles:true, cancelable:true, clientX:x, clientY:y, view:window }))
    );
  }

  function executeMove(move) {
    const a = move.split('');
    const from = squareCenter(COL[a[0]], +a[1]);
    const to   = squareCenter(COL[a[2]], +a[3]);
    if (!from || !to) return;
    clickAt(from.x, from.y);
    setTimeout(() => {
      clickAt(to.x, to.y);
      if (a[4]) {
        setTimeout(() => {
          const q = document.querySelector('.promotion-piece.q,[data-piece="q"],.promotion-menu [class*="wq"],[class*="bq"]');
          if (q) q.click();
        }, 400);
      }
    }, 150);
  }

  function sendToEngine(fen) {
    if (!state.engine) return;
    if (state.searching) {
      state.engine.postMessage('stop');
    }
    state.searching = true;
    if (state.maxElo < 3200) {
      state.engine.postMessage('setoption name UCI_LimitStrength value true');
      state.engine.postMessage(`setoption name UCI_Elo value ${state.maxElo}`);
    } else {
      state.engine.postMessage('setoption name UCI_LimitStrength value false');
    }
    state.engine.postMessage(`position fen ${fen}`);
    state.engine.postMessage(`go depth ${state.depth} movetime 3000`);
  }

  function startHack() {
    if (state.running) return;
    const cb = document.querySelector('wc-chess-board');
    if (!cb) { alert('No chess board found. Open a Chess.com game first.'); return; }

    state.running = true;
    state.searching = false;
    enabledChk.checked = true;
    startBtn.textContent = '■ Stop';
    startBtn.classList.add('running');
    bestMoveEl.textContent = 'Calculating…';
    evalEl.textContent = 'Engine starting…';

    state.lastFen = getFen() + ' ' + getColour();
    state.engine = new Worker('/bundles/app/js/vendor/jschessengine/stockfish.asm.1abfa10c.js');

    state.engine.onmessage = e => {
      const msg = e.data;
      if (typeof msg !== 'string') return;

      if (msg.startsWith('info') && msg.includes('score cp')) {
        const m = msg.match(/score cp (-?\d+)/);
        if (m) evalEl.textContent = `Eval: ${+m[1] >= 0 ? '+' : ''}${(+m[1]/100).toFixed(2)}`;
      }

      if (msg.startsWith('bestmove')) {
        state.searching = false;
        const move = msg.split(' ')[1];
        if (!move || move === '(none)') return;
        const a = move.split('');
        bestMoveEl.textContent = `Best: ${a[0]}${a[1]} → ${a[2]}${a[3]}${a[4] ? ' ('+a[4]+')' : ''}`;
        showHighlights(move);
        if (state.autoMove && state.running) {
          const delay = state.moveDelay + Math.floor(Math.random() * (state.maxRandomDelay + 1));
          state.pendingMove = setTimeout(() => { if (state.running) executeMove(move); }, delay);
        }
      }
    };

    sendToEngine(state.lastFen);

    state.intervalId = setInterval(() => {
      if (!state.running) return;
      const newFen = getFen() + ' ' + getColour();
      if (newFen !== state.lastFen) {
        state.lastFen = newFen;
        evalEl.textContent = 'Recalculating…';
        sendToEngine(newFen);
      }
    }, 300);
  }

  function stopHack() {
    state.running = false;
    if (state.engine) state.engine.postMessage('stop');
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    if (state.pendingMove) { clearTimeout(state.pendingMove); state.pendingMove = null; }
    if (state.engine) { state.engine.terminate(); state.engine = null; }
    state.searching = false;
    clearHighlights();
    enabledChk.checked = false;
    startBtn.textContent = '▶ Start';
    startBtn.classList.remove('running');
    bestMoveEl.textContent = '—';
    evalEl.textContent = 'Stopped.';
  }

})();