/**
 * Datei: scripts/check-f10-leitstand.mjs
 *
 * Zweck: F10-WS-1-Gate (Leitstand-Schreibpfad). Prüft AK1 (reales Profil
 * unter profiles/, ProfilReferenz mit real aus dem Dateiinhalt berechnetem
 * Hash — sha256Hex aus src/checkpoint-store/index.ts, kein zweiter
 * Hasher), AK3 (Options-Sperre — ein AusfuehrungsOptionen-Feld oder ein
 * unbekanntes Feld im Body → 400), AK4 (Loopback-Bindung — Grep gegen den
 * bootstrap-Aufruf), AK5 (laufId-Eindeutigkeit — zwei unmittelbar
 * aufeinanderfolgende POSTs mit identischer laufId erzeugen genau einen
 * fuehreAufgabeDurch-Aufruf, der zweite POST bekommt 409) und AK6 (kein
 * Prozesstod — eine werfende fuehreAufgabeDurch-Attrappe belegt, dass der
 * Serverprozess den Wurf übersteht und GET /api/startfehler den Eintrag
 * zeigt). AK3/AK5/AK6 laufen real gegen einen laufenden Testserver
 * (erzeugeRequestHandler + createServer + fetch auf einem Ephemeral-Port),
 * nicht gegen eine zweite, von Hand nachgebaute Prüfung — die echte
 * fuehreAufgabeDurch-Abhängigkeit wird dafür per erzeugeRequestHandler-
 * Option durch eine Attrappe ersetzt (Muster wie F6as Starter).
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f10-leitstand.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { sha256Hex } from '../src/checkpoint-store/index.ts'
import { erzeugeRequestHandler, pruefeStartauftrag, VERBOTENE_OPTIONEN_FELDER } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F10-Leitstand-Check (WS-1) ===\n')

// ─── (a) AK1: reales Profil + ProfilReferenz mit real berechnetem Hash ──────
const PROFIL_PFAD = 'profiles/beispielprojekt.json'
let profilReferenz
if (!existsSync(PROFIL_PFAD)) {
  befunde.push(`AK1: ${PROFIL_PFAD} fehlt`)
} else {
  const inhalt = readFileSync(PROFIL_PFAD, 'utf-8')
  let obj
  try {
    obj = JSON.parse(inhalt)
  } catch (fehler) {
    befunde.push(`AK1: ${PROFIL_PFAD} ist kein gültiges JSON (${fehler.message})`)
  }
  if (obj !== undefined) {
    const pflichtfelder = ['projekt', 'version', 'gates', 'dod', 'werkzeuge', 'reviewRegeln']
    const fehlend = pflichtfelder.filter((feld) => !(feld in obj))
    if (fehlend.length > 0) {
      befunde.push(`AK1: ${PROFIL_PFAD} fehlen Pflichtfelder: ${fehlend.join(', ')}`)
    } else {
      profilReferenz = { pfad: PROFIL_PFAD, hash: sha256Hex(inhalt), version: obj.version }
      console.log(`✓ AK1: ${PROFIL_PFAD} valide, ProfilReferenz mit echtem Inhalts-Hash gebaut.`)
    }
  }
}
// Fallback, falls AK1 oben einen Befund gemeldet hat — AK3/AK5/AK6 unten sollen trotzdem laufen können.
profilReferenz ??= { pfad: PROFIL_PFAD, hash: 'a'.repeat(64), version: 1 }

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
  profilReferenz,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: [] } },
  werkzeugStartziel: ['node', '--version'],
  werkzeugVersionDeklariert: 'test',
  berechtigungskontext: 'test',
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
