"""
Reconcilia el calendario de fase de grupos con datos reales (ESPN public API).

Para cada partido de grupos en la tabla `matches` (seed 99100-99171), busca el
evento real por par de equipos y actualiza:
  - scheduled_at y venue (calendario real)
  - score + status si el partido real ya terminó (orientación-aware)

Uso:
  set SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
  python scripts/reconcile_calendar.py [--dry]

ESPN no requiere API key. Esto sirve de puente mientras el plan de
API-Football no incluya la temporada 2026.
"""
import json
import os
import sys
import unicodedata
import urllib.request
from datetime import date, timedelta

SUPA_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPA_KEY = os.environ["SUPABASE_SERVICE_KEY"]
DRY = "--dry" in sys.argv

# Fase de grupos real: 11-27 de junio 2026
START = date(2026, 6, 11)
END = date(2026, 6, 27)

ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={d}"

# Nombre ESPN (normalizado) -> code FIFA. Cubre variantes con/sin acentos y guiones.
NAME_TO_CODE = {
    "mexico": "MEX", "south africa": "RSA", "south korea": "KOR", "korea republic": "KOR",
    "czechia": "CZE", "czech republic": "CZE",
    "canada": "CAN", "bosnia herzegovina": "BIH", "bosnia and herzegovina": "BIH",
    "qatar": "QAT", "switzerland": "SUI",
    "brazil": "BRA", "morocco": "MAR", "haiti": "HAI", "scotland": "SCO",
    "united states": "USA", "usa": "USA", "paraguay": "PAR", "australia": "AUS",
    "turkey": "TUR", "turkiye": "TUR",
    "germany": "GER", "curacao": "CUW", "ivory coast": "CIV", "cote divoire": "CIV",
    "ecuador": "ECU",
    "netherlands": "NED", "japan": "JPN", "sweden": "SWE", "tunisia": "TUN",
    "belgium": "BEL", "egypt": "EGY", "iran": "IRN", "new zealand": "NZL",
    "spain": "ESP", "cape verde": "CPV", "cape verde islands": "CPV", "cabo verde": "CPV",
    "saudi arabia": "KSA", "uruguay": "URU",
    "france": "FRA", "senegal": "SEN", "iraq": "IRQ", "norway": "NOR",
    "argentina": "ARG", "algeria": "ALG", "austria": "AUT", "jordan": "JOR",
    "portugal": "POR", "dr congo": "COD", "congo dr": "COD",
    "democratic republic of congo": "COD",
    "uzbekistan": "UZB", "colombia": "COL",
    "england": "ENG", "croatia": "CRO", "ghana": "GHA", "panama": "PAN",
}


def norm(name: str) -> str:
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("-", " ").replace("&", "and").strip()


def to_code(name: str) -> str | None:
    return NAME_TO_CODE.get(norm(name))


def http_json(url: str, method: str = "GET", body: dict | None = None, headers: dict | None = None):
    req = urllib.request.Request(url, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=data) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def supa(path: str, method: str = "GET", body: dict | None = None, prefer: str | None = None):
    headers = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    if prefer:
        headers["Prefer"] = prefer
    return http_json(f"{SUPA_URL}/rest/v1/{path}", method, body, headers)


def fetch_espn_events():
    """Trae todos los eventos reales de la fase de grupos, indexados por par de equipos."""
    events = {}
    unmatched_names = set()
    d = START
    while d <= END:
        data = http_json(ESPN_URL.format(d=d.strftime("%Y%m%d")))
        for e in data.get("events", []):
            comp = e["competitions"][0]
            sides = {c["homeAway"]: c for c in comp["competitors"]}
            home, away = sides.get("home"), sides.get("away")
            if not home or not away:
                continue
            h_code = to_code(home["team"]["displayName"])
            a_code = to_code(away["team"]["displayName"])
            if not h_code:
                unmatched_names.add(home["team"]["displayName"])
            if not a_code:
                unmatched_names.add(away["team"]["displayName"])
            if not h_code or not a_code:
                continue
            venue = comp.get("venue") or {}
            vname = venue.get("fullName") or ""
            vcity = (venue.get("address") or {}).get("city") or ""
            events[frozenset((h_code, a_code))] = {
                "home_code": h_code,
                "away_code": a_code,
                "date": e["date"],  # ISO UTC
                "venue": f"{vname}, {vcity}" if vname and vcity else (vname or None),
                "completed": comp["status"]["type"]["completed"],
                "state": comp["status"]["type"]["state"],  # pre | in | post
                "home_score": int(home.get("score") or 0),
                "away_score": int(away.get("score") or 0),
            }
        d += timedelta(days=1)
    return events, unmatched_names


def main():
    espn, unmatched_names = fetch_espn_events()
    print(f"ESPN: {len(espn)} partidos reales de grupos encontrados")
    if unmatched_names:
        print(f"  ⚠ nombres ESPN sin mapear: {sorted(unmatched_names)}")

    ours = supa(
        "matches?stage=eq.group_stage&select=id,home_team_code,away_team_code,"
        "home_team,away_team,scheduled_at,venue,status,home_score,away_score"
    )
    print(f"DB:   {len(ours)} partidos de grupos en la app")

    updated = scored = skipped = missing = 0
    for m in ours:
        pair = frozenset((m["home_team_code"], m["away_team_code"]))
        ev = espn.get(pair)
        if not ev:
            missing += 1
            continue

        patch = {}
        # Calendario real (fecha/hora exacta y sede)
        if m["scheduled_at"][:16] != ev["date"][:16].replace("Z", ""):
            patch["scheduled_at"] = ev["date"]
        if ev["venue"] and ev["venue"] != m["venue"]:
            patch["venue"] = ev["venue"]

        # Resultado real solo si el partido terminó (orientación-aware)
        if ev["completed"]:
            flipped = ev["home_code"] != m["home_team_code"]
            hs = ev["away_score"] if flipped else ev["home_score"]
            as_ = ev["home_score"] if flipped else ev["away_score"]
            if m["status"] != "finished" or m["home_score"] != hs or m["away_score"] != as_:
                patch.update({"home_score": hs, "away_score": as_, "status": "finished", "minute": 90})
                scored += 1

        if not patch:
            skipped += 1
            continue

        label = f"{m['home_team']} vs {m['away_team']}"
        if DRY:
            print(f"  [dry] {label}: {patch}")
        else:
            supa(f"matches?id=eq.{m['id']}", "PATCH", patch, prefer="return=minimal")
            print(f"  ✓ {label}: " + ", ".join(patch.keys()))
        updated += 1

    print(f"\nResumen: {updated} actualizados ({scored} con resultado), {skipped} ya correctos, {missing} sin evento real (revisar)")


if __name__ == "__main__":
    main()
