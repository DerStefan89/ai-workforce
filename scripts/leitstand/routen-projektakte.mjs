/**
 * Datei: scripts/leitstand/routen-projektakte.mjs
 *
 * Zweck: Projektion für GET /api/projektakte (F46 D1, docs/design/abgleich-f46.md §4.3) — die
 * Leseroute der Projektakte. Liefert die drei Kontextdateien beschreibung.md, anweisungen.md und
 * lagebild.md aus dem Kontextordner des Projekts als Klartext, dazu das Versionsziel (Zielsatz und
 * Erfolgskriterien des aktuellen Meilensteins) aus docs/projekt/zielfassung.md, wenn es dort
 * eindeutig auffindbar ist, und Status/Pfad von zielfassung.md und roadmap.json für die Quellenliste.
 *
 * Sicherheitsgrenzen (lesend, keine Eingabe aus der Anfrage):
 * - Feste Pfadliste: die Dateinamen stehen in KONTEXT_DATEIEN; Ordner (kontextPfad), Roadmap-Pfad
 *   und Zielfassungs-Pfad kommen aus der Serverinstanz (Projektregister bzw. Default), nie aus URL,
 *   Query oder Körper — die Route liest keinen Anfrageteil.
 * - Jeder Pfad wird gegen die Repo-Wurzel aufgelöst; ein absoluter Pfad, ein '..'-Segment oder ein
 *   Pfad, dessen echter Ort (realpath, folgt Verknüpfungen) außerhalb der Repo-Wurzel liegt, ist
 *   'fehler' — es wird dann nichts gelesen.
 * - Größengrenze je Datei MAX_BYTES (64 KB): gelesen werden höchstens so viele Bytes, das Feld
 *   'gekuerzt' kennzeichnet den Schnitt. Die Zielfassung wird nur für die Suche gelesen (Grenze
 *   ZIELFASSUNG_MAX_BYTES), ihr Text geht nicht in die Antwort.
 * - Fehler sind Feldstatus ('fehlt' | 'fehler'), nie ein 500 — Muster baueRoadmapProjektion.
 *
 * Versionsziel „eindeutig auffindbar“ (Prüfpunkt D1, abgleich-f46.md §7): aktueller Meilenstein nach
 * derselben Regel wie public/leitstand/roadmap-anzeige.js aktuellerMeilenstein (erster LAEUFT, sonst
 * erster nicht ABGESCHLOSSEN); in der Zielfassung genau EINE Zeile, die mit
 * '**Zielsatz <Meilenstein-ID>' beginnt (z. B. '**Zielsatz M5 (= V1-RC):**'). Erfolgskriterien
 * genauso über genau eine Zeile '**Bestehensbedingung <ID>…:**' mit nummerierter Liste darunter.
 * Null oder mehrere Treffer: 'nicht_eindeutig' — die Ansicht zeigt dann „kommt“, nichts Geratenes.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET /api/projektakte, je Projektinstanz über den Dispatcher)
 * - scripts/leitstand/routen-projektakte.test.mjs (node:test)
 *
 * Wichtig: Dateiinhalte gehen roh (als Text) an den Client; dort werden sie escaped und als
 * Absätze gezeigt, nie als Markdown gerendert (public/leitstand/projektakte-anzeige.js).
 */

import { closeSync, openSync, readSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { baueRoadmapProjektion } from './routen-roadmap.mjs'

/** Höchstgröße je Kontextdatei in Bytes; darüber wird gekürzt (Feld 'gekuerzt'). */
export const MAX_BYTES = 64 * 1024

/** Höchstgröße der Zielfassung für die Suche nach dem Versionsziel (Text geht nicht in die Antwort). */
export const ZIELFASSUNG_MAX_BYTES = 1024 * 1024

/** Ersatzzeichen U+FFFD am Textende (entsteht, wenn die Größengrenze ein Mehrbyte-Zeichen teilt). */
const ERSATZZEICHEN_AM_ENDE = new RegExp(`${String.fromCharCode(0xfffd)}+$`)

/** Höchstlänge von Zielsatz und je Erfolgskriterium in Zeichen (Schutz vor einer entgleisten Fundstelle). */
const MAX_ZEICHEN = 2000

/** Feste Dateinamen im Kontextordner — die einzige Liste lesbarer Kontextdateien. */
export const KONTEXT_DATEIEN = Object.freeze({ beschreibung: 'beschreibung.md', anweisungen: 'anweisungen.md', lagebild: 'lagebild.md' })

/** Fester Pfad der Zielfassung (repo-relativ). */
export const ZIELFASSUNG_PFAD = 'docs/projekt/zielfassung.md'

/**
 * Löst einen repo-relativen Pfad sicher auf.
 * @param repoWurzel - Repo-Wurzel des Projekts
 * @param pfad - repo-relativer Pfad aus der Serverkonfiguration
 * @returns { ok: true, absolut } oder { ok: false, grund }
 */
function loesePfadAuf(repoWurzel, pfad) {
  if (typeof pfad !== 'string' || pfad === '' || isAbsolute(pfad) || /^[A-Za-z]:/.test(pfad) || pfad.split(/[/\\]/).includes('..')) {
    return { ok: false, grund: 'Pfad ist nicht repo-relativ' }
  }
  const wurzel = resolve(repoWurzel)
  const absolut = resolve(wurzel, pfad)
  if (absolut !== wurzel && !absolut.startsWith(wurzel + sep)) return { ok: false, grund: 'Pfad liegt außerhalb der Repo-Wurzel' }
  return { ok: true, absolut }
}

/**
 * Prüft, dass der echte Ort einer vorhandenen Datei (Verknüpfungen aufgelöst) unter der echten
 * Repo-Wurzel liegt.
 * @param repoWurzel - Repo-Wurzel
 * @param absolut - aufgelöster Pfad
 * @returns true, wenn innerhalb
 */
function liegtEchtInnerhalb(repoWurzel, absolut) {
  const wurzel = realpathSync(resolve(repoWurzel))
  const echt = realpathSync(absolut)
  const rel = relative(wurzel, echt)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Liest höchstens maxBytes einer Datei als UTF-8.
 * @param absolut - Dateipfad
 * @param maxBytes - Grenze
 * @returns { text, gekuerzt }
 */
function leseBegrenzt(absolut, maxBytes) {
  const groesse = statSync(absolut).size
  const anzahl = Math.min(groesse, maxBytes)
  const puffer = Buffer.alloc(anzahl)
  const fd = openSync(absolut, 'r')
  try {
    let gelesen = 0
    while (gelesen < anzahl) {
      const n = readSync(fd, puffer, gelesen, anzahl - gelesen, gelesen)
      if (n === 0) break
      gelesen += n
    }
    // Ein Schnitt mitten in einem Mehrbyte-Zeichen ergibt am Ende U+FFFD — nur dann weg damit; ein echtes
    // Ersatzzeichen am Ende einer ungekürzten Datei bleibt stehen (Prüfpass D1, cr 3).
    const gekuerzt = groesse > maxBytes
    const roh = puffer.subarray(0, gelesen).toString('utf8')
    return { text: gekuerzt ? roh.replace(ERSATZZEICHEN_AM_ENDE, '') : roh, gekuerzt }
  } finally {
    closeSync(fd)
  }
}

/**
 * Liest eine Datei der festen Liste.
 * @param repoWurzel - Repo-Wurzel
 * @param pfad - repo-relativer Pfad (aus der Serverkonfiguration)
 * @param optionen - { mitText: true liefert text/gekuerzt, maxBytes }
 * @returns { status: 'ok' | 'fehlt' | 'fehler', pfad, absolut?, text?, gekuerzt?, grund? }
 */
export function leseKontextDatei(repoWurzel, pfad, { mitText = true, maxBytes = MAX_BYTES } = {}) {
  const aufgeloest = loesePfadAuf(repoWurzel, pfad)
  if (!aufgeloest.ok) return { status: 'fehler', pfad: String(pfad ?? ''), grund: aufgeloest.grund }
  try {
    const info = statSync(aufgeloest.absolut)
    if (!info.isFile()) return { status: 'fehler', pfad, grund: 'keine Datei' }
    if (!liegtEchtInnerhalb(repoWurzel, aufgeloest.absolut)) return { status: 'fehler', pfad, grund: 'Pfad liegt außerhalb der Repo-Wurzel' }
    const eintrag = { status: 'ok', pfad, absolut: aufgeloest.absolut }
    if (!mitText) return eintrag
    return { ...eintrag, ...leseBegrenzt(aufgeloest.absolut, maxBytes) }
  } catch (fehler) {
    if (fehler?.code === 'ENOENT' || fehler?.code === 'ENOTDIR') return { status: 'fehlt', pfad }
    return { status: 'fehler', pfad, grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Aktueller Meilenstein einer gültigen Roadmap-Projektion (Regel wie aktuellerMeilenstein im Client).
 * @param projektion - Ergebnis von baueRoadmapProjektion
 * @returns Meilenstein-ID oder null
 */
export function aktuelleMeilensteinId(projektion) {
  if (projektion?.status !== 'ok' || !Array.isArray(projektion.meilensteine)) return null
  const m = projektion.meilensteine.find((x) => x.status === 'LAEUFT') ?? projektion.meilensteine.find((x) => x.status !== 'ABGESCHLOSSEN')
  return m?.id ?? null
}

/**
 * Escaped einen Text für einen regulären Ausdruck.
 * @param text - Rohtext
 * @returns escapter Text
 */
function regexText(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Kürzt einen Fundtext auf MAX_ZEICHEN.
 * @param text - Rohtext
 * @returns Text
 */
function kappe(text) {
  return text.length > MAX_ZEICHEN ? `${text.slice(0, MAX_ZEICHEN)}…` : text
}

/**
 * Sucht Zielsatz und Erfolgskriterien eines Meilensteins in der Zielfassung (Regel im Dateikopf).
 * Rein, ohne I/O.
 * @param text - Inhalt der Zielfassung
 * @param meilensteinId - z. B. 'M5'
 * @returns { status: 'ok', zielsatz, kriterien: string[] | null } | { status: 'nicht_eindeutig', treffer }
 */
export function findeVersionsziel(text, meilensteinId) {
  const zeilen = text.split(/\r?\n/)
  const kopf = (wort) => new RegExp(`^\\*\\*${wort} ${regexText(meilensteinId)}(?![\\w-])[^*]*\\*\\*\\s*(.*)$`)
  const zielMuster = kopf('Zielsatz')
  const zielTreffer = zeilen.map((z, i) => ({ i, m: z.match(zielMuster) })).filter((x) => x.m !== null)
  if (zielTreffer.length !== 1) return { status: 'nicht_eindeutig', treffer: zielTreffer.length }

  // Zielsatz: Rest der Kopfzeile plus Folgezeilen bis zur Leerzeile.
  const teile = [zielTreffer[0].m[1]]
  for (let i = zielTreffer[0].i + 1; i < zeilen.length && zeilen[i].trim() !== ''; i++) teile.push(zeilen[i].trim())
  const zielsatz = kappe(teile.join(' ').replace(/\s+/g, ' ').trim())
  if (zielsatz === '') return { status: 'nicht_eindeutig', treffer: 1 }

  // Erfolgskriterien: nummerierte Liste direkt unter genau einer Bestehensbedingung.
  const bedingungMuster = kopf('Bestehensbedingung')
  const bedTreffer = zeilen.map((z, i) => ({ i, m: z.match(bedingungMuster) })).filter((x) => x.m !== null)
  let kriterien = null
  if (bedTreffer.length === 1) {
    const liste = []
    for (let i = bedTreffer[0].i + 1; i < zeilen.length; i++) {
      const zeile = zeilen[i]
      const punkt = zeile.match(/^\d+\.\s+(.*)$/)
      if (punkt !== null) liste.push(punkt[1].trim())
      else if (zeile.trim() !== '' && /^\s+\S/.test(zeile) && liste.length > 0) liste[liste.length - 1] += ` ${zeile.trim()}`
      else if (zeile.trim() === '' && liste.length === 0) continue
      else break
    }
    if (liste.length > 0) kriterien = liste.map(kappe)
  }
  return { status: 'ok', zielsatz, kriterien }
}

/**
 * Baut die Projektion für GET /api/projektakte. Wirft nie.
 * @param optionen - { repoWurzel, kontextPfad, roadmapPfad, zielfassungPfad? } — alle aus der Serverinstanz
 * @returns { dateien: { beschreibung, anweisungen, lagebild, zielfassung, roadmap }, versionsziel }
 */
export function baueProjektakteProjektion({ repoWurzel, kontextPfad, roadmapPfad, zielfassungPfad = ZIELFASSUNG_PFAD }) {
  const dateien = {}
  for (const [schluessel, name] of Object.entries(KONTEXT_DATEIEN)) dateien[schluessel] = leseKontextDatei(repoWurzel, `${kontextPfad}/${name}`)
  dateien.roadmap = leseKontextDatei(repoWurzel, roadmapPfad, { mitText: false })
  const zielfassung = leseKontextDatei(repoWurzel, zielfassungPfad, { maxBytes: ZIELFASSUNG_MAX_BYTES })
  // Der Text der Zielfassung dient nur der Suche; in der Antwort stehen nur Status und Pfad.
  dateien.zielfassung = { status: zielfassung.status, pfad: zielfassung.pfad, ...(zielfassung.absolut ? { absolut: zielfassung.absolut } : {}), ...(zielfassung.grund ? { grund: zielfassung.grund } : {}) }
  const zielfassungText = zielfassung.text

  let versionsziel
  if (zielfassung.status !== 'ok') {
    versionsziel = { status: zielfassung.status === 'fehlt' ? 'fehlt' : 'fehler', meilenstein: null }
  } else {
    let meilenstein = null
    try {
      meilenstein = aktuelleMeilensteinId(baueRoadmapProjektion({ repoWurzel, roadmapPfad }))
    } catch (fehler) {
      console.error('GET /api/projektakte: Roadmap nicht lesbar:', fehler)
    }
    if (meilenstein === null) versionsziel = { status: 'nicht_eindeutig', meilenstein: null }
    else versionsziel = { meilenstein, ...findeVersionsziel(zielfassungText ?? '', meilenstein) }
  }
  return { dateien, versionsziel }
}
