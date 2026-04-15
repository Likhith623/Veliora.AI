//sandbox -> page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FixedPointEngine, FPPongState, FP_MULT } from '@/lib/FixedPointEngine';

export default function SandboxPage() {
    // State purely for React UI hooks (not 60fps)
    const [frameCounts, setFrameCounts] = useState<{ e1: number, e2: number }>({ e1: 0, e2: 0 });
    const [snapshot, setSnapshot] = useState<FPPongState | null>(null);
    const [rollbackMsg, setRollbackMsg] = useState('');

    // Refs
    // 1. Two separate engines representing two peers
    const engine1Ref = useRef<FixedPointEngine | null>(null);
    const engine2Ref = useRef<FixedPointEngine | null>(null);
    
    // Canvas contexts
    const c1Ref = useRef<HTMLCanvasElement>(null);
    const c2Ref = useRef<HTMLCanvasElement>(null);

    // Anim Ref
    const loopRef = useRef<number>(0);

    // Init phase
    useEffect(() => {
        if (!engine1Ref.current) engine1Ref.current = new FixedPointEngine();
        if (!engine2Ref.current) engine2Ref.current = new FixedPointEngine();
        
        loopRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(loopRef.current);
    }, []);

    // Core Loop for the sandbox
    const gameLoop = useCallback((timestamp: number) => {
        if (!engine1Ref.current || !engine2Ref.current) return;

        // Step 1: Simulated Inputs for testing.
        // We'll create a deterministic "bot" that moves up and down based on the frame.
        // This ensures the exact same input is fed to both engines.
        const frame = engine1Ref.current.getState().frame;
        // P1 moves up and down
        let p1Input = 300 + Math.sin(frame * 0.05) * 200; 
        // P2 follows the ball pseudo-randomly but deterministically
        let p2Input = 300 + Math.cos(frame * 0.03) * 150;

        // Both engines process identical inputs
        engine1Ref.current.update(p1Input, p2Input);
        engine2Ref.current.update(p1Input, p2Input);

        // Render both
        drawEngine(engine1Ref.current, c1Ref.current, '#ec4899'); // Pink
        drawEngine(engine2Ref.current, c2Ref.current, '#3b82f6'); // Blue

        // Occasionally update React state to see frame sync visually
        if (frame % 30 === 0) {
            setFrameCounts({
                e1: engine1Ref.current.getState().frame,
                e2: engine2Ref.current.getState().frame,
            });
        }

        loopRef.current = requestAnimationFrame(gameLoop);
    }, []);

    // Shared Drawing function converting FP -> Float for rendering ONLY
    const drawEngine = (engine: FixedPointEngine, canvas: HTMLCanvasElement | null, color: string) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const state = engine.getState();
        const c = state.canvas; // Still in FP, we need to divide

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Logical is 800x600

        // Center dash
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        ctx.setLineDash([]);
        
        ctx.fillStyle = '#fff';

        // Paddles
        const p1 = state.paddles.p1;
        ctx.fillStyle = color;
        ctx.fillRect(p1.x / FP_MULT, p1.y / FP_MULT, p1.width / FP_MULT, p1.height / FP_MULT);

        const p2 = state.paddles.p2;
        ctx.fillStyle = color;
        ctx.fillRect(p2.x / FP_MULT, p2.y / FP_MULT, p2.width / FP_MULT, p2.height / FP_MULT);

        // Ball
        const b = state.ball;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(b.x / FP_MULT, b.y / FP_MULT, b.radius / FP_MULT, 0, Math.PI * 2);
        ctx.fill();
    };


    // --- The Snapshot Test & Rollback Actions ---
    
    // Save Frame Snapshot
    const handleTakeSnapshot = () => {
        if (engine1Ref.current) {
            const snap = engine1Ref.current.saveState();
            setSnapshot(snap);
            setRollbackMsg(`Snapshot taken at Frame: ${snap.frame}`);
        }
    };

    // The "Slow-Motion" Rollback Test
    // Simulates an architecture rewinding state and quickly simulating forward
    const handlePerformRollbackTest = () => {
        if (!snapshot || !engine1Ref.current || !engine2Ref.current) {
            setRollbackMsg('Take snapshot first!');
            return;
        }

        // Save current frame for logging
        const targetFrame = engine2Ref.current.getState().frame; // Usually engine 2 represents the host or target

        // Rewind Engine 1 back to Snapshot Frame
        engine1Ref.current.loadState(snapshot);
        const rewoundFrame = engine1Ref.current.getState().frame;

        // Perform fast-forward resimulation (Input replay)
        // Since we used a deterministic formula for input (Math.sin via frame num), we can replay it perfectly.
        const framesToSimulate = targetFrame - rewoundFrame;
        
        for (let i = 0; i < framesToSimulate; i++) {
            const tempFrame = engine1Ref.current.getState().frame;
            let p1Input = 300 + Math.sin(tempFrame * 0.05) * 200; 
            let p2Input = 300 + Math.cos(tempFrame * 0.03) * 150;
            engine1Ref.current.update(p1Input, p2Input);
        }

        const rebuiltFrame = engine1Ref.current.getState().frame;

        // Verify checksum basically implies: Did the state diverge?
        // Let's do a basic JSON compare
        const E1StateOut = JSON.stringify(engine1Ref.current.saveState());
        const E2StateOut = JSON.stringify(engine2Ref.current.saveState());

        if (E1StateOut === E2StateOut) {
            setRollbackMsg(`✅ Rollback Success! Resimulated ${framesToSimulate} frames perfectly in 0ms. Hash matched.`);
        } else {
            console.warn("MISMATCH", E1StateOut, E2StateOut);
            setRollbackMsg(`❌ Rollback Failed! Butterfly Effect drift detected.`);
        }
    };

    return (
        <div className="min-h-screen bg-black/90 text-white p-8 flex flex-col items-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500 mb-8 flex flex-col items-center">
                <span>Phase 5: The Sandbox Engine</span>
                <span className="text-sm font-mono mt-2 text-gray-400 tracking-widest">(Fixed-Point & Rollback Prototyping)</span>
            </h1>

            {/* Metrics */}
            <div className="flex gap-10 mb-8 border border-white/20 p-6 rounded-xl bg-white/5">
                <div className="text-center">
                    <div className="text-xs uppercase text-pink-400 font-bold">Engine 1 (Local) Frame</div>
                    <div className="text-4xl font-mono mt-2">{frameCounts.e1}</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div className="text-center">
                    <div className="text-xs uppercase text-blue-400 font-bold">Engine 2 (Remote) Frame</div>
                    <div className="text-4xl font-mono mt-2">{frameCounts.e2}</div>
                </div>
            </div>

            {/* Side-by-side Canvases */}
            <div className="flex gap-8 flex-wrap justify-center w-full mb-10">
                <div className="flex flex-col items-center">
                   <h2 className="text-pink-400 font-bold mb-3 tracking-widest uppercase">Engine 1 View</h2>
                   {/* We assume logical 800x600 in JS, map via CSS */}
                   <canvas ref={c1Ref} width={800} height={600} className="w-[400px] h-[300px] sm:w-[600px] sm:h-[450px] border-4 border-pink-500/50 rounded-lg shadow-[0_0_20px_rgba(236,72,153,0.3)] bg-black" />
                </div>
                
                <div className="flex flex-col items-center">
                   <h2 className="text-blue-400 font-bold mb-3 tracking-widest uppercase">Engine 2 View</h2>
                   <canvas ref={c2Ref} width={800} height={600} className="w-[400px] h-[300px] sm:w-[600px] sm:h-[450px] border-4 border-blue-500/50 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-black" />
                </div>
            </div>

            {/* Test Actions */}
            <div className="flex flex-col items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <h3 className="text-xl font-bold mb-2">The Snapshot & Rollback Test</h3>
                 <div className="flex gap-4">
                     <button onClick={handleTakeSnapshot} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded font-bold transition">
                         1. Take State Snapshot
                     </button>
                     <button onClick={handlePerformRollbackTest} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded font-bold transition">
                         2. Simulate Latency Rewind (Fast-Forward to Now)
                     </button>
                 </div>
                 
                 <div className={`mt-4 font-mono text-sm py-2 px-4 rounded ${rollbackMsg.includes('✅') ? 'bg-green-500/20 text-green-300' : rollbackMsg.includes('❌') ? 'bg-red-500/20 text-red-300' : 'text-gray-400'}`}>
                     {rollbackMsg || "Waiting for snapshot..."}
                 </div>
            </div>

            <p className="mt-8 text-gray-500 text-sm max-w-2xl text-center leading-relaxed">
              <strong>Rules of Rollback:</strong> Both canvases must render identical outputs infinitely. No `Math.random()` or Float arithmetic. 
              The Rollback test verifies that we can save the internal memory array, step Engine 1 back in time mathematically, re-apply historical inputs inside a `while` loop synchronously, and re-arrive at the exact same JSON deterministic state tree.
            </p>
        </div>
    );
}
