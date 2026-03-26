export type CanvasSetup = {
    /** The CSS selector that can be used to find the canvas element. */
    resolvedSelector: string
    /** Removes the pre-created canvas or disconnects the observer. Call on error. */
    cleanup: () => void
}

/**
 * Pre-creates a canvas element or sets up a MutationObserver to intercept the canvas the app appends itself.
 *
 * @param canvasSelector - CSS selector the app uses to find the canvas (e.g. `'#my-canvas'`).
 *                         If omitted, the app creates the canvas itself; it will be assigned `fallbackId`.
 * @param fallbackId - ID assigned to the intercepted canvas when no `canvasSelector` is given (default: `canvas`).
 */
export function ensureCanvas(canvasSelector?: string, fallbackId = 'canvas'): CanvasSetup {
    if (canvasSelector) {
        const canvas = document.createElement('canvas')
        canvas.id = canvasSelector.replace(/^#/, '')
        canvas.classList.add('bevy-canvas')
        document.body.appendChild(canvas)
        return {
            resolvedSelector: canvasSelector,
            cleanup: () => canvas.remove(),
        }
    }

    // No selector: we consider the app will append its own canvas to <body>.
    // Watch for it and assign a stable ID so it can be found later.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLCanvasElement && !node.id) {
                    node.id = fallbackId
                    node.classList.add('bevy-canvas')
                    observer.disconnect()
                }
            }
        }
    })
    observer.observe(document.body, { childList: true })
    return {
        resolvedSelector: `#${fallbackId}`,
        cleanup: () => observer.disconnect(),
    }
}
