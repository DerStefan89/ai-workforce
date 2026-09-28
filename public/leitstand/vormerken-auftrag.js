/**
 * Datei: public/leitstand/vormerken-auftrag.js
 *
 * Zweck: F27 WS-2 (AK12), seit F36 WS-1b (F-781) als reines Modul — Text
 * des Vormerken-Auftrags, der einen Scout-Kandidaten als GENAU EINEN neuen
 * Eintrag in ressourcen.json anlegen lässt. Seit F36 WS-1 verlangt
 * validiereRessourcenDaten (src/ressourcen/index.ts) für typ 'extern'
 * name, beschreibung (R1), unterart und bei unterart 'mcp' wirkung — der
 * Text nennt diese Felder deshalb ausdrücklich. Der Scout-Kandidat
 * (schemas/ergebnis-scout.schema.json) trägt weder beschreibung noch
 * unterart/wirkung; die ausführende Rolle bestimmt sie aus der Quelle.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (Vormerken-Klick, Kollisionshinweis)
 * - public/leitstand/vormerken-auftrag.test.mjs
 */

/** Leitet eine ressourcen.json-taugliche id aus einem Kandidatennamen ab (Schema-Pattern ^[a-z0-9][a-z0-9-]*$). @param name - kandidat.name @returns kleingeschriebene, bindestrich-getrennte id, nie leer */
export function ableiteRessourcenId(name) {
  const roh = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return roh.length > 0 ? roh : 'kandidat'
}

/** Feldzeilen, die nur typ 'extern' trägt (R1, F36 WS-1) — typ 'skill' liest name/beschreibung aus dem Frontmatter und darf sie nicht tragen. @param kandidat - ein Eintrag aus ergebnis.kandidaten @returns Zeilen ohne führendes '- ' */
function externFeldZeilen(kandidat) {
  return [
    `name: ${JSON.stringify(kandidat.name)}`,
    'beschreibung: ein Satz, was der Kandidat leistet — aus der Quelle, nicht erfunden (PFLICHT bei typ "extern", R1)',
    'unterart: einer von "skill" | "agent" | "mcp" (PFLICHT bei typ "extern" — aus der Quelle bestimmen; Scout-Typ "extern" ist meist ein MCP-Server)',
    'wirkung: einer von "lokal" | "extern_lesend" | "extern_schreibend" (PFLICHT nur bei unterart "mcp", sonst weglassen; lokal = kein fremder Dienst, E-F36-4)',
    ...(typeof kandidat.lizenz === 'string' && kandidat.lizenz.length > 0 ? [`lizenz: ${JSON.stringify(kandidat.lizenz)} (optional, laut Scout — Anzeige vor „Freigeben & installieren“, E-F36-6)`] : []),
  ]
}

/**
 * Baut den Auftragstext des Vormerken-Auftrags (AK12) — weist die ausführende Rolle an, GENAU
 * EINEN neuen Eintrag zu ressourcen.json hinzuzufügen. freigabe:'OFFEN' steht als PFLICHTFELD im
 * Text (R2 erzwingt es ohne installation ohnehin für typ 'extern', hier zusätzlich für typ 'skill'
 * ausdrücklich verlangt — ein Vormerken ist nie zugleich eine Freigabe). Kein neuer Endpunkt,
 * keine neue Schreiblogik (F27/feature.md AK12) — der Auftrag durchläuft denselben Weg wie jeder
 * andere (POST /api/auftraege → POST .../routen → ZWINGEND-Freigabe am ausfuehrung-Schritt).
 * @param kandidat - ein Eintrag aus ergebnis.kandidaten
 * @param laufId - laufId des Scout-Laufs, aus dem der Kandidat stammt (Beleg)
 * @returns Auftragstext für POST /api/auftraege
 */
export function baueVormerkenAuftragstext(kandidat, laufId) {
  const id = ableiteRessourcenId(kandidat.name)
  const istSkill = kandidat.typ === 'skill'
  const herkunftZeile = istSkill
    ? `herkunft: { "art": "skill", "pfad": ".claude/skills/${id}" } (Zielpfad, sobald der Skill lokal vorliegt — Installation ist Nicht-Ziel dieses Auftrags)`
    : `herkunft: { "art": "extern", "url": ${JSON.stringify(kandidat.quelle_url)} }`
  const felder = [
    `id: "${id}"`,
    `typ: "${kandidat.typ}"`,
    ...(istSkill ? [] : externFeldZeilen(kandidat)),
    `capabilities: ${JSON.stringify(kandidat.capabilities)}`,
    'freigabe: "OFFEN" (PFLICHT — Registrierung erzeugt keine Verfügbarkeit, schemas/ressourcen.schema.json Regel R2; eine spätere Freigabe entscheidet ein Mensch separat)',
    herkunftZeile,
  ]
  return [
    'Füge der Datei ressourcen.json (Repo-Wurzel) GENAU EINEN neuen Eintrag im ressourcen[]-Array hinzu. Keine weitere Änderung an dieser Datei, kein bestehender Eintrag wird verändert oder entfernt.',
    `Neuer Eintrag:\n${felder.map((f) => `- ${f}`).join('\n')}`,
    `Beleg: Kandidat aus Scout-Lauf '${laufId}' (schemas/ergebnis-scout.schema.json).`,
  ].join('\n\n')
}
