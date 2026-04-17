import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only plugin: runs api/chat.ts as middleware under the Vite dev server,
// so `npm run dev` on :5173 can serve /api/chat without needing `vercel dev`.
// In production, Vercel's file-based routing picks up api/chat.ts directly;
// this plugin is not involved.
function apiChatDevPlugin(): Plugin {
  return {
    name: 'clean-shopper-api-chat-dev',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          // Collect the request body so we can hand it to the handler as a
          // standard Fetch Request object.
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body = Buffer.concat(chunks)

          const host = req.headers.host ?? 'localhost'
          const url = `http://${host}${req.url ?? '/api/chat'}`

          const method = (req.method ?? 'POST').toUpperCase()
          const fetchReq = new Request(url, {
            method,
            headers: req.headers as Record<string, string>,
            body: method === 'GET' || method === 'HEAD' ? undefined : body,
          })

          // Load api/chat.ts through Vite's module graph so TypeScript compiles
          // and HMR picks up edits on the server file.
          const mod = await server.ssrLoadModule('/api/chat.ts')
          const handler = mod.default as (req: Request) => Promise<Response>
          const fetchRes = await handler(fetchReq)

          res.statusCode = fetchRes.status
          fetchRes.headers.forEach((value, key) => res.setHeader(key, value))
          const text = await fetchRes.text()
          res.end(text)
        } catch (err) {
          // Log full error server-side; return a terse JSON to the browser.
          console.error('[api/chat dev] unhandled error', err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev middleware error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_*-prefixed vars via import.meta.env. Our serverless
  // handler reads non-prefixed vars (ANTHROPIC_API_KEY, SUPABASE_URL,
  // SUPABASE_ANON_KEY) from process.env, so we copy them in from .env.local here.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of Object.keys(env)) {
    if (process.env[key] === undefined) process.env[key] = env[key]
  }

  return {
    plugins: [
      tailwindcss(),
      react(),
      apiChatDevPlugin(),
    ],
  }
})
