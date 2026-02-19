import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './socket'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME ?? 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    // Prefer WebSockets; fall back to long-polling
    transports: ['websocket', 'polling'],
  })

  registerSocketHandlers(io)

  httpServer.listen(port, hostname, () => {
    console.log(`\n> Bunker Online ready on http://${hostname}:${port}`)
    console.log(`> Mode: ${dev ? 'development' : 'production'}\n`)
  })
})
