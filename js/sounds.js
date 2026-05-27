// ═══════════════════════════════════════════════
//  SOUNDS — Web Audio API (no external files)
// ═══════════════════════════════════════════════

const Sounds = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, type, duration, vol = 0.3, startTime = 0) {
    const c = getCtx();
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + startTime);
    gain.gain.setValueAtTime(vol, c.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startTime + duration);
    osc.start(c.currentTime + startTime);
    osc.stop(c.currentTime + startTime + duration + 0.05);
  }

  function noise(duration, vol = 0.15) {
    const c = getCtx();
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src  = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    src.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.start(); src.stop(c.currentTime + duration + 0.05);
  }

  const play = {
    move()      { if(muted)return; tone(220, 'sine', 0.05, 0.08); },
    question()  { if(muted)return; tone(440,'triangle',0.1,0.2); tone(550,'triangle',0.1,0.15,0.1); },
    correct()   { if(muted)return; [523,659,784].forEach((f,i)=>tone(f,'sine',0.15,0.25,i*0.1)); },
    wrong()     { if(muted)return; tone(200,'sawtooth',0.3,0.2); tone(150,'sawtooth',0.3,0.15,0.15); },
    bonus()     { if(muted)return; tone(660,'sine',0.2,0.3); tone(880,'sine',0.15,0.2,0.1); },
    trap()      { if(muted)return; noise(0.3,0.25); tone(100,'sawtooth',0.3,0.2); },
    chest()     { if(muted)return; tone(330,'triangle',0.15,0.2); },
    victory()   { if(muted)return; [523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.25,0.3,i*0.12)); },
    punish()    { if(muted)return; noise(0.15,0.3); tone(80,'sawtooth',0.4,0.25); },
    pardon()    { if(muted)return; tone(523,'sine',0.2,0.2); tone(784,'sine',0.2,0.15,0.15); },
    help()      { if(muted)return; tone(440,'sine',0.1,0.15); tone(554,'sine',0.1,0.15,0.1); tone(659,'sine',0.15,0.2,0.2); },
    taunt()     { if(muted)return; [300,250,300,200].forEach((f,i)=>tone(f,'square',0.08,0.1,i*0.08)); },
    freeze()    { if(muted)return; tone(180,'triangle',0.5,0.3); },
    chat()      { if(muted)return; tone(600,'sine',0.08,0.1); },
    tick()      { if(muted)return; tone(440,'sine',0.05,0.05); },
    royal()     { if(muted)return; [523,659,784,1047].forEach((f,i)=>tone(f,'triangle',0.35,0.3,i*0.18)); },
    wrongKing() { if(muted)return; tone(180,'sawtooth',0.4,0.25); tone(120,'sawtooth',0.5,0.2,0.2); },
  };

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { play, toggleMute, get muted() { return muted; } };
})();
