/**
 * SANACIÓN INTEGRAL — Bienestar espiritual, psicológico y emocional
 * © 2026 Luis Jiménez (@luisjhz89-svg). Todos los derechos reservados.
 * Uso sujeto a los términos de /LICENSE.md.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCrisisReply } from './safety'

test('prioriza ayuda urgente ante mensajes de autolesión en cualquier módulo', () => {
  const reply = getCrisisReply('motivation', 'Estoy pensando en suicidarme')
  assert.match(reply ?? '', /911/)
})

test('deriva síntomas graves de abstinencia a urgencias', () => {
  const reply = getCrisisReply('recovery', 'Tengo convulsiones y dejé de beber')
  assert.match(reply ?? '', /urgencias/)
})

test('no clasifica como crisis síntomas generales fuera del módulo de recuperación', () => {
  assert.equal(getCrisisReply('psychology', 'Tengo temblores'), null)
})

test('permite conversación de apoyo no urgente', () => {
  assert.equal(getCrisisReply('recovery', 'Quiero encontrar una reunión'), null)
})
