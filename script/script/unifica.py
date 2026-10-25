#!/usr/bin/env python3
"""
unifica.py
Unisce:
  - data/formazioni_seriea.json   (output parse_formazioni.py)
  - data/stats_giocatori.json     (output parse_stats.py)

Genera:
  - data/formazioni_con_voti.json  (formato finale per AssenzeDB.carica())

Ogni giocatore (titolare, panchina, indisponibile) viene arricchito con
Mv, Fm, ruolo, Pv presi dall'Excel.

Normalizzazione nomi robusta:
  - toglie accenti (NFD + strip combining marks)
  - uniforma apostrofi tipografici (' ' `) → apostrofo dritto (')
  - toglie punti, trattini, spazi multipli
  - match esatto → match normalizzato → match "cognome + iniziale"
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORM_FILE = ROOT / "data" / "formazioni_seriea.json"
STATS_FILE = ROOT / "data" / "stats_giocatori.json"
OUT_FILE = ROOT / "data" / "formazioni_con_voti.json"
MISS_FILE = ROOT / "data" / "_giocatori_non_trovati.txt"


def normalizza(s):
    """Normalizzazione aggressiva per il matching dei nomi."""
    if s is None:
        return ""
    s = str(s)
    # 1. accenti
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    # 2. apostrofi tipografici → apostrofo dritto
    s = re.sub(r"['''`´]", "'", s)
    # 3. lowercase
    s = s.lower()
    # 4. punti e trattini → spazio (ma NON apostrofi)
    s = re.sub(r"[.\-–—]", " ", s)
    # 5. spazi multipli
    s = re.sub(r"\s+", " ", s).strip()
    return s


def costruisci_indice(stats):
    """Restituisce un indice normalizzato nome→giocatore."""
    idx = {}
    for g in stats:
        n = normalizza(g["nome"])
        if not n:
            continue
        # Se c'è collisione (due giocatori con stesso nome), tieni quello con Pv maggiore
        if n in idx:
            if g["Pv"] > idx[n]["Pv"]:
                idx[n] = g
        else:
            idx[n] = g
    return idx


def cerca_giocatore(nome, idx_norm, idx_esatto):
    """
    Prova diverse strategie di match.
    Ritorna il giocatore o None.
    """
    if not nome:
        return None

    # 1. match esatto
    if nome in idx_esatto:
        return idx_esatto[nome]

    # 2. match normalizzato
    n = normalizza(nome)
    if n in idx_norm:
        return idx_norm[n]

    # 3. "cognome + iniziale" (es. "Adams C." vs "Adams")
    parti = n.split()
    if len(parti) >= 2:
        # Prova cognome (prima parola) + iniziale
        cognome = parti[0]
        iniziale = parti[1].rstrip(".") if len(parti) > 1 else ""
        # 3a. cerca "cognome iniziale" nel normalizzato
        if iniziale:
            for key, g in idx_norm.items():
                if key == f"{cognome} {iniziale}" or key.startswith(f"{cognome} {iniziale} "):
                    return g
        # 3b. cerca solo cognome
        for key, g in idx_norm.items():
            if key.startswith(cognome + " "):
                return g
        # 3c. cerca solo la prima parola di key
        for key, g in idx_norm.items():
            if key.split()[0] == cognome:
                return g

    # 4. match parziale: una stringa è contenuta nell'altra
    if len(n) >= 4:
        candidati = [g for k, g in idx_norm.items() if n in k or k in n]
        if len(candidati) == 1:
            return candidati[0]

    return None


def arricchisci(giocatore, idx_norm, idx_esatto):
    """Aggiunge Mv/Fm/ruolo/Pv al giocatore. Ritorna (giocatore_arricchito, trovato)."""
    g = dict(giocatore)
    info = cerca_giocatore(g["nome"], idx_norm, idx_esatto)
    if info:
        g["Mv"] = info["Mv"]
        g["Fm"] = info["Fm"]
        g["Pv"] = info["Pv"]
        g["Gf"] = info["Gf"]
        g["Ass"] = info["Ass"]
        # Se il ruolo HTML è '?' o mancante, usa quello Excel
        if not g.get("ruolo") or g.get("ruolo") == "?":
            g["ruolo"] = info["ruolo"]
        # Salva anche il nome canonico dell'Excel (utile per debug)
        g["nome_excel"] = info["nome"]
        return g, True
    else:
        g["Mv"] = 0.0
        g["Fm"] = 0.0
        g["Pv"] = 0
        g["Gf"] = 0
        g["Ass"] = 0
        g["nome_excel"] = None
        return g, False


def stima_importanza(giocatore, era_titolare_altrove=False):
    """
    Stima l'importanza dell'assenza basandosi sulla fantamedia (Fm).
    Soglie:
      Fm >= 6.8  → chiave
      Fm 5.8-6.79 → rotazione
      Fm < 5.8   → marginale
      (nessun voto) → marginale
    """
    fm = giocatore.get("Fm", 0) or 0
    pv = giocatore.get("Pv", 0) or 0
    if pv == 0:
        return "marginale"
    if fm >= 6.8:
        return "chiave"
    if fm >= 5.8:
        return "rotazione"
    return "marginale"


def media_titolari(titolari):
    """Media Mv dei soli titolari con Mv > 0."""
    voti = [t["Mv"] for t in titolari if t.get("Mv", 0) > 0]
    if not voti:
        return None, 0, len(titolari)
    return round(sum(voti) / len(voti), 2), len(voti), len(titolari)


def main():
    if not FORM_FILE.exists():
        print(f"❌ Manca {FORM_FILE}. Esegui prima parse_formazioni.py", file=sys.stderr)
        sys.exit(1)
    if not STATS_FILE.exists():
        print(f"❌ Manca {STATS_FILE}. Esegui prima parse_stats.py", file=sys.stderr)
        sys.exit(1)

    with open(FORM_FILE, encoding="utf-8") as f:
        form_data = json.load(f)
    with open(STATS_FILE, encoding="utf-8") as f:
        stats = json.load(f)

    print(f"Formazioni: {len(form_data['formazioni'])} squadre")
    print(f"Stats: {len(stats)} giocatori")

    idx_norm = costruisci_indice(stats)
    idx_esatto = {g["nome"]: g for g in stats}

    formazioni_out = {}
    non_trovati = []
    tot_tit = 0
    tot_tit_con_voto = 0

    for squadra, dati in form_data["formazioni"].items():
        titolari = []
        for g in dati.get("titolari", []):
            arricchito, ok = arricchisci(g, idx_norm, idx_esatto)
            titolari.append(arricchito)
            tot_tit += 1
            if arricchito["Mv"] > 0:
                tot_tit_con_voto += 1
            if not ok:
                non_trovati.append(f"[TIT] {squadra} → {g['nome']}")

        panchina = []
        for g in dati.get("panchina", []):
            arricchito, ok = arricchisci(g, idx_norm, idx_esatto)
            panchina.append(arricchito)
            if not ok:
                non_trovati.append(f"[PAN] {squadra} → {g['nome']}")

        indisponibili = []
        for g in dati.get("indisponibili", []):
            arricchito, ok = arricchisci(g, idx_norm, idx_esatto)
            arricchito["tipo"] = "infortunato"
            arricchito["importanza"] = stima_importanza(arricchito)
            indisponibili.append(arricchito)
            if not ok:
                non_trovati.append(f"[IND] {squadra} → {g['nome']}")

        squalificati = []
        for g in dati.get("squalificati", []):
            arricchito, ok = arricchisci(g, idx_norm, idx_esatto)
            arricchito["tipo"] = "squalificato"
            arricchito["importanza"] = "chiave"  # squalificato = sicuramente fuori
            squalificati.append(arricchito)
            if not ok:
                non_trovati.append(f"[SQL] {squadra} → {g['nome']}")

        diffidati = []
        for g in dati.get("diffidati", []):
            arricchito, ok = arricchisci(g, idx_norm, idx_esatto)
            arricchito["tipo"] = "diffidato"
            diffidati.append(arricchito)
            if not ok:
                non_trovati.append(f"[DFF] {squadra} → {g['nome']}")

        media, n_con_voto, n_tot = media_titolari(titolari)

        formazioni_out[squadra] = {
            "modulo": dati.get("modulo"),
            "titolari": titolari,
            "panchina": panchina,
            "indisponibili": indisponibili,
            "squalificati": squalificati,
            "diffidati": diffidati,
            "ballottaggi": dati.get("ballottaggi", []),
            "media_titolari": media,
            "titolari_con_voto": n_con_voto,
            "titolari_totali": n_tot,
        }

    out = {
        "giornata": form_data.get("giornata"),
        "aggiornato": form_data.get("aggiornato"),
        "formazioni": formazioni_out,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Scritto {OUT_FILE}")
    print(f"   Titolari totali: {tot_tit} (con voto: {tot_tit_con_voto})")
    print(f"\n📊 Medie voto titolari per squadra:")
    for sq, v in sorted(formazioni_out.items(), key=lambda x: -(x[1]["media_titolari"] or 0)):
        m = v["media_titolari"]
        m_str = f"{m:.2f}" if m else "—"
        print(f"   {sq:20s} TIT: {m_str}  ({v['titolari_con_voto']}/{v['titolari_totali']})")

    if non_trovati:
        MISS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MISS_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(non_trovati))
        print(f"\n⚠️ {len(non_trovati)} giocatori non trovati nell'Excel.")
        print(f"   Dettagli in {MISS_FILE}")
        for line in non_trovati[:15]:
            print(f"     {line}")
        if len(non_trovati) > 15:
            print(f"     ... e altri {len(non_trovati) - 15}")
    else:
        print("\n✅ Tutti i giocatori trovati nell'Excel!")


if __name__ == "__main__":
    main()