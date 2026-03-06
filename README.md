<div align="center">

# 🛠️ 𝐅𝐈𝐋𝐄 𝐑𝐄𝐂𝐎𝐕𝐄𝐑𝐘 𝐏𝐑𝐎 𝐯𝟑.𝟎 🛠️
**The Ultimate Data Resurrection Tool for Windows**

[![Version](https://img.shields.io/badge/VERSION-3.0.0-00ff41?style=for-the-badge&logo=appveyor)](https://github.com/Xaicon)
[![OS](https://img.shields.io/badge/OS-Windows_10%2B-0078d7?style=for-the-badge&logo=windows)](https://github.com/Xaicon)
[![Tech Stack](https://img.shields.io/badge/TECH-Electron_%7C_React-61dafb?style=for-the-badge&logo=react)](https://github.com/Xaicon)
[![Author](https://img.shields.io/badge/AUTHOR-Xaicon-white?style=for-the-badge&logo=github)](https://github.com/Xaicon)

<br>

> **"Perché i file eliminati non devono essere file persi."** > Un'architettura ad alte prestazioni progettata per il recupero dati granulare tramite NTFS Journal, Shadow Copies e Deep Filesystem Scan.

---

### ⚡ PERFORMANCE BENCHMARK (v3.0)
| Metrica | v2.5 (Old) | **v3.0 (Xaicon Edition)** |
| :--- | :---: | :---: |
| **UI Responsiveness** | 1-10 FPS | **60 FPS (Fluid)** |
| **Latenza IPC** | 500ms+ | **<10ms** |
| **Gestione File** | Freeze a 10k | **100k+ (Zero Lag)** |
| **Stop Logic** | Ritardato | **Istantaneo** |

</div>

---

## 🛰️ MATRICE DI RECUPERO
L'algoritmo di scansione opera su 4 livelli di profondità per massimizzare le probabilità di successo:

1.  **LEVEL 01: $RECYCLE.BIN** Recupero istantaneo dai metadati del Cestino. *Confidenza: 100%*
2.  **LEVEL 02: SHADOW COPIES (VSS)** Estrazione dati da snapshot di sistema precedenti. *Confidenza: 95%*
3.  **LEVEL 03: DEEP DIRECTORY SCAN** Scansione ricorsiva delle cartelle utente e file temporanei. *Confidenza: 80%*
4.  **LEVEL 04: NTFS USN JOURNAL** Analisi dei log di sistema a basso livello per tracce storiche. *Confidenza: 55%*

---


# Lancia l'interfaccia in modalità Dev
npm run dev
