/**
 * SANACIÓN INTEGRAL — Bienestar espiritual, psicológico y emocional
 * © 2026 Luis Jiménez (@luisjhz89-svg). Todos los derechos reservados.
 * Uso sujeto a los términos de /LICENSE.md.
 */
import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import OpenAI from 'openai'
import { modules, prompts, type ModuleId } from './prompts'
import { getCrisisReply } from './safety'

const app = express()
const port = Number(process.env.PORT) || 3001
const apiKey = process.env.OPENAI_API_KEY
const client = apiKey ? new OpenAI({ apiKey }) : null
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const rateLimitWindow = 60_000
const requestsPerWindow = 20
const rateLimitBuckets = new Map<string, { count: number; resetsAt: number }>()

app.disable('x-powered-by')
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  next()
})
app.use(express.json({ limit: '16kb' }))

app.use('/api/chat', (request: Request, response: Response, next: NextFunction) => {
  const now = Date.now()
  const key = request.ip ?? 'unknown'
  let bucket = rateLimitBuckets.get(key)

  if (!bucket || bucket.resetsAt <= now) {
    if (rateLimitBuckets.size >= 5_000) {
      for (const [address, entry] of rateLimitBuckets) {
        if (entry.resetsAt <= now) rateLimitBuckets.delete(address)
      }
      if (rateLimitBuckets.size >= 5_000) {
        response.status(429).json({ error: 'Intenta de nuevo en un momento.' })
        return
      }
    }
    bucket = { count: 0, resetsAt: now + rateLimitWindow }
    rateLimitBuckets.set(key, bucket)
  }

  bucket.count += 1
  if (bucket.count > requestsPerWindow) {
    response.status(429).json({ error: 'Has enviado varios mensajes. Intenta de nuevo en un minuto.' })
    return
  }
  next()
})

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ status: 'ok', aiConfigured: Boolean(client) })
})

app.post('/api/chat', async (request: Request, response: Response) => {
  const body: unknown = request.body
  if (!body || typeof body !== 'object') {
    response.status(400).json({ error: 'Solicitud no válida.' })
    return
  }

  const { module, message } = body as Record<string, unknown>
  if (
    typeof module !== 'string' ||
    !modules.includes(module as ModuleId) ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 1200
  ) {
    response.status(400).json({ error: 'Escribe un mensaje de hasta 1,200 caracteres.' })
    return
  }

  const moduleId = module as ModuleId
  const crisisReply = getCrisisReply(moduleId, message)
  if (crisisReply) {
    response.json({ reply: crisisReply, mode: 'safety' })
    return
  }

  if (!client) {
    response.json({
      reply: 'Gracias por compartirlo. Mereces apoyo y no tienes que resolverlo todo a solas. En este momento la conversación con IA no está configurada; puedes escribir a alguien de confianza y, si estás en peligro inmediato, llamar al 911.',
      mode: 'demo',
    })
    return
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 350,
      messages: [
        { role: 'system', content: prompts[moduleId] },
        { role: 'user', content: message.trim() },
      ],
    })
    const reply = completion.choices[0]?.message.content?.trim()
    if (!reply) throw new Error('Empty AI response')
    response.json({ reply, mode: 'ai' })
  } catch {
    console.error('OpenAI request failed')
    response.status(503).json({ error: 'El acompañamiento no está disponible en este momento.' })
  }
})

app.listen(port, () => {
  console.log(`Sanación Integral API disponible en http://localhost:${port}`)
})
