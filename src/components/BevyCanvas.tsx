import { useEffect, useRef } from 'react'
import '../lib/audioContextAutoplay.js'

interface Props {
    canvasSelector: string
}

export function BevyCanvas({ canvasSelector }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // The canvas was pre-created by App and hidden via CSS before WASM loaded.
        // Move it into this container and make it visible.
        const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null
        if (!canvas) return

        container.appendChild(canvas)
        canvas.classList.add('bevy-canvas-active')

        // Notify Bevy of its new dimensions.
        window.dispatchEvent(new Event('resize'))

        return () => {
            // On unmount move canvas back to body (hidden)
            // so the next effect run can re-adopt it.
            canvas.classList.remove('bevy-canvas-active')
            document.body.appendChild(canvas)
        }
    }, [canvasSelector])

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden" />
    )
}
