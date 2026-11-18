// uni-notas-api. Contrato: notas-service/SPEC.md §3.
// Curso: { id, nombre, nota_objetivo }
// Evaluación: { id, curso_id, nombre, peso_porcentaje, nota }  (nota null = pendiente)
import { solicitar } from './http.js'

const BASE = '/api/notas'

export const listarCursos = () => solicitar(`${BASE}/cursos`)

// datos: { nombre, nota_objetivo? } (nota_objetivo por defecto 11)
export const crearCurso = (datos) =>
  solicitar(`${BASE}/cursos`, { method: 'POST', body: datos })

// cambios: { nombre?, nota_objetivo? } (al menos uno)
export const editarCurso = (id, cambios) =>
  solicitar(`${BASE}/cursos/${id}`, { method: 'PATCH', body: cambios })

// Elimina también sus evaluaciones (cascada).
export const eliminarCurso = (id) =>
  solicitar(`${BASE}/cursos/${id}`, { method: 'DELETE' })

export const listarEvaluaciones = (cursoId) =>
  solicitar(`${BASE}/cursos/${cursoId}/evaluaciones`)

// datos: { nombre, peso_porcentaje, nota? }
export const crearEvaluacion = (cursoId, datos) =>
  solicitar(`${BASE}/cursos/${cursoId}/evaluaciones`, { method: 'POST', body: datos })

// cambios: { nombre?, peso_porcentaje?, nota? } (al menos uno)
export const editarEvaluacion = (id, cambios) =>
  solicitar(`${BASE}/evaluaciones/${id}`, { method: 'PATCH', body: cambios })

export const eliminarEvaluacion = (id) =>
  solicitar(`${BASE}/evaluaciones/${id}`, { method: 'DELETE' })

// Cálculos y estados (SPEC §4). El front solo los muestra; no calcula.
export const obtenerResumen = (cursoId) =>
  solicitar(`${BASE}/cursos/${cursoId}/resumen`)
