#!/usr/bin/env python3
"""
parse_formazioni.py
Estrae formazioni, panchine, infortunati, squalificati, diffidati, ballottaggi
dal file HTML "Probabili formazioni Serie A.html" salvato dal sito.

Output: data/formazioni_seriea.json
"""
import json
import re
import sys
from pathlib import Path
from datetime import date

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
HTML_FILE = ROOT / "Probabili formazioni Serie A.html"
OUT_FILE = ROOT / "data" / "formazioni_seriea.json"

# Mappa delle sigle ruolo usate dal sito → ruolo canonico
ROLE_MAP = {
    "p": "P",
    "d": "D",
    "c": "C",
    "a": "A",
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def estrai_nome_da_link(a_tag):
    """Il nome è dentro <span> nel <a class='player-name player-link'>."""
    if not a_tag:
        return None
    span = a_tag.find("span")
    if span:
        return span.get_text(strip=True)
    return a_tag.get_text(strip=True)


def estrai_ruolo_da_li(li):
    """Ogni <li class='player-item pill'> ha <span class='role' data-value='p'>."""
    role_span = li.find("span", class_="role")
    if role_span and role_span.get("data-value"):
        r = role_span["data-value"].strip().lower()
        return ROLE_MAP.get(r, "?")
    return "?"


def parse_formazione_team(team_card):
    """Estrae una squadra da un blocco <div class='card team-card'>."""
    header = team_card.find("header")
    nome = header.find(class_="team-name").get_text(strip=True)
    modulo = header.find(class_="team-formation").get_text(strip=True)

    # Titolari
    titolari_ul = team_card.find("ul", class_="player-list starters")
    titolari = []
    if titolari_ul:
        for li in titolari_ul.find_all("li", class_="player-item"):
            a = li.find("a", class_="player-name")
            nome_g = estrai_nome_da_link(a)
            if nome_g:
                titolari.append({"nome": nome_g, "ruolo": estrai_ruolo_da_li(li)})

    # Panchina
    panchina_ul = team_card.find("ul", class_="player-list reserves")
    panchina = []
    if panchina_ul:
        for li in panchina_ul.find_all("li", class_="player-item"):
            a = li.find("a", class_="player-name")
            nome_g = estrai_nome_da_link(a)
            if nome_g:
                panchina.append({"nome": nome_g, "ruolo": estrai_ruolo_da_li(li)})

    return {
        "nome": nome,
        "modulo": modulo,
        "titolari": titolari,
        "panchina": panchina,
    }


def parse_indisponibili(match_li):
    """Estrae infortunati, squalificati, diffidati, ballottaggi dal blocco
    <section class='mt-4 match-graphs burn'> di ogni match."""
    risultato = {
        "infortunati": [],
        "squalificati": [],
        "diffidati": [],
        "ballottaggi": [],
        "in_dubbio": [],
    }

    # Trova i due <div class='card team-card dark col mt-4'> che contengono
    # i nomi delle squadre, nell'ordine casa/trasferta
    cards = match_li.find_all("div", class_="card team-card dark col mt-4")
    if len(cards) < 2:
        return risultato

    nomi_squadre = []
    for c in cards[:2]:
        h = c.find("header")
        if h:
            tn = h.find(class_="team-name")
            if tn:
                nomi_squadre.append(tn.get_text(strip=True))

    # Sezione "Dettaglio calciatori"
    graphs = match_li.find("section", class_="match-graphs")
    if not graphs:
        return risultato

    # Mappa section → chiave output
    sezioni = [
        ("injureds", "infortunati"),
        ("suspendeds", "squalificati"),
        ("cautioneds", "diffidati"),
        ("ballots", "ballottaggi"),
        ("dubts", "in_dubbio"),
    ]

    for css_class, chiave in sezioni:
        sec = graphs.find("section", class_=css_class)
        if not sec:
            continue

        # Ogni sezione ha N <div class="content"> (uno per squadra)
        contents = sec.find_all("div", class_="content", recursive=False)
        for idx, content in enumerate(contents):
            squadra = nomi_squadre[idx] if idx < len(nomi_squadre) else None
            if not squadra:
                continue

            # Ballottaggi: struttura diversa
            if chiave == "ballottaggi":
                ballots = content.find_all("div", class_="ballot")
                for b in ballots:
                    items = b.find_all("li", class_="dot")
                    giocatori = []
                    for it in items:
                        a = it.find("a", class_="player-name")
                        perc = it.find("strong", class_="percentage")
                        nome_g = estrai_nome_da_link(a)
                        if nome_g:
                            giocatori.append({
                                "nome": nome_g,
                                "percentuale": perc.get_text(strip=True) if perc else None,
                            })
                    if giocatori:
                        risultato["ballottaggi"].append({
                            "squadra": squadra,
                            "giocatori": giocatori,
                        })
                continue

            # Infortunati / squalificati / diffidati / in dubbio: <ul><li>
            ul = content.find("ul")
            if not ul:
                continue
            for li in ul.find_all("li", recursive=False):
                a = li.find("a", class_="player-name")
                nome_g = estrai_nome_da_link(a)
                if not nome_g:
                    continue
                desc = li.find("p", class_="description")
                motivo = desc.get_text(strip=True) if desc else None
                risultato[chiave].append({
                    "squadra": squadra,
                    "nome": nome_g,
                    "motivo": motivo,
                })

    return risultato


def main():
    if not HTML_FILE.exists():
        print(f"❌ File non trovato: {HTML_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(HTML_FILE, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    # Trova la giornata dall'header
    giornata = None
    h1 = soup.find("h1")
    if h1:
        small = h1.find("small")
        if small:
            m = re.search(r"(\d+)", small.get_text())
            if m:
                giornata = int(m.group(1))

    formazioni = {}  # nome squadra → dati formazione

    match_items = soup.find_all("li", class_="match match-item")
    print(f"Trovati {len(match_items)} match nella pagina")

    indisponibili_per_squadra = {}  # nome squadra → dict con infortunati, ecc.

    for match_li in match_items:
        # --- Formazioni (titolari + panchina) ---
        for card in match_li.find_all("div", class_="card team-card dark col mt-4"):
            try:
                data = parse_formazione_team(card)
                if data["titolari"]:
                    formazioni[data["nome"]] = data
            except Exception as e:
                print(f"⚠️ Errore parsing formazione: {e}")

        # --- Indisponibili (infortunati/squalificati/diffidati/ballottaggi) ---
        try:
            ind = parse_indisponibili(match_li)
            for chiave in ("infortunati", "squalificati", "diffidati", "ballottaggi", "in_dubbio"):
                for item in ind.get(chiave, []):
                    sq = item["squadra"]
                    if sq not in indisponibili_per_squadra:
                        indisponibili_per_squadra[sq] = {
                            "infortunati": [], "squalificati": [],
                            "diffidati": [], "ballottaggi": [], "in_dubbio": [],
                        }
                    indisponibili_per_squadra[sq][chiave].append(item)
        except Exception as e:
            print(f"⚠️ Errore parsing indisponibili: {e}")

    # Fonde indisponibili dentro formazioni
    for sq, ind in indisponibili_per_squadra.items():
        if sq not in formazioni:
            formazioni[sq] = {
                "nome": sq, "modulo": None,
                "titolari": [], "panchina": [],
            }
        formazioni[sq]["indisponibili"] = ind["infortunati"]
        formazioni[sq]["squalificati"] = ind["squalificati"]
        formazioni[sq]["diffidati"] = ind["diffidati"]
        formazioni[sq]["ballottaggi"] = ind["ballottaggi"]
        formazioni[sq]["in_dubbio"] = ind["in_dubbio"]

    out = {
        "giornata": giornata,
        "aggiornato": date.today().isoformat(),
        "formazioni": formazioni,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"✅ Scritto {OUT_FILE}")
    print(f"   Squadre: {len(formazioni)}")
    tot_tit = sum(len(v.get("titolari", [])) for v in formazioni.values())
    tot_pan = sum(len(v.get("panchina", [])) for v in formazioni.values())
    print(f"   Titolari totali: {tot_tit}")
    print(f"   Panchina totale: {tot_pan}")
    for sq, v in sorted(formazioni.items()):
        n_ind = len(v.get("indisponibili", []))
        print(f"   • {sq:20s} modulo={v.get('modulo'):10s} "
              f"tit={len(v.get('titolari', [])):2d} "
              f"pan={len(v.get('panchina', [])):2d} "
              f"inf={n_ind}")


if __name__ == "__main__":
    main()