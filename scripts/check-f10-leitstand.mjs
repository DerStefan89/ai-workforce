/**
 * Datei: scripts/check-f10-leitstand.mjs
 *
 * Zweck: F10-WS-1-Gate (Leitstand-Schreibpfad), erweitert um F11 WS-2.
 * Prüft AK1 (reales, valides Profil unter profiles/), AK3 (Options-Sperre
 * — ein AusfuehrungsOptionen-Feld oder ein unbekanntes Feld im Body → 400),
 * AK4 (Loopback-Bindung — Grep gegen den bootstrap-Aufruf), AK5
 * (laufId-Eindeutigkeit — zwei unmittelbar aufeinanderfolgende POSTs mit
 * identischer laufId erzeugen genau einen fuehreAufgabeDurch-Aufruf, der
 * zweite POST bekommt 409) und AK6 (kein Prozesstod — eine werfende
 * fuehreAufgabeDurch-Attrappe belegt, dass der Serverprozess den Wurf
 * übersteht und GET /api/startfehler den Eintrag zeigt). F11 WS-2 ergänzt
 * je einen echten Testfall für AK5 (verbotenes Startvorlage-Feld → 400),
 * AK6 (verbotenes `inhalt` → 400, unsicherer Pfad → 400, fehlende Datei →
 * 400) und AK7 (zweiter Start während laufender Lauf → 409, D13). Alle
 * laufen real gegen einen laufenden Testserver (erzeugeRequestHandler +
 * createServer + fetch auf einem Ephemeral-Port), nicht gegen eine zweite,
 * von Hand nachgebaute Prüfung — die echte fuehreAufgabeDurch-Abhängigkeit
 * wird dafür per erzeugeRequestHandler-Option durch eine Attrappe ersetzt
 * (Muster wie F6as Starter). profilReferenz kommt für keinen dieser Tests
 * mehr aus dem Body — die Startvorlage (startvorlagen/beispielprojekt.json)
 * liefert sie serverseitig (F11 WS-2 AK4).
 *
 * F12 WS-1 ergänzt AK1 (nur Läufe mit mindestens einer Wirkungsmarke
 * erscheinen in GET /api/laeufe, eine reine Lineage-Kette nicht), AK2
 * (GET /api/laeufe ohne checkpoints-Array, GET /api/laeufe/<laufId> mit
 * der vollen Projektion, unbekannte laufId → 404), AK3(c) (Kopfdaten/Detail
 * zeigen payload.erstellt_am, null/"Zeit unbekannt" bei fehlendem Feld,
 * nie statSync-mtime) und die Advisor-Ergänzung zur Pfadsicherheit von
 * GET /api/laeufe/<laufId> (laufId mit unzulässigen Zeichen → 400, kein
 * Dateisystempfad-Escape).
 *
 * F12 WS-2 (state/plan-v1-f12-ws2.md) ergänzt AK4 (POST /api/auftraege legt
 * über registriereAuftrag an, 201 mit auftragId; GET /api/auftraege listet
 * ihn danach) und AK5 (Startauftrag trägt jetzt auftragId statt
 * auftragstext — gueltigerStartauftrag() referenziert dafür einen über
 * registriereTestAuftrag() real registrierten Auftrag im jeweiligen
 * basisVerzeichnis des Testblocks; ein Body mit auftragstext → 400, eine
 * unbekannte auftragId → 400 vor der 202-Antwort). Der alte F11-AK2-
 * Testfall (c2) prüft seither das GEGENTEIL: `auftragstext` im Body ist
 * jetzt verboten, `auftragId` ist das neue Pflichtfeld (Risiko 4/5 des
 * Plans).
 *
 * F-145-Fix ergänzt (p): eine `fuehreAufgabeDurchFn`-Attrappe zeichnet das
 * vierte Argument (`optionen`) auf, mit dem der Fire-and-forget-Aufruf in
 * `POST /api/laeufe` sie real aufruft — belegt, dass `optionen.basisVerzeichnis`
 * denselben Wert trägt, mit dem der Testserver konfiguriert wurde (vor dem
 * Fix: `undefined`, da kein viertes Argument übergeben wurde).
 *
 * F14 WS-4 (features/F14/feature.md) ergänzt (q) AK7 Teil 2 — POST
 * /api/laeufe/<laufId>/abbrechen: unbekannte/andere laufId → 404 (auch
 * während EIN anderer Lauf aktiv ist), Treffer → 202 sofort und der beim
 * Laufstart angelegte AbortController wird real ausgelöst (signal.aborted),
 * ein zweiter Abbruch-Klick bleibt idempotent (202, kein Absturz,
 * QA-Befund) — und (r) F-177: zeitgrenzeMs aus einer eigens präparierten
 * Testvorlage landet unverändert in den AusfuehrungsOptionen des
 * gestarteten Laufs. (q) belegt zusätzlich F-172s 'aktiv'-Feld
 * (QA-Befund): true für die konkret laufende laufId, false für eine
 * andere, ebenfalls existierende laufId UND nach Laufende für dieselbe
 * laufId — nicht nur "irgendein Lauf aktiv".
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f10-leitstand.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { erzeugeRequestHandler, pruefeStartauftrag, VERBOTENE_OPTIONEN_FELDER, VERBOTENE_STARTVORLAGE_FELDER } from './leitstand-server.mjs'
import { kanonischesJson, schreibeWirkungsmarke, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F10-Leitstand-Check (WS-1) ===\n')

const F12_PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

/** F12 WS-2, AK5: registriert einen echten Auftrag unter basisVerzeichnis — gueltigerStartauftrag() referenziert ihn über auftragId statt (F11-Stil) einen freien auftragstext direkt zu senden. @param basisVerzeichnis - Kontrollzustand-Wurzel des jeweiligen Testblocks @returns auftragId des registrierten Auftrags */
function registriereTestAuftrag(basisVerzeichnis) {
  const auftragId = `test-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, F12_PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', { basisVerzeichnis, schreiber: () => {} })
  return auftragId
}

// ─── (a) AK1: reales Profil ist valide ──────────────────────────────────────
// (F11 WS-2: profilReferenz kommt nicht mehr aus dem Body/Testfixture, sondern serverseitig aus
// der Startvorlage — src/startvorlage/index.ts:leiteProfilReferenzAb liest profiles/beispielprojekt.json
// bei jedem erzeugeRequestHandler-Aufruf unten ohnehin frisch. Diese Prüfung bleibt als eigenständiger
// Sanity-Check auf die reale Profildatei bestehen.)
const PROFIL_PFAD = 'profiles/beispielprojekt.json'
if (!existsSync(PROFIL_PFAD)) {
  befunde.push(`AK1: ${PROFIL_PFAD} fehlt`)
} else {
  let obj
  try {
    obj = JSON.parse(readFileSync(PROFIL_PFAD, 'utf-8'))
  } catch (fehler) {
    befunde.push(`AK1: ${PROFIL_PFAD} ist kein gültiges JSON (${fehler.message})`)
  }
  if (obj !== undefined) {
    const pflichtfelder = ['projekt', 'version', 'gates', 'dod', 'werkzeuge', 'reviewRegeln']
    const fehlend = pflichtfelder.filter((feld) => !(feld in obj))
    if (fehlend.length > 0) {
      befunde.push(`AK1: ${PROFIL_PFAD} fehlen Pflichtfelder: ${fehlend.join(', ')}`)
    } else {
      console.log(`✓ AK1: ${PROFIL_PFAD} valide.`)
    }
  }
}

// ─── (b) AK4: Loopback-Bindung (Grep gegen den bootstrap-Aufruf) ───────────
const serverQuelltext = readFileSync('scripts/leitstand-server.mjs', 'utf-8')
if (!/\.listen\(\s*PORT\s*,\s*'127\.0\.0\.1'/.test(serverQuelltext)) {
  befunde.push("AK4: server.listen bindet laut Quelltext nicht erkennbar auf '127.0.0.1'")
} else {
  console.log("✓ AK4: server.listen bindet auf '127.0.0.1' (F-120 gelöst).")
}

// ─── Testserver-Infrastruktur für AK3/AK5/AK6 ──────────────────────────────
/** @param laufId - laufId des Startauftrags @param auftragId - über registriereTestAuftrag() real registrierte Auftrags-ID (F12 WS-2, AK5) */
const gueltigerStartauftrag = (laufId, auftragId) => ({
  laufId,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

/**
 * Startet einen echten HTTP-Testserver auf einem Ephemeral-Loopback-Port.
 * @param optionen - an erzeugeRequestHandler durchgereicht (insbesondere fuehreAufgabeDurchFn)
 * @returns { basisUrl, schliessen } — Basis-URL des Testservers und eine Schließfunktion
 */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── (c) AK3: Options-Sperre — verbotenes Feld und unbekanntes Feld → 400 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f10-ak3'
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    for (const feld of VERBOTENE_OPTIONEN_FELDER) {
      const body = { ...gueltigerStartauftrag(`check-f10-ak3-${randomUUID()}`, auftragId), [feld]: 'verboten' }
      const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
      if (antwort.status !== 400) {
        befunde.push(`AK3: Body mit AusfuehrungsOptionen-Feld '${feld}' erwartet 400, erhalten ${antwort.status}`)
      }
    }
    const unbekannt = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ ...gueltigerStartauftrag(`check-f10-ak3-unbekannt-${randomUUID()}`, auftragId), unbekanntesFeld: 1 }),
    })
    if (unbekannt.status !== 400) {
      befunde.push(`AK3: Body mit unbekanntem Top-Level-Feld erwartet 400, erhalten ${unbekannt.status}`)
    }
    const pruefungDirekt = pruefeStartauftrag({ ...gueltigerStartauftrag('x', auftragId), schreiber: () => {} })
    if (pruefungDirekt.ok !== false) {
      befunde.push('AK3: pruefeStartauftrag lässt ein Objekt mit schreiber-Feld fälschlich durch')
    }
    if (befunde.length === 0) {
      console.log(`✓ AK3: alle ${VERBOTENE_OPTIONEN_FELDER.size} AusfuehrungsOptionen-Felder plus ein unbekanntes Feld werden mit 400 abgelehnt.`)
    }
  } finally {
    await schliessen()
  }
}

// ─── (c2) F12 WS-2 AK5: Startauftrag ohne 'auftragId' → 400; mit 'auftragstext' im Body → 400 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f10-f12-ak5'
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  // Attrappe statt der echten fuehreAufgabeDurch (Muster Block (d)/(d2)) — der Retry-Fall unten erreicht
  // real die Reservierung/202, ein echter Aufruf würde ohne Startfreigabe-Fixture einen realen Prozess
  // zu starten versuchen.
  const fuehreAufgabeDurchFn = async () => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const { auftragId: _ignoriert, ...ohneAuftragId } = gueltigerStartauftrag(`check-f10-f12-ak5-fehlend-${randomUUID()}`, auftragId)
    const antwortFehlend = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(ohneAuftragId) })
    const koerperFehlend = await antwortFehlend.json()
    if (antwortFehlend.status !== 400 || !koerperFehlend.grund.includes("Pflichtfeld 'auftragId' fehlt")) {
      befunde.push(
        `F12 AK5: Startauftrag ohne 'auftragId' erwartet 400 mit "Pflichtfeld 'auftragId' fehlt", erhalten status=${antwortFehlend.status}, grund=${JSON.stringify(koerperFehlend.grund)}`
      )
    }

    const mitAuftragstext = { ...gueltigerStartauftrag(`check-f10-f12-ak5-verboten-${randomUUID()}`, auftragId), auftragstext: 'sollte verboten sein' }
    const antwortVerboten = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitAuftragstext) })
    const koerperVerboten = await antwortVerboten.json()
    if (antwortVerboten.status !== 400 || !koerperVerboten.grund.includes("Feld 'auftragstext'")) {
      befunde.push(
        `F12 AK5: Startauftrag mit 'auftragstext' im Body erwartet 400 mit Hinweis auf das verbotene Feld, erhalten status=${antwortVerboten.status}, grund=${JSON.stringify(koerperVerboten.grund)}`
      )
    }

    const laufIdUnbekannt = `check-f10-f12-ak5-unbekannt-${randomUUID()}`
    const unbekannteAuftragId = { ...gueltigerStartauftrag(laufIdUnbekannt, `nie-existent-${randomUUID()}`) }
    const antwortUnbekannt = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(unbekannteAuftragId) })
    const koerperUnbekannt = await antwortUnbekannt.json()
    if (antwortUnbekannt.status !== 400 || !koerperUnbekannt.grund.includes('nicht gefunden')) {
      befunde.push(
        `F12 AK5: Startauftrag mit unbekannter 'auftragId' erwartet 400 ("nicht gefunden"), erhalten status=${antwortUnbekannt.status}, grund=${JSON.stringify(koerperUnbekannt.grund)}`
      )
    }

    // AK5-Vertrag: "kein laufId-Reservierungseffekt danach" (Plan Abschnitt 8) — derselbe laufId-Wert,
    // diesmal mit einer gültigen auftragId, muss unmittelbar danach gelingen (202), sonst hätte der
    // 400-Fall oben fälschlich schon reserviert.
    const retryMitGueltigerAuftragId = { ...gueltigerStartauftrag(laufIdUnbekannt, auftragId) }
    const antwortRetry = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(retryMitGueltigerAuftragId) })
    if (antwortRetry.status !== 202) {
      befunde.push(`F12 AK5: Retry mit derselben laufId '${laufIdUnbekannt}' und gültiger auftragId nach dem 400-Fall erwartet 202 (kein Reservierungseffekt), erhalten ${antwortRetry.status}`)
    }

    if (befunde.length === 0) {
      console.log("✓ F12 AK5: Startauftrag ohne 'auftragId' → 400, mit 'auftragstext' im Body → 400, mit unbekannter 'auftragId' → 400 (vor jeder Zustandsänderung).")
    }
  } finally {
    await schliessen()
  }
}

// ─── (d) AK5: laufId-Eindeutigkeit — zwei sofortige POSTs, genau ein Aufruf ─
{
  const aufrufe = []
  const fuehreAufgabeDurchFn = async (laufId, profilRef, eingaben) => {
    aufrufe.push(laufId)
    await verzoegerung(30)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const basisVerzeichnisAk5 = 'kontrollzustand-test-f10-ak5'
  const auftragIdAk5 = registriereTestAuftrag(basisVerzeichnisAk5)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisAk5, fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak5-${randomUUID()}`
    const body = JSON.stringify(gueltigerStartauftrag(laufId, auftragIdAk5))
    const [erste, zweite] = await Promise.all([
      fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body }),
      fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body }),
    ])
    const stati = [erste.status, zweite.status].sort()
    await verzoegerung(60)
    if (stati[0] !== 202 || stati[1] !== 409 || aufrufe.length !== 1) {
      befunde.push(`AK5: zwei sofortige POSTs mit identischer laufId erwartet [202,409] und genau einen fuehreAufgabeDurch-Aufruf, erhalten stati=${JSON.stringify(stati)}, aufrufe=${aufrufe.length}`)
    } else {
      console.log('✓ AK5: zwei sofortige POSTs mit identischer laufId erzeugen genau einen fuehreAufgabeDurch-Aufruf, der zweite bekommt 409.')
    }
  } finally {
    await schliessen()
  }
}

// ─── (d2) AK5(a): laufId mit bereits existierendem Verzeichnis unter kontrollzustand/ → 409 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f10-ak5a'
  const laufId = `check-f10-ak5a-${randomUUID()}`
  mkdirSync(join(basisVerzeichnis, laufId), { recursive: true })
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  const aufrufe = []
  const fuehreAufgabeDurchFn = async (id) => {
    aufrufe.push(id)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    if (antwort.status !== 409 || aufrufe.length !== 0) {
      befunde.push(`AK5(a): laufId mit vorab existierendem Verzeichnis erwartet 409 ohne fuehreAufgabeDurch-Aufruf, erhalten status=${antwort.status}, aufrufe=${aufrufe.length}`)
    } else {
      console.log('✓ AK5(a): laufId mit bereits vorhandenem kontrollzustand/-Verzeichnis wird ohne fuehreAufgabeDurch-Aufruf mit 409 abgelehnt.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (d3) AK5: Freigabe bei F5/F6a-Ablehnung (ok:false) — startfehler sichtbar, Retry ohne Checkpoint gelingt ──
{
  const fuehreAufgabeDurchFn = async () => ({
    ok: false,
    stufe: 'kontextpaket',
    ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'nicht-existent' },
  })
  const basisVerzeichnisAk5b = 'kontrollzustand-test-f10-ak5b'
  const auftragIdAk5b = registriereTestAuftrag(basisVerzeichnisAk5b)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisAk5b, fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak5b-${randomUUID()}`
    const body = JSON.stringify(gueltigerStartauftrag(laufId, auftragIdAk5b))
    const erste = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body })
    await verzoegerung(30)

    const startfehlerListe = await (await fetch(`${basisUrl}/api/startfehler`)).json()
    const eintrag = startfehlerListe.find((e) => e.laufId === laufId)

    // Der Fake schreibt (anders als F6as verweigereStart) keinen Checkpoint — laufIdBelegt() darf
    // die freigegebene Reservierung also nicht mehr sehen, ein Retry mit derselben laufId muss gelingen.
    const retry = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body })

    if (erste.status !== 202 || eintrag === undefined || !eintrag.fehler.includes('F5-Ablehnung') || retry.status !== 202) {
      befunde.push(
        `AK5/ok:false-Freigabe: erwartet erster POST 202, Startfehler-Eintrag mit 'F5-Ablehnung', Retry mit derselben laufId 202, erhalten ${JSON.stringify({ ersteStatus: erste.status, eintrag, retryStatus: retry.status })}`
      )
    } else {
      console.log("✓ AK5/ok:false-Freigabe: F5-Ablehnung landet in /api/startfehler, Reservierung wird freigegeben, Retry mit derselben laufId gelingt (kein Checkpoint geschrieben).")
    }
  } finally {
    await schliessen()
  }
}

// ─── (e) AK6: kein Prozesstod — werfende Attrappe, Server übersteht, /api/startfehler zeigt Eintrag ──
{
  const fuehreAufgabeDurchFn = async () => {
    throw new Error('synthetischer Wurf aus der Attrappe (AK6)')
  }
  const basisVerzeichnisAk6 = 'kontrollzustand-test-f10-ak6'
  const auftragIdAk6 = registriereTestAuftrag(basisVerzeichnisAk6)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisAk6, fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak6-${randomUUID()}`
    const start = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragIdAk6)) })
    if (start.status !== 202) {
      befunde.push(`AK6: Start-POST erwartet 202, erhalten ${start.status}`)
    }
    await verzoegerung(50)

    const startfehlerAntwort = await fetch(`${basisUrl}/api/startfehler`)
    const startfehlerListe = await startfehlerAntwort.json()
    const eintrag = startfehlerListe.find((e) => e.laufId === laufId)
    if (startfehlerAntwort.status !== 200 || eintrag === undefined) {
      befunde.push(`AK6: erwartet einen Eintrag für '${laufId}' unter GET /api/startfehler, erhalten ${JSON.stringify(startfehlerListe)}`)
    }

    // Server übersteht den Wurf: ein weiterer, unabhängiger Request muss weiterhin bedient werden.
    const retry = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f10-ak6-weiterhin-${randomUUID()}`, auftragIdAk6)) })
    if (retry.status !== 202) {
      befunde.push(`AK6: Server nach Wurf nicht mehr erreichbar/funktionsfähig, Folge-POST erwartet 202, erhalten ${retry.status}`)
    }

    if (befunde.length === 0) {
      console.log('✓ AK6: werfende Attrappe beendet den Server nicht; GET /api/startfehler zeigt den Eintrag, ein Folge-Request wird weiterhin bedient.')
    }
  } finally {
    await schliessen()
  }
}

// ─── (f) F11 WS-2 AK5: verbotenes Startvorlage-Feld und freie werkzeugsatz-Liste → 400 ──
{
  const basisVerzeichnisF11Ak5 = 'kontrollzustand-test-f11-ak5'
  const auftragIdF11Ak5 = registriereTestAuftrag(basisVerzeichnisF11Ak5)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisF11Ak5 })
  try {
    for (const feld of VERBOTENE_STARTVORLAGE_FELDER) {
      const body = { ...gueltigerStartauftrag(`check-f11-ak5-${randomUUID()}`, auftragIdF11Ak5), [feld]: 'verboten' }
      const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
      if (antwort.status !== 400) {
        befunde.push(`F11 AK5: Body mit Startvorlage-Feld '${feld}' erwartet 400, erhalten ${antwort.status}`)
      }
    }
    const freieListe = { ...gueltigerStartauftrag(`check-f11-ak5-liste-${randomUUID()}`, auftragIdF11Ak5) }
    freieListe.aufrufEingaben = { ...freieListe.aufrufEingaben, werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Bash'] } }
    const antwortListe = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(freieListe) })
    if (antwortListe.status !== 400) {
      befunde.push(`F11 AK5: Body mit freier 'aufrufEingaben.werkzeugsatz'-Liste erwartet 400, erhalten ${antwortListe.status}`)
    }
    if (befunde.length === 0) {
      console.log(`✓ F11 AK5: alle ${VERBOTENE_STARTVORLAGE_FELDER.size} Startvorlage-Felder plus eine freie 'aufrufEingaben.werkzeugsatz'-Liste werden mit 400 abgelehnt.`)
    }
  } finally {
    await schliessen()
  }
}

// ─── (g) F11 WS-2 AK6: verbotenes 'inhalt', unsicherer Pfad, fehlende Datei → je 400 ──
{
  const basisVerzeichnisF11Ak6 = 'kontrollzustand-test-f11-ak6'
  const auftragIdF11Ak6 = registriereTestAuftrag(basisVerzeichnisF11Ak6)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisF11Ak6 })
  try {
    const mitInhalt = {
      ...gueltigerStartauftrag(`check-f11-ak6-inhalt-${randomUUID()}`, auftragIdF11Ak6),
      anfragen: [{ pfad: 'package.json', frage: 'x', begruendung: 'x', inhalt: 'sollte verboten sein' }],
    }
    const antwortInhalt = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitInhalt) })
    if (antwortInhalt.status !== 400) {
      befunde.push(`F11 AK6: Anfrage mit 'inhalt' erwartet 400, erhalten ${antwortInhalt.status}`)
    }

    for (const unsichererPfad of ['../ausserhalb.txt', 'C:\\Windows\\win.ini', '/etc/passwd']) {
      const mitUnsicheremPfad = {
        ...gueltigerStartauftrag(`check-f11-ak6-pfad-${randomUUID()}`, auftragIdF11Ak6),
        anfragen: [{ pfad: unsichererPfad, frage: 'x', begruendung: 'x' }],
      }
      const antwortPfad = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitUnsicheremPfad) })
      if (antwortPfad.status !== 400) {
        befunde.push(`F11 AK6: unsicherer Anfrage-Pfad '${unsichererPfad}' erwartet 400, erhalten ${antwortPfad.status}`)
      }
    }

    const mitFehlenderDatei = {
      ...gueltigerStartauftrag(`check-f11-ak6-fehlend-${randomUUID()}`, auftragIdF11Ak6),
      anfragen: [{ pfad: 'diese-datei-gibt-es-nicht.md', frage: 'x', begruendung: 'x' }],
    }
    const antwortFehlend = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitFehlenderDatei) })
    if (antwortFehlend.status !== 400) {
      befunde.push(`F11 AK6: fehlende Anfrage-Datei erwartet 400, erhalten ${antwortFehlend.status}`)
    }

    if (befunde.length === 0) {
      console.log("✓ F11 AK6: verbotenes 'inhalt', drei unsichere Pfade und eine fehlende Datei werden je mit 400 abgelehnt.")
    }
  } finally {
    await schliessen()
  }
}

// ─── (h) F11 WS-2 AK7 (D13): zweiter Start während laufender Lauf → 409, unabhängig von der laufId ──
{
  let laufendeAufrufe = 0
  const fuehreAufgabeDurchFn = async () => {
    laufendeAufrufe += 1
    await verzoegerung(60)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const basisVerzeichnisF11Ak7 = 'kontrollzustand-test-f11-ak7'
  const auftragIdF11Ak7 = registriereTestAuftrag(basisVerzeichnisF11Ak7)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: basisVerzeichnisF11Ak7, fuehreAufgabeDurchFn })
  try {
    const erste = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-a-${randomUUID()}`, auftragIdF11Ak7)) })
    // Zweiter Startauftrag mit einer ANDEREN laufId, unmittelbar danach, während der erste Lauf noch aktiv ist (D13, nicht laufId-Kollision).
    const zweite = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-b-${randomUUID()}`, auftragIdF11Ak7)) })
    const zweiteBody = await zweite.json()
    if (erste.status !== 202 || zweite.status !== 409 || !zweiteBody.grund.includes('D13') || laufendeAufrufe !== 1) {
      befunde.push(
        `F11 AK7: zweiter Start mit anderer laufId während laufendem Lauf erwartet erste=202/zweite=409 mit 'D13' im Grund und genau einen Aufruf, erhalten ${JSON.stringify({ ersteStatus: erste.status, zweiteStatus: zweite.status, grund: zweiteBody.grund, laufendeAufrufe })}`
      )
    }

    await verzoegerung(90)
    const dritte = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-c-${randomUUID()}`, auftragIdF11Ak7)) })
    if (dritte.status !== 202) {
      befunde.push(`F11 AK7: nach Rückkehr des ersten Laufs erwartet ein dritter Start 202, erhalten ${dritte.status}`)
    }

    if (befunde.length === 0) {
      console.log("✓ F11 AK7 (D13): ein zweiter Start mit ANDERER laufId während eines laufenden Laufs bekommt 409 ('D13' im Grund), nach dessen Rückkehr gelingt ein neuer Start.")
    }
  } finally {
    await schliessen()
  }
}

// ─── (i) F11 WS-2 AK7 (D13): ein verwaister, unabgeschlossener Lauf aus einer FRÜHEREN Serverinstanz blockiert eine neue NICHT (F-128) ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f11-ak7-verwaist'
  const verwaisteLaufId = `check-f11-ak7-verwaist-${randomUUID()}`
  // Simuliert einen Lauf, der von einer früheren, längst beendeten Serverinstanz gestartet wurde und
  // nie zurückgekehrt ist (z. B. Serverabsturz) — kein laufAktiv-Zustand kann davon wissen, weil eine
  // NEUE erzeugeRequestHandler-Instanz ihr laufAktiv immer frisch mit false initialisiert (D13 ist NIE
  // aus kontrollzustand/ abgeleitet, F-128).
  mkdirSync(join(basisVerzeichnis, verwaisteLaufId), { recursive: true })
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  const fuehreAufgabeDurchFn = async (id) => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-verwaist-neu-${randomUUID()}`, auftragId)) })
    if (antwort.status !== 202) {
      befunde.push(`F11 AK7(D13)-Verwaist: ein verwaister Lauf aus kontrollzustand/ sollte einen neuen Start (andere laufId) NICHT blockieren, erwartet 202, erhalten ${antwort.status}`)
    } else {
      console.log('✓ F11 AK7 (D13): ein verwaister, unabgeschlossener Lauf aus kontrollzustand/ (frühere Serverinstanz) blockiert einen neuen Start nicht (F-128).')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (j) F12 AK1: nur Läufe mit mindestens einer Wirkungsmarke erscheinen in GET /api/laeufe, eine reine Lineage-Kette nicht ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ak1'
  const laufIdEcht = `check-f12-ak1-echt-${randomUUID()}`
  const artefaktIdLineage = `check-f12-ak1-lineage-${randomUUID()}`
  schreibeWirkungsmarke(laufIdEcht, F12_PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
  registriereKernArtefakt(artefaktIdLineage, F12_PROFIL_REFERENZ, { quelle: 'check-f10-leitstand' }, { hinweis: 'keine Wirkungsmarke' }, [], {
    basisVerzeichnis,
    schreiber: () => {},
  })

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const laeufe = await (await fetch(`${basisUrl}/api/laeufe`)).json()
    const laufIds = laeufe.map((l) => l.laufId)
    if (!laufIds.includes(laufIdEcht)) {
      befunde.push(`F12 AK1: echter Lauf '${laufIdEcht}' (Wirkungsmarke) fehlt in GET /api/laeufe, erhalten laufIds=${JSON.stringify(laufIds)}`)
    }
    if (laufIds.includes(`lineage-${artefaktIdLineage}`)) {
      befunde.push(`F12 AK1: reine Lineage-Kette 'lineage-${artefaktIdLineage}' (keine Wirkungsmarke) erscheint fälschlich in GET /api/laeufe`)
    }
    if (befunde.length === 0) {
      console.log('✓ F12 AK1: nur Läufe mit mindestens einer Wirkungsmarke erscheinen in GET /api/laeufe, eine reine Lineage-Kette (F2, registriereKernArtefakt) nicht.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (k) F12 AK2: GET /api/laeufe ohne checkpoints-Array, GET /api/laeufe/<laufId> mit voller Projektion, unbekannte laufId → 404 ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ak2'
  const laufId = `check-f12-ak2-${randomUUID()}`
  schreibeWirkungsmarke(laufId, F12_PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const laeufe = await (await fetch(`${basisUrl}/api/laeufe`)).json()
    const kopf = laeufe.find((l) => l.laufId === laufId)
    if (kopf === undefined || 'checkpoints' in kopf) {
      befunde.push(`F12 AK2: GET /api/laeufe-Eintrag für '${laufId}' fehlt oder enthält noch 'checkpoints', erhalten ${JSON.stringify(kopf)}`)
    }

    const detailAntwort = await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}`)
    const detail = await detailAntwort.json()
    if (detailAntwort.status !== 200 || !Array.isArray(detail.checkpoints) || detail.checkpoints.length !== 1 || detail.laufStatus === undefined) {
      befunde.push(`F12 AK2: GET /api/laeufe/<laufId> erwartet 200 mit einem Checkpoint und laufStatus, erhalten status=${detailAntwort.status}, body=${JSON.stringify(detail)}`)
    }

    const unbekannteAntwort = await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(`check-f12-ak2-unbekannt-${randomUUID()}`)}`)
    if (unbekannteAntwort.status !== 404) {
      befunde.push(`F12 AK2: GET /api/laeufe/<unbekannte laufId> erwartet 404, erhalten ${unbekannteAntwort.status}`)
    }

    if (befunde.length === 0) {
      console.log('✓ F12 AK2: GET /api/laeufe ist schlank (kein checkpoints-Array), GET /api/laeufe/<laufId> liefert die volle Projektion, unbekannte laufId → 404.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (l) F12 AK3(c): Kopfdaten/Detail zeigen payload.erstellt_am, null bei fehlendem Feld — nie statSync-mtime ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ak3'
  const laufId = `check-f12-ak3-${randomUUID()}`
  const { pfad: ersterPfad } = schreibeWirkungsmarke(laufId, F12_PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
  const ersterInhalt = JSON.parse(readFileSync(ersterPfad, 'utf8'))
  const ersterErstelltAm = ersterInhalt.payload.erstellt_am

  // Sequenz 2 direkt ins Kettenverzeichnis geschrieben, OHNE erstellt_am — simuliert Bestandsdaten aus
  // der Zeit vor E-M2-5 (additiv, optional). Muster wie checkpoint-store.test.ts ("unbekannter typ").
  const payloadOhneHash = { lauf_id: laufId, sequenz: 2, vorgaenger_hash: ersterInhalt.payload.selbst_hash, art: 'terminal', ergebnis: 'ERFOLGREICH' }
  const eintragOhneHash = { schema_version: 1, typ: 'wirkungsmarke', profil_referenz: F12_PROFIL_REFERENZ, payload: payloadOhneHash }
  const selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))
  writeFileSync(
    join(basisVerzeichnis, laufId, 'checkpoints', `2-${selbstHash}.json`),
    kanonischesJson({ ...eintragOhneHash, payload: { ...payloadOhneHash, selbst_hash: selbstHash } })
  )

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const laeufe = await (await fetch(`${basisUrl}/api/laeufe`)).json()
    const kopf = laeufe.find((l) => l.laufId === laufId)
    if (kopf?.zeitpunkt !== null) {
      befunde.push(`F12 AK3(c): Kopfdaten-zeitpunkt erwartet null (letzter Eintrag ohne erstellt_am, Bestandsdaten-Simulation), erhalten ${JSON.stringify(kopf?.zeitpunkt)}`)
    }

    const detail = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}`)).json()
    const cp1 = detail.checkpoints?.find((cp) => cp.sequenz === 1)
    const cp2 = detail.checkpoints?.find((cp) => cp.sequenz === 2)
    if (cp1?.zeitstempel !== ersterErstelltAm) {
      befunde.push(`F12 AK3(c): Detail-zeitstempel für sequenz 1 erwartet payload.erstellt_am (${ersterErstelltAm}), erhalten ${JSON.stringify(cp1?.zeitstempel)}`)
    }
    if (cp2?.zeitstempel !== null) {
      befunde.push(`F12 AK3(c): Detail-zeitstempel für sequenz 2 (ohne erstellt_am) erwartet null, erhalten ${JSON.stringify(cp2?.zeitstempel)} — nie statSync-mtime als Ersatzwert`)
    }

    if (befunde.length === 0) {
      console.log('✓ F12 AK3(c): Kopfdaten/Detail zeigen payload.erstellt_am, null bei fehlendem Feld (Bestandsdaten) — nie statSync-mtime.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (m) F12 WS-1 Advisor-Ergänzung: GET /api/laeufe/<laufId> mit unzulässigen Zeichen (nach decodeURIComponent) → 400, kein Pfad-Escape ──
{
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f12-pfad' })
  try {
    for (const unsichereLaufId of ['../ausserhalb', 'a/b', 'a\\b']) {
      const antwort = await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(unsichereLaufId)}`)
      if (antwort.status !== 400) {
        befunde.push(`F12 Pfadsicherheit: GET /api/laeufe/<laufId> mit '${unsichereLaufId}' erwartet 400, erhalten ${antwort.status}`)
      }
    }
    if (befunde.length === 0) {
      console.log('✓ F12 Pfadsicherheit: GET /api/laeufe/<laufId> mit unzulässigen Zeichen (nach decodeURIComponent) wird mit 400 abgelehnt, nie als Dateisystempfad aufgelöst.')
    }
  } finally {
    await schliessen()
  }
}

// ─── (n) F12 WS-2 AK4: POST /api/auftraege legt über registriereAuftrag an (201, echte Version unter auftrag-<auftragId>), GET /api/auftraege listet ihn danach ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ak4'
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const antwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'Testtitel AK4', auftragstext: 'Testauftragstext AK4' }),
    })
    const koerper = await antwort.json()
    if (antwort.status !== 201 || typeof koerper.auftragId !== 'string' || koerper.auftragId.length === 0) {
      befunde.push(`F12 AK4: POST /api/auftraege erwartet 201 mit nicht-leerer 'auftragId', erhalten status=${antwort.status}, body=${JSON.stringify(koerper)}`)
    } else {
      const version = ladeArtefaktVersion(`auftrag-${koerper.auftragId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (version === null || version.daten.titel !== 'Testtitel AK4' || version.daten.auftragstext !== 'Testauftragstext AK4') {
        befunde.push(`F12 AK4: registriereAuftrag hat kein reales Artefakt mit den gesendeten Feldern angelegt, erhalten ${JSON.stringify(version)}`)
      }

      const liste = await (await fetch(`${basisUrl}/api/auftraege`)).json()
      const eintrag = liste.find((e) => e.auftragId === koerper.auftragId)
      if (eintrag === undefined || eintrag.titel !== 'Testtitel AK4' || 'auftragstext' in eintrag) {
        befunde.push(`F12 AK4: GET /api/auftraege sollte den angelegten Auftrag mit Titel, ohne auftragstext, listen, erhalten ${JSON.stringify(eintrag)}`)
      }
    }

    const rotFall = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: '', auftragstext: 'x' }) })
    if (rotFall.status !== 400) {
      befunde.push(`F12 AK4: POST /api/auftraege mit leerem 'titel' erwartet 400, erhalten ${rotFall.status}`)
    }

    if (befunde.length === 0) {
      console.log("✓ F12 AK4: POST /api/auftraege legt über registriereAuftrag real an (201), GET /api/auftraege listet ihn (Kopfdaten ohne auftragstext), leerer 'titel' → 400.")
    }
  } finally {
    await schliessen()
  }
}

// ─── (o) F12 WS-2 AK6: GET /api/startvorlage/werkzeugsaetze liefert nur name/modus/erlaubte_werkzeuge — nie art/werkzeugStartziel/berechtigungskontext/profilReferenz ──
{
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f12-ak6' })
  try {
    const antwort = await fetch(`${basisUrl}/api/startvorlage/werkzeugsaetze`)
    const liste = await antwort.json()
    const verbotenerFund = liste.some((w) => 'art' in w || 'werkzeugStartziel' in w || 'berechtigungskontext' in w || 'profilReferenz' in w)
    const erlaubteFelder = liste.every((w) => Object.keys(w).sort().join(',') === 'erlaubte_werkzeuge,modus,name')
    if (antwort.status !== 200 || liste.length === 0 || verbotenerFund || !erlaubteFelder) {
      befunde.push(`F12 AK6: GET /api/startvorlage/werkzeugsaetze erwartet 200 mit ausschließlich name/modus/erlaubte_werkzeuge je Eintrag, erhalten status=${antwort.status}, body=${JSON.stringify(liste)}`)
    } else {
      console.log('✓ F12 AK6: GET /api/startvorlage/werkzeugsaetze liefert ausschließlich name/modus/erlaubte_werkzeuge, nie art/werkzeugStartziel/berechtigungskontext/profilReferenz.')
    }
  } finally {
    await schliessen()
  }
}

// ─── (p) F-145: der Fire-and-forget-Aufruf reicht optionen strukturell an fuehreAufgabeDurchFn durch ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f145-optionen'
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  let empfangeneOptionen
  const fuehreAufgabeDurchFn = async (laufId, profilReferenz, eingaben, optionen) => {
    empfangeneOptionen = optionen
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-f145-${randomUUID()}`
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    await verzoegerung(30)

    // Vor dem F-145-Fix wurde fuehreAufgabeDurchFn ohne viertes Argument aufgerufen — empfangeneOptionen
    // wäre hier `undefined` geblieben, obwohl der Testserver mit basisVerzeichnis auf ein
    // Nicht-Default-Verzeichnis übergewiesen wurde (der eigentliche Lauf wäre real auf den Default
    // 'kontrollzustand' zurückgefallen). Nach dem Fix trägt optionen.basisVerzeichnis denselben Wert,
    // mit dem erzeugeRequestHandler selbst aufgerufen wurde.
    if (antwort.status !== 202 || empfangeneOptionen?.basisVerzeichnis !== basisVerzeichnis) {
      befunde.push(
        `F-145: fuehreAufgabeDurchFn sollte optionen.basisVerzeichnis '${basisVerzeichnis}' erhalten (dasselbe, mit dem der Server konfiguriert wurde), erhalten status=${antwort.status}, optionen=${JSON.stringify(empfangeneOptionen)}`
      )
    } else {
      console.log("✓ F-145: der Fire-and-forget-Aufruf reicht optionen (inkl. basisVerzeichnis) strukturell an fuehreAufgabeDurchFn durch — keine stille Divergenz bei Nicht-Default-basisVerzeichnis mehr.")
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (q) F14 WS-4 (AK7, Teil 2): POST /api/laeufe/<laufId>/abbrechen löst den aktiven Lauf aus ──
{
  let empfangenesAbbruchSignal
  const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, _eingaben, optionen) => {
    empfangenesAbbruchSignal = optionen?.abbruchSignal
    await verzoegerung(120)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const basisVerzeichnis = 'kontrollzustand-test-f14-ws4-abbrechen'
  const auftragId = registriereTestAuftrag(basisVerzeichnis)
  const laufId = `check-f14-ws4-abbrechen-${randomUUID()}`
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    // (q1) unbekannte/inaktive laufId → 404, kein aktiver Lauf betroffen.
    const antwortUnbekannt = await fetch(`${basisUrl}/api/laeufe/${laufId}/abbrechen`, { method: 'POST' })
    if (antwortUnbekannt.status !== 404) {
      befunde.push(`F14 WS-4 AK7: Abbruch einer unbekannten/inaktiven laufId erwartet 404, erhalten ${antwortUnbekannt.status}`)
    }

    const start = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    if (start.status !== 202) {
      befunde.push(`F14 WS-4 AK7: Laufstart erwartet 202, erhalten ${start.status}`)
    }
    await verzoegerung(20)

    // QA-Befund: eine reale Checkpoint-Kette für laufId (NACH der Reservierung angelegt, sonst würde
    // laufIdBelegt() den Start oben mit 409 ablehnen) und eine zweite, unabhängige laufId — Vorbedingung
    // für den 'aktiv'-Nachweis unten, da GET /api/laeufe/<laufId> ohne echtes Verzeichnis 404 liefert,
    // bevor es je das 'aktiv'-Feld baut.
    schreibeWirkungsmarke(laufId, F12_PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
    const andereLaufId = `check-f14-ws4-abbrechen-andere-${randomUUID()}`
    schreibeWirkungsmarke(andereLaufId, F12_PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })

    // (q2) laufAktivLaufId != gesuchte laufId → 404, unabhängig davon, dass EIN Lauf aktiv ist.
    const antwortFalscheId = await fetch(`${basisUrl}/api/laeufe/eine-andere-laufid/abbrechen`, { method: 'POST' })
    if (antwortFalscheId.status !== 404) {
      befunde.push(`F14 WS-4 AK7: Abbruch einer ANDEREN laufId während eines laufenden Laufs erwartet 404, erhalten ${antwortFalscheId.status}`)
    }

    // QA-Befund (F-172): 'aktiv' bezieht sich auf DIESE konkrete laufId, nicht auf "irgendein Lauf
    // aktiv" — die aktive laufId muss true zeigen, eine andere, ebenfalls existierende laufId false.
    const detailAktiv = await (await fetch(`${basisUrl}/api/laeufe/${laufId}`)).json()
    const detailAndere = await (await fetch(`${basisUrl}/api/laeufe/${andereLaufId}`)).json()
    if (detailAktiv.aktiv !== true || detailAndere.aktiv !== false) {
      befunde.push(
        `F14 WS-4 F-172: 'aktiv' sollte für die laufende laufId true und für eine ANDERE, existierende laufId false sein, erhalten ${JSON.stringify({ aktiv: detailAktiv.aktiv, andereAktiv: detailAndere.aktiv })}`
      )
    } else {
      console.log("✓ F14 WS-4 F-172: 'aktiv' unterscheidet korrekt DIESE laufId von einer anderen, ebenfalls existierenden laufId — nicht nur 'irgendein Lauf aktiv'.")
    }

    // (q3) Grünfall: laufAktivLaufId trifft → 202 sofort, ohne auf das Laufende zu warten, UND der beim
    // Start angelegte AbortController wird real ausgelöst (empfangenesAbbruchSignal.aborted === true).
    const antwortAbbruch = await fetch(`${basisUrl}/api/laeufe/${laufId}/abbrechen`, { method: 'POST' })
    if (antwortAbbruch.status !== 202) {
      befunde.push(`F14 WS-4 AK7: Abbruch des aktiven Laufs erwartet 202, erhalten ${antwortAbbruch.status}`)
    } else if (empfangenesAbbruchSignal?.aborted !== true) {
      befunde.push('F14 WS-4 AK7: der beim Laufstart angelegte AbortController wurde durch den Abbruch-Endpunkt nicht real ausgelöst (signal.aborted sollte true sein)')
    }

    // QA-Befund: ein zweiter Abbruch-Klick auf denselben, noch aktiven Lauf darf nicht abstürzen —
    // AbortController.abort() ist idempotent (WHATWG-Spezifikation), der zweite Aufruf bekommt
    // dasselbe 202 wie der erste, kein 500.
    const antwortDoppelklick = await fetch(`${basisUrl}/api/laeufe/${laufId}/abbrechen`, { method: 'POST' })
    if (antwortDoppelklick.status !== 202) {
      befunde.push(`F14 WS-4 AK7: ein zweiter Abbruch-Klick auf denselben, noch aktiven Lauf erwartet ebenfalls 202 (idempotent), erhalten ${antwortDoppelklick.status}`)
    }

    if (befunde.length === 0) {
      console.log('✓ F14 WS-4 AK7: unbekannte/andere laufId → 404, Abbruch der aktiven laufId → 202 mit real ausgelöstem AbortController, Doppelklick bleibt idempotent (202, kein Absturz).')
    }

    // Nach Laufende (mock-Verzögerung 120ms, längst abgelaufen): laufAktiv wurde im .then zurückgesetzt —
    // dieselbe laufId zeigt jetzt 'aktiv:false' (QA-Befund, F-172 vollständig belegt, nicht nur der true-Fall).
    await verzoegerung(150)
    const detailNachEnde = await (await fetch(`${basisUrl}/api/laeufe/${laufId}`)).json()
    if (detailNachEnde.aktiv !== false) {
      befunde.push(`F14 WS-4 F-172: nach Laufende sollte 'aktiv' auf false zurückfallen, erhalten ${detailNachEnde.aktiv}`)
    } else {
      console.log("✓ F14 WS-4 F-172: nach Laufende zeigt dieselbe laufId 'aktiv:false' — laufAktiv wurde real zurückgesetzt.")
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (r) F14 WS-4 (F-177): zeitgrenzeMs aus der Startvorlage landet unverändert in den optionen des Laufs ──
{
  // Reviewer-Befund: Datei-Erzeugung UND Serverstart liegen jetzt selbst im try — ein Wurf an
  // irgendeiner Stelle (auch vor starteTestserver) lässt weder die Testvorlage noch basisVerzeichnis
  // zurück (anders als zuvor, wo beides vor dem try lag und bei einem frühen Wurf nie geräumt worden wäre).
  const testStartvorlagePfad = 'startvorlagen/test-f14-ws4-zeitgrenze.json'
  const basisVerzeichnis = 'kontrollzustand-test-f14-ws4-zeitgrenze'
  let schliessen = async () => {}
  try {
    const testVorlage = JSON.parse(readFileSync('startvorlagen/beispielprojekt.json', 'utf-8'))
    testVorlage.zeitgrenzeMs = 42000
    writeFileSync(testStartvorlagePfad, JSON.stringify(testVorlage))

    let empfangeneOptionen
    const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, _eingaben, optionen) => {
      empfangeneOptionen = optionen
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    const auftragId = registriereTestAuftrag(basisVerzeichnis)
    const testserver = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn, startvorlagePfad: testStartvorlagePfad })
    schliessen = testserver.schliessen

    const laufId = `check-f14-ws4-zeitgrenze-${randomUUID()}`
    const antwort = await fetch(`${testserver.basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
    await verzoegerung(30)
    if (antwort.status !== 202 || empfangeneOptionen?.zeitgrenzeMs !== 42000) {
      befunde.push(`F14 WS-4 F-177: erwartet 202 und optionen.zeitgrenzeMs 42000 aus der Startvorlage, erhalten status=${antwort.status}, zeitgrenzeMs=${empfangeneOptionen?.zeitgrenzeMs}`)
    } else {
      console.log('✓ F14 WS-4 F-177: zeitgrenzeMs aus der Startvorlage landet unverändert in den AusfuehrungsOptionen des Laufs.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    rmSync(testStartvorlagePfad, { force: true })
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
