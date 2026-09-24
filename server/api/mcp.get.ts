import { defineEventHandler, setResponseStatus } from 'h3'

// El servidor MCP de Caudal es stateless: solo POST (Streamable HTTP sin streaming).
export default defineEventHandler((event) => {
  setResponseStatus(event, 405)
  return { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'MCP usa POST en /api/mcp' } }
})
