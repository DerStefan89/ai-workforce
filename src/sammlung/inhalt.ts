/**
 * Datei: src/sammlung/inhalt.ts
 *
 * Zweck: Reine Bausteine des Prüflaufs (F45 F-2b-2, F-1056) für den Inhalt einer fremden Quelle — ohne Prozess, ohne Netz:
 * - pruefePfad: Segmentprüfung eines Pfads aus Tarball oder git-Baum (Advisor A6) — nichts, was Windows anders auflöst
 *   (Laufwerk, Gerätenamen, Punkt/Leerzeichen am Ende, „..“, Backslash, Doppelpunkt, Steuerzeichen);
 * - neutralisierePfad: benennt jedes Segment, das (nach NFC und Kleinschreibung) mit „.claude“ beginnt, und die Dateien
 *   CLAUDE.md/CLAUDE.local.md um (Präfix „_“), damit --add-dir keine Skills, Commands, Agents oder Anweisungen der Quelle
 *   lädt (Advisor A5) — jede Umbenennung ist ein Fakt;
 * - leseTarGz: eigener Tar-Leser für npm-Tarballs (gzip, ustar, pax „path“/„size“, GNU „L“), nur reguläre Dateien,
 *   Prüfsumme je Kopf, Grenzen (Advisor A6). Seit F-1075 fail-closed: jeder Eintrag, den npm anders auflösen könnte als der
 *   Prüfer (`./`, `//`, Punkt/Leerzeichen am Segmentende, Backslash, absolut, Laufwerk, `..`, Gerätename, Pfad-Zwillinge in
 *   Schreibweise oder Unicode-Form, Datei zugleich Ordner), bricht Prüfung und damit jede Installation ab; seit Runde 3 auch jeder
 *   Eintrag unter node_modules (bundleDependencies) und jedes nicht einfache Tar-Format (kein POSIX-ustar, GNU L/K, pax g,
 *   pax path/linkpath);
 * - pfadSchluessel / findeNamensKonflikt: Vergleichsform eines Pfads, wie Windows/NTFS ihn auflöst (NFC, klein, ohne Punkt/
 *   Leerzeichen am Segmentende), und die Suche nach Zwillingen und Datei/Ordner-Konflikten — auch für den ganzen git-Baum
 *   (Prüflauf und Skill-Installation, F-1075);
 * - istBinaer, sammleFakten: mechanische Fakten über den Inhalt (getrennt vom Modellurteil).
 *
 * Wird aufgerufen von: src/sammlung/quelle.ts (Holen), src/sammlung/inhalt.test.ts, scripts/check-f45-f2b2-pruefung.mjs.
 *
 * Wichtig: Nichts hier führt Inhalt aus oder interpretiert ihn über die Fakten hinaus. Grenzen (GRENZEN) gelten für beide
 * Quellen (git, npm) gleich.
 */

import { gunzipSync } from 'node:zlib'

/** Grenzen des Prüfinhalts (Plan v3 §2). */
export const GRENZEN = Object.freeze({
  /** höchstens so viele ausgewählte Dateien, sonst „zu groß für die Prüfung“ */
  maxDateien: 3000,
  /** höchstens so viele Bytes ausgewählt, sonst „zu groß für die Prüfung“ */
  maxBytes: 25 * 1024 * 1024,
  /** größere Einzeldateien werden übersprungen (Fakt) */
  maxDateiBytes: 1024 * 1024,
  /** entpackte Größe eines Tarballs */
  maxEntpacktBytes: 100 * 1024 * 1024,
  /** höchstens so viele übersprungene Dateien werden einzeln aufgezählt */
  maxAufgezaehlt: 50,
})

/** Eine Datei des Prüfinhalts (Pfad relativ, „/“ als Trenner, so wie in der Quelle). */
export interface InhaltDatei {
  pfad: string
  bytes: Buffer
}

/** Eine übersprungene Datei (Fakt) mit Grund-Code. */
export interface Uebersprungen {
  pfad: string
  grund: 'symlink' | 'submodul' | 'zu_gross' | 'pfad_abgelehnt' | 'binaer' | 'eintragstyp' | 'kollision'
  detail?: string
}

/** Windows-Gerätenamen (mit beliebiger Endung gefährlich, z. B. „nul.txt“). */
const GERAETENAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)(\..*)?$/i

/**
 * Segmentprüfung eines relativen Pfads (Advisor A6). Zulässig ist nur, was auf jedem System genau dieselbe Datei meint.
 * @param pfad - relativer Pfad mit „/“
 * @returns null (zulässig) oder Grund
 */
export function pruefePfad(pfad: string): string | null {
  if (pfad.length === 0) return 'leerer Pfad'
  if (pfad.length > 400) return 'Pfad länger als 400 Zeichen'
  if (pfad.startsWith('/')) return 'absoluter Pfad'
  if (/^[A-Za-z]:/.test(pfad)) return 'Laufwerksangabe'
  for (const segment of pfad.split('/')) {
    if (segment.length === 0) return 'leeres Segment'
    if (segment === '.' || segment === '..') return `Segment '${segment}'`
    if (/[\\:*?"<>|\u0000-\u001f\u007f]/.test(segment)) return `unzulässiges Zeichen in '${segment}'`
    if (/[. ]$/.test(segment)) return `Punkt oder Leerzeichen am Ende von '${segment}'`
    if (GERAETENAME.test(segment)) return `Windows-Gerätename '${segment}'`
  }
  return null
}

/**
 * Normalform eines Segments für den Vergleich: NFC, klein.
 * @param segment - Pfadsegment
 * @returns Normalform
 */
function normalform(segment: string): string {
  return segment.normalize('NFC').toLowerCase()
}

/** Dateinamen, die die CLI als Anweisungen lädt (Normalform). */
const ANWEISUNGS_DATEIEN = new Set(['claude.md', 'claude.local.md'])

/**
 * Neutralisiert einen (schon geprüften) Pfad (Advisor A5): Segmente mit Normalform „.claude…“ und die Dateien CLAUDE.md/
 * CLAUDE.local.md bekommen „_“ vorangestellt.
 * @param pfad - relativer Pfad mit „/“
 * @returns { pfad, umbenannt }
 */
export function neutralisierePfad(pfad: string): { pfad: string; umbenannt: boolean } {
  const segmente = pfad.split('/')
  let umbenannt = false
  const neu = segmente.map((segment, i) => {
    const n = normalform(segment)
    const letztes = i === segmente.length - 1
    if (n.startsWith('.claude') || (letztes && ANWEISUNGS_DATEIEN.has(n))) {
      umbenannt = true
      return `_${segment}`
    }
    return segment
  })
  return { pfad: neu.join('/'), umbenannt }
}

/**
 * Binärdatei: NUL-Byte in den ersten 8 KB.
 * @param bytes - Inhalt
 * @returns true bei Binärdatei
 */
export function istBinaer(bytes: Buffer): boolean {
  return bytes.subarray(0, 8192).includes(0)
}

/**
 * Vergleichsform eines relativen Pfads, wie Windows/NTFS (und npm auf Windows) ihn auflöst: je Segment NFC, klein, ohne Punkte
 * und Leerzeichen am Ende (F-1075).
 * @param pfad - relativer Pfad mit „/“
 * @returns Schlüssel
 */
export function pfadSchluessel(pfad: string): string {
  return pfad
    .split('/')
    .map((s) => s.normalize('NFC').toLowerCase().replace(/[. ]+$/, ''))
    .join('/')
}

/**
 * Sucht Pfad-Zwillinge (gleicher pfadSchluessel, z. B. `SKILL.md`/`skill.md` oder NFC/NFD) und Pfade, die zugleich Datei und
 * Ordner eines anderen sind (F-1075). Wer prüft, muss ALLE Einträge übergeben, nicht nur die ausgewählten.
 * @param pfade - relative Pfade (Dateien und andere Baum-Einträge)
 * @returns Beschreibung des ersten Konflikts oder null
 */
export function findeNamensKonflikt(pfade: readonly string[]): string | null {
  const je = new Map<string, string>()
  for (const p of pfade) {
    const k = pfadSchluessel(p)
    const vorher = je.get(k)
    if (vorher !== undefined) return `Pfad-Zwillinge '${vorher}' und '${p}' (nur Schreibweise bzw. Unicode-Form verschieden)`
    je.set(k, p)
  }
  const konflikt = ordnerKonflikt([...je.keys()])
  return konflikt === null ? null : `'${konflikt}' ist zugleich Datei und Ordner`
}

/**
 * Prüft den Namen eines Tar-Eintrags fail-closed (F-1075): nichts, was npm/node-tar anders auflösen könnte als der Prüfer.
 * @param name - voller Name im Tarball (vor dem Abschneiden des ersten Segments)
 * @param istOrdner - Typ „5“ (darf mit genau einem „/“ enden)
 * @returns Grund oder null
 */
export function pruefeTarName(name: string, istOrdner: boolean): string | null {
  if (name.includes('\\')) return 'Backslash im Namen'
  if (name.startsWith('/')) return 'absoluter Pfad'
  if (/^[A-Za-z]:/.test(name)) return 'Laufwerksbuchstabe'
  const ohneEnde = istOrdner && name.endsWith('/') ? name.slice(0, -1) : name
  for (const segment of ohneEnde.split('/')) {
    if (segment === '') return 'leeres Segment („//“ oder „/“ am Ende)'
    if (segment === '.') return 'Segment „.“ („./“)'
    if (segment === '..') return 'Segment „..“'
    if (/[. ]$/.test(segment)) return `Punkt oder Leerzeichen am Ende von '${segment}'`
  }
  return null
}

/** Ergebnis von leseTarGz. */
export type TarErgebnis = { ok: true; dateien: InhaltDatei[]; uebersprungen: Uebersprungen[]; wurzel: string | null } | { ok: false; grund: string }

/**
 * Liest ein oktales Tar-Feld.
 * @param feld - Bytes des Felds
 * @returns Zahl oder null (leer, ungültig oder base-256)
 */
function oktal(feld: Buffer): number | null {
  if ((feld[0] & 0x80) !== 0) return null
  const text = feld.toString('latin1').replace(/\0.*$/s, '').trim()
  if (text === '') return 0
  return /^[0-7]+$/.test(text) ? Number.parseInt(text, 8) : null
}

/**
 * Text eines Tar-Felds bis zum ersten NUL (UTF-8).
 * @param feld - Bytes
 * @returns Text
 */
function textFeld(feld: Buffer): string {
  const ende = feld.indexOf(0)
  return feld.subarray(0, ende === -1 ? feld.length : ende).toString('utf8')
}

/**
 * Liest pax-Datensätze („<länge> <schlüssel>=<wert>\n“).
 * @param daten - Inhalt des pax-Kopfs
 * @returns Schlüssel → Wert oder null (kaputt)
 */
function lesePax(daten: Buffer): Map<string, string> | null {
  const werte = new Map<string, string>()
  let pos = 0
  while (pos < daten.length) {
    const leer = daten.indexOf(0x20, pos)
    if (leer === -1) return null
    const laenge = Number.parseInt(daten.subarray(pos, leer).toString('latin1'), 10)
    if (!Number.isInteger(laenge) || laenge <= 0 || pos + laenge > daten.length) return null
    const satz = daten.subarray(leer + 1, pos + laenge - 1).toString('utf8')
    const gleich = satz.indexOf('=')
    if (gleich === -1) return null
    werte.set(satz.slice(0, gleich), satz.slice(gleich + 1))
    pos += laenge
  }
  return werte
}

/**
 * Liest einen npm-Tarball (gzip + tar) vollständig im Speicher (Advisor A6). Nur reguläre Dateien (Typ „0“/NUL/„7“) werden
 * Inhalt; Verzeichnisse zählen nicht, jeder andere Typ (Symlink, Hardlink, Gerät, FIFO, unbekannt) ist ein Fakt. Das erste
 * Segment (bei npm „package/“) wird entfernt, wie npm selbst es tut. Dateien über GRENZEN.maxDateiBytes und Binärdateien
 * werden übersprungen (Fakt — die Installation scheitert dann am Abgleich der Dateiliste). Seit F-1075: jeder Name, den
 * pruefeTarName oder pruefePfad ablehnt, → Fehler (kein Überspringen). Kaputter Kopf (Prüfsumme), base-256-Größe oder
 * Überschreiten der entpackten Grenze → Fehler (kein Teilinhalt). Code-Review F-2b-2a (1): derselbe Pfad zweimal (auch in anderer
 * Schreibweise) oder eine Datei, die zugleich Ordner eines anderen Eintrags ist, → Fehler: npm überschreibt beim Entpacken mit dem
 * LETZTEN Eintrag, geprüft würde sonst ein anderer Inhalt als der installierte.
 * @param gz - Bytes des .tgz
 * @returns Dateien und Fakten oder Fehler
 */
export function leseTarGz(gz: Buffer): TarErgebnis {
  let tar: Buffer
  try {
    tar = gunzipSync(gz, { maxOutputLength: GRENZEN.maxEntpacktBytes })
  } catch (fehler) {
    return { ok: false, grund: `Tarball nicht entpackbar (${(fehler as Error).message})` }
  }
  const dateien: InhaltDatei[] = []
  const uebersprungen: Uebersprungen[] = []
  let wurzel: string | null = null
  const gesehen = new Set<string>()
  const ordnerEintraege: string[] = []
  let paxNaechster: Map<string, string> | null = null
  let pos = 0
  while (pos + 512 <= tar.length) {
    const kopf = tar.subarray(pos, pos + 512)
    if (kopf.every((b) => b === 0)) break
    const pruefsumme = oktal(kopf.subarray(148, 156))
    let summe = 0
    for (let i = 0; i < 512; i++) summe += i >= 148 && i < 156 ? 0x20 : kopf[i]
    if (pruefsumme === null || pruefsumme !== summe) return { ok: false, grund: `Tarball beschädigt: Prüfsumme des Kopfs bei Byte ${pos} stimmt nicht` }
    const typ = String.fromCharCode(kopf[156])
    let groesse = oktal(kopf.subarray(124, 136))
    if (paxNaechster?.has('size') === true) groesse = Number(paxNaechster.get('size'))
    if (groesse === null || !Number.isSafeInteger(groesse) || groesse < 0) return { ok: false, grund: `Tarball: Größe bei Byte ${pos} nicht lesbar` }
    const datenStart = pos + 512
    const datenEnde = datenStart + groesse
    if (datenEnde > tar.length) return { ok: false, grund: 'Tarball abgeschnitten' }
    const daten = tar.subarray(datenStart, datenEnde)
    pos = datenStart + Math.ceil(groesse / 512) * 512

    // F-1075 Runde 3: nur einfache POSIX-ustar-Einträge — kein GNU-Langname/-Link (L/K), kein globaler pax-Kopf (g), keine
    // pax-Felder path/linkpath. So kann der eigene Leser nicht anders auflösen als node-tar (statt dessen Regeln nachzubilden).
    if (kopf.subarray(257, 263).toString('latin1') !== 'ustar\0') return { ok: false, grund: `Tar-Format nicht unterstützt: Eintrag bei Byte ${pos - 512 - Math.ceil(groesse / 512) * 512} ist kein POSIX-ustar` }
    if (typ === 'L' || typ === 'K' || typ === 'g') return { ok: false, grund: `Tar-Format nicht unterstützt: Kopf-Typ '${typ}' (GNU-Langname/-Link bzw. globaler pax-Kopf)` }
    if (typ === 'x') {
      paxNaechster = lesePax(daten)
      if (paxNaechster === null) return { ok: false, grund: 'Tarball: pax-Kopf nicht lesbar' }
      if (paxNaechster.has('path') || paxNaechster.has('linkpath')) return { ok: false, grund: 'Tar-Format nicht unterstützt: pax-Feld path/linkpath' }
      continue
    }
    const praefix = textFeld(kopf.subarray(345, 500))
    let name = praefix !== '' ? `${praefix}/${textFeld(kopf.subarray(0, 100))}` : textFeld(kopf.subarray(0, 100))
    paxNaechster = null
    // F-1075: kein Überspringen — ein Name, den npm anders auflösen könnte, bricht Prüfung (und damit jede Installation) ab.
    const nameGrund = pruefeTarName(name, typ === '5')
    if (nameGrund !== null) return { ok: false, grund: `Tarball-Eintrag '${name}': ${nameGrund} — npm könnte ihn anders auflösen als geprüft; abgebrochen` }
    const segmente = (typ === '5' && name.endsWith('/') ? name.slice(0, -1) : name).split('/')
    if (wurzel === null) wurzel = segmente[0]
    const relativ = segmente.slice(1).join('/')
    if (relativ !== '') {
      const relGrund = pruefePfad(relativ)
      if (relGrund !== null) return { ok: false, grund: `Tarball-Eintrag '${name}': ${relGrund}; abgebrochen` }
      // F-1075 Runde 3: nichts unter node_modules (jede Tiefe) — bundleDependencies würden ungeprüft mitinstalliert.
      if (pfadSchluessel(relativ).split('/').includes('node_modules')) return { ok: false, grund: `Tarball-Eintrag '${name}': bundleDependencies nicht unterstützt (node_modules im Paket); abgebrochen` }
    }
    if (typ === '5') {
      if (relativ !== '') ordnerEintraege.push(relativ)
      continue
    }
    if (relativ !== '') {
      const schluessel = pfadSchluessel(relativ)
      if (gesehen.has(schluessel)) return { ok: false, grund: `Tarball enthält '${relativ}' mehrfach (auch in anderer Schreibweise oder Unicode-Form) — npm nähme den letzten Eintrag, geprüft würde ein anderer; abgebrochen` }
      gesehen.add(schluessel)
    }
    if (typ !== '0' && typ !== '\0' && typ !== '7') {
      uebersprungen.push({ pfad: relativ || name, grund: 'eintragstyp', detail: `Tar-Typ '${typ === '\0' ? 'NUL' : typ}'` })
      continue
    }
    if (relativ === '') {
      uebersprungen.push({ pfad: name, grund: 'pfad_abgelehnt', detail: 'Datei auf der obersten Ebene des Tarballs' })
      continue
    }
    if (groesse > GRENZEN.maxDateiBytes) {
      uebersprungen.push({ pfad: relativ, grund: 'zu_gross', detail: `${groesse} Bytes` })
      continue
    }
    const bytes = Buffer.from(daten)
    if (istBinaer(bytes)) {
      uebersprungen.push({ pfad: relativ, grund: 'binaer' })
      continue
    }
    dateien.push({ pfad: relativ, bytes })
  }
  // Datei zugleich Ordner — über Dateien und Ordner-Einträge (Ordner allein dürfen mehrfach vorkommen).
  const ordnerSchluessel = new Set(ordnerEintraege.map(pfadSchluessel))
  const dateiAlsOrdner = [...gesehen].find((k) => ordnerSchluessel.has(k))
  const konflikt = dateiAlsOrdner ?? ordnerKonflikt([...gesehen])
  if (konflikt !== null) return { ok: false, grund: `Tarball: '${konflikt}' ist zugleich Datei und Ordner — abgebrochen` }
  return { ok: true, dateien, uebersprungen, wurzel }
}

/**
 * Findet einen Pfad, der zugleich Datei und Ordner eines anderen Pfads ist (`a` und `a/b`; Vergleich in Normalform).
 * @param pfade - relative Pfade
 * @returns erster Konflikt oder null
 */
export function ordnerKonflikt(pfade: readonly string[]): string | null {
  const normal = new Set(pfade.map(pfadSchluessel))
  for (const p of normal) {
    const teile = p.split('/')
    for (let k = 1; k < teile.length; k++) {
      const ordner = teile.slice(0, k).join('/')
      if (normal.has(ordner)) return ordner
    }
  }
  return null
}

/** Mechanische Fakten über den Prüfinhalt (Plan v3 §2). */
export interface InhaltFakten {
  dateien: number
  bytes: number
  /** übersprungen je Grund (Zahl) und die ersten GRENZEN.maxAufgezaehlt einzeln */
  uebersprungen: { je_grund: Record<string, number>; liste: Uebersprungen[] }
  /** umbenannte Pfade (Neutralisierung, A5) — Original → neu */
  umbenannt: Array<{ von: string; nach: string }>
  /** Dateien je Endung, die ausführbar sein können */
  skripte: Record<string, number>
  /** package.json der Wurzel: Lebenszyklus-Skripte, bin, Zahl der Abhängigkeiten (null ohne package.json) */
  paket: { lebenszyklus: Record<string, string>; bin: string[]; abhaengigkeiten: number } | null
  /** Pfade mit Hook-Konfiguration (settings*.json mit „hooks“, hooks/hooks.json) */
  hooks: string[]
  /** SKILL.md-Dateien und Agent-Dateien (agents/*.md) */
  skill_dateien: string[]
  agent_dateien: string[]
}

/** Endungen, die als Skript gezählt werden. */
const SKRIPT_ENDUNGEN = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.sh', '.bash', '.ps1', '.psm1', '.bat', '.cmd', '.py', '.rb', '.pl', '.exe', '.dll']

/** Lebenszyklus-Skripte, die npm bei einer Installation ausführen kann. */
const LEBENSZYKLUS = ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack', 'dependencies']

/**
 * Sammelt Fakten über die ausgewählten Dateien (Pfade wie in der Quelle, vor der Neutralisierung).
 * @param dateien - ausgewählter Inhalt
 * @param uebersprungen - übersprungene Einträge
 * @param umbenannt - Neutralisierungen
 * @returns InhaltFakten
 */
export function sammleFakten(dateien: readonly InhaltDatei[], uebersprungen: readonly Uebersprungen[], umbenannt: ReadonlyArray<{ von: string; nach: string }>): InhaltFakten {
  const skripte: Record<string, number> = {}
  const hooks: string[] = []
  const skillDateien: string[] = []
  const agentDateien: string[] = []
  let paket: InhaltFakten['paket'] = null
  for (const d of dateien) {
    const klein = d.pfad.toLowerCase()
    const endung = SKRIPT_ENDUNGEN.find((e) => klein.endsWith(e))
    if (endung !== undefined) skripte[endung] = (skripte[endung] ?? 0) + 1
    const name = klein.split('/').pop() ?? ''
    if (name === 'skill.md') skillDateien.push(d.pfad)
    if (/(^|\/)agents\/[^/]+\.md$/.test(klein)) agentDateien.push(d.pfad)
    if (klein === 'hooks/hooks.json' || klein.endsWith('/hooks/hooks.json')) hooks.push(d.pfad)
    else if (/(^|\/)settings[^/]*\.json$/.test(klein) && /"hooks"\s*:/.test(d.bytes.toString('utf8'))) hooks.push(d.pfad)
    if (d.pfad === 'package.json') {
      try {
        const json = JSON.parse(d.bytes.toString('utf8')) as Record<string, unknown>
        const skripteJson = typeof json.scripts === 'object' && json.scripts !== null ? (json.scripts as Record<string, unknown>) : {}
        const lebenszyklus: Record<string, string> = {}
        for (const s of LEBENSZYKLUS) if (typeof skripteJson[s] === 'string') lebenszyklus[s] = skripteJson[s] as string
        const bin = typeof json.bin === 'string' ? [json.bin] : typeof json.bin === 'object' && json.bin !== null ? Object.keys(json.bin) : []
        const zaehle = (feld: unknown) => (typeof feld === 'object' && feld !== null ? Object.keys(feld).length : 0)
        paket = { lebenszyklus, bin, abhaengigkeiten: zaehle(json.dependencies) + zaehle(json.optionalDependencies) + zaehle(json.peerDependencies) }
      } catch {
        paket = { lebenszyklus: { '(package.json nicht lesbar)': '' }, bin: [], abhaengigkeiten: 0 }
      }
    }
  }
  const jeGrund: Record<string, number> = {}
  for (const u of uebersprungen) jeGrund[u.grund] = (jeGrund[u.grund] ?? 0) + 1
  return {
    dateien: dateien.length,
    bytes: dateien.reduce((s, d) => s + d.bytes.length, 0),
    uebersprungen: { je_grund: jeGrund, liste: uebersprungen.slice(0, GRENZEN.maxAufgezaehlt) },
    umbenannt: [...umbenannt],
    skripte,
    paket,
    hooks,
    skill_dateien: skillDateien,
    agent_dateien: agentDateien,
  }
}
