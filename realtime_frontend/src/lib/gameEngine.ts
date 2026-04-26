// gameEngine.ts
// Client-side deterministic physics engine for WebRTC P2P Live Games
//
// FIX: resetPongBall() used Math.random() — replaced with frame-based
// deterministic direction. Both clients share the same frame counter
// so they always agree on the reset direction.

export interface GameState {
  type: string;
  status: 'playing' | 'finished';
  scores: Record<string, number>;
  max_score: number;
  player_a: string;
  player_b: string;
  winner?: string;
  canvas: { width: number; height: number };
}

export interface PongState extends GameState {
  type: 'pong';
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  paddles: Record<string, { y: number; height: number; width: number; x: number; speed: number }>;
}

export interface AirHockeyState extends GameState {
  type: 'air_hockey';
  puck: { x: number; y: number; vx: number; vy: number; radius: number };
  mallets: Record<string, { x: number; y: number; radius: number }>;
  goals: Record<string, { y: number; width: number }>;
}

/** Air Hockey simulation tick (host-authoritative). Used at 30 fps. */
export const TICK_RATE = 1000 / 30;

export function initPongState(player_a: string, player_b: string): PongState {
  return {
    type: 'pong',
    canvas: { width: 800, height: 400 },
    ball: { x: 400, y: 200, vx: 4, vy: 3, radius: 8 },
    paddles: {
      [player_a]: { y: 170, height: 60, width: 10, x: 20, speed: 6 },
      [player_b]: { y: 170, height: 60, width: 10, x: 770, speed: 6 },
    },
    scores: { [player_a]: 0, [player_b]: 0 },
    max_score: 5,
    status: 'playing',
    player_a,
    player_b,
  };
}

export function initAirHockeyState(player_a: string, player_b: string): AirHockeyState {
  return {
    type: 'air_hockey',
    canvas: { width: 600, height: 800 },
    puck: { x: 300, y: 400, vx: 0, vy: 0, radius: 15 },
    mallets: {
      [player_a]: { x: 300, y: 700, radius: 25 }, // Bottom side host
      [player_b]: { x: 300, y: 100, radius: 25 }, // Top side opponent
    },
    goals: {
      [player_a]: { y: 800, width: 200 },
      [player_b]: { y: 0, width: 200 },
    },
    scores: { [player_a]: 0, [player_b]: 0 },
    max_score: 5,
    status: 'playing',
    player_a,
    player_b,
  };
}

// Frame counter for deterministic ball resets across both peers
let _pongResetCounter = 0;

export function updatePong(state: PongState): void {
  if (state.status !== 'playing') return;

  const { ball, canvas, paddles, player_a, player_b } = state;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
    ball.vy = -ball.vy;
    ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
  }

  // Paddle A
  const pA = paddles[player_a];
  if (
    ball.x - ball.radius <= pA.x + pA.width &&
    ball.x - ball.radius >= pA.x &&
    ball.y >= pA.y &&
    ball.y <= pA.y + pA.height
  ) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    ball.vy = ((ball.y - pA.y) / pA.height - 0.5) * 8;
  }

  // Paddle B
  const pB = paddles[player_b];
  if (
    ball.x + ball.radius >= pB.x &&
    ball.x + ball.radius <= pB.x + pB.width &&
    ball.y >= pB.y &&
    ball.y <= pB.y + pB.height
  ) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    ball.vy = ((ball.y - pB.y) / pB.height - 0.5) * 8;
  }

  // Scoring
  if (ball.x - ball.radius <= 0) {
    state.scores[player_b] += 1;
    resetPongBall(state, 1);
  } else if (ball.x + ball.radius >= canvas.width) {
    state.scores[player_a] += 1;
    resetPongBall(state, -1);
  }

  // Speed cap
  const maxSpeed = 12;
  ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vx));
  ball.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vy));

  // Win condition
  if (state.scores[player_a] >= state.max_score || state.scores[player_b] >= state.max_score) {
    state.status = 'finished';
    state.winner = state.scores[player_a] >= state.max_score ? player_a : player_b;
  }
}

/**
 * Deterministic ball reset — no Math.random().
 * Both peers share the same frame counter so they always agree.
 */
function resetPongBall(state: PongState, lastScorerDirection: number): void {
  state.ball.x = state.canvas.width / 2;
  state.ball.y = state.canvas.height / 2;
  // Serve toward whoever just conceded the point
  state.ball.vx = lastScorerDirection * 4;
  // Deterministic y velocity alternates: +3, -3, +3, -3 …
  _pongResetCounter++;
  state.ball.vy = (_pongResetCounter % 2 === 0 ? 3 : -3);
}

export function updateAirHockey(state: AirHockeyState): void {
  if (state.status !== 'playing') return;

  const { puck, canvas, mallets, player_a, player_b } = state;

  puck.vx *= 0.99;
  puck.vy *= 0.99;
  puck.x += puck.vx;
  puck.y += puck.vy;

  if (puck.x - puck.radius <= 0 || puck.x + puck.radius >= canvas.width) {
    puck.vx = -puck.vx * 0.9;
    puck.x = Math.max(puck.radius, Math.min(canvas.width - puck.radius, puck.x));
  }

  [player_a, player_b].forEach((pid) => {
    const m = mallets[pid];
    const dx = puck.x - m.x;
    const dy = puck.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < puck.radius + m.radius && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      puck.vx = nx * 8;
      puck.vy = ny * 8;
      const overlap = puck.radius + m.radius - dist;
      puck.x += nx * overlap;
      puck.y += ny * overlap;
    }
  });

  const goalCenter = canvas.width / 2;

  // Top wall / Player B's goal (y=0)
  if (puck.y - puck.radius <= 0) {
    const goalHalfWidth = (state.goals[player_b]?.width || 200) / 2;
    if (Math.abs(puck.x - goalCenter) < goalHalfWidth) {
      state.scores[player_a] += 1; // Player A scores into Player B's goal at top
      resetAirHockeyPuck(state);
    } else {
      puck.vy = Math.abs(puck.vy);
    }
  }

  // Bottom wall / Player A's goal (y=canvas.height)
  if (puck.y + puck.radius >= canvas.height) {
    const goalHalfWidth = (state.goals[player_a]?.width || 200) / 2;
    if (Math.abs(puck.x - goalCenter) < goalHalfWidth) {
      state.scores[player_b] += 1; // Player B scores into Player A's goal at bottom
      resetAirHockeyPuck(state);
    } else {
      puck.vy = -Math.abs(puck.vy);
    }
  }

  if (state.scores[player_a] >= state.max_score || state.scores[player_b] >= state.max_score) {
    state.status = 'finished';
    state.winner = state.scores[player_a] >= state.max_score ? player_a : player_b;
  }
}

function resetAirHockeyPuck(state: AirHockeyState): void {
  state.puck.x = state.canvas.width / 2;
  state.puck.y = state.canvas.height / 2;
  state.puck.vx = 0;
  state.puck.vy = 0;
}