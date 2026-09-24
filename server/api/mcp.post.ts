import { defineEventHandler, readBody, setResponseStatus, setHeader } from 'h3'
import { authUserId } from '../utils/auth'
import { TOOLS, callTool } from '../utils/mcp'

// Servidor MCP (SPC-018) con transporte Streamable HTTP, respuesta JSON simple
// (sin streaming). Autenticado con `Authorization: Bearer caudal_...`; sin key → 401.
const PROTOCOL = '2025-06-18'

interface Rpc {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

const ok = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result })
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)

  const body = (await readBody<Rpc | Rpc[]>(event).catch(() => null)) as Rpc | Rpc[] | null
  if (!body) {
    setResponseStatus(event, 400)
    return err(null, -32700, 'parse error')
  }
  const mensajes = Array.isArray(body) ? body : [body]
  const respuestas: unknown[] = []

  for (const msg of mensajes) {
    const id = msg.id ?? null
    if (msg.method === 'initialize') {
      respuestas.push(
        ok(id, {
          protocolVersion: (msg.params?.protocolVersion as string) || PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { name: 'caudal', version: '1.0.0' },
        }),
      )
    } else if (msg.method === 'tools/list') {
      respuestas.push(ok(id, { tools: TOOLS }))
    } else if (msg.method === 'tools/call') {
      const params = msg.params ?? {}
      const name = String(params.name ?? '')
      try {
        const result = await callTool(userId, name, (params.arguments as Record<string, unknown>) ?? {})
        respuestas.push(ok(id, { content: [{ type: 'text', text: JSON.stringify(result) }] }))
      } catch (e) {
        // Errores de tool: result con isError (el asistente puede reaccionar).
        respuestas.push(ok(id, { content: [{ type: 'text', text: JSON.stringify({ error: (e as Error).message }) }], isError: true }))
      }
    } else if (msg.method?.startsWith('notifications/')) {
      // Notificación: sin respuesta.
    } else if (msg.id != null) {
      respuestas.push(err(id, -32601, 'method not found'))
    }
  }

  if (!respuestas.length) {
    setResponseStatus(event, 202)
    return ''
  }
  setHeader(event, 'content-type', 'application/json')
  return Array.isArray(body) ? respuestas : respuestas[0]
})
