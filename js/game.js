// ═══════════════════════════════════════════════
//  GAME — نسخة الدارجة 🇲🇦
// ═══════════════════════════════════════════════

const Game = (() => {

  const PLAYER_CONFIGS = [
    { id:'p1', idx:0, team:0, teamName:'الفرقة الزرقا', color:'#38A0FF', label:'ZQSD',   emoji:'🧔',
      move:{ up:['z','Z'], down:['s','S'], left:['q','Q'], right:['d','D'] },
      lobby:{ join:['z','Z','q','Q','s','S','d','D'], prev:['q','Q'], next:['d','D'], confirm:['s','S'] } },
    { id:'p2', idx:1, team:0, teamName:'الفرقة الزرقا', color:'#00CFFF', label:'TFGH',   emoji:'👒',
      move:{ up:['t','T'], down:['g','G'], left:['f','F'], right:['h','H'] },
      lobby:{ join:['t','T','f','F','g','G','h','H'], prev:['f','F'], next:['h','H'], confirm:['g','G'] } },
    { id:'p3', idx:2, team:1, teamName:'الفرقة الحمرا', color:'#FF3333', label:'↑↓←→',  emoji:'🦁',
      move:{ up:['ArrowUp'], down:['ArrowDown'], left:['ArrowLeft'], right:['ArrowRight'] },
      lobby:{ join:['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'], prev:['ArrowLeft'], next:['ArrowRight'], confirm:['ArrowDown'] } },
    { id:'p4', idx:3, team:1, teamName:'الفرقة الحمرا', color:'#FF8C00', label:'IJKL',   emoji:'🌙',
      move:{ up:['i','I'], down:['k','K'], left:['j','J'], right:['l','L'] },
      lobby:{ join:['i','I','j','J','k','K','l','L'], prev:['j','J'], next:['l','L'], confirm:['k','K'] } },
  ];

  const TEAM_NAMES  = ['الفرقة الزرقا 🔵', 'الفرقة الحمرا 🔴'];
  const TEAM_COLORS = ['#38A0FF', '#FF3333'];

  const SIZE_CONFIG = {
    small:  { cols:8,  rows:8  },
    medium: { cols:14, rows:14 },
    large:  { cols:22, rows:22 },
  };
  const DIFF_CONFIG = {
    easy:   { time:420, trapChance:6,  bonusChance:14 },
    normal: { time:300, trapChance:12, bonusChance:10 },
    hard:   { time:180, trapChance:20, bonusChance:6  },
  };

  const TRAP_MSGS = [
    "⚠️ الإمبوتياج! -30 نقطة",
    "☠️ المفتشية! -30 نقطة",
    "😭 كراء الدار زاد! -30",
    "🚧 الباراج! -30 نقطة",
    "📝 مصلحة — ارجع غدا! -30",
    "💸 الضريبة جات! -30 نقطة",
    "🏛️ المكتب مسدود — رجع بكري! -30",
  ];

  // Fixed config — medium maze, hard difficulty
  const FIXED_SIZE = 'medium';
  const FIXED_DIFF = 'hard';
  // Minimum points required to exit the maze
  const MIN_EXIT_SCORE = 200;

  // Player names entered by users
  let playerNames = ['', '', '', ''];

  let numPlayers=1, currentScreen='intro';
  let selectedSize=FIXED_SIZE, selectedDiff=FIXED_DIFF;
  let maze=null, renderer=null, players=[], scores=[];
  let timeLeft=300, timerInterval=null, animFrame=null, animTime=0;
  let paused=false, questionActive=false;
  let cdInterval=null, victoryData=null;
  const keys={}, moveAccum=[0,0,0,0];

  const $=id=>document.getElementById(id);

  // ── Screens ───────────────────────────────────
  function goTo(name) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el=$('screen-'+name); if(el) el.classList.add('active');
    currentScreen=name;
    if(name==='intro')        initIntro();
    if(name==='char-select')  initNameSelect();
    if(name==='game')         initGame();
    if(name==='victory')      initVictory();
  }

  function quit() { if(confirm('Voulez-vous vraiment quitter ?')) window.close(); }
  function setMode(n) { numPlayers=n; [1,2,4].forEach(m=>$(`btn-mode-${m}`)?.classList.toggle('active',m===n)); }
  function toggleSound() {
    const m=Sounds.toggleMute();
    $('btn-sound').textContent=m?'🔇':'🔊';
    $('btn-sound').classList.toggle('muted',m);
  }

  // ── Intro ─────────────────────────────────────
  function initIntro() { stopGame(); initParticles(); }

  function initParticles() {
    const cv=$('particles-canvas'); if(!cv) return;
    const ctx=cv.getContext('2d');
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    const pts=Array.from({length:80},()=>({
      x:Math.random()*cv.width, y:Math.random()*cv.height,
      r:Math.random()*2+.5, vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      color:['#FF3333','#FFD700','#2ECC71'][Math.floor(Math.random()*3)],
      alpha:Math.random()*.6+.2,
    }));
    function tick() {
      if(currentScreen!=='intro') return;
      ctx.clearRect(0,0,cv.width,cv.height);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=cv.width;if(p.x>cv.width)p.x=0;
        if(p.y<0)p.y=cv.height;if(p.y>cv.height)p.y=0;
        ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1; requestAnimationFrame(tick);
    }
    tick();
  }

  // ── Name Select ───────────────────────────────
  function initNameSelect() {
    playerNames = ['', '', '', ''];
    const container = $('name-inputs-container');
    container.innerHTML = '';
    $('btn-start').disabled = true;

    const configs = numPlayers === 4
      ? PLAYER_CONFIGS
      : PLAYER_CONFIGS.slice(0, numPlayers);

    configs.forEach((pc, i) => {
      const teamLabel = numPlayers === 4
        ? `<span class="name-team-badge" style="background:${pc.color}">${pc.teamName}</span>`
        : '';

      const div = document.createElement('div');
      div.className = 'name-input-block';
      div.style.borderColor = pc.color;
      div.innerHTML = `
        <div class="name-input-header">
          <span class="name-player-emoji">${pc.emoji}</span>
          <span class="name-player-label" style="color:${pc.color}">Joueur ${i+1} — <kbd>${pc.label}</kbd></span>
          ${teamLabel}
        </div>
        <input type="text" id="name-input-${i}" class="name-input-field"
               placeholder="Votre prénom / لقبك..."
               maxlength="16" autocomplete="off"
               oninput="Game.onNameInput()" />
      `;
      container.appendChild(div);
    });
  }

  function onNameInput() {
    const configs = numPlayers === 4 ? PLAYER_CONFIGS : PLAYER_CONFIGS.slice(0, numPlayers);
    let allFilled = true;
    configs.forEach((_, i) => {
      const val = ($(`name-input-${i}`)?.value || '').trim();
      playerNames[i] = val;
      if (!val) allFilled = false;
    });
    $('btn-start').disabled = !allFilled;
  }

  // ── Start Game ────────────────────────────────
  function startGame() {
    selectedSize=FIXED_SIZE; selectedDiff=FIXED_DIFF;
    goTo('game');
  }

  function selectOption() {} // kept for compatibility

  function initGame() {
    stopGame(); Interactions.resetAll();
    scores=[0,0,0,0];
    const diff=DIFF_CONFIG[selectedDiff]||DIFF_CONFIG.normal;
    const sz=SIZE_CONFIG[selectedSize]||SIZE_CONFIG.medium;
    timeLeft=diff.time; paused=false; questionActive=false;
    const exitX=numPlayers===4?Math.floor(sz.cols*.7):sz.cols-1;
    const exitY=numPlayers===4?Math.floor(sz.rows*.7):sz.rows-1;
    maze=new MazeGrid(sz.cols,sz.rows,diff.trapChance,diff.bonusChance,exitX,exitY);
    renderer=new MazeRenderer($('maze-canvas'),maze);
    players=buildPlayers(sz);
    buildHUD(); buildInteractionBar();
    const m0=Math.floor(timeLeft/60),s0=String(timeLeft%60).padStart(2,'0');
    $('hud-timer').textContent=`${m0}:${s0}`;
    timerInterval=setInterval(tickTimer,1000);
    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    if(numPlayers>1) startCdInterval();
    let last=performance.now(); moveAccum.fill(0);
    function loop(now) {
      if(!paused&&!questionActive){
        const dt=now-last; animTime+=dt/1000;
        players.forEach((p,i)=>{
          const now2=Date.now();
          if(p.frozen&&now2>=p.frozenUntil){p.frozen=false;document.getElementById(`freeze-${p.id}`)?.remove();}
          if(p.helpActive&&now2>=p.helpUntil) p.helpActive=false;
          if(!p.frozen){
            moveAccum[i]=(moveAccum[i]||0)+dt;
            if(moveAccum[i]>=p.moveDelay){moveAccum[i]=0;handleMovement(p);}
          }
        });
      }
      last=now; renderer.draw(players,animTime,numPlayers);
      animFrame=requestAnimationFrame(loop);
    }
    animFrame=requestAnimationFrame(loop);
  }

  function buildPlayers(sz) {
    const corners=[[0,0],[sz.cols-1,0],[0,sz.rows-1],[sz.cols-1,sz.rows-1]];
    if(numPlayers===1){
      const pc=PLAYER_CONFIGS[0];
      return [makeP(pc,0,0,playerNames[0]||'ل1')];
    }
    if(numPlayers===2){
      return [
        makeP(PLAYER_CONFIGS[0],0,0,playerNames[0]||'ل1'),
        makeP(PLAYER_CONFIGS[2],sz.cols-1,0,playerNames[1]||'ل2'),
      ];
    }
    return PLAYER_CONFIGS.map((pc,i)=>{
      const [sx,sy]=corners[i];
      return makeP(pc,sx,sy,playerNames[i]||`ل${i+1}`);
    });
  }

  function makeP(pc,sx,sy,name) {
    return {id:pc.id,idx:pc.idx,team:pc.team,x:sx,y:sy,
      color:pc.color,emoji:pc.emoji,name:name,
      moveDelay:160,moveKeys:pc.move,
      frozen:false,frozenUntil:0,helpActive:false,helpUntil:0};
  }

  function stopGame() {
    if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
    if(cdInterval){clearInterval(cdInterval);cdInterval=null;}
    window.removeEventListener('keydown',onKeyDown);
    window.removeEventListener('keyup',onKeyUp);
    document.querySelectorAll('[id^=freeze-]').forEach(e=>e.remove());
    $('interaction-bar')?.classList.add('hidden');
    $('exit-req-bar')?.remove();
    hideKingOverlay();
    hideWrongKingOverlay();
  }

  function buildHUD() {
    const hud=$('game-hud'); hud.innerHTML='';
    if(numPlayers<=2){
      const p1=players[0];
      hud.innerHTML=`<div class="hud-player-block"><div class="hud-avatar" style="color:${p1.color}">${p1.emoji}</div><div><div class="hud-pname arabic-text" style="color:${p1.color}">${p1.name}</div><div class="hud-score">نقاط: <span id="hud-score-${p1.id}">0</span></div></div></div>`;
      hud.innerHTML+=`<div class="hud-center"><div class="hud-timer" id="hud-timer">5:00</div><button class="btn btn-ghost small" style="padding:4px 10px;font-size:12px" onclick="Game.pauseToggle()">⏸</button></div>`;
      if(numPlayers===2){const p2=players[1];hud.innerHTML+=`<div class="hud-player-block right"><div class="hud-avatar" style="color:${p2.color}">${p2.emoji}</div><div><div class="hud-pname arabic-text" style="color:${p2.color}">${p2.name}</div><div class="hud-score">نقاط: <span id="hud-score-${p2.id}">0</span></div></div></div>`;}
    } else {
      const ta=players.filter(p=>p.team===0),tb=players.filter(p=>p.team===1);
      hud.innerHTML=`<div class="hud-4p-left">${ta.map(p=>`<div class="hud-player-block" style="font-size:12px"><div class="hud-avatar" style="color:${p.color};width:28px;height:28px;font-size:15px">${p.emoji}</div><div><div class="hud-pname arabic-text" style="color:${p.color};font-size:12px">${p.name}</div><div class="hud-score" style="font-size:11px"><span id="hud-score-${p.id}">0</span></div></div></div>`).join('')}<div class="team-score-bar a">🔵 زرقا: <span id="team-score-0">0</span></div></div>
      <div class="hud-center"><div class="hud-timer" id="hud-timer">5:00</div><button class="btn btn-ghost small" style="padding:4px 10px;font-size:12px" onclick="Game.pauseToggle()">⏸</button></div>
      <div class="hud-4p-right">${tb.map(p=>`<div class="hud-player-block right" style="font-size:12px"><div class="hud-avatar" style="color:${p.color};width:28px;height:28px;font-size:15px">${p.emoji}</div><div><div class="hud-pname arabic-text" style="color:${p.color};font-size:12px;text-align:right">${p.name}</div><div class="hud-score" style="font-size:11px"><span id="hud-score-${p.id}">0</span></div></div></div>`).join('')}<div class="team-score-bar b">🔴 حمرا: <span id="team-score-1">0</span></div></div>`;
    }
    $('controls-hint').textContent=players.map(p=>`${p.emoji} ${p.name}`).join('  ·  ');
    // Add exit requirement bar below controls hint
    let reqBar=$('exit-req-bar');
    if(!reqBar){reqBar=document.createElement('div');reqBar.id='exit-req-bar';reqBar.className='exit-req-bar';document.getElementById('screen-game').appendChild(reqBar);}
    updateExitBar();
  }

  function buildInteractionBar() {
    const bar=$('interaction-bar');
    if(numPlayers<2){bar.classList.add('hidden');return;}
    bar.classList.remove('hidden');
    bar.innerHTML=players.map(p=>`<div class="ibar-section">
      <span class="ibar-label" style="color:${p.color}">${p.emoji}</span>
      <button class="ibar-btn punish" onclick="Game.doAction('${p.id}','punish')">💀<span class="cd" id="cd-${p.id}-punish"></span></button>
      <button class="ibar-btn pardon" onclick="Game.doAction('${p.id}','pardon')">🤝<span class="cd" id="cd-${p.id}-pardon"></span></button>
      <button class="ibar-btn help"   onclick="Game.doAction('${p.id}','help')">💡<span class="cd" id="cd-${p.id}-help"></span></button>
      <button class="ibar-btn taunt"  onclick="Game.doAction('${p.id}','taunt')">😜<span class="cd" id="cd-${p.id}-taunt"></span></button>
    </div>`).join('<div class="ibar-sep">|</div>');
  }

  function startCdInterval() {
    cdInterval=setInterval(()=>{
      players.forEach(p=>['punish','pardon','help','taunt'].forEach(a=>{
        const el=$(`cd-${p.id}-${a}`);
        if(el){const r=Interactions.remaining(p.id,a);el.textContent=r>0?` ${r}s`:'';}}));
    },250);
  }

  // ── Movement ──────────────────────────────────
  function handleMovement(p) {
    const mk=p.moveKeys;let dx=0,dy=0;
    if(mk.up.some(k=>keys[k]))dy=-1;if(mk.down.some(k=>keys[k]))dy=1;
    if(mk.left.some(k=>keys[k]))dx=-1;if(mk.right.some(k=>keys[k]))dx=1;
    if(!dx&&!dy) return;
    const nx=p.x+dx,ny=p.y+dy;
    if(nx<0||nx>=maze.cols||ny<0||ny>=maze.rows) return;
    const dir={'0,-1':0,'1,0':1,'0,1':2,'-1,0':3}[`${dx},${dy}`];
    if(maze.get(p.x,p.y).walls[dir]) return;
    p.x=nx;p.y=ny;Sounds.play.move();onCellEnter(p);
  }

  function onKeyDown(e) { keys[e.key]=true; if(e.key==='Escape'&&currentScreen==='game') pauseToggle(); }
  function onKeyUp(e)   { keys[e.key]=false; }

  // ── Cell events ───────────────────────────────
  function onCellEnter(p) {
    const cell=maze.get(p.x,p.y);
    if(cell.type===CELL.EXIT){
      const pts=scores[p.idx]||0;
      if(pts<MIN_EXIT_SCORE){
        const needed=MIN_EXIT_SCORE-pts;
        showPopup(`🚪 خاصك ${needed} نقطة باش تخرج!`,'#FFD700');
        Sounds.play.wrong();
        return;
      }
      endGame(p);return;
    }
    if(cell.type===CELL.QUESTION&&!cell.looted){cell.looted=true;showQuestion(p);return;}
    if(cell.type===CELL.TRAP){
      addScore(p.idx,-30);
      showPopup(TRAP_MSGS[Math.floor(Math.random()*TRAP_MSGS.length)],'#FF5733');
      Sounds.play.trap();
      return;
    }
    if(cell.type===CELL.BONUS&&!cell.looted){
      cell.looted=true;
      addScore(p.idx,30);showPopup('⭐ +30 — البركة جات!','#FFD700');Sounds.play.bonus();return;
    }
    if(cell.type===CELL.CHEST&&!cell.looted){
      cell.looted=true;
      if(Math.random()<.5){addScore(p.idx,50);showPopup('📦 +50 — الله يبارك!','#FFD700');}
      else{addScore(p.idx,-20);showPopup('📦 -20 — شي غاشي!','#FF5733');}
      Sounds.play.chest();return;
    }
  }

  // ── Question + King Overlays ──────────────────
  function showQuestion(p) {
    const q = getRandomQuestion();
    if (q.isKingQuestion) {
      showKingOverlay(() => displayQuestion(p, q));
    } else {
      displayQuestion(p, q);
    }
  }

  function showKingOverlay(callback) {
    questionActive = true;
    Sounds.play.royal();
    const overlay = $('king-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
      if (callback) callback();
    }, 2800);
  }

  function hideKingOverlay() {
    $('king-overlay')?.classList.add('hidden');
  }

  function showWrongKingOverlay() {
    Sounds.play.wrongKing();
    const overlay = $('wrong-king-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 2500);
  }

  function hideWrongKingOverlay() {
    $('wrong-king-overlay')?.classList.add('hidden');
  }

  function displayQuestion(p, q) {
    questionActive=true;
    if (!q.isKingQuestion) Sounds.play.question();

    const catEl = $('question-category');
    if (catEl) {
      const icons = {تاريخ:'📜',دين:'☪️',سياسة:'🏛️',بايخة:'🤪',مضحكة:'😂',ثقافة:'🎭'};
      catEl.textContent = (icons[q.category]||'❓') + ' ' + (q.category||'');
    }

    $('question-text').textContent=q.q;
    $('question-feedback').textContent='';$('question-feedback').className='question-feedback';
    $('question-badge').textContent=`${q.isKingQuestion?'👑':'❓'} سؤال — ${p.name}`;

    const box=$('question-answers');box.innerHTML='';
    q.answers.forEach((ans,i)=>{
      const btn=document.createElement('button');btn.className='answer-btn arabic-text';btn.textContent=ans;
      btn.onclick=()=>{
        box.querySelectorAll('.answer-btn').forEach((b,j)=>{b.onclick=null;if(j===q.correct)b.classList.add('correct');});
        const fb=$('question-feedback');
        if(i===q.correct){
          btn.classList.add('correct');
          addScore(p.idx,100);
          fb.textContent='✅ صح! +100 نقطة';fb.className='question-feedback ok';
          Sounds.play.correct();
          setTimeout(()=>{$('screen-question').classList.remove('active');questionActive=false;},1800);
        } else {
          btn.classList.add('wrong');addScore(p.idx,-50);
          fb.textContent='❌ غلط! -50 نقطة';fb.className='question-feedback bad';
          Sounds.play.wrong();
          // Show wrong-king photo only for political questions
          if (q.category === 'سياسة') {
            setTimeout(()=>{
              $('screen-question').classList.remove('active');
              showWrongKingOverlay();
              setTimeout(()=>{questionActive=false;},2600);
            }, 800);
          } else {
            setTimeout(()=>{$('screen-question').classList.remove('active');questionActive=false;},1800);
          }
        }
      };
      box.appendChild(btn);
    });
    $('screen-question').classList.add('active');
  }

  // ── Interactions ──────────────────────────────
  function doAction(who,action) {
    if(currentScreen!=='game'||paused||questionActive) return;
    const actor=players.find(p=>p.id===who);if(!actor) return;
    const enemies=players.filter(p=>p.team!==actor.team);
    const teammate=players.find(p=>p.team===actor.team&&p.id!==who);
    const nearEnemy=enemies.length?enemies.reduce((n,p)=>Math.hypot(p.x-actor.x,p.y-actor.y)<Math.hypot(n.x-actor.x,n.y-actor.y)?p:n,enemies[0]):null;
    let result;
    if(action==='punish'){if(!nearEnemy){showPopup('ما فيش عدو!','#888');return;}result=Interactions.punish(who);}
    else if(action==='pardon'){if(!nearEnemy){showPopup('ما فيش عدو!','#888');return;}result=Interactions.pardon(who);}
    else if(action==='help'){result=Interactions.help(who);}
    else result=Interactions.taunt(who);
    if(!result?.ok){if(result?.cd)showPopup(`⏳ ${result.cd}s`,'#888');return;}
    const cv=$('maze-canvas'),rect=cv.getBoundingClientRect(),cs=renderer.cell;
    const bx=rect.left+actor.x*cs+cs/2,by=rect.top+actor.y*cs;
    if(action==='punish'){
      nearEnemy.frozen=true;nearEnemy.frozenUntil=Date.now()+result.duration;
      const el=document.createElement('div');el.className='freeze-overlay';el.id=`freeze-${nearEnemy.id}`;
      document.body.appendChild(el);addScore(actor.idx,-20);
      showPopup(`❄️ ${nearEnemy.name} تجمّد!`,'#38A0FF');Sounds.play.punish();
    } else if(action==='pardon'){
      nearEnemy.frozen=false;document.getElementById(`freeze-${nearEnemy.id}`)?.remove();
      addScore(nearEnemy.idx,result.pts);showPopup(`🤝 +${result.pts} — عفو!`,'#38A0FF');Sounds.play.pardon();
    } else if(action==='help'){
      const target=numPlayers===2?players.find(p=>p.id!==who):teammate;
      if(target){target.helpActive=true;target.helpUntil=Date.now()+result.duration;}
      showPopup('💡 رؤية موسّعة!','#FFD700');Sounds.play.help();
    } else Sounds.play.taunt();
    spawnBubble(result.msg,actor.color,action+'-b',bx,by);
  }

  function spawnBubble(text,color,cls,x,y) {
    Sounds.play.chat();
    const el=document.createElement('div');el.className=`chat-bubble ${cls}`;
    el.style.borderColor=color;el.style.direction='rtl';el.textContent=text;
    el.style.left=`${Math.min(x,window.innerWidth-220)}px`;el.style.top=`${Math.max(y-75,8)}px`;
    $('chat-layer').appendChild(el);setTimeout(()=>el.remove(),3100);
  }

  // ── Timer & Score ─────────────────────────────
  function tickTimer() {
    if(paused||questionActive) return;
    timeLeft--;
    const m=Math.floor(timeLeft/60),s=String(timeLeft%60).padStart(2,'0');
    const el=$('hud-timer');if(el){el.textContent=`${m}:${s}`;el.className='hud-timer'+(timeLeft<=30?' urgent':'');}
    if(timeLeft<=10&&timeLeft>0) Sounds.play.tick();
    if(timeLeft<=0) endGame(null);
  }

  function addScore(pIdx,pts) { scores[pIdx]=Math.max(0,(scores[pIdx]||0)+pts);updateHUD(); }

  function updateExitBar() {
    const bar=$('exit-req-bar'); if(!bar) return;
    if(numPlayers===1||numPlayers===2){
      // Show per-player progress toward MIN_EXIT_SCORE
      bar.innerHTML=players.map(p=>{
        const pts=scores[p.idx]||0;
        const pct=Math.min(100,Math.round(pts/MIN_EXIT_SCORE*100));
        const ready=pts>=MIN_EXIT_SCORE;
        return `<div class="exit-player-req ${ready?'ready':''}">
          <span>${p.emoji} ${p.name}</span>
          <div class="exit-progress-track"><div class="exit-progress-fill" style="width:${pct}%;background:${ready?'#2ECC71':p.color}"></div></div>
          <span class="exit-pts-label">${pts}/${MIN_EXIT_SCORE} ${ready?'✅ جاهز':'🔒'}</span>
        </div>`;
      }).join('');
    } else {
      // 4P: show team progress
      bar.innerHTML=[0,1].map(t=>{
        const teamPlayers=players.filter(p=>p.team===t);
        const leader=teamPlayers.reduce((a,b)=>(scores[b.idx]||0)>(scores[a.idx]||0)?b:a,teamPlayers[0]);
        const pts=leader?scores[leader.idx]||0:0;
        const pct=Math.min(100,Math.round(pts/MIN_EXIT_SCORE*100));
        const ready=pts>=MIN_EXIT_SCORE;
        return `<div class="exit-player-req ${ready?'ready':''}">
          <span>${t===0?'🔵':'🔴'} ${t===0?'زرقا':'حمرا'}</span>
          <div class="exit-progress-track"><div class="exit-progress-fill" style="width:${pct}%;background:${ready?'#2ECC71':TEAM_COLORS[t]}"></div></div>
          <span class="exit-pts-label">${pts}/${MIN_EXIT_SCORE} ${ready?'✅':'🔒'}</span>
        </div>`;
      }).join('');
    }
  }

  function updateHUD() {
    players.forEach(p=>{const el=$(`hud-score-${p.id}`);if(el)el.textContent=scores[p.idx]||0;});
    if(numPlayers===4){
      const ta=$('team-score-0'),tb=$('team-score-1');
      if(ta)ta.textContent=players.filter(p=>p.team===0).reduce((s,p)=>s+(scores[p.idx]||0),0);
      if(tb)tb.textContent=players.filter(p=>p.team===1).reduce((s,p)=>s+(scores[p.idx]||0),0);
    }
    updateExitBar();
  }

  function showPopup(text,color) {
    const el=document.createElement('div');el.className='cell-popup';el.textContent=text;
    el.style.color=color;el.style.left='50%';el.style.top='40%';el.style.direction='rtl';
    document.body.appendChild(el);setTimeout(()=>el.remove(),1500);
  }

  // ── End game ──────────────────────────────────
  function endGame(wp) {
    stopGame();if(wp)scores[wp.idx]+=timeLeft;Sounds.play.victory();
    let winTeam=-1;
    if(wp)winTeam=wp.team;
    else if(numPlayers>2){
      const ta=players.filter(p=>p.team===0).reduce((s,p)=>s+(scores[p.idx]||0),0);
      const tb=players.filter(p=>p.team===1).reduce((s,p)=>s+(scores[p.idx]||0),0);
      winTeam=ta>=tb?0:1;
    }
    victoryData={winnerPlayer:wp,winTeam};goTo('victory');
  }

  function initVictory() {
    const {winnerPlayer:wp,winTeam}=victoryData||{};
    startConfetti();
    if(numPlayers===1){
      const p=players[0];
      $('victory-title').textContent='ربحتي! 🏆';
      $('victory-body').innerHTML=`<div class="victory-score-row"><div class="vscore-card winner">
        <div class="vscore-emoji">${p.emoji}</div>
        <div class="vscore-name arabic-text" style="color:${p.color}">${p.name}</div>
        <div class="vscore-pts">${scores[p.idx]||0} نقطة</div>
      </div></div>`;
    } else if(numPlayers===2){
      const s0=scores[0]||0,s1=scores[1]||0,win=s0>=s1?0:1;
      $('victory-title').textContent=`${players[win].name} ربح! ${players[win].emoji}`;
      $('victory-body').innerHTML=`<div class="victory-score-row">${players.map((p,i)=>`
        <div class="vscore-card${i===win?' winner':''}">
          <div class="vscore-emoji">${p.emoji}</div>
          <div class="vscore-name arabic-text" style="color:${p.color}">${p.name}</div>
          <div class="vscore-pts">${scores[i]||0} نقطة</div>
        </div>`).join('<div style="align-self:center;font-size:24px;font-weight:900">ضد</div>')}</div>`;
    } else {
      const ta=players.filter(p=>p.team===0).reduce((s,p)=>s+(scores[p.idx]||0),0);
      const tb=players.filter(p=>p.team===1).reduce((s,p)=>s+(scores[p.idx]||0),0);
      const wt=winTeam>=0?winTeam:(ta>=tb?0:1);
      $('victory-title').textContent=`${TEAM_NAMES[wt]} ربحات! 🏆`;
      $('victory-body').innerHTML=`<div class="victory-score-row">${[0,1].map(t=>`
        <div class="vscore-card${t===wt?' winner':''}">
          <div class="vscore-emoji">${t===0?'🔵':'🔴'}</div>
          <div class="vscore-name arabic-text" style="color:${TEAM_COLORS[t]}">${TEAM_NAMES[t]}</div>
          <div class="vscore-pts">${t===0?ta:tb} نقطة</div>
          <div class="vscore-team">${players.filter(p=>p.team===t).map(p=>p.emoji+' '+p.name).join(' + ')}</div>
        </div>`).join('<div style="align-self:center;font-size:28px">ضد</div>')}</div>`;
    }
  }

  function restart() {
    victoryData=null;
    playerNames=['','','',''];
    goTo('char-select');
  }

  function startConfetti() {
    const cv=$('confetti-canvas'),ctx=cv.getContext('2d');
    cv.width=window.innerWidth;cv.height=window.innerHeight;
    const pieces=Array.from({length:120},()=>({
      x:Math.random()*cv.width,y:Math.random()*-cv.height,r:Math.random()*8+4,
      color:['#FF3333','#FFD700','#2ECC71','#FF8C00','#38A0FF'][Math.floor(Math.random()*5)],
      vx:(Math.random()-.5)*3,vy:Math.random()*3+2,
      angle:Math.random()*Math.PI*2,va:(Math.random()-.5)*.1,
    }));
    function tick(){
      if(currentScreen!=='victory') return;
      ctx.clearRect(0,0,cv.width,cv.height);
      pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.angle+=p.va;
        if(p.y>cv.height){p.y=-10;p.x=Math.random()*cv.width;}
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
        ctx.fillStyle=p.color;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.5);ctx.restore();});
      requestAnimationFrame(tick);
    }
    tick();
  }

  function pauseToggle() { paused=!paused;$('overlay-pause').classList.toggle('hidden',!paused); }

  window.addEventListener('DOMContentLoaded',()=>goTo('intro'));

  return {goTo,quit,setMode,toggleSound,startGame,restart,pauseToggle,selectOption,doAction,onNameInput};
})();
