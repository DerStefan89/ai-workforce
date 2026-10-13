/**
 * Datei: src/projektkarte/projektkarte.test.ts
 *
 * Zweck: Tests der Projektkarte (F45 B2a-1): ARCHITECTURE.md-Analyse gegen dieses Repo (beschrieben trotz
 * Kopfkommentar mit Platzhalter), das Skelett (nicht beschrieben) und eine teilweise gefüllte Datei; Zuschnitt je
 * Rolle; Hash stabil, LF-unabhängig und anders bei geänderter ARCHITECTURE.md; Lücken in fehlend; sichtbare
 * Kürzung; Checkliste des code-reviewers mit „(nur UI)“; Prüfbefehl lesbar; keine Überschrift des bindenden ADR-Blocks.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it, test } from 'node:test'
import { analysiereArchitektur, baueProjektkarte, beschreibePruefbefehl, GRENZE_ZEICHEN, KARTE_ROLLEN, leseCheckliste, ZUSCHNITT } from './index.ts'
import type { ProjektkarteEingaben } from './types.ts'

const REPO_ARCH = readFileSync('ARCHITECTURE.md', 'utf8')
const SKELETT_ARCH = readFileSync('vorlagen/projekt-skelett/ARCHITECTURE.md', 'utf8')
const CHECKLISTE = readFileSync('.claude/agents/code-reviewer.md', 'utf8')

/**
 * Vollständige Eingaben mit überschreibbaren Feldern.
 * @param teil - Überschreibungen
 * @returns Eingaben
 */
function eingaben(teil: Partial<ProjektkarteEingaben> = {}): ProjektkarteEingaben {
  return {
    projektbeschreibung: { pfad: 'docs/projekt/kontext/beschreibung.md', text: 'Ein Haushaltsbuch für eine Person.' },
    auftrag: { titel: 'Export als CSV', ziel: 'CSV-Export der Buchungen', akzeptanzkriterien: [{ id: 'AK1', text: 'Export enthält alle Buchungen' }], nicht_ziele: ['Kein Import'] },
    architektur: { pfad: 'ARCHITECTURE.md', text: REPO_ARCH },
    adrs: '# ADR 0001 — Stack (docs/adr/0001-stack.md)\nNode und TypeScript.',
    dateien: ['package.json', 'README.md', 'src/a/index.ts', 'src/b/index.ts', 'docs/adr/0001-stack.md'],
    rahmen: {
      werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm ci)', 'Bash(npm run check:*)'],
      bashZeitgrenzeMs: 1200000,
      pruefbefehl: ['C:\\Program Files\\nodejs\\node.exe', 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js', 'run', 'check'],
      arbeitsordner: true,
    },
    faehigkeiten: [{ typ: 'skill', name: 'frontend-design', quelle: 'katalog' }],
    dod: ['Typisiert, kein `any`', '[FÜLLUNG, nur UI] Mobile Darstellung berücksichtigt'],
    reviewCheckliste: { pfad: '.claude/agents/code-reviewer.md', text: CHECKLISTE },
    lesefehler: [],
    ...teil,
  }
}

describe('analysiereArchitektur', () => {
  it('dieses Repo ist beschrieben, obwohl der Kopfkommentar einen Platzhalter trägt', () => {
    const a = analysiereArchitektur(REPO_ARCH)
    assert.equal(a.nichtBeschrieben, false)
    assert.deepEqual(a.pflichtFehlt, [])
    assert.ok(a.abschnitte.some((x) => x.titel === 'Ordnerstruktur' && x.beschrieben))
  })
  it('das Skelett ist nicht beschrieben', () => {
    const a = analysiereArchitektur(SKELETT_ARCH)
    assert.equal(a.nichtBeschrieben, true)
    assert.deepEqual(a.pflichtFehlt, ['Ordnerstruktur', 'Datenzugriff'])
  })
  it('teilweise gefüllt: nur der offene Pflichtabschnitt fehlt', () => {
    const text = SKELETT_ARCH.replace(/## 1\. Ordnerstruktur\n\n[\s\S]*?\n\n## 2/, '## 1. Ordnerstruktur\n\n- `src/` — Code\n\n## 2')
    const a = analysiereArchitektur(text)
    assert.equal(a.nichtBeschrieben, false)
    assert.deepEqual(a.pflichtFehlt, ['Datenzugriff'])
  })
  it('leere Datei und Datei ohne Abschnitte sind nicht beschrieben', () => {
    assert.equal(analysiereArchitektur('').nichtBeschrieben, true)
    assert.equal(analysiereArchitektur('# Titel\nnur Text').nichtBeschrieben, true)
  })
})

describe('baueProjektkarte', () => {
  it('Zuschnitt je Rolle: genau die Abschnitte der Tabelle', () => {
    for (const rolle of KARTE_ROLLEN) {
      const karte = baueProjektkarte(eingaben(), rolle)
      assert.deepEqual(karte.abschnitte, [...(ZUSCHNITT.get(rolle) ?? [])])
      assert.equal(karte.text.includes('## Ausführungsrahmen'), rolle !== 'code-reviewer', rolle)
      assert.equal(karte.text.includes('## Im Projekt eingeschaltete Fähigkeiten'), rolle === 'architekt', rolle)
      assert.ok(karte.text.includes('## Vorhaben') && karte.text.includes('## Bestand') && karte.text.includes('## Qualität'), rolle)
      assert.deepEqual(karte.fehlend, [], rolle)
    }
  })
  it('Architekt: Rahmen mit kein git, Prüfbefehl lesbar, Meldeweg; Bestand mit Auszug und Ordnern', () => {
    const t = baueProjektkarte(eingaben(), 'architekt').text
    assert.match(t, /Kein git/)
    assert.match(t, /Prüfbefehl: npm run check — führt der Kern/)
    assert.match(t, /Shell: nur npm install, npm ci, npm run check/)
    assert.match(t, /Ausführungsrahmen:'/)
    assert.match(t, /### Ordnerstruktur/)
    assert.match(t, /- src\/ \(2 Dateien\): a, b/)
    assert.match(t, /- AK1: Export enthält alle Buchungen/)
  })
  it('Advisor: Prüfpflicht für Planschritte außerhalb des Rahmens', () => {
    assert.match(baueProjektkarte(eingaben(), 'architecture-advisor').text, /ist ein Befund/)
  })
  it('Code-Reviewer: ARCHITECTURE als Prüfmaßstab, ADR-Text, Checkliste mit Urteil je Punkt, AK nur als Verweis', () => {
    const t = baueProjektkarte(eingaben(), 'code-reviewer').text
    assert.match(t, /Prüfmaßstab/)
    assert.match(t, /Node und TypeScript/)
    assert.match(t, /Checkliste \(\.claude\/agents\/code-reviewer\.md, Stand [0-9a-f]{12}\)/)
    assert.match(t, /### Verbotene Patterns/)
    assert.match(t, /Urteil je Punkt/)
    assert.match(t, /siehe den AK-Prüfblock/)
    assert.doesNotMatch(t, /- AK1:/)
    assert.doesNotMatch(t, /FÜLLUNG|FUELLUNG/)
  })
  it('keine Überschrift des bindenden ADR-Blocks (check-fixpaket-f35-reallauf (a))', () => {
    for (const rolle of KARTE_ROLLEN) assert.doesNotMatch(baueProjektkarte(eingaben(), rolle).text, /Bereits entschiedene Projektentscheidungen/)
  })
  it('Hash stabil, LF-unabhängig, anders bei geänderter ARCHITECTURE.md', () => {
    const a = baueProjektkarte(eingaben(), 'architekt')
    assert.equal(baueProjektkarte(eingaben(), 'architekt').hash, a.hash)
    assert.match(a.hash, /^[0-9a-f]{64}$/)
    const crlf = baueProjektkarte(eingaben({ architektur: { pfad: 'ARCHITECTURE.md', text: REPO_ARCH.replace(/\n/g, '\r\n') } }), 'architekt')
    assert.equal(crlf.hash, a.hash)
    const geaendert = baueProjektkarte(eingaben({ architektur: { pfad: 'ARCHITECTURE.md', text: `${REPO_ARCH}\n- neue Regel\n` } }), 'architekt')
    assert.notEqual(geaendert.hash, a.hash)
  })
  it('Skelett-ARCHITECTURE.md: „Architektur noch nicht beschrieben“ statt Vorlagentext', () => {
    const karte = baueProjektkarte(eingaben({ architektur: { pfad: 'ARCHITECTURE.md', text: SKELETT_ARCH } }), 'architekt')
    assert.match(karte.text, /Architektur noch nicht beschrieben/)
    assert.doesNotMatch(karte.text, /Gate-Vorlage|ORM-Konventionen/)
    assert.ok(karte.fehlend.includes('ARCHITECTURE.md: Architektur noch nicht beschrieben'))
  })
  it('eingebettete Überschriften kollidieren nicht mit den Kartenabschnitten (Nachweis B2a-1)', () => {
    const t = baueProjektkarte(eingaben({ projektbeschreibung: { pfad: 'b.md', text: '# Titel\n\n## Qualität\nText' } }), 'code-reviewer').text
    assert.equal(t.split('\n').filter((z) => z === '## Qualität').length, 1)
    assert.match(t, /^#### Qualität$/m)
  })
  it('fehlende Eingaben: Karte entsteht, Lücken in fehlend (fail-open)', () => {
    const karte = baueProjektkarte(
      eingaben({ projektbeschreibung: null, architektur: null, dateien: null, rahmen: null, faehigkeiten: null, dod: null, reviewCheckliste: null, lesefehler: ['ARCHITECTURE.md: fehlt'] }),
      'architekt'
    )
    assert.ok(karte.text.length > 0)
    assert.deepEqual(karte.fehlend, [
      'ARCHITECTURE.md: fehlt',
      'Projektbeschreibung: fehlt',
      'Ausführungsrahmen: Workflow ohne Ausführungsschritt oder Werkzeugsatz unbekannt',
      'Fähigkeiten: Stand nicht lesbar',
      'DoD: kein Abschnitt „Definition of Done“ in CLAUDE.md',
      'Ordnerübersicht: versionierte Dateien nicht lesbar',
    ])
    assert.match(karte.text, /Lücken: ARCHITECTURE\.md: fehlt;/)
  })
  it('Kürzung sichtbar: je Eingabe und über der Gesamtgrenze', () => {
    const lang = 'x'.repeat(5000)
    assert.match(baueProjektkarte(eingaben({ projektbeschreibung: { pfad: 'b.md', text: lang } }), 'architekt').text, /… \[gekürzt — vollständig in b\.md\]/)
    const vieleDod = Array.from({ length: 600 }, (_, i) => `Punkt ${i} ${'y'.repeat(40)}`)
    for (const rolle of KARTE_ROLLEN) {
      const karte = baueProjektkarte(eingaben({ dod: vieleDod }), rolle)
      const grenze = GRENZE_ZEICHEN.get(rolle) ?? 0
      assert.ok(karte.text.endsWith(`[Projektkarte gekürzt: Grenze ${grenze} Zeichen für die Rolle ${rolle}]`), rolle)
      // Der Marker zählt mit (Befund des echten Architekt-Laufs B2a-1): keine Toleranz über der Grenze.
      assert.ok(karte.text.length <= grenze, `${rolle}: ${karte.text.length} > ${grenze}`)
    }
  })
  it('Gesamtkürzung trifft nur den Bestand; Laufakte nennt ihn als gekürzt (Korrekturrunde, QA L1/L2)', () => {
    // Viele lange Ordnernamen (Bestand, Ordnerübersicht) erzwingen die Gesamtkürzung bei jeder Rolle.
    const dateien = Array.from({ length: 40 }, (_, i) => Array.from({ length: 12 }, (_, j) => `ordner-${i}/${'u'.repeat(90)}-${j}/x.ts`)).flat()
    for (const rolle of KARTE_ROLLEN) {
      const karte = baueProjektkarte(eingaben({ dateien, adrs: 'a'.repeat(2400) }), rolle)
      assert.match(karte.text, /Urteil je Punkt|Definition of Done/, rolle)
      assert.ok(karte.text.includes('## Qualität'), rolle)
      assert.ok(!karte.abschnitte.includes('bestand'), rolle)
      assert.ok(karte.abschnitte.includes('qualitaet'), rolle)
      assert.ok(karte.fehlend.some((f) => /Abschnitt Bestand gekürzt/.test(f)), rolle)
    }
  })
  it('gefüllte ARCHITECTURE.md mit anderen Titeln: Auszug statt „nicht beschrieben“, Pflichttitel in fehlend (Korrekturrunde, QA L4)', () => {
    const englisch = '# Architecture\n\n## Folder structure\n- app/ — code\n\n## Data access\n- SQLite\n'
    const karte = baueProjektkarte(eingaben({ architektur: { pfad: 'ARCHITECTURE.md', text: englisch } }), 'code-reviewer')
    assert.match(karte.text, /### Folder structure/)
    assert.doesNotMatch(karte.text, /Architektur noch nicht beschrieben/)
    assert.ok(karte.fehlend.includes('ARCHITECTURE.md: Ordnerstruktur, Datenzugriff nicht gefunden oder nicht beschrieben'))
    assert.deepEqual(analysiereArchitektur(englisch).pflichtFehlt, ['Ordnerstruktur', 'Datenzugriff'])
  })
  it('Codeblöcke behalten ihre Kommentarzeilen; Ordner mit vielen Unterordnern nur mit Anzahl; leeres Repo; CLAUDE.md-Fehler ohne doppelte Lücke', () => {
    const t = baueProjektkarte(eingaben({ projektbeschreibung: { pfad: 'b.md', text: 'Text\n\n```sh\n# Kommentar\n```' } }), 'architekt').text
    assert.match(t, /^# Kommentar$/m)
    const viele = Array.from({ length: 30 }, (_, i) => `kontrollzustand/lauf-${i}/x.json`)
    assert.match(baueProjektkarte(eingaben({ dateien: viele }), 'architekt').text, /- kontrollzustand\/ \(30 Dateien\): 30 Unterordner/)
    assert.ok(baueProjektkarte(eingaben({ dateien: [] }), 'architekt').fehlend.includes('Ordnerübersicht: keine versionierten Dateien'))
    const ohneClaude = baueProjektkarte(eingaben({ dod: null, lesefehler: ['CLAUDE.md: Datei fehlt'] }), 'architekt').fehlend
    assert.deepEqual(ohneClaude, ['CLAUDE.md: Datei fehlt'])
  })
  it('ohne Arbeitsordner und ohne Bash-Regeln', () => {
    const t = baueProjektkarte(eingaben({ rahmen: { werkzeuge: ['Read'], bashZeitgrenzeMs: null, pruefbefehl: null, arbeitsordner: false } }), 'architekt').text
    assert.match(t, /Shell: keine Befehle erlaubt/)
    assert.match(t, /Löschen: nicht vorgesehen/)
    assert.match(t, /Prüfbefehl: keiner konfiguriert/)
  })
})

describe('Hilfsfunktionen', () => {
  it('leseCheckliste: Gruppen und Punkte, „nur UI“ bleibt als (nur UI)', () => {
    const zeilen = leseCheckliste(CHECKLISTE)
    assert.ok(zeilen.includes('Code-Qualitaet:'))
    assert.ok(zeilen.some((z) => z.startsWith('- Typisiert')))
    assert.ok(zeilen.some((z) => z.includes('(nur UI)')))
    assert.deepEqual(leseCheckliste('# ohne Abschnitt'), [])
  })
  it('beschreibePruefbefehl', () => {
    assert.equal(beschreibePruefbefehl(['C:\\n\\node.exe', 'C:\\n\\npm-cli.js', 'run', 'check']), 'npm run check')
    assert.equal(beschreibePruefbefehl(['/usr/bin/pytest', '-q']), 'pytest -q')
  })
})

test('F45 B2a-2: Architekt mit Arbeitspaket-Block — Vorhaben verweist darauf statt AK zu wiederholen; Feature-Bezug als Pfad', () => {
  const e = eingaben({ auftrag: { titel: 'Export', ziel: 'Ziel', akzeptanzkriterien: [{ id: 'AK1', text: 'Export enthält alle Buchungen' }], nicht_ziele: [], arbeitspaket: true, feature_ref: 'F12' } })
  const architekt = baueProjektkarte(e, 'architekt').text
  assert.match(architekt, /siehe Arbeitspaket in diesem Auftrag/)
  assert.doesNotMatch(architekt, /- AK1: Export enthält alle Buchungen/)
  assert.doesNotMatch(architekt, /Feature-Akte: features/, 'steht im Arbeitspaket-Block (keine zweite Zeile)')
  // Der Advisor bekommt keinen Arbeitspaket-Block — dort bleiben AK und Feature-Akte in der Karte.
  const advisor = baueProjektkarte(e, 'architecture-advisor').text
  assert.match(advisor, /- AK1: Export enthält alle Buchungen/)
  assert.match(advisor, /Feature-Akte: features\/F12\/feature\.md/)
  assert.match(baueProjektkarte(eingaben(), 'architekt').text, /Feature-Akte: kein Feature-Bezug im Auftrag\./)
})

test('F45 B2a-2 (QA L3): Review-Karte nennt den Stand vor dem Bau und jede im Bau geänderte Maßstabsdatei', () => {
  const geaendert = baueProjektkarte(eingaben({ pruefmassstab: { basis: 'a'.repeat(40), geaendert: ['CLAUDE.md'] } }), 'code-reviewer').text
  assert.match(geaendert, /im Stand vor dem Bau \(Commit aaaaaaaaaaaa\)/)
  assert.match(geaendert, /Prüfmaßstab im Bau geändert: CLAUDE\.md — die Änderung ist Teil des Reviews/)
  const unveraendert = baueProjektkarte(eingaben({ pruefmassstab: { basis: 'a'.repeat(40), geaendert: [] } }), 'code-reviewer').text
  assert.doesNotMatch(unveraendert, /im Bau geändert/)
  // Nur das Review: Architekt und Advisor bleiben ohne die Zeile.
  assert.doesNotMatch(baueProjektkarte(eingaben({ pruefmassstab: { basis: 'a'.repeat(40), geaendert: ['CLAUDE.md'] } }), 'architekt').text, /Prüfmaßstab/)
})
