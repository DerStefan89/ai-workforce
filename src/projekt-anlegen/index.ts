/**
 * Datei: src/projekt-anlegen/index.ts
 *
 * Zweck: F41 WS-1 (features/F41/feature.md). Kernlogik zum Anlegen eines
 * neuen Projekts durch byte-identisches Kopieren der Harness-Baseline
 * (E-F41-1 = A, Stefan 24.09.2026, docs/projekt/zielfassung.md §13.6): die
 * Startbedingung (E-183, src/invocation-policy/index.ts) ist rein
 * inhaltsbasiert — eine byte-identische Kopie von .claude/settings.json,
 * jeder referenzierten Hook-Datei und state/aktuelle-autorisierung.json
 * validiert gegen dieselbe, bereits bestehende externe Baseline, ohne dass
 * ein neues Freigabeartefakt entsteht (ARCHITECTURE.md §3).
 *
 * KORREKTUR (24.09.2026, Challenger-Befund, real widerlegt über einen
 * echten Lauf gegen ein neu angelegtes Projekt, features/F41/nachweis-
 * ws1.md): eine frühere Fassung dieser Datei behauptete, Startbedingung 2
 * (E-188) lehne ein neues Projektverzeichnis "strukturell IMMER" ab. Das
 * ist falsch. `gueltigkeitsschluessel.arbeitsverzeichnis_pfad`
 * (src/claude-code-gateway/index.ts, `starteGateway`) ist
 * `process.cwd()` des LEITSTAND-SERVERPROZESSES, nicht das
 * Arbeitsverzeichnis des gestarteten Kindprozesses — der Server macht
 * nirgends ein `process.chdir()`. `arbeitsverzeichnis_pfad` ist damit für
 * JEDES Projekt derselbe, konstante Wert (der Pfad von ai-workforce
 * selbst), unabhängig davon, in welchem Verzeichnis der eigentliche
 * Kindprozess läuft (das steuert ausschließlich `AusfuehrungsOptionen.cwd`,
 * F25 WS-1). Eine byte-identische Kopie von state/aktuelle-autorisierung.
 * json validiert deshalb auch Startbedingung 2 gegen denselben,
 * bestehenden Wirksamkeitsnachweis — real belegt: ein echter, lesender
 * Lauf gegen ein neu angelegtes Projekt erreichte RUN_PREPARED und lief
 * bis ERFOLGREICH durch, der reale Kindprozess las dabei real eine nur im
 * neuen Projektverzeichnis vorhandene Markerdatei. `pruefeVolleStartfreigabeFuerRepo`
 * prüft deshalb am Ziel BEIDE Bedingungen, mit denselben Eingaben wie
 * `starteGateway` (F-670, state/findings.md, dokumentiert die
 * architektonische Schwäche selbst: arbeitsverzeichnis_pfad bindet NICHT
 * an das reale Projektverzeichnis — vorbestehend seit F25, durch F41 nur
 * sichtbarer).
 *
 * Reine Datei-I/O-Funktionen, kein HTTP, kein D13-Bezug (kein Lauf wird
 * gestartet) — Muster scripts/leitstand/routen-f39.mjs: die orchestrierende
 * Reihenfolge (Quelle grün? kopieren, Ziel grün? sonst zurückbauen) bleibt
 * beim Aufrufer (scripts/leitstand-server.mjs), dieses Modul stellt nur die
 * einzelnen, unabhängig testbaren Schritte.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f41-projekt-anlegen.mjs.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { leseAktuelleAutorisierung } from '../claude-code-gateway/index.ts'
import { ermittleHookPfade, ermittleIstZustand, pruefeStartbedingung1, pruefeStartbedingung2 } from '../invocation-policy/index.ts'
import type { BedingungErgebnis, IstUebrigeFelder } from '../invocation-policy/types.ts'
import type { ProjektEintrag } from '../projekte/types.ts'

/** Die drei Felder aus der neu geschriebenen Startvorlage, die pruefeVolleStartfreigabeFuerRepo für Startbedingung 2 (E-188) braucht — Muster GatewayEingaben. */
export interface NeueStartvorlageEckdaten {
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
  werkzeugStartziel: string[]
}

/**
 * Strenger als src/projekte/index.ts' ID_MUSTER (dort ohne Längengrenze,
 * erlaubt auch einen einzelnen Buchstaben — gilt für JEDEN Registereintrag,
 * auch handgepflegte). Für eine NEU vergebene id gilt zusätzlich eine
 * Mindest-/Maximallänge (CONTEXT des Auftrags): mindestens 2, höchstens 41
 * Zeichen — ein Verzeichnisname, kein beliebig kurzes/langes Freitextfeld.
 */
export const NEUE_PROJEKT_ID_MUSTER = /^[a-z0-9][a-z0-9-]{1,40}$/

/**
 * Code-Review-Befund (F41 WS-1): case-insensitiver Pfadvergleich nur auf
 * Dateisystemen, die selbst case-insensitiv sind (Windows/macOS) — auf
 * einem case-sensitiven Dateisystem (Linux, u. a. dem in CLAUDE.md
 * dokumentierten Fall "gemountetes Windows-Verzeichnis") wäre ein
 * pauschales `.toLowerCase()` beim Containment-Check zu großzügig: ein
 * `zielordner`, der sich nur in Groß-/Kleinschreibung vom Basisverzeichnis
 * unterscheidet, bestünde die Prüfung fälschlich, obwohl er dort real
 * außerhalb der Basis liegt. Anders als der ähnliche, aber rein
 * hash-vergleichende `normalisierePfadFuerVergleich` in
 * src/invocation-policy/index.ts (kein Sicherheitsgrenze, nur
 * Schlüsselvergleich) ist DIESE Funktion die tatsächliche
 * Sicherheitsgrenze gegen Path-Traversal — deshalb bewusst plattformbedingt
 * statt pauschal.
 */
function normalisierePfadFuerVergleich(pfad: string): string {
  return process.platform === 'win32' || process.platform === 'darwin' ? pfad.toLowerCase() : pfad
}

export interface ZielordnerErgebnis {
  ok: boolean
  ziel?: string
  grund?: string
}

/**
 * Löst den Zielordner für ein neues Projekt auf und prüft Containment
 * (muss unter elternverzeichnis liegen), Traversal (resolve() löst '..'
 * bereits vor dem Präfixvergleich auf) und Symlinks (jeder bereits
 * existierende Pfadabschnitt zwischen elternverzeichnis und ziel muss real
 * genau dort liegen, wo er textuell steht — sonst könnte ein Symlink den
 * tatsächlichen Schreibort aus der Basis heraus verschieben). Prüft
 * zuletzt, dass ziel nicht existiert oder leer ist.
 * @param elternverzeichnis - Basis, unter der jedes neue Projekt liegen muss (Elternverzeichnis des ai-workforce-Repos)
 * @param id - Projekt-id, Standardname des Zielordners
 * @param angegebenerZielordner - optionaler, vom Body übergebener Zielordner (absolut oder relativ zu elternverzeichnis)
 * @returns { ok: true, ziel } oder { ok: false, grund }
 */
export function loeseZielordner(elternverzeichnis: string, id: string, angegebenerZielordner?: string): ZielordnerErgebnis {
  const elternAufgeloest = resolve(elternverzeichnis)
  const ziel = angegebenerZielordner !== undefined && angegebenerZielordner.length > 0 ? resolve(elternAufgeloest, angegebenerZielordner) : join(elternAufgeloest, id)

  const elternMitTrenner = `${elternAufgeloest.replace(/[\\/]+$/, '')}${sep}`
  const zielNormalisiert = normalisierePfadFuerVergleich(ziel)
  const elternNormalisiert = normalisierePfadFuerVergleich(elternMitTrenner)
  if (!zielNormalisiert.startsWith(elternNormalisiert)) {
    return { ok: false, grund: `Zielordner '${ziel}' liegt außerhalb der erlaubten Basis '${elternAufgeloest}' (Containment)` }
  }

  // Symlink-Prüfung: die Basis SELBST und jeder bereits existierende Abschnitt zwischen Basis und
  // Ziel müssen real exakt dort liegen, wo sie textuell stehen (Muster: kein Vertrauen in einen
  // Pfad, der über einen Symlink an der Basis vorbei zeigen könnte). Die Basis zuerst und separat
  // geprüft (Selbsttest-Fund: eine Schleife, die erst BEI aktuell = elternAufgeloest beginnt und
  // nur die Segmente DANACH iteriert, prüft die Basis selbst nie).
  if (existsSync(elternAufgeloest)) {
    const realEltern = realpathSync(elternAufgeloest)
    if (normalisierePfadFuerVergleich(realEltern) !== normalisierePfadFuerVergleich(elternAufgeloest)) {
      return { ok: false, grund: `Basisverzeichnis '${elternAufgeloest}' ist ein Symlink oder führt über einen Symlink — abgelehnt` }
    }
  }
  const relativerRest = ziel.slice(elternMitTrenner.length)
  let aktuell = elternAufgeloest
  for (const segment of relativerRest.split(sep)) {
    if (segment.length === 0) continue
    aktuell = join(aktuell, segment)
    if (existsSync(aktuell)) {
      const real = realpathSync(aktuell)
      if (normalisierePfadFuerVergleich(real) !== normalisierePfadFuerVergleich(aktuell)) {
        return { ok: false, grund: `Zielpfad '${aktuell}' ist ein Symlink oder führt über einen Symlink — abgelehnt` }
      }
    }
  }

  if (existsSync(ziel)) {
    const inhalt = readdirSync(ziel)
    if (inhalt.length > 0) {
      return { ok: false, grund: `Zielordner '${ziel}' existiert bereits und ist nicht leer` }
    }
  }

  return { ok: true, ziel }
}

/**
 * Kopiert die Harness-Baseline byte-identisch: .claude/settings.json, jede
 * darin referenzierte Hook-Datei (ermittleHookPfade, dieselbe Messung wie
 * src/invocation-policy/index.ts' ermittleIstZustand — kein zweiter,
 * potenziell abweichender Lesepfad) und state/aktuelle-autorisierung.json.
 * copyFileSync statt readFileSync/writeFileSync: kopiert Bytes ohne jede
 * Interpretation (Kodierung, Zeilenenden) — genau die Eigenschaft, die
 * pruefeStartbedingung1FuerRepo unten voraussetzt.
 * @param quellRepoWurzel - Repo-Wurzel, aus der kopiert wird (die grüne Quelle)
 * @param zielRepoWurzel - Repo-Wurzel des neuen Projekts (muss bereits existieren)
 * @returns die Liste der repo-relativen Pfade, die kopiert wurden
 */
export function kopiereBaseline(quellRepoWurzel: string, zielRepoWurzel: string): string[] {
  const kopiert: string[] = []

  const settingsRelativ = join('.claude', 'settings.json')
  mkdirSync(join(zielRepoWurzel, '.claude'), { recursive: true })
  copyFileSync(join(quellRepoWurzel, settingsRelativ), join(zielRepoWurzel, settingsRelativ))
  kopiert.push(settingsRelativ)

  const settingsGeparst = JSON.parse(readFileSync(join(quellRepoWurzel, settingsRelativ), 'utf8'))
  for (const hookPfad of ermittleHookPfade(settingsGeparst)) {
    mkdirSync(dirname(join(zielRepoWurzel, hookPfad)), { recursive: true })
    copyFileSync(join(quellRepoWurzel, hookPfad), join(zielRepoWurzel, hookPfad))
    kopiert.push(hookPfad)
  }

  const autorisierungRelativ = join('state', 'aktuelle-autorisierung.json')
  mkdirSync(join(zielRepoWurzel, 'state'), { recursive: true })
  copyFileSync(join(quellRepoWurzel, autorisierungRelativ), join(zielRepoWurzel, autorisierungRelativ))
  kopiert.push(autorisierungRelativ)

  return kopiert
}

/**
 * Schreibt startvorlagen/<id>.json (aus startvorlagen/ai-workforce.json der
 * Quelle, OHNE pruefbefehl/pruefZeitgrenzeMs — ein neues Projekt hat noch
 * keinen deterministischen Prüfschritt, siehe features/F41/feature.md
 * "Bekannte Grenzen"), profiles/<id>.json (aus profiles/ai-workforce.json
 * der Quelle, mit projekt: id) und .gitignore (kontrollzustand/) im neuen
 * Repo. JSON.stringify(…, null, 2) + '\n', ausschließlich LF
 * (ARCHITECTURE.md §7 — der Kern schreibt nie CRLF).
 * @param id - Projekt-id des neuen Eintrags
 * @param quellRepoWurzel - Repo-Wurzel, aus der die Vorlagen abgeleitet werden
 * @param zielRepoWurzel - Repo-Wurzel des neuen Projekts
 * @returns die geschriebenen Eckdaten der neuen Startvorlage (werkzeugVersionDeklariert/berechtigungskontext/werkzeugStartziel) — pruefeVolleStartfreigabeFuerRepo braucht sie für Startbedingung 2 (E-188), ohne die Datei ein zweites Mal zu lesen
 */
export function schreibeStartvorlageUndProfil(id: string, quellRepoWurzel: string, zielRepoWurzel: string): NeueStartvorlageEckdaten {
  const startvorlage = JSON.parse(readFileSync(join(quellRepoWurzel, 'startvorlagen', 'ai-workforce.json'), 'utf8'))
  delete startvorlage.pruefbefehl
  delete startvorlage.pruefZeitgrenzeMs
  // Realer Fund (Smoketest, Muster F-415/F25 WS-1): src/startvorlage/index.ts' leiteProfilReferenzAb
  // liest vorlage.profilPfad über einen rohen readFileSync — relativ zum process.cwd() des
  // SERVERPROZESSES, nicht zu zielRepoWurzel (anders als settingsPfad/aktuelleAutorisierungPfad/
  // startvorlagePfad, die scripts/leitstand-server.mjs' loeseProjektPfade bereits absolut auflöst).
  // Bliebe profilPfad unverändert 'profiles/ai-workforce.json', bände sich das neue Projekt beim
  // echten Serverlauf still an ai-workforce's EIGENES Profil (die Datei existiert dort ja
  // tatsächlich) statt an sein eigenes — deshalb hier absolut auf das gleich geschriebene
  // profiles/<id>.json gesetzt, cwd-unabhängig wie die übrigen Pfade.
  startvorlage.profilPfad = join(zielRepoWurzel, 'profiles', `${id}.json`)
  mkdirSync(join(zielRepoWurzel, 'startvorlagen'), { recursive: true })
  writeFileSync(join(zielRepoWurzel, 'startvorlagen', `${id}.json`), `${JSON.stringify(startvorlage, null, 2)}\n`)

  const profil = JSON.parse(readFileSync(join(quellRepoWurzel, 'profiles', 'ai-workforce.json'), 'utf8'))
  profil.projekt = id
  mkdirSync(join(zielRepoWurzel, 'profiles'), { recursive: true })
  writeFileSync(join(zielRepoWurzel, 'profiles', `${id}.json`), `${JSON.stringify(profil, null, 2)}\n`)

  writeFileSync(join(zielRepoWurzel, '.gitignore'), 'kontrollzustand/\n')

  return {
    werkzeugVersionDeklariert: startvorlage.werkzeugVersionDeklariert,
    berechtigungskontext: startvorlage.berechtigungskontext,
    werkzeugStartziel: startvorlage.werkzeugStartziel,
  }
}

type IstZustandUndAutorisierungErgebnis =
  | { ok: true; istZustand: ReturnType<typeof ermittleIstZustand>; aktuelleAutorisierung: NonNullable<ReturnType<typeof leseAktuelleAutorisierung>> }
  | { ok: false; grund: string }

/**
 * Gemeinsame Messung für pruefeStartbedingung1FuerRepo UND
 * pruefeVolleStartfreigabeFuerRepo (D5, kein zweiter Regelsatz) — misst
 * istZustand (ermittleIstZustand, dieselbe Funktion wie starteGateway) und
 * liest die aktuelle-autorisierung.json DIESES Repos genau einmal.
 */
function misseIstZustandUndAutorisierung(repoWurzel: string): IstZustandUndAutorisierungErgebnis {
  const settingsPfad = join(repoWurzel, '.claude', 'settings.json')
  let istZustand: ReturnType<typeof ermittleIstZustand>
  try {
    istZustand = ermittleIstZustand(settingsPfad)
  } catch (fehler) {
    return { ok: false, grund: `Ist-Zustand (.claude/settings.json + Schutzskripte) nicht messbar: ${(fehler as Error).message}` }
  }

  const aktuelleAutorisierungPfad = join(repoWurzel, 'state', 'aktuelle-autorisierung.json')
  const aktuelleAutorisierung = leseAktuelleAutorisierung(aktuelleAutorisierungPfad)
  if (aktuelleAutorisierung === null) {
    return { ok: false, grund: 'state/aktuelle-autorisierung.json fehlt, ist kein gültiges JSON, oder hat nicht die erwartete Form' }
  }

  return { ok: true, istZustand, aktuelleAutorisierung }
}

/**
 * Prüft Startbedingung 1 (E-183) gegen das übergebene Repo — liest die
 * baselineReferenz aus dem (bereits kopierten) state/aktuelle-autorisierung.
 * json DIESES Repos; sie zeigt auf das externe Autorisierungs-Repo, nicht
 * auf repoWurzel selbst, deshalb liefert eine byte-identische Kopie hier
 * dasselbe Ergebnis wie die Quelle (features/F25/nachweis-ws1.md). Kein
 * Wurf bei erwartetem Rot-Fall.
 * @param repoWurzel - Repo-Wurzel, gegen die geprüft wird
 * @param optionen - startfreigabeRepoWurzel überschreibt src/invocation-policy/index.ts' STANDARD_REPO_WURZEL (Muster GatewayOptionen.startfreigabeRepoWurzel) — u.a. für scripts/check-f41-projekt-anlegen.mjs, das gegen ein Wegwerf-Git-Repo statt des echten externen Autorisierungs-Repos prüft.
 * @returns BedingungErgebnis von pruefeStartbedingung1, oder { ok: false, grund } bei nicht messbarem Ist-Zustand/fehlender Autorisierungsreferenz
 */
export function pruefeStartbedingung1FuerRepo(repoWurzel: string, optionen: { startfreigabeRepoWurzel?: string } = {}): BedingungErgebnis {
  const gemessen = misseIstZustandUndAutorisierung(repoWurzel)
  if (!gemessen.ok) return gemessen
  return pruefeStartbedingung1(gemessen.aktuelleAutorisierung.baselineReferenz, gemessen.istZustand, { repoWurzel: optionen.startfreigabeRepoWurzel })
}

/**
 * Prüft die VOLLE Startfreigabe (Bedingung 1, E-183, UND Bedingung 2,
 * E-188) gegen das übergebene Repo — dieselben Eingaben wie starteGateway
 * (src/claude-code-gateway/index.ts), direkt über pruefeStartbedingung1/2
 * aufgerufen statt über den Orchestrator pruefeStartfreigabe: der schreibt
 * über seinen `schreiber` ein Startfreigabe-Ereignis (Log-Zeile) — bei der
 * Registrierung eines neuen Projekts ist das keine echte Startfreigabe für
 * einen tatsächlich anstehenden Lauf, sondern nur eine Prüfung VORAB; ein
 * geloggtes `startfreigabe_geprueft`/`startfreigabe_abgelehnt`-Ereignis
 * ohne zugehörigen Lauf wäre irreführend (Auftrags-Vorgabe: "OHNE
 * Wirkungsmarke/Log-Schreiben").
 *
 * KORREKTUR (24.09.2026): eine frühere Fassung dieses Moduls prüfte hier
 * NUR Bedingung 1 — mit der (real widerlegten) Begründung, Bedingung 2
 * lehne ein neues Verzeichnis strukturell immer ab. Siehe Kopfkommentar
 * dieser Datei und features/F41/nachweis-ws1.md für den Realbeleg.
 * arbeitsverzeichnis_pfad ist bewusst `process.cwd()` DIESES
 * (Server-)Prozesses — exakt wie starteGateway es baut, unabhängig von
 * repoWurzel (F-670, state/findings.md: dieselbe architektonische
 * Eigenschaft, nicht neu für F41).
 * @param repoWurzel - Repo-Wurzel, gegen die geprüft wird (das neu angelegte Ziel)
 * @param neueStartvorlage - Eckdaten der für DIESES Projekt geschriebenen Startvorlage (schreibeStartvorlageUndProfil)
 * @param optionen - startfreigabeRepoWurzel, Muster pruefeStartbedingung1FuerRepo
 * @returns { ok: true } wenn beide Bedingungen bestehen, sonst das BedingungErgebnis der zuerst fehlgeschlagenen (Reihenfolge E-183 vor E-188, Muster pruefeStartfreigabe)
 */
export function pruefeVolleStartfreigabeFuerRepo(repoWurzel: string, neueStartvorlage: NeueStartvorlageEckdaten, optionen: { startfreigabeRepoWurzel?: string } = {}): BedingungErgebnis {
  const gemessen = misseIstZustandUndAutorisierung(repoWurzel)
  if (!gemessen.ok) return gemessen

  const bedingung1 = pruefeStartbedingung1(gemessen.aktuelleAutorisierung.baselineReferenz, gemessen.istZustand, { repoWurzel: optionen.startfreigabeRepoWurzel })
  if (!bedingung1.ok) return bedingung1

  const istUebrigeFelder: IstUebrigeFelder = {
    werkzeug_version_deklariert: neueStartvorlage.werkzeugVersionDeklariert,
    berechtigungskontext: neueStartvorlage.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    startziel_pfad: neueStartvorlage.werkzeugStartziel[0],
  }
  return pruefeStartbedingung2(gemessen.aktuelleAutorisierung.wirksamkeitsnachweisReferenz, gemessen.istZustand, istUebrigeFelder, { repoWurzel: optionen.startfreigabeRepoWurzel })
}

/**
 * Baut root-relativen Pfad und Registerfelder eines neuen Projekteintrags.
 * repo_pfad ist relativ zu repoWurzelBasis (derselbe Referenzpunkt, den
 * scripts/leitstand-server.mjs' CLI-Bindeblock als projekteBasis verwendet
 * — process.cwd() des Serverprozesses, siehe loeseProjektPfade) — für ein
 * Geschwisterverzeichnis üblicherweise '../<id>'. Mit '/' statt dem
 * plattformeigenen Trenner geschrieben (Konsistenz mit den übrigen, von
 * Hand gepflegten Einträgen in projekte.json).
 * @param id - Projekt-id
 * @param name - Menschenlesbarer Name
 * @param zielRepoWurzel - absoluter Pfad des neuen Repos
 * @param repoWurzelBasis - Referenzpunkt (projekteBasis des Servers)
 * @returns vollständiger ProjektEintrag, Status IDEE
 */
export function baueNeuenProjektEintrag(id: string, name: string, zielRepoWurzel: string, repoWurzelBasis: string): ProjektEintrag {
  const repoPfad = relative(resolve(repoWurzelBasis), zielRepoWurzel).split(sep).join('/')
  return {
    id,
    name,
    repo_pfad: repoPfad.length > 0 ? repoPfad : '.',
    startvorlage_pfad: `startvorlagen/${id}.json`,
    profil_pfad: `profiles/${id}.json`,
    basisverzeichnis: 'kontrollzustand',
    status: 'IDEE',
  }
}

/**
 * Baut den Ordner zurück, den DIESER Request angelegt hat (Rot-Fall in
 * Schritt (d) des Auftrags) — löscht ausschließlich ziel selbst, nie etwas
 * außerhalb. force:true, weil ziel laut loeseZielordner vor dem Anlegen
 * entweder nicht existierte oder bereits leer war — ein Fehlschlag hier ist
 * kein "echtes" Aufräumen fremden Inhalts.
 *
 * Wirft NIE (QA-Befund, F41 WS-1): scripts/_aufraeumen.ts' raeumeVerzeichnis
 * (dieselbe Fehlerklasse, EPERM/EBUSY/ENOTEMPTY — F-590, ein von einem
 * Virenscanner/der Dateiindizierung kurz gehaltenes Handle) ist ausdrücklich
 * NUR für Wegwerf-Verzeichnisse in Prüfcode gedacht ("Produktcode räumt
 * weiterhin ohne stilles Wiederholen auf — dort ist ein blockiertes Handle
 * ein Befund", scripts/_aufraeumen.ts Kopfkommentar) — dieser Aufruf hier
 * ist der erste rekursive rmSync in Produktcode. Kein stilles Wiederholen,
 * aber auch kein ungefangener zweiter Wurf: ein fehlgeschlagener Rückbau
 * darf niemals verhindern, dass der aufrufende Request trotzdem eine
 * Antwort bekommt (sonst bleibt die Verbindung offen und der Wurf reißt als
 * unhandled rejection den gesamten Serverprozess mit, nicht nur diesen
 * Request). Der Fehlschlag selbst bleibt ein sichtbarer Befund (console.error).
 * @param ziel - absoluter Pfad des in diesem Request angelegten Ordners
 * @returns { ok: true } bei Erfolg (oder wenn ziel gar nicht existierte), { ok: false, grund } wenn rmSync scheitert — ziel besteht dann weiter und muss von Hand entfernt werden
 */
export function raeumeAngelegtenOrdnerZurueck(ziel: string): { ok: true } | { ok: false; grund: string } {
  try {
    if (existsSync(ziel)) {
      rmSync(ziel, { recursive: true, force: true })
    }
    return { ok: true }
  } catch (fehler) {
    const grund = `'${ziel}' konnte nicht zurückgebaut werden (${(fehler as Error).message}) — von Hand entfernen`
    console.error(`[projekt-anlegen] raeumeAngelegtenOrdnerZurueck: ${grund}`)
    return { ok: false, grund }
  }
}
