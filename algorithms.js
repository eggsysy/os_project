// =================================================================
// ALGORITHM LOGIC MODULE (algorithms.js)
// Contains the functional logic for generating the full simulation trace.
// All functions are exported for use by app.js.
// =================================================================

/**
 * Generates the full trace for the FIFO algorithm.
 * @param {number[]} references - The page reference string.
 * @param {number} frames - The number of physical memory frames.
 * @returns {Array} The detailed simulation trace.
 */
export function generateTraceFIFO(references, frames) {
    let trace = [];
    let memory = new Array(frames).fill(null);
    let nextVictimIndex = 0; // The FIFO pointer

    for (let i = 0; i < references.length; i++) {
        const currentRef = references[i];
        const newState = {
            reference: currentRef,
            refIndex: i,
            action: null,
            frameState: [...memory],
            replacedPage: null,
            replacedFrameIndex: null,
            pointer: nextVictimIndex, 
        };

        const hitIndex = memory.indexOf(currentRef);

        if (hitIndex !== -1) {
            // HIT
            newState.action = 'HIT';
        } else {
            // FAULT
            const nullIndex = memory.indexOf(null);

            if (nullIndex !== -1) {
                // Allocation (Free space available)
                memory[nullIndex] = currentRef;
                newState.action = 'FAULT';
                newState.replacedFrameIndex = nullIndex;
            } else {
                // Replacement (Memory is full)
                newState.action = 'REPLACEMENT';
                newState.replacedPage = memory[nextVictimIndex];
                newState.replacedFrameIndex = nextVictimIndex;
                memory[nextVictimIndex] = currentRef;

                // Advance pointer
                nextVictimIndex = (nextVictimIndex + 1) % frames;
            }
        }

        // Final state update before pushing
        newState.frameState = [...memory];
        newState.pointer = nextVictimIndex; // Store the *next* pointer position for visualization
        trace.push(newState);
    }
    return trace;
}

/**
 * Generates the full trace for the LRU (Least Recently Used) algorithm.
 * @param {number[]} references - The page reference string.
 * @param {number} frames - The number of physical memory frames.
 * @returns {Array} The detailed simulation trace.
 */
export function generateTraceLRU(references, frames) {
    let trace = [];
    let memory = new Array(frames).fill(null);
    // Age counter: 0 is most recently used; larger value is least recently used.
    let ageCounter = new Array(frames).fill(0);

    for (let i = 0; i < references.length; i++) {
        const currentRef = references[i];
        const newState = {
            reference: currentRef,
            refIndex: i,
            action: null,
            frameState: [...memory],
            replacedPage: null,
            replacedFrameIndex: null,
            lruAges: [...ageCounter] // Store ages before current step logic
        };

        const hitIndex = memory.indexOf(currentRef);

        // 1. Increment all ages
        for (let j = 0; j < frames; j++) {
            if (memory[j] !== null && j !== hitIndex) {
                ageCounter[j]++;
            }
        }

        if (hitIndex !== -1) {
            // HIT: Reset age to 0
            newState.action = 'HIT';
            ageCounter[hitIndex] = 0;
        } else {
            // FAULT
            const nullIndex = memory.indexOf(null);

            if (nullIndex !== -1) {
                // Allocation: Reset age to 0
                memory[nullIndex] = currentRef;
                ageCounter[nullIndex] = 0;
                newState.action = 'FAULT';
                newState.replacedFrameIndex = nullIndex;
            } else {
                // Replacement: Find the LRU page (Max age)
                const maxAge = Math.max(...ageCounter);
                const victimIndex = ageCounter.indexOf(maxAge);

                newState.action = 'REPLACEMENT';
                newState.replacedPage = memory[victimIndex];
                newState.replacedFrameIndex = victimIndex;

                // Replace and reset age to 0
                memory[victimIndex] = currentRef;
                ageCounter[victimIndex] = 0;
            }
        }

        // Final state update before pushing
        newState.frameState = [...memory];
        newState.lruAges = [...ageCounter]; // Store ages after current step logic
        trace.push(newState);
    }
    return trace;
}

/**
 * Generates the full trace for the Optimal algorithm (requires future knowledge).
 * @param {number[]} references - The page reference string.
 * @param {number} frames - The number of physical memory frames.
 * @returns {Array} The detailed simulation trace.
 */
export function generateTraceOptimal(references, frames) {
    let trace = [];
    let memory = new Array(frames).fill(null);

    for (let i = 0; i < references.length; i++) {
        const currentRef = references[i];
        const newState = {
            reference: currentRef,
            refIndex: i,
            action: null,
            frameState: [...memory],
            replacedPage: null,
            replacedFrameIndex: null,
        };

        const hitIndex = memory.indexOf(currentRef);

        if (hitIndex !== -1) {
            // HIT
            newState.action = 'HIT';
        } else {
            // FAULT
            const nullIndex = memory.indexOf(null);

            if (nullIndex !== -1) {
                // Allocation
                memory[nullIndex] = currentRef;
                newState.action = 'FAULT';
                newState.replacedFrameIndex = nullIndex;
            } else {
                // Replacement: Find the page used furthest in the future
                let longestFutureIndex = -1;
                let victimIndex = -1;

                for (let j = 0; j < frames; j++) {
                    const page = memory[j];
                    let nextUseIndex = -1;

                    // Search for the page's next use in the *remaining* string (i+1 onwards)
                    for (let k = i + 1; k < references.length; k++) {
                        if (references[k] === page) {
                            nextUseIndex = k;
                            break;
                        }
                    }

                    if (nextUseIndex === -1) {
                        // This page will never be used again -> choose it immediately
                        victimIndex = j;
                        break;
                    } else if (nextUseIndex > longestFutureIndex) {
                        // This page is used furthest in the future
                        longestFutureIndex = nextUseIndex;
                        victimIndex = j;
                    }
                }

                // Perform replacement
                newState.action = 'REPLACEMENT';
                newState.replacedPage = memory[victimIndex];
                newState.replacedFrameIndex = victimIndex;
                memory[victimIndex] = currentRef;
            }
        }

        // Final state update before pushing
        newState.frameState = [...memory];
        trace.push(newState);
    }
    return trace;
}

/**
 * Generates the full trace for the Clock (Second Chance) algorithm.
 * @param {number[]} references - The page reference string.
 * @param {number} frames - The number of physical memory frames.
 * @returns {Array} The detailed simulation trace.
 */
export function generateTraceClock(references, frames) {
    let trace = [];
    let memory = new Array(frames).fill(null);
    let refBits = new Array(frames).fill(0); // Reference bits (0 or 1)
    let pointer = 0; // Clock hand

    for (let i = 0; i < references.length; i++) {
        const currentRef = references[i];
        let action = null;
        let replacedPage = null;
        let replacedFrameIndex = null;

        const hitIndex = memory.indexOf(currentRef);

        if (hitIndex !== -1) {
            // HIT: Set reference bit to 1
            action = 'HIT';
            refBits[hitIndex] = 1;
        } else {
            // FAULT
            const nullIndex = memory.indexOf(null);

            if (nullIndex !== -1) {
                // Allocation (Free space available)
                memory[nullIndex] = currentRef;
                refBits[nullIndex] = 1; // New page's ref bit is set to 1
                action = 'FAULT';
                replacedFrameIndex = nullIndex;
            } else {
                // Replacement: Clock Hand Search
                action = 'REPLACEMENT';

                while (true) {
                    if (refBits[pointer] === 0) {
                        // Found victim: refBit is 0 (A frame that has not been recently used)
                        replacedPage = memory[pointer];
                        replacedFrameIndex = pointer;
                        memory[pointer] = currentRef;
                        refBits[pointer] = 1; // New page's ref bit is set to 1
                        pointer = (pointer + 1) % frames; // Move pointer for next replacement
                        break;
                    } else {
                        // Second Chance: Set refBit to 0 and advance pointer
                        refBits[pointer] = 0;
                        pointer = (pointer + 1) % frames;
                    }
                }
            }
        }

        // State update before pushing
        const newState = {
            reference: currentRef,
            refIndex: i,
            action: action,
            frameState: [...memory],
            replacedPage: replacedPage,
            replacedFrameIndex: replacedFrameIndex,
            refBits: [...refBits],
            pointer: pointer,
        };
        trace.push(newState);
    }
    return trace;
}
