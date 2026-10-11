/**
 * Datei: scripts/tests-mit-untergrenze.mjs
 *
 * Zweck: Test-Gate mit Untergrenze für den eingebauten Testrunner von Node. `node --test` endet ohne
 * gefundene Testdatei mit Exit 0 („tests 0“) — ein leeres oder falsch verdrahtetes Testmuster sähe
 * also grün aus. Dieses Skript startet `node --test` mit TAP-Ausgabe, reicht die Ausgabe durch und ist
 * rot bei Exit ≠ 0, bei fehlgeschlagenen Tests, bei fehlender Zusammenfassung oder wenn weniger Tests
 * bestanden haben als die Untergrenze.
 *
 * Herkunft: ai-workforce F45 B1a-2 (lokal neu im Projekt-Skelett), eingesetzt über die Gate-Vorlage
 * docs/harness/gate-vorlage-node.md.
 *
 * Wird aufgerufen von: npm run test, sobald die Gate-Vorlage angewendet ist ("test" in package.json).
 *
 * Aufruf: node scripts/tests-mit-untergrenze.mjs <Untergrenze> [weitere Argumente für node --test]
 *   z. B. "test": "node scripts/tests-mit-untergrenze.mjs 1"
 * Exit 0 = Untergrenze erreicht, kein Fehlschlag; Exit 1 = sonst
 */

import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

/**
 * Wertet eine TAP-Zusammenfassung aus.
 * @param tap - TAP-Text von node --test
 * @param exitCode - Exit-Code des Testlaufs (null bei Startfehler)
 * @param untergrenze - mindestens bestandene Tests
 * @returns { ok, grund, bestanden, fehlgeschlagen }
 */
export function bewerteTestlauf(tap, exitCode, untergrenze) {
  // Letzter Treffer zählt: Testausgaben erscheinen im TAP ebenfalls als `# …`-Zeilen und stehen vor der
  // Zusammenfassung — ein Test, der „# pass 99“ ausgibt, darf die Zählung nicht verfälschen.
  const zahl = (name) => {
    const treffer = [...tap.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`, 'gm'))].at(-1)
    return treffer === undefined ? null : Number(treffer[1])
  }
  const bestanden = zahl('pass')
  const fehlgeschlagen = zahl('fail')
  if (bestanden === null || fehlgeschlagen === null) return { ok: false, grund: 'keine TAP-Zusammenfassung (# pass/# fail) gefunden', bestanden, fehlgeschlagen }
  if (exitCode !== 0) return { ok: false, grund: `node --test endete mit Exit ${exitCode}`, bestanden, fehlgeschlagen }
  if (fehlgeschlagen > 0) return { ok: false, grund: `${fehlgeschlagen} Test(s) fehlgeschlagen`, bestanden, fehlgeschlagen }
  if (bestanden < untergrenze) return { ok: false, grund: `nur ${bestanden} Test(s) bestanden, Untergrenze ${untergrenze}`, bestanden, fehlgeschlagen }
  return { ok: true, grund: `${bestanden} Test(s) bestanden (Untergrenze ${untergrenze})`, bestanden, fehlgeschlagen }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [untergrenzeText, ...weitere] = process.argv.slice(2)
  const untergrenze = Number(untergrenzeText)
  if (!Number.isInteger(untergrenze) || untergrenze < 1) {
    console.error('Aufruf: node scripts/tests-mit-untergrenze.mjs <Untergrenze ≥ 1> [Argumente für node --test]')
    process.exit(1)
  }
  // Ohne NODE_TEST_CONTEXT: läuft dieses Skript selbst unter node --test, meldete sich der innere Lauf
  // sonst als Teiltest beim äußeren an und schriebe keine TAP-Zusammenfassung.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'NODE_TEST_CONTEXT'))
  const lauf = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...weitere], { encoding: 'utf8', env, maxBuffer: 256 * 1024 * 1024 })
  process.stdout.write(lauf.stdout ?? '')
  process.stderr.write(lauf.stderr ?? '')
  const bewertung = bewerteTestlauf(lauf.stdout ?? '', lauf.status, untergrenze)
  console.log(`\n${bewertung.ok ? '✓' : '✗'} Test-Gate: ${bewertung.grund}`)
  process.exit(bewertung.ok ? 0 : 1)
}
