/**
 * Datei: public/leitstand/code-daten.js
 *
 * Zweck: Reine Regeln für Entwicklung › Code (#/code) und die rechte Spalte von „Auftrag anlegen“
 * (#/projekt), F46 D4 (docs/design/abgleich-f46.md §4.11, §4.12). Alles hier arbeitet nur auf der
 * Antwort der Leseroute GET …/code (scripts/leitstand/routen-code.mjs) und auf Formular- bzw.
 * Poll-Werten — kein DOM, kein Netz, in Node testbar.
 *
 * - gruppiereNachOrdner: Dateien nach Ordner (Reihenfolge der Route bleibt).
 * - sicherBefehle: der Befehlsblock „Sichern“ mit echten Dateien, Commit-Vorschlag aus dem
 *   Branchnamen und Push — PowerShell-tauglich gequotet, keine Platzhalter (F-958, F-959). Gibt es
 *   nichts Sicheres zu zeigen (keine Änderungen, Liste gekappt, kein Branch), kommt ein Grund statt
 *   eines halben Befehls.
 * - verlaufArt/filtereVerlauf: Verlauf auf main nach Alle · Feature · Fixes · Doku.
 * - freigabeZustand: Commit-Freigabe aus den Metadaten (Dateizeit, 10 Minuten).
 * - bereitschaft: die Prüfliste „Bereit zum Start?“.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/code.js, public/leitstand/views/auftrag-umgebung.js
 * - public/leitstand/code-daten.test.mjs (node:test)
 *
 * Wichtig: Die Befehle werden nur angezeigt und auf Klick kopiert — der Leitstand führt nichts aus.
 * Pfade und Branch kommen aus Git und werden für PowerShell in einfache Anführungszeichen gesetzt,
 * sobald sie nicht mit einem Buchstaben beginnen oder etwas anderes als [A-Za-z0-9._/-] enthalten (jedes
 * einfache Anführungszeichen, auch ’ ‘ ‚ ‛, verdoppelt); der Commit-Vorschlag enthält nur Zeichen, die in
 * doppelten Anführungszeichen nichts auslösen.
 */

/** Gültigkeit der Commit-Freigabe laut Hook commit-guard (.claude/hooks/commit-guard.cjs). */
export const FREIGABE_MINUTEN = 10

/**
 * Argumente, die in PowerShell ohne Anführungszeichen sicher sind: beginnen mit einem Buchstaben (nie
 * mit einer Ziffer — „1kb“ oder „1e3“ läse PowerShell als Zahl, Prüfpass cr 1) und enthalten nur
 * Buchstaben, Ziffern und . _ / -.
 */
const PS_SICHER = /^[A-Za-z][A-Za-z0-9._/-]*$/

/** Einfache Anführungszeichen, die PowerShell gleich behandelt: ' und die typografischen ‘ ’ ‚ ‛ (Prüfpass cr 1). */
const PS_EINFACH = /['‘’‚‛]/g

/** Ein abgekürzter oder voller Commit-Hash. */
const HASH = /^[0-9a-f]{7,64}$/

/** Höchstzahl Pfade und Zeichen je Zeile „git add“ (Windows begrenzt eine Kommandozeile auf 32 767 Zeichen, Prüfpass qa 4). */
const ADD_PFADE_JE_ZEILE = 50
const ADD_ZEICHEN_JE_ZEILE = 8000

/** Zeichen, die Git in einem Pfad als Muster liest (Glob) — solche Pfade bekommen „:(literal)“ (Prüfpass qa 12). */
const GLOB_ZEICHEN = /[*?[\]]/

/**
 * Setzt ein Argument für PowerShell sicher: unverändert, wenn es nur harmlose Zeichen enthält, sonst
 * in einfache Anführungszeichen (darin ist nichts aktiv; jedes einfache Anführungszeichen, auch ein
 * typografisches, wird verdoppelt).
 * @param text - Pfad oder Branch
 * @returns Argument
 */
export function psArgument(text) {
  const s = String(text)
  if (PS_SICHER.test(s)) return s
  return `'${s.replace(PS_EINFACH, '$&$&')}'`
}

/**
 * Pfad als git-add-Argument: wörtlich (Glob-Zeichen oder führendes „-“ → „:(literal)“ davor, dann ist
 * er weder Muster noch Schalter), dann PowerShell-gequotet.
 * @param pfad - repo-relativer Pfad
 * @returns Argument
 */
export function gitPfadArgument(pfad) {
  return psArgument(GLOB_ZEICHEN.test(pfad) || pfad.startsWith('-') ? `:(literal)${pfad}` : pfad)
}

/**
 * Ordner eines repo-relativen Pfads ('' für die Repo-Wurzel).
 * @param pfad - Pfad mit '/'
 * @returns Ordner
 */
export function ordnerVon(pfad) {
  const i = pfad.lastIndexOf('/')
  return i === -1 ? '' : pfad.slice(0, i)
}

/**
 * Dateiname eines Pfads.
 * @param pfad - Pfad mit '/'
 * @returns Name
 */
export function nameVon(pfad) {
  return pfad.slice(pfad.lastIndexOf('/') + 1)
}

/**
 * Gruppiert Dateien nach Ordner, in der Reihenfolge des ersten Auftretens.
 * @param eintraege - dateien.eintraege der Route
 * @returns [{ ordner, dateien }]
 */
export function gruppiereNachOrdner(eintraege) {
  const gruppen = new Map()
  for (const datei of Array.isArray(eintraege) ? eintraege : []) {
    const ordner = ordnerVon(datei.pfad)
    if (!gruppen.has(ordner)) gruppen.set(ordner, [])
    gruppen.get(ordner).push(datei)
  }
  return [...gruppen].map(([ordner, dateien]) => ({ ordner, dateien }))
}

/**
 * Summe der Zeilen (+/−) über alle Dateien mit bekannter Zahl.
 * @param eintraege - dateien.eintraege
 * @returns { plus, minus }
 */
export function summeZeilen(eintraege) {
  let plus = 0
  let minus = 0
  for (const e of Array.isArray(eintraege) ? eintraege : []) {
    if (typeof e.plus === 'number') plus += e.plus
    if (typeof e.minus === 'number') minus += e.minus
  }
  return { plus, minus }
}

/**
 * Commit-Vorschlag aus dem Branchnamen: 'feat/f46-d4-entwicklung-code' → 'F46 D4: entwicklung code',
 * sonst der Name ohne Präfix mit Leerzeichen. Nur Buchstaben, Ziffern, Leerzeichen und . , : # ( ) -
 * bleiben — nichts, was in doppelten Anführungszeichen etwas auslöst ($, `, ").
 * @param branch - Branchname oder null
 * @returns Vorschlag oder null
 */
export function commitVorschlag(branch) {
  if (typeof branch !== 'string' || branch.trim() === '') return null
  const ohnePraefix = branch.replace(/^(?:feat|feature|fix|bugfix|docs|chore|refactor|test|ws)\//i, '')
  const muster = ohnePraefix.match(/^f(\d+[a-z]?)-((?:ws-?)?[a-z]{0,2}\d+[a-z]?)-(.+)$/i)
  let roh = ohnePraefix.replace(/[-_/]+/g, ' ')
  if (muster !== null) {
    const teil = muster[2].toLowerCase()
    const ws = teil.startsWith('ws') ? `WS-${teil.replace(/^ws-?/, '')}` : `${teil.charAt(0).toUpperCase()}${teil.slice(1)}`
    roh = `F${muster[1].toLowerCase()} ${ws}: ${muster[3].replace(/[-_/]+/g, ' ')}`
  }
  const sauber = roh
    .replace(/[^\p{L}\p{N} .,:#()-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return sauber === '' ? null : sauber
}

/**
 * Befehlsblock „Sichern“: git add mit den echten Dateien, git commit mit dem Vorschlag, git push.
 * Welche Pfade in „git add“ gehören (Prüfpass qa 1): jede Datei mit Änderung im Arbeitsbaum oder neu;
 * NICHT eine schon gestagte Löschung (X = D) und nicht der alte Pfad einer gestagten Umbenennung — beide
 * stehen weder im Index noch im Arbeitsbaum, „git add“ bräche sonst mit „pathspec did not match“ ab und
 * stagte gar nichts. Die Zeile wird bei vielen Pfaden aufgeteilt; ohne „origin“ entfällt der Push.
 * @param daten - Antwort der Route (status ok)
 * @param optionen - { veraltet: true, wenn das letzte Aktualisieren scheiterte (kein Befehl aus altem Stand) }
 * @returns { zeilen: string[], hinweise: string[] } oder { grund: 'veraltet' | 'keineAenderungen' | 'gekappt' |
 *   'keinBranch' | 'aufMain' | 'dateienFehler' | 'branchFehler' | 'keinVorschlag' }
 */
export function sicherBefehle(daten, { veraltet = false } = {}) {
  if (veraltet) return { grund: 'veraltet' }
  const dateien = daten?.dateien
  if (dateien?.status !== 'ok') return { grund: 'dateienFehler' }
  if (dateien.eintraege.length === 0) return { grund: 'keineAenderungen' }
  if (dateien.gekappt) return { grund: 'gekappt' }
  const branch = daten?.branch
  if (branch?.status !== 'ok') return { grund: 'branchFehler' }
  if (branch.losgeloest || typeof branch.name !== 'string') return { grund: 'keinBranch' }
  // Auf main wird nicht gesichert — erst ein Feature-Branch (Prüfpass qa 3).
  if (branch.name === 'main' || branch.name === 'master') return { grund: 'aufMain' }
  const nachricht = commitVorschlag(branch.name)
  if (nachricht === null) return { grund: 'keinVorschlag' }
  const pfade = []
  for (const e of dateien.eintraege) {
    if (typeof e.xy === 'string' && e.xy[0] === 'D') continue
    pfade.push(e.pfad)
  }
  const zeilen = []
  let teil = []
  let laenge = 0
  for (const argument of [...new Set(pfade)].map(gitPfadArgument)) {
    if (teil.length >= ADD_PFADE_JE_ZEILE || (teil.length > 0 && laenge + argument.length + 1 > ADD_ZEICHEN_JE_ZEILE)) {
      zeilen.push(`git add ${teil.join(' ')}`)
      teil = []
      laenge = 0
    }
    teil.push(argument)
    laenge += argument.length + 1
  }
  if (teil.length > 0) zeilen.push(`git add ${teil.join(' ')}`)
  zeilen.push(`git commit -m "${nachricht}"`)
  const hinweise = []
  if (daten.remoteWebUrl?.status === 'ok' && daten.remoteWebUrl.origin === false) hinweise.push('keinOrigin')
  else zeilen.push(`git push -u origin ${psArgument(branch.name)}`)
  return { zeilen, hinweise }
}

/**
 * Art eines Commits auf main für den Filter.
 * @param eintrag - verlauf.eintraege[i]
 * @returns 'fix' | 'doku' | 'feature' | 'sonstiges'
 */
export function verlaufArt(eintrag) {
  const betreff = String(eintrag?.betreff ?? '')
  if (/^(?:fix|hotfix|bugfix)\b/i.test(betreff) || /^F\d+[a-z]?\s+Fix(?:paket)?\b/i.test(betreff)) return 'fix'
  if (/^(?:docs?|doku)\b/i.test(betreff) || /\bDoku(?:mentation)?\b/.test(betreff.split(':')[0] ?? '')) return 'doku'
  if (eintrag?.zuordnung?.feature) return 'feature'
  return 'sonstiges'
}

/**
 * Filtert den Verlauf.
 * @param eintraege - verlauf.eintraege
 * @param filter - 'alle' | 'feature' | 'fix' | 'doku'
 * @returns Liste
 */
export function filtereVerlauf(eintraege, filter) {
  const liste = Array.isArray(eintraege) ? eintraege : []
  return filter === 'alle' ? liste : liste.filter((e) => verlaufArt(e) === filter)
}

/**
 * Abstand in Stunden und Minuten.
 * @param minuten - abstandMinuten oder null
 * @returns { stunden, minuten } oder null
 */
export function zerlegeAbstand(minuten) {
  if (typeof minuten !== 'number' || !Number.isFinite(minuten) || minuten < 0) return null
  return { stunden: Math.floor(minuten / 60), minuten: minuten % 60 }
}

/**
 * Link auf einen Commit bei GitHub.
 * @param remoteWebUrl - geprüfte Repo-Adresse oder null
 * @param hash - Commit-Hash
 * @returns URL oder null
 */
export function commitUrl(remoteWebUrl, hash) {
  if (typeof remoteWebUrl !== 'string' || typeof hash !== 'string' || !HASH.test(hash)) return null
  return `${remoteWebUrl}/commit/${hash}`
}

/**
 * Zustand der Commit-Freigabe — mit der seit dem Laden vergangenen Zeit, damit die Anzeige ohne neuen
 * Git-Abruf abläuft (Prüfpass qa 6).
 * @param feld - freigabeCommit der Route
 * @param vergangeneMinuten - Minuten seit dem Laden des Stands
 * @returns { art: 'gueltig' | 'abgelaufen' | 'keine' | 'fehler' | 'unbekannt', restMinuten?, alterMinuten? }
 */
export function freigabeZustand(feld, vergangeneMinuten = 0) {
  if (feld === undefined || feld === null) return { art: 'unbekannt' }
  if (feld.status !== 'ok') return { art: 'fehler' }
  if (!feld.vorhanden) return { art: 'keine' }
  const alter = typeof feld.alterMinuten === 'number' ? feld.alterMinuten + Math.max(0, Math.floor(vergangeneMinuten)) : null
  if (typeof alter !== 'number') return { art: 'fehler' }
  return alter < FREIGABE_MINUTEN ? { art: 'gueltig', restMinuten: FREIGABE_MINUTEN - alter, alterMinuten: alter } : { art: 'abgelaufen', alterMinuten: alter }
}

/**
 * Prüfliste „Bereit zum Start?“ (§4.11). Jede Zeile: { id, zustand: 'ok' | 'offen' | 'warnung' |
 * 'laedt' | 'fehler' | 'kommt', pflicht }. Ergebnis 'bereit' nur, wenn alle Pflichtzeilen ok sind.
 * @param eingabe - { titel, ergebnis, kontext, aktiverLauf (aus dem Poll, undefined = unbekannt),
 *   codeStand ({ zustand, daten } aus code-stand.js) }
 * @returns { zeilen, bereit, mainWarnung }
 */
export function bereitschaft({ titel, ergebnis, kontext, aktiverLauf, codeStand }) {
  const daten = codeStand?.daten ?? null
  const laedt = codeStand?.zustand === 'laedt' && daten === null
  const ausRoute = (pruefe) => (laedt ? 'laedt' : daten === null ? 'fehler' : pruefe(daten))
  const textOk = (wert) => typeof wert === 'string' && wert.trim() !== ''
  const zeilen = [
    { id: 'titel', pflicht: true, zustand: textOk(titel) ? 'ok' : 'offen' },
    { id: 'ergebnis', pflicht: true, zustand: textOk(ergebnis) ? 'ok' : 'offen' },
    { id: 'kontext', pflicht: false, zustand: textOk(kontext) ? 'ok' : 'offen' },
    { id: 'projektkarte', pflicht: false, zustand: 'kommt' },
    // Gefunden heißt: der Ordner existiert (Feld arbeitsverzeichnis) und Git antwortet dort; ohne Git „prüfen“.
    { id: 'arbeitsverzeichnis', pflicht: true, zustand: ausRoute((d) => (d.arbeitsverzeichnis?.vorhanden !== true ? 'fehler' : d.status === 'ok' ? 'ok' : 'warnung')) },
    {
      id: 'git',
      pflicht: false,
      zustand: ausRoute((d) => {
        if (d.status !== 'ok' || d.branch?.status !== 'ok') return 'fehler'
        if (d.branch.losgeloest || d.branch.name === 'main' || d.branch.name === 'master') return 'warnung'
        return d.dateien?.status === 'ok' && d.dateien.anzahl > 0 ? 'warnung' : 'ok'
      }),
    },
    { id: 'pruefbefehl', pflicht: true, zustand: ausRoute((d) => (d.startvorlage?.status === 'ok' && textOk(d.startvorlage.pruefbefehl) ? 'ok' : 'offen')) },
    { id: 'harness', pflicht: false, zustand: ausRoute((d) => (d.harness?.status !== 'ok' ? 'fehler' : d.harness.claudeMd ? 'ok' : 'warnung')) },
    { id: 'lauf', pflicht: true, zustand: typeof aktiverLauf?.aktiv !== 'boolean' ? 'laedt' : aktiverLauf.aktiv ? 'warnung' : 'ok' },
  ]
  const mainWarnung = daten?.branch?.status === 'ok' && !daten.branch.losgeloest && (daten.branch.name === 'main' || daten.branch.name === 'master')
  return { zeilen, bereit: zeilen.filter((z) => z.pflicht).every((z) => z.zustand === 'ok'), mainWarnung }
}
