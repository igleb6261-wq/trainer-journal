#!/usr/bin/env node
/* ============================================================
   Builds encrypted parts with the trainer's own technique videos.

   Usage:  node scripts/build-own-videos.mjs ~/Projects/trainer-journal-videos

   The workspace folder (outside the repo, never committed) holds:
     videos.json  — [{ exercise, group, file }] mapping, file is in encoded/
     encoded/     — compressed mp4 files (see scripts/encode-video.swift)
     packed.json  — what is already packed (created by this script)

   Only videos that are new or changed get packed, into a NEW part, so
   existing parts stay untouched in git. Output: public/own/part-NN.bin
   and public/own/index.json. Each part is "TJENC1\n" + salt + iv +
   AES-GCM(PBKDF2-SHA256) of a "TJVID1" pack — same format as videos.bin.
   The password is asked interactively, checked against videos.bin and
   never stored anywhere.
   ============================================================ */
import { createHash, webcrypto } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'

const { subtle } = webcrypto
const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'public', 'own')
const PART_LIMIT = 45 * 1024 * 1024
const ITER = 200000

const ws = resolve((process.argv[2] ?? '').replace(/^~/, process.env.HOME))
if (!process.argv[2] || !existsSync(join(ws, 'videos.json'))) {
  console.error('Usage: node scripts/build-own-videos.mjs <workspace with videos.json>')
  process.exit(1)
}

const exKey = (n) => n.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
const idOf = (name) => 'own-pack-' + createHash('sha1').update(exKey(name)).digest('hex').slice(0, 12)

function askHidden(q) {
  return new Promise((res) => {
    stdout.write(q)
    if (!stdin.isTTY) {
      // piped input (tests): first line
      let s = ''
      stdin.setEncoding('utf8')
      stdin.on('data', (c) => (s += c))
      stdin.on('end', () => res(s.split('\n')[0]))
      return
    }
    let s = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const on = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.off('data', on)
        stdout.write('\n')
        res(s)
      } else if (ch === '\u0003') process.exit(1)
      else if (ch === '\u007f') s = s.slice(0, -1)
      else s += ch
    }
    stdin.on('data', on)
  })
}

async function keyFor(password, salt) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(password.trim()), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

const MAG = Buffer.from('TJENC1\n')
async function decrypt(buf, password) {
  if (!buf.subarray(0, MAG.length).equals(MAG)) throw new Error('not a TJENC1 file')
  const salt = buf.subarray(MAG.length, MAG.length + 16)
  const iv = buf.subarray(MAG.length + 16, MAG.length + 28)
  return Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv }, await keyFor(password, salt), buf.subarray(MAG.length + 28)))
}
async function encrypt(plain, password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const data = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(password, salt), plain))
  return Buffer.concat([MAG, salt, iv, data])
}

function buildPack(items) {
  const files = []
  const exercises = []
  const blobs = []
  let off = 0
  for (const it of items) {
    const b = readFileSync(join(ws, 'encoded', it.file))
    const id = idOf(it.exercise)
    files.push([id, off, b.length])
    exercises.push([it.exercise, it.group, [id]])
    blobs.push(b)
    off += b.length
  }
  const header = Buffer.from(JSON.stringify({ format: 'trainer-journal-videos', version: 1, exercises, files }))
  const len = Buffer.alloc(4)
  len.writeUInt32LE(header.length)
  return Buffer.concat([Buffer.from('TJVID1\n'), len, header, ...blobs])
}

const list = JSON.parse(readFileSync(join(ws, 'videos.json'), 'utf8'))
const statePath = join(ws, 'packed.json')
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { parts: [] }
const sig = (it) => `${it.exercise}|${it.file}|${statSync(join(ws, 'encoded', it.file)).size}`
const done = new Set(state.parts.flatMap((p) => p.items))
const todo = list.filter((it) => !done.has(sig(it)))
if (!todo.length) {
  console.log('Nothing new to pack.')
  process.exit(0)
}
console.log(`Videos to pack: ${todo.length}`)

const password = await askHidden('Пароль для видео (тот же, что в приложении): ')
try {
  await decrypt(readFileSync(join(ROOT, 'public', 'videos.bin')), password)
} catch {
  console.error('Пароль не подошёл к videos.bin — ничего не сделано.')
  process.exit(1)
}

// group into parts of up to PART_LIMIT
const groups = [[]]
let size = 0
for (const it of todo) {
  const s = statSync(join(ws, 'encoded', it.file)).size
  if (size + s > PART_LIMIT && groups.at(-1).length) {
    groups.push([])
    size = 0
  }
  groups.at(-1).push(it)
  size += s
}

mkdirSync(OUT, { recursive: true })
for (const g of groups) {
  const n = state.parts.length + 1
  const name = `own/part-${String(n).padStart(2, '0')}.bin`
  const enc = await encrypt(buildPack(g), password)
  // self-check: decrypts back and header parses
  const back = await decrypt(enc, password)
  const hlen = back.readUInt32LE(7)
  const head = JSON.parse(back.subarray(11, 11 + hlen).toString())
  if (head.files.length !== g.length) throw new Error('self-check failed')
  writeFileSync(join(ROOT, 'public', name), enc)
  state.parts.push({ file: name, items: g.map(sig) })
  console.log(`${name}: ${g.length} videos, ${(enc.length / 1048576).toFixed(1)} MB`)
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ parts: state.parts.map((p) => p.file) }, null, 1) + '\n')
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n')
console.log('Готово.')
