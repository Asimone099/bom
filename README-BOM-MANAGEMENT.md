# 🚀 BOM Management System

Sistema completo per la gestione di commesse e distinte base (Bill of Materials).

## 📋 Descrizione

Applicazione web moderna per la gestione di:
- **Commesse** con stati e priorità
- **Distinte Base (BOM)** complete con tutti i dettagli tecnici
- **Import/Export Excel** con file reali
- **KPI e Report** avanzati
- **Interfaccia moderna** con notifiche eleganti

## 🎯 Come Usare l'Applicazione

### 🚀 Avvio Rapido

1. **Avvia l'applicazione**: Doppio click su `🚀-AVVIA-BOM-APP.bat`
2. **Attendi il caricamento**: Si apriranno 2 finestre (Backend + Frontend)
3. **Accedi all'app**: Si aprirà automaticamente su http://localhost:3001

### 🛑 Stop Applicazione

1. **Ferma tutto**: Doppio click su `🛑-FERMA-BOM-APP.bat`
2. **Oppure**: Chiudi manualmente le finestre del terminale

### 📊 Controllo Stato

- **Verifica servizi**: Doppio click su `📊-STATUS-BOM-APP.bat`
- **Guida completa**: Doppio click su `📖-GUIDA-BOM-APP.bat`

## 🎨 Funzionalità Principali

### 📊 Dashboard
- KPI in tempo reale
- Statistiche commesse
- Panoramica generale
- Azioni rapide

### 📋 Gestione Commesse
- Visualizzazione tabellare completa
- **Modal elegante** per nuove commesse
- Modifica commesse esistenti
- Stati colorati e priorità

### 🔧 Gestione BOM
- Tabella completa con tutte le colonne:
  - Part Number, Descrizione, Tipologia
  - Materiale, Trattamento, Quantità
  - Fornitore, Costruttore, Prezzi
  - Lead Time, MOQ, Note
- **Modal elegante** per nuovi articoli
- Filtri avanzati
- Azioni per ogni componente

### 📤 Import/Export
- **Export Excel reale** (.xlsx)
- Export Commesse, BOM, KPI
- Template per import
- **Notifiche eleganti** invece di popup

### 📈 KPI e Report
- Metriche avanzate
- Componenti più utilizzati
- Analisi fornitori
- Grafici e statistiche

## 🛠️ Tecnologie Utilizzate

### Frontend
- **React 18** con TypeScript
- **Ant Design** per UI components
- **XLSX** per export Excel reali
- **CSS moderno** con glassmorphism

### Backend
- **Node.js** con Express
- **TypeScript** per type safety
- **PostgreSQL** per database
- **API REST** complete

## 📁 Struttura Progetto

```
bom-management/
├── 🚀-AVVIA-BOM-APP.bat     # Script avvio
├── 🛑-FERMA-BOM-APP.bat     # Script stop
├── 📊-STATUS-BOM-APP.bat    # Controllo stato
├── 📖-GUIDA-BOM-APP.bat     # Guida utente
├── frontend/                 # Applicazione React
│   ├── src/
│   │   ├── components/      # Componenti UI
│   │   └── App.tsx          # App principale
│   └── package.json
├── backend/                  # API Node.js
│   ├── src/
│   │   ├── controllers/     # Controller API
│   │   ├── services/        # Logica business
│   │   └── repositories/    # Accesso dati
│   └── package.json
└── README-BOM-MANAGEMENT.md  # Questa guida
```

## 🔧 Requisiti Sistema

- **Node.js** (versione 16 o superiore)
- **Windows** (per gli script .bat)
- **Browser moderno** (Chrome, Firefox, Edge)
- **4GB RAM** minimo
- **Connessione internet** (per installazione dipendenze)

## 💡 Modalità Sviluppo

L'applicazione attualmente funziona in **modalità sviluppo**:

### ✅ Vantaggi
- Avvio rapido e semplice
- Modifiche in tempo reale
- Debug completo
- Nessuna configurazione server

### ⚠️ Limitazioni
- **Dati temporanei**: Si perdono al riavvio
- **Solo locale**: Non accessibile da altri PC
- **Performance**: Non ottimizzata per produzione

## 🚀 Prossimi Passi (Opzionali)

### Per Uso Aziendale
1. **Database permanente**: PostgreSQL o MySQL
2. **Deploy produzione**: Server dedicato
3. **Autenticazione**: Login utenti
4. **Backup automatici**: Salvataggio dati

### Per Sviluppo Avanzato
1. **Test automatici**: Unit e integration test
2. **CI/CD Pipeline**: Deploy automatico
3. **Monitoring**: Log e metriche
4. **Scalabilità**: Load balancing

## 🆘 Risoluzione Problemi

### ❌ App non si avvia
1. Verifica Node.js installato: `node --version`
2. Usa `🛑-FERMA-BOM-APP.bat` per pulire
3. Riprova con `🚀-AVVIA-BOM-APP.bat`

### ❌ Pagina bianca
1. Attendi 10-15 secondi per il caricamento
2. Ricarica pagina (F5)
3. Controlla stato con `📊-STATUS-BOM-APP.bat`

### ❌ Errori di porta
1. Ferma tutto con `🛑-FERMA-BOM-APP.bat`
2. Attendi 10 secondi
3. Riavvia con `🚀-AVVIA-BOM-APP.bat`

### ❌ Export non funziona
1. Controlla che il browser permetta download
2. Verifica spazio disco disponibile
3. Prova con browser diverso

## 📞 Supporto

Per problemi tecnici:
1. Controlla i **log** nelle finestre del terminale
2. Usa `📊-STATUS-BOM-APP.bat` per diagnostica
3. Leggi `📖-GUIDA-BOM-APP.bat` per dettagli

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: Ottobre 2024  
**Compatibilità**: Windows 10/11, Node.js 16+