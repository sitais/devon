import { IDisposable, Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import React, { useEffect, useRef, useState } from 'react'

// import socket from "../socket/socket";
import { fetchSessionEvents } from '@/lib/services/sessionService/use-fetch-session-events'
import { useSearchParams } from 'next/navigation'
import FileTabs from '@/components/file-tabs/file-tabs'
import { Terminal as TerminalIcon } from 'lucide-react'

export default function ShellWidget() {
    const searchParams = useSearchParams()
    const chatId = searchParams.get('chat')

    const [messages, setMessages] = useState([])
    useEffect(() => {
        if (!chatId || chatId === 'New') return
        const fetchAndUpdateMessages = () => {
            fetchSessionEvents(chatId)
                .then(data => {
                    setMessages(getOnlyToolResponse(data))
                })
                .catch(error => {
                    console.error('Error fetching session events:', error)
                })
        }
        const intervalId = setInterval(fetchAndUpdateMessages, 4000)

        return () => {
            clearInterval(intervalId)
        }
    }, [chatId])

    return <Terminal messages={messages} />
}

function getOnlyToolResponse(messages) {
    return messages?.filter(
        message =>
            message.type === 'EnvironmentRequest' ||
            message.type === 'EnvironmentResponse'
    )
}

// Source: https://github.com/OpenDevin/OpenDevin/blob/main/frontend/src/components/Terminal.tsx
/*
class JsonWebsocketAddon {
    _socket: WebSocket

    _disposables: IDisposable[]

    constructor(_socket: WebSocket) {
        this._socket = _socket
        this._disposables = []
    }

    activate(terminal: XtermTerminal) {
        this._disposables.push(
            terminal.onData(data => {
                const payload = JSON.stringify({ action: 'terminal', data })
                this._socket.send(payload)
            })
        )
        this._socket.addEventListener('message', event => {
            const { action, args, observation, content } = JSON.parse(
                event.data
            )
            if (action === 'run') {
                terminal.writeln(args.command)
            }
            if (observation === 'run') {
                content.split('\n').forEach((line: string) => {
                    terminal.writeln(line)
                })
                terminal.write('\n$ ')
            }
        })
    }

    dispose() {
        this._disposables.forEach(d => d.dispose())
        this._socket.removeEventListener('message', () => {})
    }
}
*/

/**
 * The terminal's content is set by write messages. To avoid complicated state logic,
 * we keep the terminal persistently open as a child of <App /> and hidden when not in use.
 */

function Terminal({ messages }): JSX.Element {
    const terminalRef = useRef<HTMLDivElement>(null)
    const terminalInstanceRef = useRef<XtermTerminal | null>(null)

    useEffect(() => {
        async function addOn() {
            const { FitAddon } = await import('@xterm/addon-fit')
            const fitAddon = new FitAddon()
            terminal.loadAddon(fitAddon)
            // Without this timeout, `fitAddon.fit()` throws the error
            // "this._renderer.value is undefined"
            setTimeout(() => {
                fitAddon.fit()
            }, 100)
        }

        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-workspace')
            .trim()
        const terminal = new XtermTerminal({
            // This value is set to the appropriate value by the
            // `fitAddon.fit()` call below.
            // If not set here, the terminal does not respect the width
            // of its parent element. This causes a bug where the terminal
            // is too large and switching tabs causes a layout shift.
            cols: 0,
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
            fontSize: 13,
            theme: {
                // background: bgColor,
            },
            cursorBlink: true,
        })

        terminal.open(terminalRef.current as HTMLDivElement)
        terminalInstanceRef.current = terminal // Store the terminal instance
        terminal.write('> ')

        addOn()

        // const jsonWebsocketAddon = new JsonWebsocketAddon(socket);
        // terminal.loadAddon(jsonWebsocketAddon);

        return () => {
            terminal.dispose()
            terminalInstanceRef.current = null
        }
    }, [])

    useEffect(() => {
        const terminal = terminalInstanceRef.current
        if (terminal) {
            terminal.clear() // Clear the existing content
            messages.forEach((message, idx) => {
                let prefix = ''
                if (message.type === 'EnvironmentRequest') {
                    prefix = idx === 0 ? '> ' : '\n> '
                }
                terminal.writeln(`${prefix}${message.content}`)
            })
        }
    }, [messages])

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-start">
                {[{ id: 1, name: 'Terminal' }].map(file => (
                    <button
                        key={file.id}
                        className={`flex px-2 items-center bg-black px-1 pb-0 pt-2 text-sm border-t-[1.5px] min-w-[100px] ${file.id === 1 ? 'border-t-primary outline outline-neutral-500 outline-[0.5px] rounded-t-sm' : 'border-transparent'}`}
                        // onClick={() => updateSelectedFile(file)}
                    >
                        <TerminalIcon size={16} className="mr-1 text-primary mb-[1px]" />
                        {file.name}
                    </button>
                ))}
            </div>
            <div
                id="terminal-wrapper"
                className="h-full bg-black rounded-b-lg w-full"
            >
                <div
                    id="terminal-ref"
                    ref={terminalRef}
                    className="w-full px-3 pt-3 h-full overflow-scroll"
                />
            </div>
        </div>
    )
}
