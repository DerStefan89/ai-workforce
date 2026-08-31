/**
 * Datei: src/invocation-policy/types.ts
 *
 * Zweck: Gemeinsame Typen für die Invocation Policy (F4). Eigene
 * Ereignisname-Union (kein Eingriff in F1Bs oder F3s Ereignisname-Union,
 * D1-Muster wie F2/F3 gegenüber F1/F1B).
 */

export interface BaselineReferenz {
  pfad: string
  commit_hash: string
  datei_hash: string
}

export interface BaselineEintrag {
  werkzeug_konfiguration: { pfad: string; hash: string }
  schutzskripte: { pfad: string; hash: string }[]
  erzeugt_am?: string
}

/** Ein real gemessenes Schutzskript: Pfad + Hash, pfadgebunden (F-047-Fix). */
export interface SchutzskriptEintrag {
  pfad: string
  hash: string
}

/** Real gemessener Ist-Zustand (Hash der Werkzeugkonfiguration + Pfad/Hash-Paare der referenzierten Schutzskripte) — einmal je pruefeStartfreigabe-Aufruf gemessen, an beide Startbedingungen weitergereicht (plan-v2 Delta 1, löst F11). schutzskripte ist pfadgebunden (F-047-Fix, löst den vorherigen mengenbasierten Vergleich ab, der einen Inhalts-Swap zwischen zwei Schutzskripten nicht erkannte). */
export interface IstZustand {
  werkzeug_konfiguration_hash: string
  schutzskripte: SchutzskriptEintrag[]
}

/** Übrige Bestandteile des Gültigkeitsschlüssels (E-188), die NICHT aus istZustand abgeleitet werden. */
export interface IstUebrigeFelder {
  werkzeug_version_deklariert: string
  berechtigungskontext: string
  arbeitsverzeichnis_pfad: string
}

export interface Gueltigkeitsschluessel {
  werkzeug_konfiguration_hash: string
  schutzskript_hashes: string[]
  werkzeug_version_deklariert: string
  berechtigungskontext: string
  arbeitsverzeichnis_pfad: string
}

export interface WirksamkeitsnachweisEintrag {
  gueltigkeitsschluessel: Gueltigkeitsschluessel
  rot_fall_beleg: string
  geprueft_am: string
}

export type BedingungErgebnis = { ok: true } | { ok: false; grund: string }

export type Starturteil =
  | { starturteil: 'FREIGEGEBEN'; berechtigungskontext: string; werkzeugsatz_begrenzung: 'DEKLARIERT' }
  | { starturteil: 'ABGELEHNT'; grund: string; werkzeugsatz_begrenzung: 'DEKLARIERT' }

export type Ereignisname = 'startfreigabe_geprueft' | 'startfreigabe_abgelehnt'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  grund?: string
}

export type Schreiber = (ereignis: Ereignis) => void
