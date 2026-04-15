//fixedpointengine.ts
export const FP_MULT = 10000; // 4-decimal place fixed-point multiplier

export interface FPPongState {
    frame: number;
    ball: { 
        x: number; 
        y: number; 
        vx: number; 
        vy: number; 
        radius: number; 
    };
    paddles: {
        p1: { x: number; y: number; width: number; height: number };
        p2: { x: number; y: number; width: number; height: number };
    };
    canvas: { width: number; height: number };
    scores: { p1: number; p2: number };
}

// Helper math for explicit fixed-point arithmetic if needed
export const fpAdd = (a: number, b: number) => a + b;
export const fpSub = (a: number, b: number) => a - b;
export const fpMul = (a: number, b: number) => Math.floor((a * b) / FP_MULT);
export const fpDiv = (a: number, b: number) => Math.floor((a * FP_MULT) / b);

export class FixedPointEngine {
    private state: FPPongState;

    constructor(initialState?: FPPongState) {
        if (initialState) {
            this.state = this.deepCopy(initialState);
        } else {
            this.state = this.getInitialState();
        }
    }

    private getInitialState(): FPPongState {
        return {
            frame: 0,
            ball: {
                x: 400 * FP_MULT,
                y: 200 * FP_MULT,
                vx: 5 * FP_MULT, // 5 pixels per frame
                vy: 5 * FP_MULT,
                radius: 8 * FP_MULT
            },
            canvas: { width: 800 * FP_MULT, height: 400 * FP_MULT },
            paddles: {
                p1: { x: 20 * FP_MULT, y: 150 * FP_MULT, width: 10 * FP_MULT, height: 60 * FP_MULT },
                p2: { x: 770 * FP_MULT, y: 150 * FP_MULT, width: 10 * FP_MULT, height: 60 * FP_MULT }
            },
            scores: { p1: 0, p2: 0 }
        };
    }

    // Step 2: The Snapshot Test
    // Perfect deterministic serialization
    public saveState(): FPPongState {
        return this.deepCopy(this.state);
    }

    public loadState(state: FPPongState): void {
        this.state = this.deepCopy(state);
    }

    public getState(): FPPongState {
        return this.state;
    }

    // Helper for absolute clone
    private deepCopy(state: FPPongState): FPPongState {
        // Since state is basic JSON, this works perfectly. 
        // More performant engines might copy typed arrays or class properties inline.
        return {
            frame: state.frame,
            ball: { ...state.ball },
            paddles: {
                p1: { ...state.paddles.p1 },
                p2: { ...state.paddles.p2 }
            },
            canvas: { ...state.canvas },
            scores: { ...state.scores }
        };
    }

    // Input Y is passed in already converted to FP internally.
    public update(p1TargetY: number | null, p2TargetY: number | null): void {
        const p1 = this.state.paddles.p1;
        const p2 = this.state.paddles.p2;
        const b = this.state.ball;
        const c = this.state.canvas;

        // 1. Process inputs deterministically
        if (p1TargetY !== null) {
            const fpY = p1TargetY;
            p1.y = Math.min(Math.max(0, fpY), c.height - p1.height);
        }
        if (p2TargetY !== null) {
            const fpY = p2TargetY;
            p2.y = Math.min(Math.max(0, fpY), c.height - p2.height);
        }

        // 2. Step Physics (Linear integration using integers)
        b.x += b.vx;
        b.y += b.vy;

        // 3. Collision Detection (Integers entirely prevent floating point drift across devices)

        // Top/Bottom Walls
        if (b.y - b.radius <= 0) {
            b.y = b.radius; // Resolve penetration
            b.vy = -b.vy;   // Bounce
        } else if (b.y + b.radius >= c.height) {
            b.y = c.height - b.radius;
            b.vy = -b.vy;
        }

        // Paddles (AABB + Circle approximation using basic bounds for strict determinism)
        // Check P1 (Left)
        if (b.x - b.radius <= p1.x + p1.width && 
            b.x + b.radius >= p1.x &&
            b.y >= p1.y && 
            b.y <= p1.y + p1.height) {
                
            if (b.vx < 0) {
                b.vx = -b.vx; // Bounce
                b.x = p1.x + p1.width + b.radius; // Resolve
                // Add minor deterministic "spin/english" based on paddle hit location
                // No floats!
                const centerPaddle = p1.y + p1.height / 2; // integer division rounds in JS normally but let's use Math.floor
                const hitOffset = b.y - Math.floor(centerPaddle);
                // Adjust vy proportionally deterministically
                b.vy = b.vy + fpMul(hitOffset, Math.floor(0.15 * FP_MULT));
            }
        }

        // Check P2 (Right)
        if (b.x + b.radius >= p2.x && 
            b.x - b.radius <= p2.x + p2.width &&
            b.y >= p2.y && 
            b.y <= p2.y + p2.height) {
                
            if (b.vx > 0) {
                b.vx = -b.vx; // Bounce
                b.x = p2.x - b.radius; // Resolve
                const centerPaddle = p2.y + p2.height / 2;
                const hitOffset = b.y - Math.floor(centerPaddle);
                b.vy = b.vy + fpMul(hitOffset, Math.floor(0.15 * FP_MULT));
            }
        }

        // 4. Score boundaries
        if (b.x - b.radius <= 0) {
            this.state.scores.p2++;
            this.resetBall(1);
        } else if (b.x + b.radius >= c.width) {
            this.state.scores.p1++;
            this.resetBall(-1);
        }

        // 5. Increment Frame Step
        this.state.frame++;
    }

    // Deterministic reset, absolutely NO Math.random() allowed in Rollback engines.
    private resetBall(direction: number): void {
        this.state.ball.x = 400 * FP_MULT;
        this.state.ball.y = 200 * FP_MULT;
        this.state.ball.vx = direction * 5 * FP_MULT;
        // Deterministic pseudo-random y velocity based on frame count
        const pseudoRand = (this.state.frame % 3) - 1; // -1, 0, 1
        this.state.ball.vy = pseudoRand === 0 ? 4 * FP_MULT : pseudoRand * 5 * FP_MULT;
    }
}
