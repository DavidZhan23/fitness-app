import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { waitForDb } from './db.js'
import { errorHandler } from './errorMiddleware.js'
import { startSchedulers } from './scheduler.js'
import authRouter from './routes/auth.js'
import aiRouter from './routes/ai.js'
import logsRouter from './routes/logs.js'
import communityRouter from './routes/community.js'
import developerRouter from './routes/developer.js'
import telemetryRouter from './routes/telemetry.js'

const app = express()
const port = Number(process.env.PORT || 3001)

const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }))
app.use(express.json({ limit: '2mb' }))

app.use(authRouter)
app.use(aiRouter)
app.use(logsRouter)
app.use(communityRouter)
app.use(developerRouter)
app.use(telemetryRouter)

app.use(errorHandler)

async function start() {
  await waitForDb()
  startSchedulers()
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`)
  })
}

start().catch((err) => {
  console.error('[api] failed to start', err)
  process.exit(1)
})
