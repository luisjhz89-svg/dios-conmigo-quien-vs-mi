/**
 * SANACIÓN INTEGRAL — Bienestar espiritual, psicológico y emocional
 * © 2026 Luis Jiménez (@luisjhz89-svg). Todos los derechos reservados.
 * Uso sujeto a los términos de /LICENSE.md.
 */
import type { ModuleId } from './prompts'

const selfHarmPattern =
  /(suicid|quitarme la vida|hacerme daño|autolesion|no quiero vivir|no quiero seguir viviendo|intentar matarme|me quiero matar)/i

const urgentWithdrawalPattern =
  /(convulsion|alucinacion|confusion|desmayo|no puedo despertar|dificultad para respirar)/i

export function getCrisisReply(module: ModuleId, message: string): string | null {
  if (selfHarmPattern.test(message)) {
    return 'Siento mucho que estés pasando por esto. Si podrías hacerte daño o estás en peligro inmediato, llama al 911 ahora y acércate a alguien de confianza; no te quedes a solas. Si puedes, dile claramente: “necesito ayuda ahora”.'
  }

  if (module === 'recovery' && urgentWithdrawalPattern.test(message)) {
    return 'Estos síntomas pueden ser una emergencia, especialmente después de reducir o dejar el alcohol u otras sustancias. Llama al 911 o acude a urgencias ahora; si puedes, pide a alguien de confianza que te acompañe. No intentes manejarlo a solas.'
  }

  return null
}
