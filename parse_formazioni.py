# parse_formazioni.py - Fase 1: Estrazione dati dal file HTML
import sys
import json
import os
import re
from bs4 import BeautifulSoup

FILE_DEFAULT = "Probabili formazioni Serie A.html"
FILE_OUTPUT = "dati_estratti.json"

def pulisci(testo):
    if not testo:
        return ""
    return re.sub(r"\s+", " ", testo).strip()

def estrai_giocatori_da_lista(ul):
    out = []
    if ul is None:
        return out
    for li in ul.select("li.player-item"):
        ruolo_el = li.select_one(".role")
        ruolo_raw = (ruolo_el.get("data-value", "") if ruolo_el else "").upper()
        mappa = {"P": "P", "D": "D", "C": "C", "A": "A"}
        ruolo = mappa.get(ruolo_raw, "")
        nome_el = li.select_one(".player-name span") or li.select_one(".player-name")
        nome = pulisci(nome_el.get_text()) if nome_el else ""
        if nome:
            out.append({"nome": nome, "ruolo": ruolo})
    return out

def estrai_indisponibili_da_section(section, tipo):
    risultato = [[], []]
    if section is None:
        return risultato
    contenuti = section.select("div.content")
    for idx, content in enumerate(contenuti[:2]):
        for li in content.select("ul li"):
            a = li.select_one("a.player-name") or li.select_one("a")
            nome_el = a.select_one("span") if a else None
            nome = pulisci(nome_el.get_text()) if nome_el else (pulisci(a.get_text()) if a else "")
            if not nome or nome.lower() in ("nessun calciatore",):
                continue
            desc_el = li.select_one("p.description")
            motivo = pulisci(desc_el.get_text()) if desc_el else ""
            if tipo == "suspendeds":
                motivo = motivo or "squalificato"
            if tipo == "dubts":
                motivo = motivo or "in dubbio"
            risultato[idx].append({
                "nome": nome,
                "motivo": motivo,
                "stato": tipo,
            })
    return risultato

def estrai_ballottaggi(li):
    ballottaggi = {"casa": [], "trasferta": []}
    for idx, (lato, content) in enumerate(zip(["casa", "trasferta"], li.select("section.ballots > div.content")[:2])):
        for ballot_div in content.select("div.ballot"):
            giocatori = []
            for li_ballot in ballot_div.select("ul.ballot-list li"):
                nome_el = li_ballot.select_one(".player-name span")
                perc_el = li_ballot.select_one(".percentage")
                if nome_el and perc_el:
                    giocatori.append({
                        "nome": pulisci(nome_el.get_text()),
                        "percentuale": pulisci(perc_el.get_text())
                    })
            if len(giocatori) >= 2:
                ballottaggi[lato].append({"giocatori": giocatori})
    return ballottaggi

def estrai_squadre(li):
    h2 = li.find("h2")
    if h2:
        nomi = [pulisci(a.get_text()) for a in h2.select("a.team-name")]
        if len(nomi) >= 2:
            return nomi[0], nomi[1]
    return None, None

def estrai_formazione_team(li, lato):
    team_div = li.select_one(f'div.pitch > div.team.team-{lato}')
    if team_div is None:
        return None, [], []
    modulo = team_div.get("data-team-formation") or None
    cards = li.select("div.team-card")
    idx = 0 if lato == "home" else 1
    card = cards[idx] if idx < len(cards) else None
    if card is None:
        return modulo, [], []
    starters_ul = card.select_one("ul.player-list.starters")
    reserves_ul = card.select_one("ul.player-list.reserves")
    titolari = [g["nome"] for g in estrai_giocatori_da_lista(starters_ul)]
    panchina = [g["nome"] for g in estrai_giocatori_da_lista(reserves_ul)]
    return modulo, titolari, panchina

def estrai_partite(html):
    soup = BeautifulSoup(html, "html.parser")
    partite = soup.select("ul.match-list > li.match-item")
    formazioni = {}
    for li in partite:
        casa, trasferta = estrai_squadre(li)
        if not casa or not trasferta:
            continue
        mod_h, tit_h, pan_h = estrai_formazione_team(li, "home")
        mod_a, tit_a, pan_a = estrai_formazione_team(li, "away")
        inj = estrai_indisponibili_da_section(li.select_one("section.injureds"), "injureds")
        dub = estrai_indisponibili_da_section(li.select_one("section.dubts"), "dubts")
        squ = estrai_indisponibili_da_section(li.select_one("section.suspendeds"), "suspendeds")
        bal = estrai_ballottaggi(li)
        for i, (squadra, mod, tit, pan) in enumerate([
            (casa, mod_h, tit_h, pan_h),
            (trasferta, mod_a, tit_a, pan_a),
        ]):
            indisponibili = inj[i] + dub[i] + squ[i]
            lato = "casa" if i == 0 else "trasferta"
            formazioni[squadra] = {
                "modulo": mod,
                "titolari": tit,
                "panchina": pan,
                "indisponibili": indisponibili,
                "ballottaggi": bal[lato],
            }
    return formazioni

if __name__ == "__main__":
    html_path = sys.argv[1] if len(sys.argv) >= 2 else FILE_DEFAULT
    if not os.path.exists(html_path):
        print(f"ERRORE - File non trovato: {html_path}")
        sys.exit(1)
    print(f"Lettura di: {html_path}")
    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        html = f.read()
    formazioni = estrai_partite(html)
    if not formazioni:
        print("ATTENZIONE - Nessuna formazione trovata.")
        sys.exit(1)
    with open(FILE_OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"formazioni": formazioni}, f, ensure_ascii=False, indent=2)
    print(f"OK - Generato {FILE_OUTPUT} con {len(formazioni)} squadre.")