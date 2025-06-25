// --- Batch scheduling ---
const effectQueue = new Set<() => void>();
let scheduled = false;


function scheduleFlush() {
    // Check if there's already a scheduled flush operation
    if (!scheduled) {
        scheduled = true;

        // Schedule a microtask to run after all synchronous tasks have completed
        queueMicrotask(() => {
            // Set scheduled back to false after the microtask is executed
            scheduled = false;

            // Retrieve all effects from the effectQueue and convert it to an array
            const effects = Array.from(effectQueue);

            // Clear the effectQueue to free up memory
            effectQueue.clear();

            // Iterate over each effect function in the effects array and call them
            for (const effect of effects) {
                effect();
            }
        });
    }
}

function queueEffect(effect: () => void) {
    // Add the effect function to the effectQueue
    effectQueue.add(effect);

    // Schedule a flush operation to process the queued effects
    scheduleFlush();
}

export class Signal<T> {
    private _value: T;
    private listeners = new Set<(val: T) => void>();

    constructor(value: T) {
        this._value = value;
    }

    get value(): T {
        // Return the current value of the signal
        return this._value;
    }

    set value(newValue: T) {
        // If the new value is different from the current value, update it
        if (this._value !== newValue) {
            this._value = newValue;

            // Notify all listeners about the change
            for (const listener of this.listeners) {
                queueEffect(() => listener(newValue));
            }
        }
    }

    subscribe(listener: (val: T) => void): () => void {
        // Add a listener to the signal
        this.listeners.add(listener);

        // Immediately call the listener with the current value
        listener(this._value);

        // Return a function to unsubscribe the listener
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export function useEffect(effect: () => void, deps: Signal<any>[]): () => void {
    // Subscribe the effect to all dependencies
    const unsubscribers = deps.map(dep => dep.subscribe(effect));
    // Return a cleanup function to unsubscribe all
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
}

