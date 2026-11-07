/* Встроенные описания техники упражнений (подгружаются отдельным файлом при первом открытии) */
import { exKey } from '../../db'
import chest from './chest'
import back from './back'
import shoulders from './shoulders'
import arms from './arms'
import quads from './quads'
import hamstrings from './hamstrings'
import glutes from './glutes'
import core from './core'
import cardio from './cardio'
import stretch from './stretch'

export const TECHNIQUE = new Map<string, string>()
for (const part of [chest, back, shoulders, arms, quads, hamstrings, glutes, core, cardio, stretch]) {
  for (const [name, text] of Object.entries(part)) TECHNIQUE.set(exKey(name), text.trim())
}
