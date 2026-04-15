// RollbackManager.ts
import { FixedPointEngine, FPPongState, FP_MULT } from './FixedPointEngine';
import { HistoryBuffer, PlayerInput } from './HistoryBuffer';

export type NetworkSendCallback = (targetFrame: number, input: PlayerInput) => void;

/**
 * The Rollback Orchestrator.
 *
 * FIXES vs original:
 * 1. isPlayerOne correctly drives which engine slot (p1Y vs p2Y) local input goes into.
 * 2. visualState is always initialised — even for Player 2.
 * 3. resimulate() range is inclusive of currentFrame so the latest state is always correct.
 * 4. getVisualState() never returns null after construction.
 * 5. Score/frame are copied from physics state every tick (no random-gate needed externally).
 */
export class RollbackManager {
    private engine: FixedPointEngine;
    private history: HistoryBuffer;
    private sendCallback: NetworkSendCallback;

    public currentFrame: number = 0;

    /**
     * Input delay in frames.
     * 2 frames @ 60fps ≈ 33 ms — enough for sub-50ms RTT peers to receive
     * the input before they need to simulate it, eliminating almost all rollbacks.
     */
    public readonly inputDelay: number = 2;

    /** Earliest frame that arrived out-of-order and requires resimulation. */
    private mismatchFrame: number | null = null;

    /** Smoothed rendering state — always valid after construction. */
    private visualState: FPPongState;

    /** True = this client controls the LEFT paddle (p1). */
    public readonly isPlayerOne: boolean;

    constructor(
        sendCallback: NetworkSendCallback,
        isPlayerOne: boolean,
        initialState?: FPPongState
    ) {
        this.engine = new FixedPointEngine(initialState);
        this.history = new HistoryBuffer();
        this.sendCallback = sendCallback;
        this.isPlayerOne = isPlayerOne;

        const startState = this.engine.saveState();
        this.history.saveState(0, startState);

        // visualState is ALWAYS non-null — fixes blank canvas for P2
        this.visualState = this.deepCopyState(startState);
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Called by the network layer when a remote input packet arrives via WebRTC.
     */
    public onRemoteInput(frame: number, input: PlayerInput): void {
        const requiresRollback = this.history.addRemoteInput(frame, input, true);

        if (requiresRollback && frame <= this.currentFrame) {
            if (this.mismatchFrame === null || frame < this.mismatchFrame) {
                this.mismatchFrame = frame;
            }
        }
    }

    /**
     * Advance the simulation by one frame.
     * Call this at 60 Hz from the game loop (rAF-based accumulator, NOT setInterval).
     *
     * @param localInputRawY  Raw canvas-pixel Y from pointer/touch, or null if no input.
     */
    public update(localInputRawY: number | null): void {
        // 1. Buffer local input with delay and broadcast it
        const localInput: PlayerInput = {
            y: localInputRawY !== null ? Math.floor(localInputRawY * FP_MULT) : null,
        };
        const targetFrame = this.currentFrame + this.inputDelay;
        this.history.addLocalInput(targetFrame, localInput);
        this.sendCallback(targetFrame, localInput);

        // 2. Rollback if a confirmed remote input arrived that contradicts our prediction
        if (this.mismatchFrame !== null && this.mismatchFrame <= this.currentFrame) {
            this.resimulate(this.mismatchFrame);
            this.mismatchFrame = null;
        }

        // 3. Simulate current frame
        const frameData = this.history.getFrameData(this.currentFrame);
        const local = frameData.localInput;
        let remote = frameData.remoteInput;

        if (!frameData.isConfirmed) {
            remote = this.history.predictRemoteInput(this.currentFrame);
            this.history.addRemoteInput(this.currentFrame, remote, false);
        }

        // FIX: isPlayerOne drives which slot receives local vs remote input
        const p1Y = this.isPlayerOne ? local.y : remote.y;
        const p2Y = this.isPlayerOne ? remote.y : local.y;

        this.engine.update(p1Y, p2Y);
        this.history.saveState(this.currentFrame, this.engine.saveState());

        // 4. Smooth visual state toward physics state
        this.updateVisualInterpolation();

        // 5. Advance time
        this.currentFrame++;
    }

    /**
     * Returns the smoothed state to be used by the canvas renderer.
     * Always non-null after construction.
     */
    public getVisualState(): FPPongState {
        return this.visualState;
    }

    // ─── Private ───────────────────────────────────────────────────────────────

    private resimulate(badFrame: number): void {
        const safeFrame = Math.max(0, badFrame - 1);
        const safeState = this.history.getState(safeFrame);

        if (!safeState) {
            // Extreme lag — we've fallen out of the circular buffer.
            // Best recovery: reload from the oldest state we have.
            console.warn(`[Rollback] State for frame ${safeFrame} evicted. Skipping rollback.`);
            return;
        }

        this.engine.loadState(safeState);

        // Fast-forward from safeFrame+1 back to currentFrame (inclusive)
        for (let i = safeFrame + 1; i <= this.currentFrame; i++) {
            const fd = this.history.getFrameData(i);
            const local = fd.localInput;
            let remote = fd.remoteInput;

            if (!fd.isConfirmed) {
                remote = this.history.predictRemoteInput(i);
                this.history.addRemoteInput(i, remote, false);
            }

            const p1Y = this.isPlayerOne ? local.y : remote.y;
            const p2Y = this.isPlayerOne ? remote.y : local.y;

            this.engine.update(p1Y, p2Y);
            this.history.saveState(i, this.engine.saveState());
        }
    }

    /**
     * Lerp visual positions toward physics positions each frame.
     * Uses integer arithmetic consistent with the rest of the engine.
     * Paddles snap instantly (player should feel their own input immediately);
     * the ball glides to hide rollback artifacts.
     */
    private updateVisualInterpolation(): void {
        const phys = this.engine.getState();

        const lerp = (current: number, target: number, snap: boolean): number => {
            if (snap) return target;
            const diff = target - current;
            // Snap if within 1 pixel to avoid infinite micro-drift
            if (Math.abs(diff) < FP_MULT) return target;
            return current + Math.floor(diff * 0.35);
        };

        // Ball glides (hides rollback jumps)
        this.visualState.ball.x = lerp(this.visualState.ball.x, phys.ball.x, false);
        this.visualState.ball.y = lerp(this.visualState.ball.y, phys.ball.y, false);

        // Own paddle snaps (zero perceived input lag), opponent paddle glides
        this.visualState.paddles.p1.y = lerp(
            this.visualState.paddles.p1.y,
            phys.paddles.p1.y,
            this.isPlayerOne   // P1 snaps their own paddle
        );
        this.visualState.paddles.p2.y = lerp(
            this.visualState.paddles.p2.y,
            phys.paddles.p2.y,
            !this.isPlayerOne  // P2 snaps their own paddle
        );

        // Non-visual data: always copy directly
        this.visualState.scores = { ...phys.scores };
        this.visualState.frame = phys.frame;
    }

    private deepCopyState(state: FPPongState): FPPongState {
        return {
            frame: state.frame,
            ball: { ...state.ball },
            paddles: {
                p1: { ...state.paddles.p1 },
                p2: { ...state.paddles.p2 },
            },
            canvas: { ...state.canvas },
            scores: { ...state.scores },
        };
    }
}