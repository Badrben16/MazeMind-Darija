// ═══════════════════════════════════════════════
//  MAZE GENERATOR — Recursive Backtracker
// ═══════════════════════════════════════════════

const CELL = { NORMAL:0, QUESTION:1, TRAP:2, BONUS:3, CHEST:4, EXIT:5, START:6 };

const CELL_COLORS = {
  [CELL.NORMAL]:   '#1a1030',
  [CELL.QUESTION]: '#1a3a6a',
  [CELL.TRAP]:     '#5a1a1a',
  [CELL.BONUS]:    '#1a4a2a',
  [CELL.CHEST]:    '#4a3a0a',
  [CELL.EXIT]:     '#3a1a5a',
  [CELL.START]:    '#0a2a4a',
};

const CELL_ICONS = {
  [CELL.QUESTION]: '❓',
  [CELL.TRAP]:     '⚠️',
  [CELL.BONUS]:    '⭐',
  [CELL.CHEST]:    '📦',
  [CELL.EXIT]:     '🚪',
  [CELL.START]:    '🏁',
};

class MazeGrid {
  constructor(cols, rows, trapChance = 12, bonusChance = 10, exitX = -1, exitY = -1) {
    this.cols = cols;
    this.rows = rows;
    this.trapChance  = trapChance;
    this.bonusChance = bonusChance;
    this.exitX = exitX >= 0 ? exitX : cols - 1;
    this.exitY = exitY >= 0 ? exitY : rows - 1;
    this.cells = [];
    this._init();
    this._carve(0, 0);
    this._placeSpecials();
  }

  _init() {
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        this.cells[y * this.cols + x] = {
          walls: [true, true, true, true],
          type: CELL.NORMAL, visited: false, looted: false
        };
  }

  get(x, y) { return this.cells[y * this.cols + x]; }

  _carve(x, y) {
    const stack = [[x, y]];
    this.get(x, y).visited = true;
    const dx = [0, 1, 0, -1];
    const dy = [-1, 0, 1, 0];  // N E S W

    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];
      for (let d = 0; d < 4; d++) {
        const nx = cx + dx[d], ny = cy + dy[d];
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && !this.get(nx, ny).visited)
          neighbors.push([nx, ny, d]);
      }
      if (!neighbors.length) { stack.pop(); continue; }
      const [nx, ny, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];
      this.get(cx, cy).walls[dir] = false;
      this.get(nx, ny).walls[(dir + 2) % 4] = false;
      this.get(nx, ny).visited = true;
      stack.push([nx, ny]);
    }
  }

  _placeSpecials() {
    const total = this.cols * this.rows;
    this.get(0, 0).type = CELL.START;
    this.get(this.exitX, this.exitY).type = CELL.EXIT;

    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const c = this.get(x, y);
        if (c.type !== CELL.NORMAL) continue;
        const r = Math.random() * 100;
        const t = this.trapChance;
        const b = t + this.bonusChance;
        if      (r < t)      c.type = CELL.TRAP;
        else if (r < t + 10) c.type = CELL.QUESTION;
        else if (r < b + 10) c.type = CELL.BONUS;
        else if (r < b + 16) c.type = CELL.CHEST;
      }
  }
}

// ═══════════════════════════════════════════════
//  RENDERER
// ═══════════════════════════════════════════════

class MazeRenderer {
  constructor(canvas, maze) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.maze   = maze;
    this.resize();
  }

  resize() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - 110;
    const cellW = Math.floor(maxW / this.maze.cols);
    const cellH = Math.floor(maxH / this.maze.rows);
    this.cell = Math.min(cellW, cellH, 52);
    this.canvas.width  = this.cell * this.maze.cols;
    this.canvas.height = this.cell * this.maze.rows;
  }

  cellCenter(x, y) {
    return [x * this.cell + this.cell / 2, y * this.cell + this.cell / 2];
  }

  draw(players, animOffset, numPlayers = 1) {
    const { ctx, cell, maze } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Build visibility map — union of all players' FOV
    const BASE_FOV = 4.5;
    const alphaMap = new Float32Array(maze.cols * maze.rows);
    players.forEach(p => {
      const fov = p.helpActive ? BASE_FOV * 1.7 : BASE_FOV;
      for (let y = 0; y < maze.rows; y++) {
        for (let x = 0; x < maze.cols; x++) {
          const dist = Math.hypot(x - p.x, y - p.y);
          const a = dist < fov ? 1 : dist < fov + 1.5 ? 1 - (dist - fov) / 1.5 : 0;
          const idx = y * maze.cols + x;
          if (a > alphaMap[idx]) alphaMap[idx] = a;
        }
      }
    });

    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        const alpha = alphaMap[y * maze.cols + x];
        if (alpha <= 0) continue;
        const c = maze.get(x, y);
        ctx.globalAlpha = alpha;
        const px = x * cell, py = y * cell;

        ctx.fillStyle = CELL_COLORS[c.type] || CELL_COLORS[0];
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);

        if (c.type !== CELL.NORMAL && CELL_ICONS[c.type]) {
          ctx.font = `${cell * 0.42}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillText(CELL_ICONS[c.type], px + cell / 2, py + cell / 2);
          ctx.globalAlpha = alpha;
        }

        ctx.strokeStyle = '#38A0FF';
        ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        const [N, E, S, W] = c.walls;
        ctx.beginPath();
        if (N) { ctx.moveTo(px,        py);        ctx.lineTo(px + cell, py); }
        if (E) { ctx.moveTo(px + cell, py);        ctx.lineTo(px + cell, py + cell); }
        if (S) { ctx.moveTo(px,        py + cell); ctx.lineTo(px + cell, py + cell); }
        if (W) { ctx.moveTo(px,        py);        ctx.lineTo(px,        py + cell); }
        ctx.stroke();
      }
    }

    // Draw each player
    players.forEach((player, i) => {
      ctx.globalAlpha = player.frozen ? 0.5 + 0.3 * Math.sin(animOffset * 10) : 1;
      const [px, py] = this.cellCenter(player.x, player.y);
      const offset = Math.sin(animOffset * 4 + i * Math.PI) * 2;

      // Frozen tint
      if (player.frozen) {
        ctx.fillStyle = 'rgba(56,160,255,0.3)';
        ctx.beginPath(); ctx.arc(px, py - offset, cell * 0.55, 0, Math.PI * 2); ctx.fill();
      }

      const grad = ctx.createRadialGradient(px, py - offset, 2, px, py - offset, cell * 0.55);
      grad.addColorStop(0, player.color + 'aa');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py - offset, cell * 0.55, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = player.color;
      ctx.beginPath(); ctx.arc(px, py - offset, cell * 0.32, 0, Math.PI * 2); ctx.fill();

      // Player label (P1/P2) for duo
      if (numPlayers > 1) {
        ctx.globalAlpha = 0.9;
        ctx.font = `bold ${cell * 0.22}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(`P${i+1}`, px, py - offset + cell * 0.44);
      }

      ctx.globalAlpha = player.frozen ? 0.5 : 1;
      ctx.font = `${cell * 0.38}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(player.emoji, px, py - offset);
    });

    // EXIT ring — visible if any player is near
    ctx.globalAlpha = 1;
    const ex = maze.exitX, ey = maze.exitY;
    const nearExit = players.some(p => Math.hypot(ex - p.x, ey - p.y) < BASE_FOV);
    if (nearExit) {
      const [epx, epy] = this.cellCenter(ex, ey);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(animOffset * 3);
      ctx.strokeStyle = '#B44FFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(epx, epy, cell * 0.48, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
