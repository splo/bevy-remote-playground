import { useState, useCallback, useRef } from 'react'
import type { AppSource } from './components/Launcher'
import { useBrp } from './lib/useBrp'
import { ensureCanvas } from './lib/canvas'
import { Launcher } from './components/Launcher'
import { RpcPanel } from './components/RpcPanel'
import { BevyCanvas } from './components/BevyCanvas'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import type { BuiltInBrpBridge } from '@wasm/demo'

function App() {
  const { status, loadBridge } = useBrp()
  const [appSource, setAppSource] = useState<AppSource | null>(null)
  const [methodNames, setMethodNames] = useState<string[]>([])
  const cleanupCanvas = useRef<(() => void) | null>(null)

  const handleLoad = useCallback(async (source: AppSource) => {
    const { resolvedSelector, cleanup } = ensureCanvas(source.canvasSelector || undefined, 'bevy-canvas')
    cleanupCanvas.current = cleanup
    setAppSource({ ...source, canvasSelector: resolvedSelector })
    const bridge = await loadBridge(source.jsUrl, source.wasmUrl) as BuiltInBrpBridge | null
    if (!bridge) {
      cleanup()
      cleanupCanvas.current = null
      setAppSource(null)
      return
    }
    try {
      const result = await bridge.main['rpc.discover']()
      const names = result?.methods.map(method => method.name) ?? []
      names.sort()
      setMethodNames(names)
    } catch {
      setMethodNames([])
    }
  }, [loadBridge])

  if (status.type !== 'ready') {
    return (
      <Launcher
        onLoad={handleLoad}
        loading={status.type === 'loading'}
        error={status.type === 'error' ? status.message : undefined}
      />
    )
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-screen w-screen">
      <ResizablePanel defaultSize="25%" minSize="15%">
        <RpcPanel bridge={status.bridge} methodNames={methodNames} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel minSize="30%">
        <BevyCanvas canvasSelector={appSource!.canvasSelector} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default App
