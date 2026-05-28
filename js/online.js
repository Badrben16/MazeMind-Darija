// ═══════════════════════════════════════════════
//  ONLINE — Firebase Realtime Multiplayer 🌐
// ═══════════════════════════════════════════════

const Online = (() => {

  // ── Fill in your Firebase config here ──────────
  const FIREBASE_CONFIG = {
    apiKey:            "VOTRE_API_KEY",
    authDomain:        "VOTRE_PROJECT.firebaseapp.com",
    databaseURL:       "https://VOTRE_PROJECT-default-rtdb.firebaseio.com",
    projectId:         "VOTRE_PROJECT_ID",
    storageBucket:     "VOTRE_PROJECT.appspot.com",
    messagingSenderId: "VOTRE_SENDER_ID",
    appId:             "VOTRE_APP_ID",
  };

  const PROFILES = [
    { color:'#38A0FF', emoji:'🧔', startX:0,  startY:0  },
    { color:'#FF3333', emoji:'🦁', startX:13, startY:0  },
    { color:'#2ECC71', emoji:'🌿', startX:0,  startY:13 },
    { color:'#FF8C00', emoji:'🌙', startX:13, startY:13 },
  ];

  let db       = null;
  let roomRef  = null;
  let myId     = 'p_' + Math.random().toString(36).substr(2,8);
  let roomCode = null;
  let _isHost  = false;
  let _seed    = null;
  let _callbacks = {};

  // ── Init ─────────────────────────────────────
  function init() {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK non chargé');
      return false;
    }
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    return true;
  }

  function configured() {
    return FIREBASE_CONFIG.apiKey !== 'VOTRE_API_KEY';
  }

  // ── Room creation ─────────────────────────────
  async function createRoom(playerName) {
    const code = _genCode();
    roomCode   = code;
    _isHost    = true;
    _seed      = Math.floor(Math.random() * 1e8);
    roomRef    = db.ref('rooms/' + code);

    const profile = PROFILES[0];
    await roomRef.set({
      seed: _seed, started: false, hostId: myId,
      created: firebase.database.ServerValue.TIMESTAMP,
    });
    await roomRef.child('players/' + myId).set({
      name: playerName, emoji: profile.emoji, color: profile.color,
      joinOrder: 0, x: profile.startX, y: profile.startY,
      score: 0, frozen: false, frozenUntil: 0,
      helpActive: false, helpUntil: 0, online: true,
    });
    roomRef.child('players/' + myId).onDisconnect().update({ online: false });
    _setupListeners();
    return code;
  }

  // ── Room join ─────────────────────────────────
  async function joinRoom(code, playerName) {
    roomCode = code.toUpperCase().trim();
    _isHost  = false;
    roomRef  = db.ref('rooms/' + roomCode);

    const snap = await roomRef.once('value');
    if (!snap.exists()) throw new Error('❌ Code invalide — salle introuvable');
    const data = snap.val();
    if (data.started)  throw new Error('⏳ Partie déjà commencée');
    const existing = Object.keys(data.players || {});
    if (existing.length >= 4) throw new Error('🚫 Salle complète (4/4)');

    const order   = existing.length;
    const profile = PROFILES[order];
    _seed = data.seed;

    await roomRef.child('players/' + myId).set({
      name: playerName, emoji: profile.emoji, color: profile.color,
      joinOrder: order, x: profile.startX, y: profile.startY,
      score: 0, frozen: false, frozenUntil: 0,
      helpActive: false, helpUntil: 0, online: true,
    });
    roomRef.child('players/' + myId).onDisconnect().update({ online: false });
    _setupListeners();
  }

  // ── Listeners ─────────────────────────────────
  function _setupListeners() {
    roomRef.child('players').on('value', snap => {
      _callbacks.onPlayers && _callbacks.onPlayers(snap.val() || {});
    });
    roomRef.child('started').on('value', snap => {
      if (snap.val() === true) _callbacks.onStart && _callbacks.onStart();
    });
    roomRef.child('lootedCells').on('child_added', snap => {
      const [x, y] = snap.key.split('_').map(Number);
      _callbacks.onLoot && _callbacks.onLoot(x, y);
    });
    roomRef.child('events').limitToLast(10).on('child_added', snap => {
      const ev = snap.val();
      if (ev && ev.from !== myId) _callbacks.onEvent && _callbacks.onEvent(ev);
    });
    roomRef.child('gameOver').on('value', snap => {
      if (snap.val()) _callbacks.onGameOver && _callbacks.onGameOver(snap.val());
    });
  }

  // ── Host starts ───────────────────────────────
  async function startGame() {
    if (!_isHost || !roomRef) return;
    await roomRef.child('started').set(true);
  }

  // ── In-game sync ──────────────────────────────
  function sendMove(x, y) {
    roomRef?.child('players/' + myId).update({ x, y });
  }

  function sendScore(score) {
    roomRef?.child('players/' + myId + '/score').set(score);
  }

  function sendState(state) {
    roomRef?.child('players/' + myId).update(state);
  }

  // Returns true if WE claimed the cell (transaction), false if already looted
  async function claimCell(x, y) {
    if (!roomRef) return true; // offline fallback
    const ref = roomRef.child('lootedCells/' + x + '_' + y);
    const result = await ref.transaction(cur => cur === null ? true : undefined);
    return result.committed;
  }

  function sendEvent(type, data) {
    roomRef?.child('events').push({
      type, data, from: myId,
      ts: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  function sendGameOver(winnerName) {
    if (!_isHost) return;
    roomRef?.child('gameOver').set({ winnerName, ts: Date.now() });
  }

  function cleanup() {
    roomRef?.off();
    roomRef = null;
  }

  // ── Helpers ───────────────────────────────────
  function _genCode() {
    return Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  function on(event, fn) { _callbacks[event] = fn; }

  return {
    init, configured, createRoom, joinRoom, startGame,
    sendMove, sendScore, sendState, claimCell, sendEvent, sendGameOver, cleanup,
    on,
    getMyId:   () => myId,
    getCode:   () => roomCode,
    getSeed:   () => _seed,
    isHost:    () => _isHost,
  };
})();
