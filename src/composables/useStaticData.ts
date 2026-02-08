import { ref } from 'vue'

// Static data state (separate from dynamic)
const staticStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const staticError = ref('')
const staticServers = ref<any[]>([])
const staticWs = ref<WebSocket | null>(null)
let staticReconnectTimeout: any = null
let staticNextId = 1000 // Different starting ID to avoid conflicts

const token = import.meta.env.VITE_BACKEND_TOKEN
const wsUrl = import.meta.env.VITE_BACKEND_WS
const queryFields = ['cpu', 'system', 'gpu']

const scheduleReconnect = () => {
    if (staticReconnectTimeout) clearTimeout(staticReconnectTimeout)
    staticReconnectTimeout = setTimeout(() => {
        connect()
    }, 3000)
}

const sendQuery = () => {
    if (!staticWs.value || staticStatus.value !== 'connected') return

    const queryObj = {
        fields: queryFields,
        condition: [{"last": null}]
    }

    const payload = {
        jsonrpc: "2.0",
        id: staticNextId++,
        method: "agent_query_static",
        params: [token, queryObj]
    }

    try {
        staticWs.value.send(JSON.stringify(payload))
    } catch (e) {
        console.error("[Static] Send failed", e)
    }
}

const connect = () => {
    if (staticStatus.value === 'connected' || staticStatus.value === 'connecting') return

    if (!wsUrl || !token) {
        staticError.value = 'Missing VITE_BACKEND_WS or VITE_BACKEND_TOKEN in environment.'
        return
    }

    staticStatus.value = 'connecting'
    staticError.value = ''

    try {
        const socket = new WebSocket(wsUrl)
        staticWs.value = socket

        socket.onopen = () => {
            staticStatus.value = 'connected'
            staticError.value = ''
            sendQuery() // Fetch once
        }

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                if (msg.result && Array.isArray(msg.result)) {
                    staticServers.value = msg.result
                    if (staticError.value) staticError.value = ''
                } else if (msg.result && msg.result.error_message) {
                    staticError.value = msg.result.error_message
                } else if (msg.error) {
                    console.error('[Static] RPC Error:', msg.error)
                    staticError.value = typeof msg.error === 'string' ? msg.error : (msg.error.message || JSON.stringify(msg.error))
                }
            } catch (e) {
                console.error('[Static] Failed to parse message:', event.data)
            }
        }

        socket.onclose = () => {
            staticStatus.value = 'disconnected'
            staticWs.value = null
            scheduleReconnect()
        }

        socket.onerror = (e) => {
            console.error('[Static] WebSocket Error:', e)
            staticStatus.value = 'disconnected'
        }
    } catch (e: any) {
        console.error('[Static] Connection failed:', e)
        staticStatus.value = 'disconnected'
        scheduleReconnect()
    }
}

export function useStaticData() {
    return {
        status: staticStatus,
        error: staticError,
        servers: staticServers,
        connect,
        refresh: sendQuery // Expose refresh if needed
    }
}
