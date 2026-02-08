import { ref } from 'vue'

// Dynamic data state (separate from static)
const dynamicStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const dynamicError = ref('')
const dynamicServers = ref<any[]>([])
const dynamicWs = ref<WebSocket | null>(null)
let dynamicPollInterval: any = null
let dynamicReconnectTimeout: any = null
let dynamicNextId = 1 // Different starting ID to avoid conflicts

const token = import.meta.env.VITE_BACKEND_TOKEN
const wsUrl = import.meta.env.VITE_BACKEND_WS
const queryFields = ['cpu', 'ram', 'load', 'system', 'disk', 'network']

const scheduleReconnect = () => {
    if (dynamicReconnectTimeout) clearTimeout(dynamicReconnectTimeout)
    dynamicReconnectTimeout = setTimeout(() => {
        connect()
    }, 3000)
}

const sendQuery = () => {
    if (!dynamicWs.value || dynamicStatus.value !== 'connected') return

    const queryObj = {
        fields: queryFields,
        condition: [{"last": null}]
    }

    const payload = {
        jsonrpc: "2.0",
        id: dynamicNextId++,
        method: "agent_query_dynamic",
        params: [token, queryObj]
    }

    try {
        dynamicWs.value.send(JSON.stringify(payload))
    } catch (e) {
        console.error("[Dynamic] Send failed", e)
    }
}

const startPolling = () => {
    if (dynamicPollInterval) clearInterval(dynamicPollInterval)
    sendQuery()
    dynamicPollInterval = setInterval(sendQuery, 1000)
}

const stopPolling = () => {
    if (dynamicPollInterval) clearInterval(dynamicPollInterval)
    dynamicPollInterval = null
}

const connect = () => {
    if (dynamicStatus.value === 'connected' || dynamicStatus.value === 'connecting') return

    if (!wsUrl || !token) {
        dynamicError.value = 'Missing VITE_BACKEND_WS or VITE_BACKEND_TOKEN in environment.'
        return
    }

    dynamicStatus.value = 'connecting'
    dynamicError.value = ''

    try {
        const socket = new WebSocket(wsUrl)
        dynamicWs.value = socket

        socket.onopen = () => {
            dynamicStatus.value = 'connected'
            dynamicError.value = ''
            startPolling()
        }

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                if (msg.result && Array.isArray(msg.result)) {
                    dynamicServers.value = msg.result
                    if (dynamicError.value) dynamicError.value = ''
                } else if (msg.result && msg.result.error_message) {
                    dynamicError.value = msg.result.error_message
                    stopPolling()
                } else if (msg.error) {
                    console.error('[Dynamic] RPC Error:', msg.error)
                    dynamicError.value = typeof msg.error === 'string' ? msg.error : (msg.error.message || JSON.stringify(msg.error))
                    stopPolling()
                }
            } catch (e) {
                console.error('[Dynamic] Failed to parse message:', event.data)
            }
        }

        socket.onclose = () => {
            dynamicStatus.value = 'disconnected'
            dynamicWs.value = null
            stopPolling()
            scheduleReconnect()
        }

        socket.onerror = (e) => {
            console.error('[Dynamic] WebSocket Error:', e)
            dynamicStatus.value = 'disconnected'
        }
    } catch (e: any) {
        console.error('[Dynamic] Connection failed:', e)
        dynamicStatus.value = 'disconnected'
        scheduleReconnect()
    }
}

export function useDynamicData() {
    return {
        status: dynamicStatus,
        error: dynamicError,
        servers: dynamicServers,
        connect
    }
}
