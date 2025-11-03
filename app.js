// =================================================================
// ANIMATION AND CONTROL LOGIC MODULE (app.js)
// Handles UI, state, and visualization. Imports algorithm logic.
// =================================================================

import { generateTraceFIFO, generateTraceLRU, generateTraceOptimal, generateTraceClock } from './algorithms.js';

// --- GLOBAL STATE & CONSTANTS ---
let canvas, ctx;
let simulationTrace = [];
let currentStep = -1;
let isPlaying = false;
let animationInterval = null;
let animationSpeed = 1000;

const FRAME_HEIGHT = 80;
const FRAME_WIDTH = 120;
const MARGIN = 10;

// Theme Colors (Must match Tailwind config in index.html for UI consistency)
const COLOR_BG = '#1a1a1a';
const COLOR_FRAME = '#2a2a2a';
const COLOR_ACCENT = '#00ffff';
const COLOR_HIGHLIGHT_TEXT = '#00ffff';
const COLOR_HIT = '#00ff00';
const COLOR_FAULT = '#ff3333';
const COLOR_TEXT_PRIMARY = '#e0e0e0';
const COLOR_TEXT_SECONDARY = '#ff00ff';
const COLOR_WARNING = '#ffff00';


// --- CANVAS RENDERING ---

/** Initializes the canvas and context. */
function initCanvas() {
    canvas = document.getElementById('visualization-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

/** Resizes the canvas to fill its container width responsively. */
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const newHeight = (containerWidth / 800) * 600;

    canvas.style.width = containerWidth + 'px';
    canvas.style.height = newHeight + 'px';

    canvas.width = 800;
    canvas.height = 600;
}

/** The main drawing function that renders the current simulation state. */
function draw() {
    if (!ctx) return;

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentStep < 0 || simulationTrace.length === 0) {
        drawInitialState();
        return;
    }

    const state = simulationTrace[currentStep];
    const frameState = state.frameState;
    const currentRef = state.reference;
    const action = state.action;
    const algorithm = document.getElementById('algorithm').value;

    const totalFrames = frameState.length;
    const startX = (canvas.width - totalFrames * (FRAME_WIDTH + MARGIN)) / 2 + MARGIN / 2;
    const startY = 150;

    // 1. Draw Memory Frames
    for (let i = 0; i < totalFrames; i++) {
        const page = frameState[i];
        const x = startX + i * (FRAME_WIDTH + MARGIN);
        const y = startY;

        // Frame box (base style)
        ctx.strokeStyle = COLOR_ACCENT;
        ctx.lineWidth = 2;
        ctx.fillStyle = COLOR_FRAME;
        ctx.roundRect(x, y, FRAME_WIDTH, FRAME_HEIGHT, 5);
        ctx.fill();
        ctx.stroke();

        // Highlight for replacement
        if (action === 'REPLACEMENT' && state.replacedFrameIndex === i) {
            ctx.strokeStyle = COLOR_FAULT;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Page Number Text (glowing effect)
        ctx.fillStyle = COLOR_HIGHLIGHT_TEXT;
        ctx.font = '36px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = page === null ? '...' : page.toString();
        ctx.fillText(text, x + FRAME_WIDTH / 2, y + FRAME_HEIGHT / 2);
        ctx.shadowColor = COLOR_HIGHLIGHT_TEXT;
        ctx.shadowBlur = 8;
        ctx.fillText(text, x + FRAME_WIDTH / 2, y + FRAME_HEIGHT / 2);
        ctx.shadowBlur = 0;

        // FIFO/Clock Pointer
        if ((algorithm === 'FIFO' || algorithm === 'Clock') && state.pointer === i) {
            ctx.fillStyle = COLOR_HIGHLIGHT_TEXT;
            ctx.beginPath();
            ctx.moveTo(x + FRAME_WIDTH / 2, y + FRAME_HEIGHT + 5);
            ctx.lineTo(x + FRAME_WIDTH / 2 + 10, y + FRAME_HEIGHT + 20);
            ctx.lineTo(x + FRAME_WIDTH / 2 - 10, y + FRAME_HEIGHT + 20);
            ctx.closePath();
            ctx.fill();
            ctx.shadowColor = COLOR_HIGHLIGHT_TEXT;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = COLOR_HIGHLIGHT_TEXT;
            ctx.font = '16px "Roboto Mono"';
            ctx.fillText('POINTER', x + FRAME_WIDTH / 2, y + FRAME_HEIGHT + 35);
        }

        // Clock Reference Bit
        if (algorithm === 'Clock' && page !== null) {
            const refBit = state.refBits[i] || 0;
            const bitColor = refBit === 1 ? COLOR_HIT : COLOR_TEXT_PRIMARY;
            ctx.fillStyle = bitColor;
            ctx.font = '14px "Roboto Mono"';
            ctx.fillText(`R:${refBit}`, x + FRAME_WIDTH - 25, y + 15);
            if (refBit === 1) {
                ctx.shadowColor = COLOR_HIT;
                ctx.shadowBlur = 5;
                ctx.fillText(`R:${refBit}`, x + FRAME_WIDTH - 25, y + 15);
                ctx.shadowBlur = 0;
            }
        }

        // LRU Age
        if (algorithm === 'LRU' && page !== null) {
            const age = state.lruAges[i] || 0;
            ctx.fillStyle = COLOR_WARNING;
            ctx.font = '14px "Roboto Mono"';
            ctx.fillText(`AGE:${age}`, x + 25, y + 15);
        }
    }

    // 2. Draw Current Reference Block
    ctx.fillStyle = COLOR_TEXT_PRIMARY;
    ctx.font = '24px "Roboto Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('CURRENT_REF', canvas.width / 2, 50);

    ctx.fillStyle = action === 'HIT' ? COLOR_HIT : action === 'FAULT' || action === 'REPLACEMENT' ? COLOR_FAULT : COLOR_ACCENT;
    ctx.strokeStyle = COLOR_TEXT_PRIMARY;
    ctx.lineWidth = 2;
    ctx.roundRect(canvas.width / 2 - 40, 70, 80, 50, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLOR_BG;
    ctx.font = '36px "Roboto Mono"';
    ctx.fillText(currentRef.toString(), canvas.width / 2, 95);
    ctx.shadowColor = action === 'HIT' ? COLOR_HIT : action === 'FAULT' || action === 'REPLACEMENT' ? COLOR_FAULT : COLOR_ACCENT;
    ctx.shadowBlur = 10;
    ctx.fillText(currentRef.toString(), canvas.width / 2, 95);
    ctx.shadowBlur = 0;

    // 3. Draw Action / Status
    ctx.fillStyle = action === 'HIT' ? COLOR_HIT : action === 'FAULT' || action === 'REPLACEMENT' ? COLOR_FAULT : COLOR_TEXT_PRIMARY;
    ctx.font = '28px "Roboto Mono"';
    const actionText = action.replace('REPLACEMENT', 'FAULT+REPLACE').toUpperCase();
    ctx.fillText(actionText, canvas.width / 2, startY + FRAME_HEIGHT + 80);
    ctx.shadowColor = action === 'HIT' ? COLOR_HIT : action === 'FAULT' || action === 'REPLACEMENT' ? COLOR_FAULT : COLOR_TEXT_PRIMARY;
    ctx.shadowBlur = 10;
    ctx.fillText(actionText, canvas.width / 2, startY + FRAME_HEIGHT + 80);
    ctx.shadowBlur = 0;

    // 4. Draw Full Reference String Trace
    drawReferenceStringTrace(state.refIndex);
}

/** Draws the initial splash screen state. */
function drawInitialState() {
    ctx.fillStyle = '#6a6a6a';
    ctx.font = '30px "Roboto Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('OS MEMORY_SIM // v2.0', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '18px "Roboto Mono"';
    ctx.fillText('CONFIGURE PARAMETERS // EXECUTE TO START', canvas.width / 2, canvas.height / 2 + 10);
    ctx.shadowColor = COLOR_ACCENT;
    ctx.shadowBlur = 8;
    ctx.fillText('CONFIGURE PARAMETERS // EXECUTE TO START', canvas.width / 2, canvas.height / 2 + 10);
    ctx.shadowBlur = 0;
}

/** Renders the reference string trace element highlights. */
function drawReferenceStringTrace(activeIndex) {
    const traceContainer = document.getElementById('refStringTrace');
    if (!traceContainer) return;
    traceContainer.innerHTML = '';
    const refString = simulationTrace.map(s => s.reference);

    refString.forEach((ref, index) => {
        let colorClass = 'bg-[#1a1a1a] text-[#e0e0e0] opacity-70';
        let shadowClass = '';

        if (index < activeIndex) {
            // NOTE: Using Tailwind class names based on the defined config
            colorClass = simulationTrace[index + 1].action === 'HIT' ? 'bg-neon-success/30 text-neon-success' : 'bg-neon-danger/30 text-neon-danger';
        } else if (index === activeIndex) {
            colorClass = 'bg-neon-primary text-cyber-card scale-110 font-extrabold';
            shadowClass = 'shadow-[0_0_10px_rgba(0,255,255,0.7)]';
        }

        const element = document.createElement('div');
        element.className = `p-2 rounded-sm font-bold w-10 text-center transition-all duration-300 ${colorClass} ${shadowClass}`;
        element.textContent = ref;
        traceContainer.appendChild(element);
    });
}

// Add a roundRect polyfill for canvas
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}


// --- CONTROL HANDLERS ---

/** The main function to run the simulation, initializing the trace. */
window.runSimulation = function() {
    clearInterval(animationInterval);
    isPlaying = false;
    document.getElementById('playPauseBtn').textContent = 'PLAY';

    const refStringRaw = document.getElementById('refString').value;
    const frameCount = parseInt(document.getElementById('frameCount').value);
    const algorithm = document.getElementById('algorithm').value;

    const references = refStringRaw.split(/\s+/).filter(n => n).map(Number).filter(n => !isNaN(n) && n >= 0);

    if (references.length === 0) {
        document.getElementById('currentAction').innerHTML = '<span class="text-neon-danger">ERROR // INVALID REF_STRING</span>';
        return;
    }
    if (frameCount < 3 || frameCount > 10) {
        document.getElementById('currentAction').innerHTML = '<span class="text-neon-danger">ERROR // FRAME_COUNT [3-10]</span>';
        return;
    }

    try {
        // CALLS ALGORITHM LOGIC FROM IMPORTED MODULE
        switch (algorithm) {
            case 'FIFO': simulationTrace = generateTraceFIFO(references, frameCount); break;
            case 'LRU': simulationTrace = generateTraceLRU(references, frameCount); break;
            case 'Optimal': simulationTrace = generateTraceOptimal(references, frameCount); break;
            case 'Clock': simulationTrace = generateTraceClock(references, frameCount); break;
            default: throw new Error("INVALID_ALGORITHM_SELECTED");
        }

        currentStep = -1;
        updateControls(true);
        updateStats();
        draw();
        document.getElementById('currentAction').innerHTML = `<span class="text-neon-primary">SIMULATION_READY // ${algorithm} // AWAITING COMMAND</span>`;
    } catch (error) {
        document.getElementById('currentAction').innerHTML = `<span class="text-neon-danger">ERROR // ${error.message.toUpperCase()}</span>`;
        console.error(error);
    }
}

/** Iterates through the pre-calculated trace (forward: 1, backward: -1). */
window.stepSimulation = function(direction) {
    if (simulationTrace.length === 0) return;

    let newStep = currentStep + direction;

    if (newStep >= 0 && newStep < simulationTrace.length) {
        currentStep = newStep;

    } else if (newStep >= simulationTrace.length) {
        currentStep = simulationTrace.length - 1;
        pauseSimulation();
        document.getElementById('currentAction').innerHTML = '<span class="text-neon-primary">SIMULATION_COMPLETE // LOGS_FINALIZED</span>';
    } else if (newStep < -1) {
        currentStep = -1;
    }

    updateControls(true);
    updateStats();
    draw();
    updateCurrentActionText();
}

/** Updates the text box with the current action description. */
function updateCurrentActionText() {
    if (currentStep < 0) return;
    const state = simulationTrace[currentStep];
    let message = `<span class="text-neon-secondary">REF ${state.reference}:</span> `;
    if (state.action === 'HIT') {
        message += `<span class="text-neon-success font-bold">PAGE_HIT</span> // IN_MEMORY`;
    } else if (state.action === 'FAULT') {
        message += `<span class="text-neon-danger font-bold">PAGE_FAULT</span> // ALLOCATING_FRAME_${state.replacedFrameIndex}`;
    } else if (state.action === 'REPLACEMENT') {
        message += `<span class="text-neon-danger font-bold">PAGE_FAULT_REPLACE</span> // PAGE_${state.replacedPage}_OUT // PAGE_${state.reference}_IN @ FRAME_${state.replacedFrameIndex}`;
    }
    document.getElementById('currentAction').innerHTML = message;
}

/** Toggles the play/pause state for continuous animation. */
window.playPause = function() {
    if (isPlaying) {
        pauseSimulation();
    } else {
        playSimulation();
    }
}

/** Starts the continuous animation. */
function playSimulation() {
    if (currentStep >= simulationTrace.length - 1) {
        currentStep = -1;
    }
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = 'PAUSE';
    document.getElementById('playPauseBtn').classList.replace('bg-neon-success', 'bg-neon-danger');
    document.getElementById('playPauseBtn').classList.replace('hover:bg-green-600', 'hover:bg-red-600');

    animationInterval = setInterval(() => {
        stepSimulation(1);
        if (currentStep >= simulationTrace.length - 1) {
            pauseSimulation();
        }
    }, animationSpeed);
}

/** Stops the continuous animation. */
function pauseSimulation() {
    isPlaying = false;
    document.getElementById('playPauseBtn').textContent = 'PLAY';
    document.getElementById('playPauseBtn').classList.replace('bg-neon-danger', 'bg-neon-success');
    document.getElementById('playPauseBtn').classList.replace('hover:bg-red-600', 'hover:bg-green-600');
    clearInterval(animationInterval);
}

/** Updates the speed slider value and refreshes the interval if playing. */
window.updateSpeed = function(value) {
    animationSpeed = 2000 - value + 100;
    document.getElementById('speedValue').textContent = animationSpeed;
    if (isPlaying) {
        pauseSimulation();
        playSimulation();
    }
}

/** Updates the control button states (enabled/disabled). */
function updateControls(isSimulationRunning) {
    const isAtStart = currentStep <= -1;
    const isAtEnd = currentStep >= simulationTrace.length - 1;

    document.getElementById('stepBackBtn').disabled = !isSimulationRunning || isAtStart;
    document.getElementById('stepFwdBtn').disabled = !isSimulationRunning || isAtEnd;
    document.getElementById('playPauseBtn').disabled = !isSimulationRunning || isAtEnd;

    document.getElementById('stepBackBtn').classList.toggle('opacity-50', !isSimulationRunning || isAtStart);
    document.getElementById('stepFwdBtn').classList.toggle('opacity-50', !isSimulationRunning || isAtEnd);
    document.getElementById('playPauseBtn').classList.toggle('opacity-50', !isSimulationRunning || isAtEnd);
}

/** Updates the statistics panel. */
function updateStats() {
    const totalRefs = simulationTrace.length > 0 ? simulationTrace.map(s => s.reference).length : 0;
    let hits = 0;
    let faults = 0;

    for (let i = 0; i <= currentStep; i++) {
        if (i < simulationTrace.length) {
            const action = simulationTrace[i].action;
            if (action === 'HIT') {
                hits++;
            } else if (action === 'FAULT' || action === 'REPLACEMENT') {
                faults++;
            }
        }
    }

    const totalActions = hits + faults;
    const hitRatio = totalActions > 0 ? (hits / totalActions) * 100 : 0;

    document.getElementById('statTotalRefs').textContent = totalRefs;
    document.getElementById('statCurrentStep').textContent = totalActions;
    document.getElementById('statTotalSteps').textContent = totalRefs;
    document.getElementById('statHits').textContent = hits;
    document.getElementById('statFaults').textContent = faults;
    document.getElementById('statHitRatio').textContent = `${hitRatio.toFixed(2)}%`;
}

/** Saves the canvas content as a PNG image. */
window.saveCanvasAsImage = function() {
    if (simulationTrace.length === 0) {
        document.getElementById('currentAction').innerHTML = '<span class="text-neon-danger">ERROR // NO_SIMULATION_DATA</span>';
        return;
    }
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `OS_SIMULATION_${document.getElementById('algorithm').value}_STEP${currentStep + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- INITIALIZATION ---
window.addEventListener('load', () => {
    initCanvas();
    draw();
    updateControls(false);

    // Expose control functions globally for HTML event handlers
    // They are already exposed via window.functionName, but this is explicit.
    // The functions are already defined with 'window.' prefix above.
});
