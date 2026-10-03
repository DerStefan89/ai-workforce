/**
 * Datei: public/leitstand/harness-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln des Registers „Harness-Aufbau“ der Workforce `#/capabilities` (F46 D6,
 * docs/design/abgleich-f46.md §4.14, Bild 01-workforce-harness--Main): aus der Antwort von
 * GET /api/harness (scripts/leitstand/routen-harness.mjs) die Knoten je Baustein (Name relativ zum Ort
 * der Spalte, Bremsen einzeln), der Ordner zu einem Katalog-Pfad („Im Harness-Aufbau zeigen“) und der
 * Abgleich `.claude/agents/` gegen den Katalog (Hinweis „liegt im Harness, steht nicht im Katalog“ —
 * nur, wenn er sich aus beiden Quellen ergibt, nie als fester Text). Ohne DOM und ohne Netz, damit
 * node:test die Regeln direkt prüft (harness-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/harness-aufbau.js (Skelett, Detail)
 * - public/leitstand/views/capability-library.js (Abgleich Agents, Ordner zu einem Pfad)
 * - public/leitstand/harness-anzeige.test.mjs (node:test)
 *
 * Wichtig: Import-sicher (keine Importe); alle Werte bleiben roh, escapen ist Sache der View.
 */

/** Bausteine in Anzeigereihenfolge (wie HARNESS_BAUSTEINE der Route). */
export const BAUSTEIN_IDS = Object.freeze(['regeln', 'wissen', 'gedaechtnis', 'rollen', 'bremsen', 'pruefung'])

/** Ordner der Agents (repo-relativ, wie in der Route). */
export const AGENTS_ORDNER = '.claude/agents'

/**
 * Name eines Eintrags relativ zum Ort seiner Spalte: 'docs/STATUS.md' unter 'docs/' → 'STATUS.md', ein
 * Ordner bekommt '/' ('.claude/agents' → 'agents/'), ein Musterordner zeigt sein Muster ('check-*.mjs').
 * Der Ort kann mehrere Präfixe tragen ('scripts/ · .github/'). Rein.
 * @param pfad - repo-relativer Pfad
 * @param ort - Ort der Spalte
 * @param optionen - { ordner: boolean, muster?: string }
 * @returns Anzeigename
 */
export function knotenName(pfad, ort, { ordner = false, muster } = {}) {
  if (typeof muster === 'string' && muster !== '') return muster
  const praefixe = String(ort ?? '')
    .split('·')
    .map((p) => p.trim())
    .filter((p) => p !== '' && p !== '/')
  const p = String(pfad ?? '')
  const praefix = praefixe.find((x) => p.startsWith(x) && p.length > x.length)
  const name = praefix === undefined ? p : p.slice(praefix.length)
  return ordner ? `${name}/` : name
}

/**
 * Knoten eines Bausteins für das Skelett. Ein geschützter Ordner (Bremsen: Hooks) zeigt jede direkte
 * Datei als eigenen Knoten mit Schloss — eine Bremse soll einzeln sichtbar sein —, sofern er nur Dateien
 * enthält; jeder andere Ordner ist ein Knoten mit Anzahl. Rein.
 * @param baustein - { id, ort, eintraege } aus GET /api/harness
 * @returns [{ schluessel, name, art: 'datei' | 'ordner', pfad, vorhanden, fehler, grund?, anzahl?, geschuetzt }]
 */
export function knotenFuerBaustein(baustein) {
  const knoten = []
  for (const e of Array.isArray(baustein?.eintraege) ? baustein.eintraege : []) {
    if (e === null || typeof e !== 'object' || typeof e.pfad !== 'string') continue
    const ordner = e.art === 'ordner'
    const basis = { vorhanden: e.vorhanden === true, fehler: e.status === 'fehler', ...(typeof e.grund === 'string' ? { grund: e.grund } : {}), geschuetzt: e.geschuetzt === true }
    const kinder = ordner && Array.isArray(e.eintraege) ? e.eintraege : []
    const dateien = kinder.filter((k) => k?.art === 'datei' && typeof k.name === 'string')
    // Zerlegt wird nur, wenn ALLE direkten Einträge Dateien sind — ein Unterordner oder eine Verknüpfung in den
    // Bremsen verschwände sonst still; dann bleibt es ein Ordnerknoten mit Anzahl (Detail listet alles).
    const nurDateien = dateien.length > 0 && dateien.length === kinder.length
    if (ordner && basis.geschuetzt && basis.vorhanden && !basis.fehler && nurDateien && e.gekappt !== true) {
      const ordnerName = knotenName(e.pfad, baustein.ort, { ordner: true })
      for (const d of dateien) knoten.push({ ...basis, schluessel: `${e.pfad}/${d.name}`, name: `${ordnerName}${d.name}`, art: 'datei', pfad: `${e.pfad}/${d.name}` })
      continue
    }
    knoten.push({
      ...basis,
      schluessel: e.pfad,
      name: knotenName(e.pfad, baustein.ort, { ordner, muster: e.muster }),
      art: ordner ? 'ordner' : 'datei',
      pfad: e.pfad,
      ...(ordner && Number.isInteger(e.anzahl) ? { anzahl: e.anzahl } : {}),
    })
  }
  return knoten
}

/**
 * Sucht einen Eintrag der Antwort nach Pfad — einen Eintrag der Liste oder eine direkte Datei eines
 * gelisteten Ordners. Rein.
 * @param harness - Antwort von GET /api/harness
 * @param pfad - repo-relativer Pfad
 * @returns { baustein, eintrag, ordner?: Eintrag des Ordners, datei?: Kind-Eintrag } oder null
 */
export function findeHarnessEintrag(harness, pfad) {
  for (const baustein of Array.isArray(harness?.bausteine) ? harness.bausteine : []) {
    for (const e of Array.isArray(baustein.eintraege) ? baustein.eintraege : []) {
      if (e?.pfad === pfad) return { baustein, eintrag: e }
      if (e?.art === 'ordner' && typeof pfad === 'string' && pfad.startsWith(`${e.pfad}/`)) {
        const name = pfad.slice(e.pfad.length + 1)
        const datei = (e.eintraege ?? []).find((k) => k?.art === 'datei' && k.name === name)
        if (datei !== undefined) return { baustein, eintrag: e, ordner: e, datei }
      }
    }
  }
  return null
}

/**
 * Ort eines Katalog-Pfads im Harness: die Datei selbst, wenn sie ein Eintrag der Liste oder eine direkte Datei
 * eines gelisteten Ordners ist ('.claude/agents/qa.md'), sonst der gelistete Ordner, in dem der Pfad liegt
 * ('.claude/skills/advisor-pass' → '.claude/skills'). Rein.
 * @param harness - Antwort von GET /api/harness
 * @param pfad - herkunft.pfad eines Katalogeintrags
 * @returns repo-relativer Pfad des Eintrags oder null
 */
export function harnessOrtZuPfad(harness, pfad) {
  if (typeof pfad !== 'string' || pfad === '') return null
  const sauber = pfad.replace(/\/+$/, '')
  const direkt = findeHarnessEintrag(harness, sauber)
  if (direkt !== null && direkt.eintrag.vorhanden === true && direkt.eintrag.status === 'ok') return sauber
  for (const baustein of Array.isArray(harness?.bausteine) ? harness.bausteine : []) {
    for (const e of Array.isArray(baustein.eintraege) ? baustein.eintraege : []) {
      if (e?.vorhanden !== true) continue
      if (e.pfad === sauber || (e.art === 'ordner' && sauber.startsWith(`${e.pfad}/`))) return e.pfad
    }
  }
  return null
}

/**
 * Abgleich `.claude/agents/` gegen den Katalog: Agent-Dateien (*.md) im Harness, deren Name (ohne .md)
 * weder als id noch als herkunft.pfad eines Katalogeintrags vom Typ 'agent' vorkommt. Leer, wenn eine
 * der Quellen fehlt oder der Ordner gekappt ist (dann ist der Abgleich nicht vollständig). Rein.
 * @param harness - Antwort von GET /api/harness (oder null)
 * @param eintraege - Katalogeinträge von GET /api/ressourcen (oder null)
 * @returns sortierte Namen, z. B. ['design-guardian']
 */
export function agentsOhneKatalog(harness, eintraege) {
  if (!Array.isArray(eintraege)) return []
  const treffer = findeHarnessEintrag(harness, AGENTS_ORDNER)
  const ordner = treffer?.eintrag
  if (ordner === undefined || ordner.vorhanden !== true || ordner.status !== 'ok' || ordner.gekappt === true) return []
  const agents = eintraege.filter((e) => e?.typ === 'agent')
  const ids = new Set(agents.map((e) => e.id))
  const pfade = new Set(agents.map((e) => e.herkunft?.pfad).filter((p) => typeof p === 'string'))
  return (ordner.eintraege ?? [])
    .filter((k) => k?.art === 'datei' && typeof k.name === 'string' && k.name.endsWith('.md'))
    .map((k) => k.name.slice(0, -'.md'.length))
    .filter((name) => name !== '' && !ids.has(name) && !pfade.has(`${AGENTS_ORDNER}/${name}.md`))
    .sort()
}

/**
 * Sind alle Orte des Harness nicht vorhanden? (Leerzustand des Skeletts.) Rein.
 * @param harness - Antwort von GET /api/harness
 * @returns true, wenn kein Eintrag vorhanden ist
 */
export function harnessLeer(harness) {
  const alle = (Array.isArray(harness?.bausteine) ? harness.bausteine : []).flatMap((b) => (Array.isArray(b.eintraege) ? b.eintraege : []))
  return alle.every((e) => e?.vorhanden !== true)
}
