/**
 * Datei: public/leitstand/auftrag-aus-projektentwurf.js
 *
 * Zweck: reine JS-Kopie von baueAuftragAusProjektentwurf (src/product-coach/index.ts, F34 WS-3)
 * für den Browser — dieser Leitstand hat keinen Build-Schritt (CLAUDE.md: strip-only TypeScript
 * auf Node, kein Bundler), ein Browser kann die `.ts`-Quelle nicht laden. Verhaltensgleichheit
 * wird NICHT durch Vertrauen sichergestellt, sondern mechanisch geprüft:
 * scripts/check-f34-product-coach.mjs importiert BEIDE Funktionen und vergleicht ihre Ausgabe
 * gegen dieselben Projekt-Entwurf-Fixtures (Muster auftrag-aus-scope.js, D5-Geist).
 *
 * Wird aufgerufen von: public/leitstand/views/chat.js, scripts/check-f34-product-coach.mjs.
 *
 * Wichtig: JEDE Änderung an src/product-coach/index.ts' baueAuftragAusProjektentwurf/
 * markdownListe MUSS hier nachgezogen werden, sonst schlägt das Gate fehl.
 */

/** @param eintraege - string[] @returns Markdown-Liste, oder "- (keine)" bei leerem Array */
function markdownListe(eintraege) {
  return eintraege.length > 0 ? eintraege.map((eintrag) => `- ${eintrag}`).join('\n') : '- (keine)'
}

// F34 WS-3 Korrekturrunde (löst F-612): der Coach vergibt selbst KEINE ID (Instruktion), kann
// aber einen Meilenstein-/Feature-'titel' liefern, der zufällig mit einem ID-artigen Präfix
// beginnt (z. B. "M6 — Aufräum-Werkzeug…") — baueAuftragAusProjektentwurf stellt dem bereits die
// ECHTE, real vergebene ID voran, ohne diese Bereinigung entstünde eine sichtbare Dopplung ("M6 —
// M6 — …"). Entfernt ein führendes '[MF]<Zahl><Buchstabe?><Trenner>' unabhängig vom Trennzeichen
// (—/–/:/-), lässt jeden anderen Titeltext unverändert.
const ID_PRAEFIX_MUSTER = /^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*/

/** @param titel - string @returns titel ohne führenden ID-artigen Präfix */
export function entferneIdPraefix(titel) {
  return titel.replace(ID_PRAEFIX_MUSTER, '')
}

/**
 * F-703 (BUG P1): kontext.pruefbefehl ist ein argv-Array mit ABSOLUTEM Programmpfad — ein rohes
 * .join(' ') ergab einen weder ausführbaren noch mit der Bash(npm run …)-Allowlist vereinbaren
 * Satz. Erkennt das Muster [node(.exe), …npm-cli.js, …rest] und zeigt `npm ${rest}`; sonst
 * quotet sie jedes Element mit Leerzeichen.
 * @param argv - pruefbefehl-Array (mindestens ein Element)
 * @returns die für einen Menschen lesbare/ausführbare Anzeigeform
 */
export function anzeigePruefbefehl(argv) {
  const basename0 = (argv[0].split(/[\\/]/).pop() ?? argv[0]).toLowerCase()
  const istNode = basename0 === 'node' || basename0 === 'node.exe'
  const istNpmCli = argv[1] !== undefined && argv[1].toLowerCase().endsWith('npm-cli.js')
  if (istNode && istNpmCli) {
    return `npm ${argv.slice(2).join(' ')}`
  }
  return argv.map((teil) => (teil.includes(' ') ? `"${teil}"` : teil)).join(' ')
}

/**
 * Baut aus einem Projekt-Entwurf mit bereits vergebenen IDs (vergebeFeatureIds, server-seitig)
 * deterministisches Markdown für einen F22-Auftrag, der ausschließlich Dokumentation schreibt.
 * F42 WS-1: kontext (pruefbefehl/istAiWorkforce) additiv, aus dem zuletzt gepollten
 * GET /api/zustand — fehlt kontext, erfindet die Funktion nichts (kein Prüfbefehl, keine
 * ai-workforce-eigenen Prüfpfade).
 * @param projekt - ein Projekt-Entwurf mit bereits vergebenen IDs (meilensteine[].id/features[].id/abhaengig_von_ids)
 * @param modus - 'neu' (frisches Projekt) oder 'erweiterung' (bestehendes Projekt/Roadmap ergänzen)
 * @param kontext - { pruefbefehl, istAiWorkforce } — optional, Default {}
 * @returns { titel, auftragstext }
 */
export function baueAuftragAusProjektentwurf(projekt, modus, kontext = {}) {
  const visionCodepoints = [...projekt.vision]
  const visionGekuerzt = visionCodepoints.length > 80 ? `${visionCodepoints.slice(0, 77).join('')}...` : projekt.vision

  // F34 WS-3 Korrekturrunde (löst F-611): im Modus 'erweiterung' beschreibt 'vision' das GESAMTE,
  // unveränderte Projekt — als Auftragstitel taugt sie dort nicht. Die Titel der NEUEN
  // Meilensteine (bereinigt um einen ggf. mitgelieferten ID-Präfix, F-612) ersetzen 'vision' als
  // Titelquelle nur in diesem Modus.
  const meilensteinTitelText = projekt.meilensteine.length > 0 ? projekt.meilensteine.map((meilenstein) => entferneIdPraefix(meilenstein.titel)).join('; ') : '(kein neuer Meilenstein)'
  const meilensteinTitelCodepoints = [...meilensteinTitelText]
  const meilensteinTitelGekuerzt = meilensteinTitelCodepoints.length > 80 ? `${meilensteinTitelCodepoints.slice(0, 77).join('')}...` : meilensteinTitelText
  const titel = modus === 'erweiterung' ? `Erweiterung: ${meilensteinTitelGekuerzt}` : `Projekt-Anlage: ${visionGekuerzt}`

  // F34 WS-3 (QA-Befund, löst F-615): leere Listen bekommen denselben '(keine)'-Platzhalter wie
  // jede andere Sektion (markdownListe) — vorher blieb zwischen zwei Überschriften eine
  // kommentarlose Lücke, inkonsistent zum sonst durchgehaltenen Leerzustands-Muster.
  const meilensteinAbschnitte =
    projekt.meilensteine.length > 0
      ? projekt.meilensteine.flatMap((meilenstein) => [
          `### ${meilenstein.id} — ${entferneIdPraefix(meilenstein.titel)}`,
          `Ziel: ${meilenstein.ziel}`,
          '',
          '#### Features',
          ...(meilenstein.features.length > 0
            ? meilenstein.features.flatMap((feature) => [
                `- ${feature.id} — ${entferneIdPraefix(feature.titel)}`,
                `  Ziel: ${feature.ziel}`,
                `  Nicht-Ziele: ${feature.nicht_ziele.length > 0 ? feature.nicht_ziele.join('; ') : '(keine)'}`,
                `  Akzeptanzkriterien: ${feature.akzeptanzkriterien.length > 0 ? feature.akzeptanzkriterien.join('; ') : '(keine)'}`,
                `  Abhängig von: ${feature.abhaengig_von_ids.length > 0 ? feature.abhaengig_von_ids.join(', ') : '(keine)'}`,
              ])
            : ['- (keine)']),
          '',
        ])
      : ['(keine)', '']

  const capabilityZeilen =
    projekt.capabilities_bedarf.length > 0
      ? projekt.capabilities_bedarf.map((eintrag) => `- ${eintrag.bedarf} — status=${eintrag.status}${eintrag.ressource_id !== null ? `, ressource=${eintrag.ressource_id}` : ''}`)
      : ['- (kein Capability-Bedarf)']

  const scoutKandidaten = projekt.capabilities_bedarf.filter((eintrag) => eintrag.status === 'fehlt')
  const scoutKandidatenText = scoutKandidaten.length > 0 ? scoutKandidaten.map((eintrag) => eintrag.bedarf).join('; ') : '(keine)'

  const beschreibungAktion = modus === 'erweiterung' ? 'um diesen Abschnitt ERGÄNZEN (Bestehendes nicht umschreiben)' : 'NEU anlegen'
  const roadmapAktion = modus === 'erweiterung' ? 'um diese Meilensteine ERGÄNZEN (Bestehendes nicht umschreiben)' : 'NEU anlegen'

  const auftragstext = [
    `# ${titel}`,
    '',
    '## Vision',
    projekt.vision,
    '',
    '## Zielgruppe',
    projekt.zielgruppe,
    '',
    '## Ziele',
    markdownListe(projekt.ziele),
    '',
    '## Scope In',
    markdownListe(projekt.scope_in),
    '',
    '## Scope Out',
    markdownListe(projekt.scope_out),
    '',
    '## Meilensteine',
    ...meilensteinAbschnitte,
    '## Capability-Bedarf',
    ...capabilityZeilen,
    '',
    '## Architektur-Hinweise',
    markdownListe(projekt.architektur_hinweise),
    '',
    '## Offene Fragen',
    markdownListe(projekt.offene_fragen),
    '',
    '## Auftrag an den Baudurchgang',
    'Schreibe AUSSCHLIESSLICH Dokumentation, KEIN Produktcode:',
    `1. docs/projekt/kontext/beschreibung.md — ${beschreibungAktion}; die Einträge aus 'Capability-Bedarf' mit status 'fehlt' als eigenen Abschnitt "Scout-Kandidaten" aufnehmen (${scoutKandidatenText}); die 'Architektur-Hinweise' oben als eigenen Abschnitt "Für den Architekten (F39)" aufnehmen.`,
    kontext.istAiWorkforce === true
      ? `2. docs/projekt/roadmap.json — ${roadmapAktion}, jeder neue Meilenstein mit Status GEPLANT; muss validiereRoadmapDaten (src/projektkontext/index.ts) bestehen.`
      : `2. docs/projekt/roadmap.json — ${roadmapAktion}, jeder neue Meilenstein mit Status GEPLANT.`,
    kontext.istAiWorkforce === true
      ? '3. Je Feature eine eigene features/<id>/feature.md mit den Pflichtabschnitten aus scripts/check-feature.mjs (## Ziel, ## Nicht-Ziele, ## Akzeptanzkriterien, ## Dependencies) und Status: ENTWURF.'
      : '3. Je Feature eine eigene features/<id>/feature.md mit den Abschnitten ## Ziel, ## Nicht-Ziele, ## Akzeptanzkriterien, ## Dependencies und Status: ENTWURF.',
    kontext.pruefbefehl !== undefined && kontext.pruefbefehl.length > 0
      ? `${anzeigePruefbefehl(kontext.pruefbefehl)} muss danach grün sein.`
      : 'Kein Prüfbefehl konfiguriert — die Änderungen werden nicht automatisch geprüft.',
  ].join('\n')

  return { titel, auftragstext }
}
