# File Recovery Pro — Come ottenere il Setup.exe

GitHub compila automaticamente il .exe. Tu non installi nulla.

---

## Passo 1 — Crea account GitHub (gratis)
https://github.com → Sign up

---

## Passo 2 — Crea repository
1. Clicca **+** → **New repository**
2. Nome: `file-recovery-pro`
3. Visibilità: **Public**
4. Clicca **Create repository**

---

## Passo 3 — Carica i file
1. Estrai questo zip
2. Nella pagina del repository clicca **uploading an existing file**
3. Trascina TUTTI i file e cartelle
4. Clicca **Commit changes**

---

## Passo 4 — Imposta il tuo username
1. Apri `package.json` nel repository (clic → matita ✏️)
2. Trova: `"owner": "SOSTITUISCI_USERNAME"`
3. Sostituisci con il tuo username GitHub
4. Clicca **Commit changes**

---

## Passo 5 — Crea la Release (avvia la compilazione)
1. Clicca **Releases** (colonna destra) → **Create a new release**
2. **Tag**: digita `v2.0.0` → **Create new tag**
3. **Titolo**: `File Recovery Pro v2.0.0`
4. Clicca **Publish release**

→ GitHub inizia a compilare automaticamente!

---

## Passo 6 — Scarica il .exe
1. Vai su **Actions** (menu in alto) — vedi il build in esecuzione 🟡
2. Aspetta 5–10 minuti fino al ✅
3. Vai su **Releases** → clicca la release
4. Sotto **Assets** trovi:
   - `File Recovery Pro_v2.0.0_Setup.exe` ← **installer completo**
   - `File Recovery Pro_v2.0.0_Portable.exe` ← versione senza installazione

---

## Aggiornamenti futuri

Per rilasciare `v2.1.0`:
1. Modifica `"version": "2.1.0"` in `package.json`
2. Carica i file modificati su GitHub
3. Crea una nuova Release con tag `v2.1.0`
4. L'app installata sui PC si **aggiorna automaticamente** ✓
   (notifica in-app con download in background)

---

## Link da condividere
```
https://github.com/TUO_USERNAME/file-recovery-pro/releases/latest
```
