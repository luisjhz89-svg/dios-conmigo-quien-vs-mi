/**
 * SANACIÓN INTEGRAL — Bienestar espiritual, psicológico y emocional
 * © 2026 Luis Jiménez (@luisjhz89-svg). Todos los derechos reservados.
 * Uso sujeto a los términos de /LICENSE.md.
 */
import { useState, type FormEvent } from 'react'
import './App.css'

type ModuleId = 'spiritual' | 'recovery' | 'psychology' | 'motivation'
type Message = {
  role: 'user' | 'assistant'
  content: string
  mode?: 'ai' | 'demo' | 'safety' | 'offline'
}

const modules: {
  id: ModuleId
  title: string
  shortTitle: string
  description: string
  icon: string
  color: string
  greeting: string
  prompt: string
}[] = [
  {
    id: 'spiritual',
    title: 'Dios conmigo, ¿quién contra mí?',
    shortTitle: 'Guía espiritual',
    description: 'Fe, esperanza y un espacio para expresarte.',
    icon: '✧',
    color: 'lavender',
    greeting:
      'Este es un espacio para hablar con calma y sin juicios. ¿Qué te gustaría compartir hoy? Si te ayuda, podemos reflexionar desde la fe.',
    prompt: '¿Qué tienes en el corazón hoy?',
  },
  {
    id: 'recovery',
    title: 'Salir de las adicciones',
    shortTitle: 'Apoyo en recuperación',
    description: 'Acompañamiento y recursos para dar el siguiente paso.',
    icon: '♡',
    color: 'mint',
    greeting:
      'Gracias por acercarte. No tienes que resolverlo todo ahora; podemos enfocarnos en el siguiente paso seguro. ¿Qué estás viviendo en este momento?',
    prompt: '¿Qué apoyo necesitas en tu recuperación?',
  },
  {
    id: 'psychology',
    title: '¿Ocupo un psicólogo?',
    shortTitle: 'Bienestar emocional',
    description: 'Ordena tus ideas y encuentra opciones de apoyo.',
    icon: '☼',
    color: 'blue',
    greeting:
      'Podemos explorar cómo te sientes y pensar juntos en opciones de apoyo. No puedo dar diagnósticos, pero sí escucharte sin juzgar. ¿Qué te preocupa?',
    prompt: '¿Qué te gustaría entender mejor?',
  },
  {
    id: 'motivation',
    title: '¿Realmente estoy solo?',
    shortTitle: 'Motivación y música',
    description: 'Un impulso amable y música para acompañar tu día.',
    icon: '♫',
    color: 'gold',
    greeting:
      'No tienes que tener todo resuelto para dar un paso pequeño. Cuéntame cómo te sientes y buscaremos una idea amable para hoy.',
    prompt: '¿Cómo te sientes hoy?',
  },
]

const musicMatches = {
  hope: { label: 'Color esperanza', artist: 'Diego Torres', mood: 'Quiero un impulso de esperanza' },
  calm: { label: 'River Flows in You', artist: 'Yiruma', mood: 'Busco un momento de calma' },
  energy: { label: 'Vivir mi vida', artist: 'Marc Anthony', mood: 'Necesito recuperar energía' },
}

const urgentReply =
  'Lamento que estés pasando por esto. Si estás en peligro inmediato o podrías hacerte daño, llama al 911 ahora y acércate a alguien de confianza; no te quedes a solas. Si puedes, dile claramente: “necesito ayuda ahora”.'

function isImmediateDanger(message: string) {
  return /(quiero (morir|suicidarme|hacerme daño)|voy a (morir|suicidarme|hacerme daño)|quitarme la vida|hacerme daño|no quiero vivir|me quiero matar)/i.test(
    message,
  )
}

function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('spiritual')
  const [messagesByModule, setMessagesByModule] = useState<
    Record<ModuleId, Message[]>
  >(() =>
    Object.fromEntries(
      modules.map((module) => [
        module.id,
        [{ role: 'assistant' as const, content: module.greeting }],
      ]),
    ) as Record<ModuleId, Message[]>,
  )
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [musicMood, setMusicMood] = useState<keyof typeof musicMatches>('hope')
  const selectedModule = modules.find((module) => module.id === activeModule)!
  const messages = messagesByModule[activeModule]
  const musicMatch = musicMatches[musicMood]

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = message.trim()
    if (!content || isSending) return

    setMessage('')
    setMessagesByModule((current) => ({
      ...current,
      [activeModule]: [...current[activeModule], { role: 'user', content }],
    }))
    setIsSending(true)

    let reply = ''
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: activeModule, message: content }),
      })
      const data: { reply?: string; mode?: Message['mode'] } = await response.json()
      if (!response.ok || !data.reply) throw new Error('Chat no disponible')
      reply = data.reply
      setMessagesByModule((current) => ({
        ...current,
        [activeModule]: [
          ...current[activeModule],
          {
            role: 'assistant',
            content: reply,
            mode: data.mode,
          },
        ],
      }))
    } catch {
      reply = isImmediateDanger(content)
        ? urgentReply
        : 'No pude conectar con el servicio en este momento. Aun así, puedes tomarte una pausa y acercarte a alguien de confianza. Si estás en peligro inmediato, llama al 911.'
      setMessagesByModule((current) => ({
        ...current,
        [activeModule]: [
          ...current[activeModule],
          { role: 'assistant', content: reply, mode: 'offline' },
        ],
      }))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Sanación Integral, inicio">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>
            <strong>sanación integral</strong>
            <small>un espacio para volver a ti</small>
          </span>
        </a>
        <span className="trial-label">Un paso a la vez · a tu ritmo</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">AQUÍ PUEDES EMPEZAR</p>
        <h1>No tienes que poder con todo,<br />solo dar el siguiente paso.</h1>
        <p className="welcome-copy">
          Un espacio amable para acompañarte en tu camino espiritual y emocional.
          Elige lo que necesitas hoy.
        </p>
        <div className="welcome-note">
          <span aria-hidden="true">♡</span>
          <span>No estás solo. Mereces apoyo y cuidado, también fuera de esta pantalla.</span>
        </div>
      </section>

      <section className="module-grid" aria-label="Elige un espacio de acompañamiento">
        {modules.map((module) => (
          <button
            className={`module-card ${module.color} ${activeModule === module.id ? 'selected' : ''}`}
            key={module.id}
            onClick={() => setActiveModule(module.id)}
            type="button"
            aria-pressed={activeModule === module.id}
          >
            <span className="module-icon" aria-hidden="true">{module.icon}</span>
            <span className="module-card-title">{module.title}</span>
            <span className="module-card-description">{module.description}</span>
            <span className="module-open">Abrir espacio <span aria-hidden="true">↗</span></span>
          </button>
        ))}
      </section>

      <section className={`chat-panel ${selectedModule.color}`} aria-label={selectedModule.shortTitle}>
        <div className="chat-heading">
          <div>
            <p className="eyebrow">TU ESPACIO DE HOY</p>
            <h2><span aria-hidden="true">{selectedModule.icon}</span> {selectedModule.title}</h2>
            <p>{selectedModule.description}</p>
          </div>
          <span className="private-label"><span aria-hidden="true">●</span> Conversación temporal</span>
        </div>

        <div className="messages" aria-live="polite" aria-relevant="additions text">
          {messages.map((item, index) => (
            <div className={`message-row ${item.role}`} key={`${activeModule}-${index}`}>
              {item.role === 'assistant' && <span className="avatar" aria-hidden="true">✦</span>}
              <div className="message-content">
                {item.mode === 'demo' && <small className="message-mode">Respuesta de demostración · IA no configurada</small>}
                {item.mode === 'safety' && <small className="message-mode">Orientación de seguridad</small>}
                <p className="message-bubble">{item.content}</p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="message-row assistant">
              <span className="avatar" aria-hidden="true">✦</span>
              <p className="message-bubble typing">Preparando una respuesta cuidadosa…</p>
            </div>
          )}
        </div>

        {activeModule === 'motivation' && (
          <section className="music-match" aria-label="Recomendación musical para hoy">
            <div>
              <p className="eyebrow">UNA CANCIÓN PARA ACOMPAÑARTE</p>
              <p className="music-title">{musicMatch.label} <span>· {musicMatch.artist}</span></p>
            </div>
            <div className="music-options" aria-label="Elige cómo te sientes">
              {(Object.keys(musicMatches) as (keyof typeof musicMatches)[]).map((mood) => (
                <button
                  aria-pressed={musicMood === mood}
                  key={mood}
                  onClick={() => setMusicMood(mood)}
                  type="button"
                >
                  {musicMatches[mood].mood}
                </button>
              ))}
            </div>
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(`${musicMatch.label} ${musicMatch.artist}`)}`}
              rel="noreferrer"
              target="_blank"
            >
              Buscar en Spotify <span aria-hidden="true">↗</span>
            </a>
            <small>La música puede acompañarte; no reemplaza el apoyo profesional.</small>
          </section>
        )}

        <form className="chat-form" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message">{selectedModule.prompt}</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={selectedModule.prompt}
            maxLength={1200}
            rows={2}
            disabled={isSending}
          />
          <button className="send-button" type="submit" disabled={!message.trim() || isSending}>
            Enviar <span aria-hidden="true">↑</span>
          </button>
          <small>Presiona Enter para enviar · tus mensajes no se guardan</small>
        </form>
      </section>

      <aside className="care-note">
        <span className="care-icon" aria-hidden="true">♡</span>
        <p><strong>Este espacio acompaña, no reemplaza atención profesional.</strong><br />
          No ofrece diagnósticos ni tratamiento médico. Si hay una emergencia inmediata,
          llama al <a href="tel:911">911</a> o busca atención de urgencia.
        </p>
      </aside>

      <footer>
        <span>Sanación Integral · © 2026 Luis Jiménez</span>
        <span>Plan previsto: 7 días gratis y después $5 MXN/mes · pagos aún no activos.</span>
      </footer>
    </main>
  )
}

export default App
