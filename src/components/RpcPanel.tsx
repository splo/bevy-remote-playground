import { useState, useRef } from 'react'
import { useMediaQuery } from 'usehooks-ts'
import { isStopWatching, type BrpBridge, type StopWatchingFn } from '../lib/useBrp'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { placeholder as cmPlaceholder, EditorView } from '@codemirror/view'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const paramsExtensions = [
    javascript(),
    cmPlaceholder("{data: 'value'}"),
    EditorView.theme({ '.cm-scroller': { minHeight: 'inherit' } }),
]

interface Props {
    bridge: BrpBridge | null
    methodNames: string[]
}

export function RpcPanel({ bridge, methodNames }: Props) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'streaming'>('idle')
    const [selectedMethod, setSelectedMethod] = useState<string>('')
    const [params, setParams] = useState<string>('')
    const [callResult, setCallResult] = useState<string>('')
    const closeStreamRef = useRef<StopWatchingFn | null>(null)

    const isDark = useMediaQuery('(prefers-color-scheme: dark)')
    const cmTheme = isDark ? 'dark' : 'light'

    // If the user hasn't picked a method yet, default to the first available one.
    const effectiveMethod = selectedMethod || methodNames[0] || ''

    async function handleCall() {
        if (!bridge || !effectiveMethod) return
        // Close any existing stream before starting a new call.
        closeStreamRef.current?.()
        closeStreamRef.current = null
        setStatus('loading')
        setCallResult('')
        let parsedParams: unknown
        try {
            parsedParams = parseParams(params)
        } catch {
            setCallResult('Error: invalid params expression')
            setStatus('idle')
            return
        }
        try {
            const result = await bridge[effectiveMethod](parsedParams, (callbackResult: unknown) => {
                setCallResult(JSON.stringify(callbackResult, null, 2))
            })
            if (isStopWatching(result)) {
                closeStreamRef.current = result
                setStatus('streaming')
            } else {
                setStatus('idle')
            }
        } catch (err) {
            setCallResult(String(err))
            setStatus('idle')
        }
    }

    function handleCloseStream() {
        closeStreamRef.current?.()
        closeStreamRef.current = null
        setStatus('idle')
    }

    return (
        <form
            aria-label="RPC method call"
            className="flex flex-col gap-3 p-4 h-full overflow-hidden"
            onSubmit={(e) => {
                e.preventDefault()
                void handleCall()
            }}
        >
            <div className="flex flex-col gap-1.5">
                <Label>Method</Label>
                <Select
                    value={effectiveMethod}
                    onValueChange={(v) => setSelectedMethod(v ?? '')}
                    disabled={!bridge}
                >
                    <SelectTrigger className="w-full font-mono text-xs">
                        <SelectValue placeholder="Loading…" />
                    </SelectTrigger>
                    <SelectContent>
                        {methodNames.map((name) => (
                            <SelectItem key={name} value={name} className="font-mono text-xs">
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label>Parameters</Label>
                <div className="rounded-lg border border-input overflow-hidden">
                    <CodeMirror
                        value={params}
                        extensions={paramsExtensions}
                        editable={!!bridge}
                        theme={cmTheme}
                        basicSetup={{
                            lineNumbers: false,
                            foldGutter: false,
                            highlightActiveLine: false,
                            highlightActiveLineGutter: false,
                        }}
                        minHeight="6rem"
                        maxHeight="10rem"
                        className="text-xs font-mono"
                        onChange={(v) => setParams(v)}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit" className="flex-[2]" disabled={!bridge || !effectiveMethod}>
                    Call
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={status !== 'streaming'}
                    onClick={handleCloseStream}
                >
                    Close Stream
                </Button>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                <Label>Result</Label>
                <div className="flex-1 min-h-0 rounded-lg border border-input overflow-hidden">
                    <CodeMirror
                        value={status === 'loading' ? 'Loading…' : callResult}
                        extensions={[json()]}
                        readOnly
                        theme={cmTheme}
                        basicSetup={{
                            lineNumbers: false,
                            foldGutter: false,
                            highlightActiveLine: false,
                            highlightActiveLineGutter: false,
                        }}
                        height="100%"
                        className="h-full text-xs font-mono"
                    />
                </div>
            </div>
        </form>
    )
}

function parseParams(raw: string): unknown {
    if (!raw.trim()) return undefined
    // Allow JS syntax (`{data: 'foo'}`), not just strict JSON.
    return new Function(`return (${raw})`)()
}
