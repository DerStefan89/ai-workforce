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
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'

const befunde = []
console.log('\n=== F10-Leitstand-Check (WS-1) ===\n')

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
const gueltigerStartauftrag = (laufId) => ({
  laufId,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragstext: 'Testauftragstext',
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f10-ak3' })
  try {
    for (const feld of VERBOTENE_OPTIONEN_FELDER) {
      const body = { ...gueltigerStartauftrag(`check-f10-ak3-${randomUUID()}`), [feld]: 'verboten' }
      const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
      if (antwort.status !== 400) {
        befunde.push(`AK3: Body mit AusfuehrungsOptionen-Feld '${feld}' erwartet 400, erhalten ${antwort.status}`)
      }
    }
    const unbekannt = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ ...gueltigerStartauftrag(`check-f10-ak3-unbekannt-${randomUUID()}`), unbekanntesFeld: 1 }),
    })
    if (unbekannt.status !== 400) {
      befunde.push(`AK3: Body mit unbekanntem Top-Level-Feld erwartet 400, erhalten ${unbekannt.status}`)
    }
    const pruefungDirekt = pruefeStartauftrag({ ...gueltigerStartauftrag('x'), schreiber: () => {} })
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

// ─── (c2) F11 AK2: Startauftrag ohne 'auftragstext' → 400 ──────────────────
{
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f10-f11' })
  try {
    const { auftragstext, ...ohneAuftragstext } = gueltigerStartauftrag(`check-f10-f11-${randomUUID()}`)
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(ohneAuftragstext) })
    const body = await antwort.json()
    if (antwort.status !== 400 || !body.grund.includes("Pflichtfeld 'auftragstext' fehlt")) {
      befunde.push(`F11 AK2: Startauftrag ohne 'auftragstext' erwartet 400 mit "Pflichtfeld 'auftragstext' fehlt", erhalten status=${antwort.status}, grund=${JSON.stringify(body.grund)}`)
    } else {
      console.log("✓ F11 AK2: Startauftrag ohne 'auftragstext' wird mit 400 abgelehnt (\"Pflichtfeld 'auftragstext' fehlt\").")
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f10-ak5', fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak5-${randomUUID()}`
    const body = JSON.stringify(gueltigerStartauftrag(laufId))
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
  const aufrufe = []
  const fuehreAufgabeDurchFn = async (id) => {
    aufrufe.push(id)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId)) })
    if (antwort.status !== 409 || aufrufe.length !== 0) {
      befunde.push(`AK5(a): laufId mit vorab existierendem Verzeichnis erwartet 409 ohne fuehreAufgabeDurch-Aufruf, erhalten status=${antwort.status}, aufrufe=${aufrufe.length}`)
    } else {
      console.log('✓ AK5(a): laufId mit bereits vorhandenem kontrollzustand/-Verzeichnis wird ohne fuehreAufgabeDurch-Aufruf mit 409 abgelehnt.')
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── (d3) AK5: Freigabe bei F5/F6a-Ablehnung (ok:false) — startfehler sichtbar, Retry ohne Checkpoint gelingt ──
{
  const fuehreAufgabeDurchFn = async () => ({
    ok: false,
    stufe: 'kontextpaket',
    ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'nicht-existent' },
  })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f10-ak5b', fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak5b-${randomUUID()}`
    const body = JSON.stringify(gueltigerStartauftrag(laufId))
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f10-ak6', fuehreAufgabeDurchFn })
  try {
    const laufId = `check-f10-ak6-${randomUUID()}`
    const start = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId)) })
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
    const retry = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f10-ak6-weiterhin-${randomUUID()}`)) })
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f11-ak5' })
  try {
    for (const feld of VERBOTENE_STARTVORLAGE_FELDER) {
      const body = { ...gueltigerStartauftrag(`check-f11-ak5-${randomUUID()}`), [feld]: 'verboten' }
      const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
      if (antwort.status !== 400) {
        befunde.push(`F11 AK5: Body mit Startvorlage-Feld '${feld}' erwartet 400, erhalten ${antwort.status}`)
      }
    }
    const freieListe = { ...gueltigerStartauftrag(`check-f11-ak5-liste-${randomUUID()}`) }
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f11-ak6' })
  try {
    const mitInhalt = {
      ...gueltigerStartauftrag(`check-f11-ak6-inhalt-${randomUUID()}`),
      anfragen: [{ pfad: 'package.json', frage: 'x', begruendung: 'x', inhalt: 'sollte verboten sein' }],
    }
    const antwortInhalt = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitInhalt) })
    if (antwortInhalt.status !== 400) {
      befunde.push(`F11 AK6: Anfrage mit 'inhalt' erwartet 400, erhalten ${antwortInhalt.status}`)
    }

    for (const unsichererPfad of ['../ausserhalb.txt', 'C:\\Windows\\win.ini', '/etc/passwd']) {
      const mitUnsicheremPfad = {
        ...gueltigerStartauftrag(`check-f11-ak6-pfad-${randomUUID()}`),
        anfragen: [{ pfad: unsichererPfad, frage: 'x', begruendung: 'x' }],
      }
      const antwortPfad = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitUnsicheremPfad) })
      if (antwortPfad.status !== 400) {
        befunde.push(`F11 AK6: unsicherer Anfrage-Pfad '${unsichererPfad}' erwartet 400, erhalten ${antwortPfad.status}`)
      }
    }

    const mitFehlenderDatei = {
      ...gueltigerStartauftrag(`check-f11-ak6-fehlend-${randomUUID()}`),
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
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis: 'kontrollzustand-test-f11-ak7', fuehreAufgabeDurchFn })
  try {
    const erste = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-a-${randomUUID()}`)) })
    // Zweiter Startauftrag mit einer ANDEREN laufId, unmittelbar danach, während der erste Lauf noch aktiv ist (D13, nicht laufId-Kollision).
    const zweite = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-b-${randomUUID()}`)) })
    const zweiteBody = await zweite.json()
    if (erste.status !== 202 || zweite.status !== 409 || !zweiteBody.grund.includes('D13') || laufendeAufrufe !== 1) {
      befunde.push(
        `F11 AK7: zweiter Start mit anderer laufId während laufendem Lauf erwartet erste=202/zweite=409 mit 'D13' im Grund und genau einen Aufruf, erhalten ${JSON.stringify({ ersteStatus: erste.status, zweiteStatus: zweite.status, grund: zweiteBody.grund, laufendeAufrufe })}`
      )
    }

    await verzoegerung(90)
    const dritte = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-c-${randomUUID()}`)) })
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
  const fuehreAufgabeDurchFn = async (id) => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(`check-f11-ak7-verwaist-neu-${randomUUID()}`)) })
    if (antwort.status !== 202) {
      befunde.push(`F11 AK7(D13)-Verwaist: ein verwaister Lauf aus kontrollzustand/ sollte einen neuen Start (andere laufId) NICHT blockieren, erwartet 202, erhalten ${antwort.status}`)
    } else {
      console.log('✓ F11 AK7 (D13): ein verwaister, unabgeschlossener Lauf aus kontrollzustand/ (frühere Serverinstanz) blockiert einen neuen Start nicht (F-128).')
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

const F12_PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

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
    rmSync(basisVerzeichnis, { recursive: true, force: true })
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
    rmSync(basisVerzeichnis, { recursive: true, force: true })
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
    rmSync(basisVerzeichnis, { recursive: true, force: true })
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
