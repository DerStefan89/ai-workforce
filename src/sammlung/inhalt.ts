/**
 * Datei: src/sammlung/inhalt.ts
 *
 * Zweck: Reine Bausteine des Prüflaufs (F45 F-2b-2, F-1056) für den Inhalt einer fremden Quelle — ohne Prozess, ohne Netz:
 * - pruefePfad: Segmentprüfung eines Pfads aus dem npm-Paketordner oder git-Baum (Advisor A6) — nichts, was Windows anders
 *   auflöst (Laufwerk, Gerätenamen, Punkt/Leerzeichen am Ende, „..“, Backslash, Doppelpunkt, Steuerzeichen);
 * - neutralisierePfad: benennt jedes Segment, das (nach NFC und Kleinschreibung) mit „.claude“ beginnt, und die Dateien
 *   CLAUDE.md/CLAUDE.local.md um (Präfix „_“), damit --add-dir keine Skills, Commands, Agents oder Anweisungen der Quelle
 *   lädt (Advisor A5) — jede Umbenennung ist ein Fakt;
 * - pfadSchluessel / findeNamensKonflikt: Vergleichsform eines Pfads, wie Windows/NTFS ihn auflöst (NFC, klein, ohne Punkt/
 *   Leerzeichen am Segmentende), und die Suche nach Zwillingen und Datei/Ordner-Konflikten — auch für den ganzen git-Baum
 *   (Prüflauf und Skill-Installation, F-1075);
 * - istBinaer, sammleFakten: mechanische Fakten über den Inhalt (getrennt vom Modellurteil).
 * Der eigene Tar-Leser (leseTarGz, pruefeTarName) ist seit F45 F-2b-2b entfernt (F-1075 Variante C): npm-Inhalt wird von der
 * Platte gelesen, nachdem npm selbst installiert hat (src/sammlung/quelle.ts holeNpmInhalt).
 *
 * Wird aufgerufen von: src/sammlung/quelle.ts (Holen), src/sammlung/inhalt.test.ts, scripts/check-f45-f2b2-pruefung.mjs.
 *
 * Wichtig: Nichts hier führt Inhalt aus oder interpretiert ihn über die Fakten hinaus. Grenzen (GRENZEN) gelten für beide
 * Quellen (git, npm) gleich.
 */

/** Nur sha512-SRI (Advisor A7: sha1 ist für einen Inhaltspin zu schwach) — Pin, Prüflauf und Prüfbericht (F-1074 (9)). */
export const SHA512_INTEGRITY = /^sha512-[A-Za-z0-9+/]{86}==$/

/** Grenzen des Prüfinhalts (Plan v3 §2). */
export const GRENZEN = Object.freeze({
  /** höchstens so viele ausgewählte Dateien, sonst „zu groß für die Prüfung“ */
  maxDateien: 3000,
  /** höchstens so viele Bytes ausgewählt, sonst „zu groß für die Prüfung“ */
  maxBytes: 25 * 1024 * 1024,
  /** größere Einzeldateien werden übersprungen (Fakt) */
  maxDateiBytes: 1024 * 1024,
  /** höchstens so viele Einträge (Dateien und Ordner) werden im npm-Paketordner besucht, sonst „zu groß“ (Advisor F7) */
  maxEintraege: 10_000,
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
  /**
   * package.json der Wurzel: Lebenszyklus-Skripte, bin (Namen; bei `bin` als String der Pfad), Zahl der Abhängigkeiten und seit
   * F45 F-2b-2c bin_ziele (Name → Pfad wie in package.json, roh und ungeprüft — fremde Eingabe; berichtKurz prüft Form und
   * Dateiliste, bevor ein Pfad in einen Vormerken-Auftrag geht, Advisor B4). null ohne package.json.
   */
  paket: { lebenszyklus: Record<string, string>; bin: string[]; abhaengigkeiten: number; bin_ziele?: Record<string, string> } | null
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
        const binZiele: Record<string, string> = {}
        if (typeof json.bin === 'string') binZiele[String(json.name ?? '').split('/').pop() || 'bin'] = json.bin.slice(0, 300)
        else if (typeof json.bin === 'object' && json.bin !== null) for (const [n, z] of Object.entries(json.bin).slice(0, 20)) if (typeof z === 'string') binZiele[n.slice(0, 100)] = z.slice(0, 300)
        paket = { lebenszyklus, bin, abhaengigkeiten: zaehle(json.dependencies) + zaehle(json.optionalDependencies) + zaehle(json.peerDependencies), bin_ziele: binZiele }
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
