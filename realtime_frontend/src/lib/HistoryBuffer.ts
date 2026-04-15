// HistoryBuffer.ts
import { FPPongState } from './FixedPointEngine';

export interface PlayerInput {
    y: number | null; // Fixed-point target Y coordinate for the paddle
}

export interface FrameData {
    state: FPPongState | null; // The deterministic fixed-point state at this frame
    localInput: PlayerInput;   // Inputs captured from local player
    remoteInput: PlayerInput;  // Inputs received from remote player (or predicted)
    isConfirmed: boolean;      // True if remoteInput represents actual received data
}

/**
 * Phase 6: The Chronos Buffer
 * A fixed-size circular buffer for storing a sliding window of game states and inputs.
 * Avoids garbage collection overhead compared to standard array pushing/shifting.
 */
export class HistoryBuffer {
    private readonly SIZE = 60; // 1-second history buffer at 60 FPS
    private buffer: FrameData[];
    
    // The highest frame number where we have CONFIRMED inputs from both players.
    // Anything past this frame is speculative and subject to rollback.
    private lastConfirmedFrame: number = 0;

    constructor() {
        // Initialize a 60-element fixed array
        this.buffer = new Array(this.SIZE);
        for (let i = 0; i < this.SIZE; i++) {
            this.buffer[i] = {
                state: null,
                localInput: { y: null },
                remoteInput: { y: null },
                isConfirmed: false
            };
        }
    }

    /**
     * Resolves the circular index for any given frame.
     */
    private getIndex(frame: number): number {
        // Handle negative frames gracefully if they ever occur by wrapping positively
        return ((frame % this.SIZE) + this.SIZE) % this.SIZE;
    }

    /**
     * Saves the deterministic state resulting from simulating `frame`.
     */
    public saveState(frame: number, state: FPPongState): void {
        const idx = this.getIndex(frame);
        this.buffer[idx].state = state; // We assume the engine gave us a deep copy
    }

    /**
     * Retrieves the saved state for a given frame, if it exists.
     */
    public getState(frame: number): FPPongState | null {
        return this.buffer[this.getIndex(frame)].state;
    }

    /**
     * Retrieves the entire FrameData object for inspection.
     */
    public getFrameData(frame: number): FrameData {
        return this.buffer[this.getIndex(frame)];
    }

    /**
     * Adds the local player's input for a specific frame.
     * This is always confirmed.
     */
    public addLocalInput(frame: number, input: PlayerInput): void {
        const idx = this.getIndex(frame);
        this.buffer[idx].localInput = input;
    }

    /**
     * Adds the remote player's input.
     * If this is late-arriving UDP data, we evaluate if our prediction was wrong.
     * Returns true if a rollback is required.
     */
    public addRemoteInput(frame: number, input: PlayerInput, isConfirmed: boolean): boolean {
        const idx = this.getIndex(frame);
        const frameData = this.buffer[idx];

        let requiresRollback = false;

        // If we are applying confident network data over a frame we previously predicted:
        if (isConfirmed && !frameData.isConfirmed) {
            // Did our prediction mismatch reality?
            if (frameData.remoteInput.y !== input.y) {
                requiresRollback = true;
            }
            
            // Advance our last confirmed frame marker if possible
            // (Assumes inputs arrive roughly sequentially)
            if (frame > this.lastConfirmedFrame) {
                this.lastConfirmedFrame = frame;
            }
        }

        // Overwrite with the latest data (either our prediction or actual remote)
        frameData.remoteInput = input;
        frameData.isConfirmed = isConfirmed;

        return requiresRollback;
    }

    /**
     * Predicts the remote input based on the last known frame.
     * This simulates the "Zero Latency" feel.
     */
    public predictRemoteInput(frame: number): PlayerInput {
        // If we don't have remote input for `frame`, guess that it's the exact
        // same as `frame - 1`. 
        const prevIdx = this.getIndex(frame - 1);
        const prevInput = this.buffer[prevIdx].remoteInput;
        
        return { y: prevInput.y };
    }

    public getLastConfirmedFrame(): number {
        return this.lastConfirmedFrame;
    }
}
