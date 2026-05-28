// ═══════════════════════════════════════════════
//  GAME — نسخة الدارجة 🇲🇦  v2.1
// ═══════════════════════════════════════════════

const Game = (() => {

  // Arrow keys used by the online/solo d-pad player
  const ONLINE_KEYS = { up:['ArrowUp','w','W'], down:['ArrowDown','s','S'],
                        left:['ArrowLeft','a','A'], right:['ArrowRight','d','D'] };

  const PLAYER_CONFIGS = [
    { id:'p1', idx:0, team:0, color:'#38A0FF', emoji:'🧔', label:'ZQSD',
      move:{ up:['z','Z'], down:['s','S'], left:['q','Q'], right:['d','D'] } },
    { id:'p2', idx:1, team:1, color:'#FF3333', emoji:'🦁', label:'↑↓←→',
      move:{ up:['ArrowUp'], down:['ArrowDown'], left:['ArrowLeft'], right:['ArrowRight'] } },
  ];

  const FIXED_SIZE = 'medium';
  const FIXED_DIFF = 'hard';
  const MIN_EXIT_SCORE = 200;

  const SIZE_CONFIG = { medium:{ cols:14, rows:14 } };
  const DIFF_CONFIG = {
    easy:  { time:420, trapChance:6,  bonusChance:14 },
    normal:{ time:300, trapChance:12, bonusChance:10 },
    hard:  { time:180, trapChance:20, bonusChance:6  },
  };

  const TRAP_MSGS = [
    "⚠️ الإمبوتياج! -30 نقطة", "☠️ المفتشية! -30 نقطة",
    "😭 كراء الدار زاد! -30",   "🚧 الباراج! -30 نقطة",
    "💸 الضريبة جات! -30 نقطة", "🏛️ المكتب مسدود! -30",
  ];

  // ── State ─────────────────────────────────────
  let numPlayers=1, currentScreen='intro';
  let playerNames=['','','',''];
  let onlineMode=false, myOnlineId=null;

  let maze=null, renderer=null, players=[], scores=[];
  let timeLeft=300, timerInterval=null, animFrame=null, animTime=0;
  let paused=false, questionActive=false, cdInterval=null, victoryData=null;

  const keys={};          // keyboard state
  const touchKeys={};     // d-pad touch state (single player)
  const touchKeys2={};    // d-pad touch state 2P local {p1:{},p2:{}}

  const $=id=>document.getElementById(id);

  // ── Screen routing ────────────────────────────
  function goTo(name) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el=$('screen-'+name); if(el) el.classList.add('active');
    currentScreen=name;
    ({ 'intro':initIntro, 'char-select':initNameSelect,
       'online-setup':initOnlineSetup, 'online-lobby':initOnlineLobby,
       'game':initGame, 'victory':initVictory })[name]?.();
  }

  function quit() { if(confirm('Voulez-vous vraiment quitter ?')) window.close(); }

  function setMode(n) {
    onlineMode=false; numPlayers=n;
    [1,2].forEach(m=>$(`btn-mode-${m}`)?.classList.toggle('active',m===n));
  }

  function toggleSound() {
    const m=Sounds.toggleMute();
    $('btn-sound').textContent=m?'🔇':'🔊';
    $('btn-sound').classList.toggle('muted',m);
  }

  // ── Intro ─────────────────────────────────────
  function initIntro() { stopGame(); Online.cleanup(); initParticles(); }

  function initParticles() {
    const cv=$('particles-canvas'); if(!cv) return;
    const ctx=cv.getContext('2d');
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    const pts=Array.from({length:60},()=>({
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
        ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      });
      ctx.globalAlpha=1; requestAnimationFrame(tick);
    }
    tick();
  }

  // ── Online: Setup ─────────────────────────────
  function goToOnline() { goTo('online-setup'); }

  function initOnlineSetup() {
    $('online-error-msg').textContent='';
    if(!Online.configured()) $('online-config-warning').classList.remove('hidden');
    else $('online-config-warning').classList.add('hidden');
  }

  async function onlineCreate() {
    const name=($('online-name-input')?.value||'').trim();
    if(!name){ $('online-error-msg').textContent='Entre ton prénom !'; return; }
    if(!Online.configured()){ $('online-error-msg').textContent='Configure Firebase dans js/online.js'; return; }
    $('online-error-msg').textContent='⏳ Création de la salle…';
    try {
      Online.init();
      const code=await Online.createRoom(name);
      onlineMode=true; myOnlineId=Online.getMyId();
      goTo('online-lobby');
    } catch(e){ $('online-error-msg').textContent='❌ '+e.message; }
  }

  async function onlineJoin() {
    const name=($('online-name-input')?.value||'').trim();
    const code=($('online-code-input')?.value||'').trim();
    if(!name){ $('online-error-msg').textContent='Entre ton prénom !'; return; }
    if(code.length<4){ $('online-error-msg').textContent='Entre le code (4 lettres)'; return; }
    if(!Online.configured()){ $('online-error-msg').textContent='Configure Firebase dans js/online.js'; return; }
    $('online-error-msg').textContent='⏳ Connexion…';
    try {
      Online.init();
      await Online.joinRoom(code, name);
      onlineMode=true; myOnlineId=Online.getMyId();
      goTo('online-lobby');
    } catch(e){ $('online-error-msg').textContent='❌ '+e.message; }
  }

  // ── Online: Lobby ─────────────────────────────
  function initOnlineLobby() {
    const code=Online.getCode();
    if($('lobby-room-code')) $('lobby-room-code').textContent=code||'????';
    const startBtn=$('btn-online-start');
    if(Online.isHost()){ startBtn.classList.remove('hidden'); }
    else { startBtn.classList.add('hidden'); }
    $('online-lobby-hint').textContent=Online.isHost()
      ? `Partage le code "${code}" avec tes amis, puis lance quand tout le monde est prêt.`
      : 'En attente que l\'hôte lance la partie…';

    Online.on('onPlayers', pl=>{ renderOnlineLobbyPlayers(pl); });
    Online.on('onStart',   ()=>{ startOnlineGame(); });
  }

  function renderOnlineLobbyPlayers(obj) {
    const list=$('online-players-list'); if(!list) return;
    list.innerHTML='';
    const entries=Object.entries(obj||{}).sort((a,b)=>a[1].joinOrder-b[1].joinOrder);
    entries.forEach(([id,p])=>{
      const div=document.createElement('div');
      div.className='online-player-slot'+(p.online===false?' offline':'');
      div.innerHTML=`<span class="op-emoji">${p.emoji}</span>
        <span class="op-name" style="color:${p.color}">${p.name}</span>
        <span class="op-badge" style="background:${p.color}">${p.online===false?'Déconnecté':'✅ Prêt'}</span>`;
      list.appendChild(div);
    });
    const active=entries.filter(([,p])=>p.online!==false).length;
    const btn=$('btn-online-start');
    if(btn){ btn.disabled=active<2; }
    $('online-lobby-hint').textContent=Online.isHost()
      ? `${active} joueur(s) connecté(s) — il faut au moins 2 pour commencer.`
      : 'En attente que l\'hôte lance…';
  }

  function copyRoomCode() {
    const code=Online.getCode();
    if(code) navigator.clipboard?.writeText(code).then(()=>showPopup('📋 Code copié !','#2ECC71'));
  }

  async function onlineLobbyStart() { await Online.startGame(); }

  function startOnlineGame() {
    numPlayers=1; onlineMode=true; myOnlineId=Online.getMyId();
    goTo('game');
  }

  // ── Name Select (local) ───────────────────────
  function initNameSelect() {
    playerNames=['','','',''];
    const container=$('name-inputs-container'); container.innerHTML='';
    $('btn-start').disabled=true;
    const configs=PLAYER_CONFIGS.slice(0,numPlayers);
    configs.forEach((pc,i)=>{
      const div=document.createElement('div');
      div.className='name-input-block'; div.style.borderColor=pc.color;
      div.innerHTML=`
        <div class="name-input-header">
          <span class="name-player-emoji">${pc.emoji}</span>
          <span class="name-player-label" style="color:${pc.color}">Joueur ${i+1}</span>
        </div>
        <input type="text" id="name-input-${i}" class="name-input-field"
               placeholder="Prénom / لقب..." maxlength="16" autocomplete="off"
               oninput="Game.onNameInput()" />`;
      container.appendChild(div);
    });
  }

  function onNameInput() {
    const configs=PLAYER_CONFIGS.slice(0,numPlayers);
    let ok=true;
    configs.forEach((_,i)=>{
      const v=($(`name-input-${i}`)?.value||'').trim();
      playerNames[i]=v; if(!v) ok=false;
    });
    $('btn-start').disabled=!ok;
  }

  function startGame() { goTo('game'); }
  function selectOption() {}

  // ── Game init ─────────────────────────────────
  function initGame() {
    stopGame(); Interactions.resetAll();
    scores=[0,0,0,0];
    const diff=DIFF_CONFIG[FIXED_DIFF];
    const sz=SIZE_CONFIG[FIXED_SIZE];
    timeLeft=diff.time; paused=false; questionActive=false;

    if(onlineMode) { setMazeSeed(Online.getSeed()); }
    else           { resetMazeSeed(); }

    maze=new MazeGrid(sz.cols,sz.rows,diff.trapChance,diff.bonusChance,sz.cols-1,sz.rows-1);
    renderer=new MazeRenderer($('maze-canvas'),maze);
    players=buildPlayers(sz);
    buildHUD(); buildInteractionBar(); showDpad();

    const m0=Math.floor(timeLeft/60),s0=String(timeLeft%60).padStart(2,'0');
    $('hud-timer').textContent=`${m0}:${s0}`;
    timerInterval=setInterval(tickTimer,1000);
    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    if(numPlayers>1||onlineMode) startCdInterval();
    if(onlineMode) setupOnlineSync(sz);

    let last=performance.now(); moveAccum={};
    function loop(now) {
      if(!paused&&!questionActive){
        const dt=now-last; animTime+=dt/1000;
        players.forEach(p=>{
          const now2=Date.now();
          if(p.frozen&&now2>=p.frozenUntil){ p.frozen=false; $(`freeze-${p.id}`)?.remove(); }
          if(p.helpActive&&now2>=p.helpUntil) p.helpActive=false;
          if(!p.frozen&&!p.remote){
            moveAccum[p.id]=(moveAccum[p.id]||0)+dt;
            if(moveAccum[p.id]>=p.moveDelay){ moveAccum[p.id]=0; handleMovement(p); }
          }
        });
      }
      last=now; renderer.draw(players,animTime,players.length);
      animFrame=requestAnimationFrame(loop);
    }
    animFrame=requestAnimationFrame(loop);
  }

  let moveAccum={};

  function buildPlayers(sz) {
    const corners=[[0,0],[sz.cols-1,0],[0,sz.rows-1],[sz.cols-1,sz.rows-1]];
    if(onlineMode) {
      // Only my player — remote players added via Firebase
      return [{ id:myOnlineId||'p_me', idx:0, team:0, x:0, y:0,
        color:'#38A0FF', emoji:'🧔', name:playerNames[0]||'Moi',
        moveDelay:160, remote:false,
        frozen:false, frozenUntil:0, helpActive:false, helpUntil:0 }];
    }
    return PLAYER_CONFIGS.slice(0,numPlayers).map((pc,i)=>({
      id:pc.id, idx:i, team:pc.team, x:corners[i][0], y:corners[i][1],
      color:pc.color, emoji:pc.emoji, name:playerNames[i]||`J${i+1}`,
      moveDelay:160, moveKeys:pc.move, remote:false,
      frozen:false, frozenUntil:0, helpActive:false, helpUntil:0,
    }));
  }

  // ── D-pad visibility ──────────────────────────
  function showDpad() {
    const isMobile=('ontouchstart' in window)||navigator.maxTouchPoints>0;
    $('dpad-single').classList.add('hidden');
    $('dpad-left').classList.add('hidden');
    $('dpad-right').classList.add('hidden');
    $('touch-actions').classList.add('hidden');

    if(onlineMode) {
      $('dpad-single').classList.remove('hidden');
      return;
    }
    if(numPlayers===1) {
      if(isMobile) $('dpad-single').classList.remove('hidden');
      return;
    }
    if(numPlayers===2) {
      $('dpad-left').classList.remove('hidden');
      $('dpad-right').classList.remove('hidden');
      $('touch-actions').classList.remove('hidden');
    }
  }

  // ── Touch D-pad ───────────────────────────────
  const DIR_TO_ONLINE = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
  const DIR_TO_P1 = { up:'z', down:'s', left:'q', right:'d' };
  const DIR_TO_P2 = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };

  function touchStart(dir, e) {
    if(e) e.preventDefault();
    if(onlineMode) keys[DIR_TO_ONLINE[dir]]=true;
    else           keys[DIR_TO_P1[dir]]=true;
  }
  function touchEnd(dir) {
    if(onlineMode) delete keys[DIR_TO_ONLINE[dir]];
    else           delete keys[DIR_TO_P1[dir]];
  }
  function touchStart2(player, dir, e) {
    if(e) e.preventDefault();
    const map=player==='p1'?DIR_TO_P1:DIR_TO_P2;
    keys[map[dir]]=true;
  }
  function touchEnd2(player, dir) {
    const map=player==='p1'?DIR_TO_P1:DIR_TO_P2;
    delete keys[map[dir]];
  }
  function doMyAction(action) {
    const me=onlineMode?players.find(p=>p.id===myOnlineId):players[0];
    if(me) doAction(me.id, action);
  }

  // ── Online sync ───────────────────────────────
  function setupOnlineSync(sz) {
    const PROFILES=[
      {color:'#38A0FF',emoji:'🧔'},{color:'#FF3333',emoji:'🦁'},
      {color:'#2ECC71',emoji:'🌿'},{color:'#FF8C00',emoji:'🌙'},
    ];
    const STARTS=[[0,0],[sz.cols-1,0],[0,sz.rows-1],[sz.cols-1,sz.rows-1]];

    // Update my starting position according to join order
    Online.on('onPlayers', remoteObj=>{
      if(currentScreen!=='game') return;
      const sorted=Object.entries(remoteObj||{}).sort((a,b)=>a[1].joinOrder-b[1].joinOrder);

      // Update my player profile & start pos based on my join order
      const myEntry=sorted.find(([id])=>id===myOnlineId);
      if(myEntry){
        const [,rp]=myEntry;
        const me=players.find(p=>p.id===myOnlineId);
        if(me&&!me._positioned){
          const [sx,sy]=STARTS[rp.joinOrder]||[0,0];
          me.x=sx; me.y=sy; me.color=rp.color; me.emoji=rp.emoji;
          me.name=rp.name; me._positioned=true;
          buildHUD();
        }
      }

      sorted.forEach(([id,rp])=>{
        if(id===myOnlineId) return;
        let p=players.find(pl=>pl.id===id);
        if(!p){
          p={ id, idx:players.length, team:rp.joinOrder%2,
              x:rp.x??STARTS[rp.joinOrder]?.[0]??0,
              y:rp.y??STARTS[rp.joinOrder]?.[1]??0,
              color:rp.color, emoji:rp.emoji, name:rp.name,
              moveDelay:160, remote:true,
              frozen:false, frozenUntil:0, helpActive:false, helpUntil:0 };
          players.push(p);
          scores[p.idx]=rp.score||0;
          buildHUD(); buildInteractionBar(); startCdInterval();
        } else {
          if(rp.x!=null) p.x=rp.x;
          if(rp.y!=null) p.y=rp.y;
          p.frozen=!!rp.frozen; p.frozenUntil=rp.frozenUntil||0;
          p.helpActive=!!rp.helpActive; p.helpUntil=rp.helpUntil||0;
          scores[p.idx]=rp.score||0;
          updateHUD();
        }
      });
    });

    Online.on('onLoot',(x,y)=>{ const c=maze.get(x,y);if(c) c.looted=true; });

    Online.on('onEvent',ev=>{
      if(!ev||ev.from===myOnlineId) return;
      if(ev.type==='freeze'){
        const t=players.find(p=>p.id===ev.data?.targetId);
        if(t){t.frozen=true;t.frozenUntil=Date.now()+(ev.data?.duration||3500);}
      }
      if(ev.type==='unfreeze'){
        const t=players.find(p=>p.id===ev.data?.targetId);
        if(t){t.frozen=false;}
      }
      if(ev.type==='help'){
        const t=players.find(p=>p.id===ev.data?.targetId);
        if(t){t.helpActive=true;t.helpUntil=Date.now()+(ev.data?.duration||6000);}
      }
      if(ev.type==='bubble'){
        spawnBubble(ev.data?.msg||'',ev.data?.color||'#fff','remote-b',window.innerWidth/2,100);
      }
    });

    Online.on('onGameOver',data=>{
      if(currentScreen==='game'){
        victoryData={onlineWinner:data?.winnerName};
        goTo('victory');
      }
    });
  }

  // ── Movement ──────────────────────────────────
  function handleMovement(p) {
    const mk=onlineMode ? ONLINE_KEYS : p.moveKeys;
    let dx=0,dy=0;
    if(mk.up?.some(k=>keys[k]))   dy=-1;
    if(mk.down?.some(k=>keys[k])) dy=1;
    if(mk.left?.some(k=>keys[k])) dx=-1;
    if(mk.right?.some(k=>keys[k]))dx=1;
    if(!dx&&!dy) return;
    const nx=p.x+dx, ny=p.y+dy;
    if(nx<0||nx>=maze.cols||ny<0||ny>=maze.rows) return;
    const dir={'0,-1':0,'1,0':1,'0,1':2,'-1,0':3}[`${dx},${dy}`];
    if(maze.get(p.x,p.y).walls[dir]) return;
    p.x=nx; p.y=ny; Sounds.play.move();
    if(onlineMode) Online.sendMove(nx,ny);
    onCellEnter(p);
  }

  function onKeyDown(e) { keys[e.key]=true; if(e.key==='Escape'&&currentScreen==='game') pauseToggle(); }
  function onKeyUp(e)   { delete keys[e.key]; }

  // ── Cell events ───────────────────────────────
  function onCellEnter(p) {
    const cell=maze.get(p.x,p.y);
    if(cell.type===CELL.EXIT){
      const pts=scores[p.idx]||0;
      if(pts<MIN_EXIT_SCORE){
        showPopup(`🚪 خاصك ${MIN_EXIT_SCORE-pts} نقطة باش تخرج!`,'#FFD700');
        Sounds.play.wrong(); return;
      }
      endGame(p); return;
    }
    if(cell.type===CELL.QUESTION&&!cell.looted){
      if(onlineMode){
        Online.claimCell(p.x,p.y).then(ok=>{ if(ok){ cell.looted=true; showQuestion(p); } });
      } else { cell.looted=true; showQuestion(p); }
      return;
    }
    if(cell.type===CELL.TRAP){
      addScore(p.idx,-30);
      showPopup(TRAP_MSGS[Math.floor(Math.random()*TRAP_MSGS.length)],'#FF5733');
      Sounds.play.trap(); return;
    }
    if(cell.type===CELL.BONUS&&!cell.looted){
      if(onlineMode){
        Online.claimCell(p.x,p.y).then(ok=>{
          if(ok){ cell.looted=true; addScore(p.idx,30); showPopup('⭐ +30!','#FFD700'); Sounds.play.bonus(); }
        });
      } else {
        cell.looted=true; addScore(p.idx,30); showPopup('⭐ +30!','#FFD700'); Sounds.play.bonus();
      }
      return;
    }
    if(cell.type===CELL.CHEST&&!cell.looted){
      if(onlineMode){
        Online.claimCell(p.x,p.y).then(ok=>{
          if(ok){ cell.looted=true; _openChest(p); }
        });
      } else { cell.looted=true; _openChest(p); }
    }
  }

  function _openChest(p){
    if(Math.random()<.5){addScore(p.idx,50);showPopup('📦 +50 — الله يبارك!','#FFD700');}
    else{addScore(p.idx,-20);showPopup('📦 -20 — شي غاشي!','#FF5733');}
    Sounds.play.chest();
  }

  // ── Questions ─────────────────────────────────
  function showQuestion(p) {
    const q=getRandomQuestion();
    if(q.isKingQuestion) showKingOverlay(()=>displayQuestion(p,q));
    else displayQuestion(p,q);
  }

  function showKingOverlay(cb) {
    questionActive=true; Sounds.play.royal();
    const ol=$('king-overlay'); ol.classList.remove('hidden');
    setTimeout(()=>{ ol.classList.add('hidden'); cb?.(); },2800);
  }
  function hideKingOverlay(){ $('king-overlay')?.classList.add('hidden'); }

  function showWrongKingOverlay() {
    Sounds.play.wrongKing();
    const ol=$('wrong-king-overlay'); ol.classList.remove('hidden');
    setTimeout(()=>ol.classList.add('hidden'),2500);
  }
  function hideWrongKingOverlay(){ $('wrong-king-overlay')?.classList.add('hidden'); }

  function displayQuestion(p,q) {
    questionActive=true;
    if(!q.isKingQuestion) Sounds.play.question();
    const icons={تاريخ:'📜',دين:'☪️',سياسة:'🏛️',بايخة:'🤪',مضحكة:'😂',ثقافة:'🎭'};
    $('question-category').textContent=(icons[q.category]||'❓')+' '+(q.category||'');
    $('question-text').textContent=q.q;
    $('question-feedback').textContent=''; $('question-feedback').className='question-feedback';
    $('question-badge').textContent=`${q.isKingQuestion?'👑':'❓'} سؤال — ${p.name}`;
    const box=$('question-answers'); box.innerHTML='';
    q.answers.forEach((ans,i)=>{
      const btn=document.createElement('button');
      btn.className='answer-btn arabic-text'; btn.textContent=ans;
      btn.onclick=()=>{
        box.querySelectorAll('.answer-btn').forEach((b,j)=>{b.onclick=null;if(j===q.correct)b.classList.add('correct');});
        const fb=$('question-feedback');
        if(i===q.correct){
          btn.classList.add('correct'); addScore(p.idx,100);
          fb.textContent='✅ صح! +100 نقطة'; fb.className='question-feedback ok';
          Sounds.play.correct();
          setTimeout(()=>{ $('screen-question').classList.remove('active'); questionActive=false; },1800);
        } else {
          btn.classList.add('wrong'); addScore(p.idx,-50);
          fb.textContent='❌ غلط! -50 نقطة'; fb.className='question-feedback bad';
          Sounds.play.wrong();
          if(q.category==='سياسة'){
            setTimeout(()=>{ $('screen-question').classList.remove('active'); showWrongKingOverlay();
              setTimeout(()=>{ questionActive=false; },2600); },800);
          } else {
            setTimeout(()=>{ $('screen-question').classList.remove('active'); questionActive=false; },1800);
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
    const actor=players.find(p=>p.id===who); if(!actor) return;
    const others=players.filter(p=>p.id!==who);
    const nearOther=others.length?others.reduce((n,p)=>Math.hypot(p.x-actor.x,p.y-actor.y)<Math.hypot(n.x-actor.x,n.y-actor.y)?p:n,others[0]):null;
    let result;
    if(action==='punish'||action==='pardon'){if(!nearOther){showPopup('ما فيش حد!','#888');return;}}
    if(action==='punish') result=Interactions.punish(who);
    else if(action==='pardon') result=Interactions.pardon(who);
    else if(action==='help') result=Interactions.help(who);
    else result=Interactions.taunt(who);
    if(!result?.ok){ if(result?.cd) showPopup(`⏳ ${result.cd}s`,'#888'); return; }
    const cv=$('maze-canvas'),rect=cv.getBoundingClientRect(),cs=renderer.cell;
    const bx=rect.left+actor.x*cs+cs/2, by=rect.top+actor.y*cs;
    if(action==='punish'){
      nearOther.frozen=true; nearOther.frozenUntil=Date.now()+result.duration;
      addScore(actor.idx,-20); showPopup(`❄️ ${nearOther.name} تجمّد!`,'#38A0FF'); Sounds.play.punish();
      if(onlineMode) Online.sendEvent('freeze',{targetId:nearOther.id,duration:result.duration});
    } else if(action==='pardon'){
      nearOther.frozen=false; addScore(nearOther.idx,result.pts);
      showPopup(`🤝 +${result.pts}!`,'#2ECC71'); Sounds.play.pardon();
      if(onlineMode) Online.sendEvent('unfreeze',{targetId:nearOther.id});
    } else if(action==='help'){
      const target=nearOther;
      if(target){ target.helpActive=true; target.helpUntil=Date.now()+result.duration; }
      showPopup('💡 رؤية موسّعة!','#FFD700'); Sounds.play.help();
      if(onlineMode) Online.sendEvent('help',{targetId:target?.id,duration:result.duration});
    } else { Sounds.play.taunt(); }
    spawnBubble(result.msg, actor.color, action+'-b', bx, by);
    if(onlineMode) Online.sendEvent('bubble',{msg:result.msg,color:actor.color});
  }

  function spawnBubble(text,color,cls,x,y) {
    Sounds.play.chat();
    const el=document.createElement('div'); el.className=`chat-bubble ${cls}`;
    el.style.borderColor=color; el.style.direction='rtl'; el.textContent=text;
    el.style.left=`${Math.min(x,window.innerWidth-220)}px`;
    el.style.top=`${Math.max(y-75,8)}px`;
    $('chat-layer').appendChild(el); setTimeout(()=>el.remove(),3100);
  }

  // ── HUD ───────────────────────────────────────
  function buildHUD() {
    const hud=$('game-hud'); hud.innerHTML='';
    const p1=players[0];
    let html=`<div class="hud-player-block">
      <div class="hud-avatar" style="color:${p1.color}">${p1.emoji}</div>
      <div><div class="hud-pname arabic-text" style="color:${p1.color}">${p1.name}</div>
      <div class="hud-score">نقاط: <span id="hud-score-${p1.id}">0</span></div></div></div>`;
    html+=`<div class="hud-center"><div class="hud-timer" id="hud-timer">3:00</div>
      <button class="btn btn-ghost small" style="padding:4px 8px;font-size:11px" onclick="Game.pauseToggle()">⏸</button></div>`;
    if(players.length>1){
      const p2=players[1];
      html+=`<div class="hud-player-block right">
        <div class="hud-avatar" style="color:${p2.color}">${p2.emoji}</div>
        <div><div class="hud-pname arabic-text" style="color:${p2.color}">${p2.name}</div>
        <div class="hud-score">نقاط: <span id="hud-score-${p2.id}">0</span></div></div></div>`;
    }
    hud.innerHTML=html;
    $('controls-hint').textContent=players.map(p=>`${p.emoji} ${p.name}`).join('  ·  ');
    let reqBar=$('exit-req-bar');
    if(!reqBar){ reqBar=document.createElement('div'); reqBar.id='exit-req-bar'; reqBar.className='exit-req-bar';
      document.getElementById('screen-game').appendChild(reqBar); }
    updateExitBar();
  }

  function buildInteractionBar() {
    const bar=$('interaction-bar');
    if(players.length<2){ bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    // In online mode, only show my player's buttons
    const myPlayers=onlineMode?players.filter(p=>p.id===myOnlineId):players.filter(p=>!p.remote);
    bar.innerHTML=myPlayers.map(p=>`<div class="ibar-section">
      <span class="ibar-label" style="color:${p.color}">${p.emoji}</span>
      <button class="ibar-btn punish" onclick="Game.doAction('${p.id}','punish')">💀<span class="cd" id="cd-${p.id}-punish"></span></button>
      <button class="ibar-btn pardon" onclick="Game.doAction('${p.id}','pardon')">🤝<span class="cd" id="cd-${p.id}-pardon"></span></button>
      <button class="ibar-btn help"   onclick="Game.doAction('${p.id}','help')">💡<span class="cd" id="cd-${p.id}-help"></span></button>
      <button class="ibar-btn taunt"  onclick="Game.doAction('${p.id}','taunt')">😜<span class="cd" id="cd-${p.id}-taunt"></span></button>
    </div>`).join('');
  }

  function startCdInterval() {
    if(cdInterval) clearInterval(cdInterval);
    cdInterval=setInterval(()=>{
      players.forEach(p=>['punish','pardon','help','taunt'].forEach(a=>{
        const el=$(`cd-${p.id}-${a}`);
        if(el){ const r=Interactions.remaining(p.id,a); el.textContent=r>0?` ${r}s`:''; }
      }));
    },250);
  }

  // ── Score & exit bar ──────────────────────────
  function addScore(pIdx,pts) {
    scores[pIdx]=Math.max(0,(scores[pIdx]||0)+pts);
    updateHUD();
    if(onlineMode) Online.sendScore(scores[pIdx]);
  }

  function updateExitBar() {
    const bar=$('exit-req-bar'); if(!bar) return;
    bar.innerHTML=players.map(p=>{
      const pts=scores[p.idx]||0, pct=Math.min(100,Math.round(pts/MIN_EXIT_SCORE*100));
      const ready=pts>=MIN_EXIT_SCORE;
      return `<div class="exit-player-req${ready?' ready':''}">
        <span>${p.emoji} ${p.name}</span>
        <div class="exit-progress-track"><div class="exit-progress-fill" style="width:${pct}%;background:${ready?'#2ECC71':p.color}"></div></div>
        <span class="exit-pts-label">${pts}/${MIN_EXIT_SCORE}${ready?' ✅':' 🔒'}</span>
      </div>`;
    }).join('');
  }

  function updateHUD() {
    players.forEach(p=>{ const el=$(`hud-score-${p.id}`); if(el) el.textContent=scores[p.idx]||0; });
    updateExitBar();
  }

  function showPopup(text,color) {
    const el=document.createElement('div'); el.className='cell-popup';
    el.textContent=text; el.style.color=color;
    el.style.left='50%'; el.style.top='40%'; el.style.direction='rtl';
    document.body.appendChild(el); setTimeout(()=>el.remove(),1500);
  }

  // ── Timer ─────────────────────────────────────
  function tickTimer() {
    if(paused||questionActive) return;
    timeLeft--;
    const m=Math.floor(timeLeft/60), s=String(timeLeft%60).padStart(2,'0');
    const el=$('hud-timer');
    if(el){ el.textContent=`${m}:${s}`; el.className='hud-timer'+(timeLeft<=30?' urgent':''); }
    if(timeLeft<=10&&timeLeft>0) Sounds.play.tick();
    if(timeLeft<=0) endGame(null);
  }

  // ── End game ──────────────────────────────────
  function endGame(wp) {
    stopGame();
    if(wp) scores[wp.idx]+=timeLeft;
    Sounds.play.victory();
    if(onlineMode&&wp) Online.sendGameOver(wp.name);
    victoryData={ winnerPlayer:wp };
    goTo('victory');
  }

  function stopGame() {
    if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }
    if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
    if(cdInterval){ clearInterval(cdInterval); cdInterval=null; }
    window.removeEventListener('keydown',onKeyDown);
    window.removeEventListener('keyup',onKeyUp);
    document.querySelectorAll('[id^=freeze-]').forEach(e=>e.remove());
    $('interaction-bar')?.classList.add('hidden');
    $('exit-req-bar')?.remove();
    $('dpad-single')?.classList.add('hidden');
    $('dpad-left')?.classList.add('hidden');
    $('dpad-right')?.classList.add('hidden');
    $('touch-actions')?.classList.add('hidden');
    hideKingOverlay(); hideWrongKingOverlay();
  }

  // ── Victory ───────────────────────────────────
  function initVictory() {
    startConfetti();
    if(victoryData?.onlineWinner){
      $('victory-title').textContent=`${victoryData.onlineWinner} ربح! 🏆`;
      $('victory-body').innerHTML=`<div class="vscore-card winner"><div class="vscore-pts">وصل الباب الأول!</div></div>`;
      return;
    }
    const wp=victoryData?.winnerPlayer;
    if(!wp){
      $('victory-title').textContent='⏰ الوقت انتهى!';
      const best=players.reduce((a,b)=>(scores[b.idx]||0)>(scores[a.idx]||0)?b:a,players[0]);
      $('victory-body').innerHTML=`<div class="victory-score-row">${players.map((p,i)=>`
        <div class="vscore-card${p===best?' winner':''}">
          <div class="vscore-emoji">${p.emoji}</div>
          <div class="vscore-name arabic-text" style="color:${p.color}">${p.name}</div>
          <div class="vscore-pts">${scores[i]||0} نقطة</div>
        </div>`).join('<div style="align-self:center;font-size:24px">ضد</div>')}</div>`;
    } else if(players.length===1){
      $('victory-title').textContent='ربحتي! 🏆';
      $('victory-body').innerHTML=`<div class="victory-score-row"><div class="vscore-card winner">
        <div class="vscore-emoji">${wp.emoji}</div>
        <div class="vscore-name arabic-text" style="color:${wp.color}">${wp.name}</div>
        <div class="vscore-pts">${scores[wp.idx]||0} نقطة</div>
      </div></div>`;
    } else {
      $('victory-title').textContent=`${wp.name} ربح! ${wp.emoji}`;
      $('victory-body').innerHTML=`<div class="victory-score-row">${players.map((p,i)=>`
        <div class="vscore-card${p===wp?' winner':''}">
          <div class="vscore-emoji">${p.emoji}</div>
          <div class="vscore-name arabic-text" style="color:${p.color}">${p.name}</div>
          <div class="vscore-pts">${scores[i]||0} نقطة</div>
        </div>`).join('<div style="align-self:center;font-size:24px">ضد</div>')}</div>`;
    }
  }

  function restart() { victoryData=null; playerNames=['','','',''];
    if(onlineMode){ onlineMode=false; Online.cleanup(); } goTo('intro'); }

  function startConfetti() {
    const cv=$('confetti-canvas'),ctx=cv.getContext('2d');
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    const pieces=Array.from({length:100},()=>({
      x:Math.random()*cv.width, y:Math.random()*-cv.height, r:Math.random()*8+4,
      color:['#FF3333','#FFD700','#2ECC71','#FF8C00','#38A0FF'][Math.floor(Math.random()*5)],
      vx:(Math.random()-.5)*3, vy:Math.random()*3+2,
      angle:Math.random()*Math.PI*2, va:(Math.random()-.5)*.1,
    }));
    function tick(){
      if(currentScreen!=='victory') return;
      ctx.clearRect(0,0,cv.width,cv.height);
      pieces.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.angle+=p.va;
        if(p.y>cv.height){ p.y=-10; p.x=Math.random()*cv.width; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
        ctx.fillStyle=p.color; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.5); ctx.restore();
      }); requestAnimationFrame(tick);
    }
    tick();
  }

  function pauseToggle() { paused=!paused; $('overlay-pause').classList.toggle('hidden',!paused); }

  window.addEventListener('DOMContentLoaded',()=>goTo('intro'));

  return { goTo, quit, setMode, toggleSound, startGame, restart, pauseToggle,
           selectOption, doAction, doMyAction, onNameInput,
           goToOnline, onlineCreate, onlineJoin, copyRoomCode, onlineLobbyStart,
           touchStart, touchEnd, touchStart2, touchEnd2 };
})();
