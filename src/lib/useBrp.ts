import { useState, useCallback } from 'react'
import type { BrpBridge, InstantMethod, StopWatchingFn } from '@wasm/demo'

export type {
    BrpBridge,
    BrpMethod,
    InitInput,
    InitOutput,
    InstantMethod,
    InstantMethodNoCallback,
    InstantMethodWithCallback,
    StopWatchingFn,
    WatchMethod,
} from '@wasm/demo'

type WasmModule = typeof import('@wasm/demo')


export function isStopWatching(value: unknown): value is StopWatchingFn {
    return typeof value === 'function'
}

/** [OpenRPC document](https://spec.open-rpc.org/). */
export type BrpRpcDiscoverResult = {
    openrpc: string
    info: {
        title: string
        version: string
    }
    methods: {
        name: string
        params: unknown[]
    }[]
}

/** BRP bridge with the `rpc.discover` method. */
export type OpenRpcBrpBridge = BrpBridge & {
    /** Returns an OpenRPC discovery document. */
    'rpc.discover': InstantMethod<undefined, BrpRpcDiscoverResult>
}

export type BrpStatus =
    | { type: 'unloaded' }
    | { type: 'loading' }
    | { type: 'ready'; bridge: BrpBridge }
    | { type: 'error'; message: string };

/**
 * Function type for loading a BRP bridge.
 * Resolves to the bridge on success, or `null` on error.
 */
export type LoadBridgeFn = (jsUrl: string, wasmUrl?: string) => Promise<BrpBridge | null>

/** The current connection status and a function to start loading. */
export type BrpLoader = {
    /** Current BRP connection state */
    status: BrpStatus
    /** Function to load a BRP bridge from JS and WASM URLs */
    loadBridge: LoadBridgeFn
}

/**
 * Manages the Bevy Remote Protocol connection lifecycle:
 * loading a WASM module and retrieving the BRP bridge.
 *
 * @returns `BrpLoader` with the current connection status and a function to start loading.
 */
export function useBrp(): BrpLoader {
    const [status, setStatus] = useState<BrpStatus>({ type: 'unloaded' })

    const loadBridge = useCallback<LoadBridgeFn>(async (jsUrl: string, wasmUrl?: string) => {
        setStatus({ type: 'loading' })
        let jsBlobUrl: string | null = null
        try {
            const jsBlob = await fetch(jsUrl).then((r) => r.blob())
            jsBlobUrl = URL.createObjectURL(jsBlob)
            const mod = await import(/* @vite-ignore */ jsBlobUrl) as WasmModule
            const resolvedWasmUrl = wasmUrl ?? jsUrl.replace(/\.js$/, '_bg.wasm')
            await mod.default({ module_or_path: resolvedWasmUrl })
            const bridge = await mod.getBridge()
            setStatus({ type: 'ready', bridge })
            return bridge
        } catch (error) {
            setStatus({ type: 'error', message: String(error) })
            return null
        } finally {
            if (jsBlobUrl) URL.revokeObjectURL(jsBlobUrl)
        }
    }, [])

    return { status, loadBridge }
}
