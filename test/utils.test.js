import { describe, expect, it } from 'vitest'
import { MENSAJES, aTexto, leerNota, leerNotaObjetivo, leerPeso } from '../src/utils/numeros.js'
import { entradaPeruAIso, formatearFechaPeru, isoAEntradaPeru } from '../src/utils/fechas.js'

describe('numeros', () => {
  it('una nota 0 se conserva como 0 y vacía es null', () => {
    expect(leerNota('0')).toEqual({ valor: 0, error: null })
    expect(leerNota('')).toEqual({ valor: null, error: null })
    expect(leerNota('   ')).toEqual({ valor: null, error: null })
  })

  it('acepta hasta 2 decimales, con punto o coma', () => {
    expect(leerNota('14.55').valor).toBe(14.55)
    expect(leerNota('14,5').valor).toBe(14.5)
    expect(leerNota('20').valor).toBe(20)
  })

  it('rechaza más de 2 decimales (se cuenta lo escrito)', () => {
    expect(leerNota('14.555').error).toBe('Admite como máximo 2 decimales.')
    expect(leerNota('14.500').error).toBe('Admite como máximo 2 decimales.')
  })

  it('rechaza fuera de rango y texto no numérico', () => {
    expect(leerNota('20.01').error).toBe(MENSAJES.nota)
    expect(leerNota('21').error).toBe(MENSAJES.nota)
    expect(leerNota('-1').error).toBe(MENSAJES.nota)
    expect(leerNota('abc').error).toBe(MENSAJES.nota)
    expect(leerNotaObjetivo('').error).toBe(MENSAJES.notaObjetivo)
    expect(leerNotaObjetivo('25').error).toBe(MENSAJES.notaObjetivo)
  })

  it('peso: mayor que 0 y hasta 100', () => {
    expect(leerPeso('0').error).toBe(MENSAJES.peso)
    expect(leerPeso('100').valor).toBe(100)
    expect(leerPeso('100.01').error).toBe(MENSAJES.peso)
    expect(leerPeso('0.01').valor).toBe(0.01)
    expect(leerPeso('').error).toBe(MENSAJES.peso)
  })

  it('aTexto', () => {
    expect(aTexto(null)).toBe('')
    expect(aTexto(0)).toBe('0')
    expect(aTexto(14.5)).toBe('14.5')
  })
})

describe('fechas (hora de Perú)', () => {
  it('la entrada se envía con -05:00 y sin fracciones de segundo', () => {
    expect(entradaPeruAIso('2026-12-05T08:00')).toBe('2026-12-05T08:00:00-05:00')
    expect(entradaPeruAIso('2026-12-05T08:00:30.500')).toBe('2026-12-05T08:00:00-05:00')
    expect(entradaPeruAIso('')).toBeNull()
    expect(entradaPeruAIso('2026-12-05')).toBeNull()
  })

  it('una fecha de la API se lleva a la hora de Perú', () => {
    expect(isoAEntradaPeru('2026-12-01T23:59:00-05:00')).toBe('2026-12-01T23:59')
    expect(isoAEntradaPeru('2026-12-02T04:59:00Z')).toBe('2026-12-01T23:59')
    expect(formatearFechaPeru('2026-12-02T04:59:00Z')).toBe(formatearFechaPeru('2026-12-01T23:59:00-05:00'))
    expect(formatearFechaPeru('2026-12-01T23:59:00-05:00')).toMatch(/01\/12\/2026.*23:59/)
  })

  it('no depende de la zona horaria del entorno', () => {
    const original = process.env.TZ
    try {
      process.env.TZ = 'Asia/Tokyo'
      expect(isoAEntradaPeru('2026-12-01T23:59:00-05:00')).toBe('2026-12-01T23:59')
      expect(formatearFechaPeru('2026-12-01T23:59:00-05:00')).toMatch(/01\/12\/2026.*23:59/)
    } finally {
      process.env.TZ = original
    }
  })
})
