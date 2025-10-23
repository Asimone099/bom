import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import itIT from 'antd/locale/it_IT';
import * as XLSX from 'xlsx';
import 'antd/dist/reset.css';
import LoginScreen from './components/LoginScreen';
import UserHeader from './components/UserHeader';
import SettingsModal from './components/SettingsModal';
import BOMTableDemo from './components/BOMTableDemo';
import { authService, User } from './services/auth.service';

// Aggiungi stili CSS per le animazioni
const modalStyles = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Inserisci gli stili nel documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);
}

// Estensione per Date per ottenere il numero della settimana
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const App: React.FC = () => {
  // Stato per l'autenticazione - controlla se l'utente è già loggato
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<Array<{ id: string, message: string, type: 'success' | 'info' | 'warning' | 'error' }>>([]);
  const [showNewCommessaModal, setShowNewCommessaModal] = useState(false);
  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  const [showImportBOMModal, setShowImportBOMModal] = useState(false);
  const [newCommessa, setNewCommessa] = useState({ codice: '', cliente: '', descrizione: '', dataConsegna: '', stato: 'aperta', priorita: 'media' });
  const [newArticle, setNewArticle] = useState({ codice: '', descrizione: '', categoria: '', materiale: '', prezzo: 0, livello: '1' });
  const [searchCommesse, setSearchCommesse] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [filterCliente, setFilterCliente] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [selectedBOMFile, setSelectedBOMFile] = useState<File | null>(null);
  const [selectedStockFile, setSelectedStockFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [showImportProgress, setShowImportProgress] = useState(false);

  // Dati dell'applicazione
  const [commesseData, setCommesseData] = useState([
    {
      id: '1',
      codice: 'COM-2024-001',
      cliente: 'ACME Corp',
      descrizione: 'Assemblaggio motore elettrico per applicazioni industriali',
      stato: 'in_corso',
      data_consegna: '2024-03-15',
      priorita: 'alta',
      componenti: 12,
      componenti_totali: 45,
      valore_stimato: 15420.50
    },
    {
      id: '2',
      codice: 'COM-2024-002',
      cliente: 'TechSolutions',
      descrizione: 'Quadro elettrico industriale con controllo PLC',
      stato: 'aperta',
      data_consegna: '2024-04-01',
      priorita: 'media',
      componenti: 8,
      componenti_totali: 32,
      valore_stimato: 8750.00
    },
    {
      id: '3',
      codice: 'COM-2024-003',
      cliente: 'AutoParts Ltd',
      descrizione: 'Componenti automotive per linea produzione',
      stato: 'completata',
      data_consegna: '2024-02-28',
      priorita: 'bassa',
      componenti: 15,
      componenti_totali: 67,
      valore_stimato: 21060.00
    }
  ]);

  const [bomData, setBomData] = useState([
    {
      id: '1',
      liv: 'Padre',
      n_parte_doc: 'PROD-MAIN-001',
      descrizione: 'Prodotto Principale Completo',
      tipologia: 'ASSIEME_PRINCIPALE',
      materiale: 'MISTO',
      trattamento: 'ASSEMBLAGGIO',
      unita_misura: 'PZ',
      quantita: 1,
      sigla_commerciale: 'MAIN-PRODUCT-V1',
      costruttore: 'Azienda Principale',
      rdo: 'RDO-PADRE-001',
      prezzo: 1500.00,
      dt: '2024-03-01',
      week: '09-2024',
      n_ordine: 'ORD-PADRE-001',
      conferma_offerta: 'OFF-PADRE-001',
      n_fornitore: 'FOR-INTERNO',
      totale: 1500.00,
      moq: 1,
      note: 'Assieme principale del prodotto finito',
      rif_assieme: 'ASS-PRINCIPALE'
    },
    {
      id: '2',
      liv: '1',
      n_parte_doc: 'MOT-001-DWG',
      descrizione: 'Motore elettrico 24V 2.5kW',
      tipologia: 'SOTTOASSIEME',
      materiale: 'ALLUMINIO',
      trattamento: 'ANODIZZATO',
      unita_misura: 'PZ',
      quantita: 1,
      sigla_commerciale: 'SIEMENS-1LA7',
      costruttore: 'ElectroMotors SpA',
      rdo: 'RDO-2024-001',
      prezzo: 250.00,
      dt: '2024-03-15',
      week: '12-2024',
      n_ordine: 'ORD-001-2024',
      conferma_offerta: 'OFF-2024-001',
      n_fornitore: 'FOR-001',
      totale: 250.00,
      moq: 1,
      note: 'Motore certificato CE, IP65',
      rif_assieme: 'ASS-MOTORE-001'
    },
    {
      id: '3',
      liv: '2',
      n_parte_doc: 'RES-100-SCH',
      descrizione: 'Resistenza ceramica 100 Ohm 50W',
      tipologia: 'COMPONENTE',
      materiale: 'CERAMICA',
      trattamento: 'NESSUNO',
      unita_misura: 'PZ',
      quantita: 4,
      sigla_commerciale: 'VISHAY-RH050',
      costruttore: 'Components Ltd',
      rdo: 'RDO-2024-002',
      prezzo: 0.50,
      dt: '2024-03-10',
      week: '11-2024',
      n_ordine: 'ORD-002-2024',
      conferma_offerta: 'OFF-2024-002',
      n_fornitore: 'FOR-002',
      totale: 2.00,
      moq: 100,
      note: 'Resistenza alta precisione ±1%',
      rif_assieme: 'ASS-ELETTRICO-001'
    },
    {
      id: '4',
      liv: '3',
      n_parte_doc: 'CPU-ARM-001',
      descrizione: 'Processore ARM Cortex-M4 32bit',
      tipologia: 'PARTE_SINGOLA',
      materiale: 'SILICIO',
      trattamento: 'NESSUNO',
      unita_misura: 'PZ',
      quantita: 1,
      sigla_commerciale: 'STM32F407VGT6',
      costruttore: 'STMicroelectronics',
      rdo: 'RDO-2024-004',
      prezzo: 8.50,
      dt: '2024-03-18',
      week: '12-2024',
      n_ordine: 'ORD-004-2024',
      conferma_offerta: 'OFF-2024-004',
      n_fornitore: 'FOR-004',
      totale: 8.50,
      moq: 25,
      note: 'Microcontrollore per controllo sistema',
      rif_assieme: 'ASS-CONTROLLO-001'
    },
    {
      id: '5',
      liv: '4',
      n_parte_doc: 'MAT-ALU-001',
      descrizione: 'Barra alluminio 6061 T6 Ø20mm',
      tipologia: 'MATERIALE_BASE',
      materiale: 'ALLUMINIO_6061',
      trattamento: 'T6',
      unita_misura: 'MT',
      quantita: 2.5,
      sigla_commerciale: 'ALU-6061-T6-20',
      costruttore: 'Alluminio Industriale',
      rdo: 'RDO-2024-005',
      prezzo: 12.00,
      dt: '2024-03-12',
      week: '11-2024',
      n_ordine: 'ORD-005-2024',
      conferma_offerta: 'OFF-2024-005',
      n_fornitore: 'FOR-005',
      totale: 30.00,
      moq: 6,
      note: 'Materiale grezzo per lavorazioni meccaniche',
      rif_assieme: 'ASS-MATERIALI-001'
    },
    {
      id: '6',
      liv: '5',
      n_parte_doc: 'VIT-M8-STD',
      descrizione: 'Vite M8x20 acciaio inox A2',
      tipologia: 'VITERIA',
      materiale: 'INOX A2',
      trattamento: 'PASSIVATO',
      unita_misura: 'PZ',
      quantita: 12,
      sigla_commerciale: 'DIN912-M8x20',
      costruttore: 'Bulloneria Italiana',
      rdo: 'RDO-2024-003',
      prezzo: 0.15,
      dt: '2024-03-05',
      week: '10-2024',
      n_ordine: 'ORD-003-2024',
      conferma_offerta: 'OFF-2024-003',
      n_fornitore: 'FOR-003',
      totale: 1.80,
      moq: 500,
      note: 'Viti con impronta esagonale per fissaggio',
      rif_assieme: 'ASS-FISSAGGIO-001'
    }
  ]);



  const showTab = (tabName: string) => {
    setActiveTab(tabName);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Sistema di notifiche
  const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Funzione per creare e scaricare file Excel
  const downloadExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      showNotification(`✅ File Excel ${filename}.xlsx scaricato con successo!`, 'success');
    } catch (error) {
      showNotification(`❌ Errore durante il download: ${error}`, 'error');
    }
  };

  const exportBOM = () => {
    showNotification('🔧 Generazione export BOM completa...', 'info');
    setTimeout(() => {
      downloadExcel(bomData, 'bom_completa', 'BOM');
    }, 1000);
  };



  const exportKPI = () => {
    showNotification('📈 Generazione report KPI...', 'info');
    setTimeout(() => {
      const kpiData = [
        { Metrica: 'Commesse Totali', Valore: commesseData.length },
        { Metrica: 'Componenti Unici', Valore: bomData.length },
        { Metrica: 'Valore Totale', Valore: `€ ${commesseData.reduce((sum, c) => sum + c.valore_stimato, 0).toLocaleString()}` },
        { Metrica: 'Completamento BOM', Valore: '94%' }
      ];
      downloadExcel(kpiData, 'report_kpi', 'KPI');
    }, 1000);
  };

  // Funzioni per gestire i modali
  const handleNewCommessa = () => {
    if (newCommessa.codice && newCommessa.cliente) {
      const nuovaCommessa = {
        id: (commesseData.length + 1).toString(),
        codice: newCommessa.codice,
        cliente: newCommessa.cliente,
        descrizione: newCommessa.descrizione,
        stato: newCommessa.stato,
        data_consegna: newCommessa.dataConsegna,
        priorita: newCommessa.priorita,
        componenti: 0,
        componenti_totali: 0,
        valore_stimato: 0
      };
      setCommesseData([...commesseData, nuovaCommessa]);
      setNewCommessa({ codice: '', cliente: '', descrizione: '', dataConsegna: '', stato: 'aperta', priorita: 'media' });
      setShowNewCommessaModal(false);
      showNotification(`✅ Commessa ${newCommessa.codice} creata con successo!`, 'success');
    } else {
      showNotification('❌ Compila tutti i campi obbligatori', 'error');
    }
  };

  const handleNewArticle = () => {
    if (newArticle.codice && newArticle.descrizione) {
      // Verifica che non esista già un livello padre se si sta creando un livello padre
      if (newArticle.livello === 'Padre') {
        const esisteLivelloPadre = bomData.some(b => b.liv === 'Padre');
        if (esisteLivelloPadre) {
          showNotification('❌ Esiste già un articolo con Livello Padre. Può esistere solo un assieme principale.', 'error');
          return;
        }
      }

      const nuovoArticolo = {
        id: (bomData.length + 1).toString(),
        liv: newArticle.livello || '1',
        n_parte_doc: newArticle.codice + '-DWG',
        descrizione: newArticle.descrizione,
        tipologia: newArticle.livello === 'Padre' ? 'ASSIEME_PRINCIPALE' :
                   newArticle.livello === '1' ? 'SOTTOASSIEME' :
                   newArticle.livello === '2' ? 'COMPONENTE' :
                   newArticle.livello === '3' ? 'PARTE_SINGOLA' :
                   newArticle.livello === '4' ? 'MATERIALE_BASE' : 'VITERIA',
        materiale: newArticle.materiale,
        trattamento: 'NESSUNO',
        unita_misura: 'PZ',
        quantita: 1,
        sigla_commerciale: newArticle.codice,
        costruttore: 'Da definire',
        rdo: 'RDO-NEW',
        prezzo: newArticle.prezzo,
        dt: new Date().toISOString().split('T')[0],
        week: `${new Date().getWeek()}-2024`,
        n_ordine: 'ORD-NEW',
        conferma_offerta: 'OFF-NEW',
        n_fornitore: 'FOR-NEW',
        totale: newArticle.prezzo,
        moq: 1,
        note: 'Nuovo articolo',
        rif_assieme: 'ASS-NEW'
      };
      setBomData([...bomData, nuovoArticolo]);
      setNewArticle({ codice: '', descrizione: '', categoria: '', materiale: '', prezzo: 0, livello: '1' });
      setShowNewArticleModal(false);
      showNotification(`✅ Articolo ${newArticle.codice} aggiunto alla BOM!`, 'success');
    } else {
      showNotification('❌ Compila tutti i campi obbligatori', 'error');
    }
  };

  // Funzioni di filtro
  const filteredCommesse = commesseData.filter(commessa => {
    const matchSearch = !searchCommesse || 
      commessa.codice.toLowerCase().includes(searchCommesse.toLowerCase()) ||
      commessa.cliente.toLowerCase().includes(searchCommesse.toLowerCase()) ||
      commessa.descrizione.toLowerCase().includes(searchCommesse.toLowerCase());
    
    const matchStato = !filterStato || commessa.stato === filterStato;
    const matchCliente = !filterCliente || commessa.cliente.toLowerCase().includes(filterCliente.toLowerCase());
    
    return matchSearch && matchStato && matchCliente;
  });



  const refreshKPI = () => {
    showNotification('🔄 Aggiornamento KPI in corso...', 'info');
    setTimeout(() => {
      showNotification('✅ KPI aggiornati con successo!', 'success');
    }, 1500);
  };

  // Funzioni di autenticazione
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    showNotification(`👋 Benvenuto, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard'); // Reset alla dashboard
    showNotification('👋 Logout effettuato con successo!', 'info');
  };

  const processImport = () => {
    showNotification('🚀 Import avviato...', 'info');
    setTimeout(() => {
      showNotification('✅ Import completato! 15 componenti importati, 0 errori', 'success');
    }, 2000);
  };

  // Funzioni per gestire l'import dei file
  const handleBOMFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedBOMFile(file);
        showNotification(`📄 File BOM selezionato: ${file.name}`, 'success');
      }
    };
    input.click();
  };

  const handleStockFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedStockFile(file);
        showNotification(`📦 File Stock selezionato: ${file.name}`, 'success');
      }
    };
    input.click();
  };

  const processBOMImport = async () => {
    if (!selectedBOMFile) {
      showNotification('❌ Seleziona prima un file BOM', 'error');
      return;
    }

    setShowImportProgress(true);
    setImportProgress(0);
    showNotification('🚀 Avvio import BOM...', 'info');

    try {
      // Simula il processo di import con progress
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simula l'aggiunta di nuovi dati BOM
      const newBOMItems = [
        {
          id: (bomData.length + 1).toString(),
          liv: '2',
          n_parte_doc: 'IMP-001-NEW',
          descrizione: 'Componente importato da Excel',
          tipologia: 'COMPONENTE',
          materiale: 'ACCIAIO',
          trattamento: 'ZINCATO',
          unita_misura: 'PZ',
          quantita: 5,
          sigla_commerciale: 'IMP-EXCEL-001',
          costruttore: 'Fornitore Importato',
          rdo: 'RDO-IMP-001',
          prezzo: 15.50,
          dt: new Date().toISOString().split('T')[0],
          week: `${new Date().getWeek()}-2024`,
          n_ordine: 'ORD-IMP-001',
          conferma_offerta: 'OFF-IMP-001',
          n_fornitore: 'FOR-IMP-001',
          totale: 77.50,
          moq: 10,
          note: `Importato da file: ${selectedBOMFile.name}`,
          rif_assieme: 'ASS-IMPORT-001'
        }
      ];

      setBomData([...bomData, ...newBOMItems]);
      setShowImportProgress(false);
      setSelectedBOMFile(null);
      showNotification(`✅ Import BOM completato! ${newBOMItems.length} componenti importati da ${selectedBOMFile.name}`, 'success');
    } catch (error) {
      setShowImportProgress(false);
      showNotification(`❌ Errore durante l'import: ${error}`, 'error');
    }
  };

  const processStockImport = async () => {
    if (!selectedStockFile) {
      showNotification('❌ Seleziona prima un file Stock', 'error');
      return;
    }

    setShowImportProgress(true);
    setImportProgress(0);
    showNotification('🚀 Avvio import Stock...', 'info');

    try {
      // Simula il processo di import con progress
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setShowImportProgress(false);
      setSelectedStockFile(null);
      showNotification(`✅ Import Stock completato! Dati importati da ${selectedStockFile.name}`, 'success');
    } catch (error) {
      setShowImportProgress(false);
      showNotification(`❌ Errore durante l'import: ${error}`, 'error');
    }
  };

  // Funzione per mostrare il modal di conferma
  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmAction({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction.onConfirm();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Funzioni per gestire i modal di visualizzazione e modifica
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedItem(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedItem(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (selectedItem) {
      if (selectedItem.codice) {
        // È una commessa
        const updatedCommesse = commesseData.map(c => 
          c.id === selectedItem.id ? { ...c, ...editForm } : c
        );
        setCommesseData(updatedCommesse);
        showNotification(`✅ Commessa ${editForm.codice} modificata con successo!`, 'success');
      } else {
        // È un articolo BOM
        const updatedBOM = bomData.map(b => 
          b.id === selectedItem.id ? { ...b, ...editForm } : b
        );
        setBomData(updatedBOM);
        showNotification(`✅ Articolo ${editForm.n_parte_doc} modificato con successo!`, 'success');
      }
    }
    closeEditModal();
  };

  // Funzioni per i pulsanti delle commesse
  const viewCommessa = (commessa: any) => {
    setSelectedItem(commessa);
    setShowViewModal(true);
  };

  const editCommessa = (commessa: any) => {
    setSelectedItem(commessa);
    setEditForm({
      codice: commessa.codice,
      cliente: commessa.cliente,
      descrizione: commessa.descrizione,
      stato: commessa.stato,
      data_consegna: commessa.data_consegna,
      priorita: commessa.priorita
    });
    setShowEditModal(true);
  };

  const deleteCommessa = (id: string) => {
    const commessa = commesseData.find(c => c.id === id);
    if (commessa) {
      showConfirm(
        '🗑️ Elimina Commessa',
        `Sei sicuro di voler eliminare la commessa "${commessa.codice}" del cliente ${commessa.cliente}?\n\nQuesta azione non può essere annullata.`,
        () => {
          setCommesseData(commesseData.filter(c => c.id !== id));
          showNotification(`🗑️ Commessa ${commessa.codice} eliminata con successo`, 'success');
        },
        'danger'
      );
    }
  };



  const styles = {
    body: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundAttachment: 'fixed',
      lineHeight: 1.6,
      minHeight: '100vh',
      margin: 0,
      padding: 0,
    },
    container: {
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '15px',
      width: '98%',
    },
    header: {
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      padding: '40px',
      textAlign: 'center' as const,
      borderRadius: '20px',
      marginBottom: '30px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    },
    headerH1: {
      fontSize: '42px',
      marginBottom: '15px',
      fontWeight: 700,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    },
    headerP: {
      fontSize: '18px',
      opacity: 0.9,
    },
    tabs: {
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      marginBottom: '20px',
      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      padding: '18px 25px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 600,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      color: '#666',
    },
    tabActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
    },
    content: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(15px)',
      borderRadius: '20px',
      padding: '25px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      marginBottom: '15px',
      minHeight: 'calc(100vh - 200px)',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '25px',
      marginBottom: '25px',
    },
    kpiCard: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '30px',
      borderRadius: '20px',
      textAlign: 'center' as const,
      boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    kpiNumber: {
      fontSize: '36px',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    kpiLabel: {
      fontSize: '14px',
      opacity: 0.9,
    },
    dataTable: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '20px',
      borderRadius: '15px',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto' as const,
      overflowY: 'auto' as const,
      maxHeight: 'calc(100vh - 300px)',
      borderRadius: '15px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    tableHeader: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '15px 12px',
      textAlign: 'left' as const,
      fontWeight: 600,
      fontSize: '14px',
      position: 'sticky' as const,
      top: 0,
      zIndex: 10,
    },
    tableCell: {
      padding: '12px',
      borderBottom: '1px solid #f0f0f0',
      fontSize: '13px',
      backgroundColor: 'white',
    },
    tableRow: {
      transition: 'all 0.3s ease',
    },
    button: {
      padding: '8px 16px',
      margin: '2px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 600,
      transition: 'all 0.3s ease',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
    buttonSuccess: {
      background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
      color: 'white',
    },
    buttonWarning: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
    },
    buttonSecondary: {
      background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
      color: 'white',
    },
    buttonDanger: {
      background: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)',
      color: 'white',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      textAlign: 'center' as const,
    },
    statusAperta: {
      background: '#e3f2fd',
      color: '#1976d2',
    },
    statusInCorso: {
      background: '#fff3e0',
      color: '#f57c00',
    },
    statusCompletata: {
      background: '#e8f5e8',
      color: '#388e3c',
    },
    statusSospesa: {
      background: '#fce4ec',
      color: '#c2185b',
    },
    criticityHigh: {
      background: '#ffebee',
      color: '#d32f2f',
    },
    criticityMedium: {
      background: '#fff3e0',
      color: '#f57c00',
    },
    criticityLow: {
      background: '#e8f5e8',
      color: '#388e3c',
    },
    notificationContainer: {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      zIndex: 1000,
    },
    notification: {
      background: 'white',
      padding: '15px 20px',
      borderRadius: '10px',
      marginBottom: '10px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      borderLeft: '4px solid #667eea',
      animation: 'slideIn 0.5s ease-out',
      maxWidth: '300px',
    },
    confirmModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)',
    },
    confirmContent: {
      background: 'white',
      padding: '40px',
      borderRadius: '25px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      textAlign: 'center' as const,
    },
    confirmIcon: {
      fontSize: '64px',
      marginBottom: '20px',
      display: 'block',
    },
    confirmTitle: {
      fontSize: '24px',
      fontWeight: 700,
      marginBottom: '15px',
      color: '#333',
    },
    confirmMessage: {
      fontSize: '16px',
      lineHeight: 1.6,
      color: '#666',
      marginBottom: '30px',
      whiteSpace: 'pre-line' as const,
    },
    confirmButtons: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
    },
    confirmButtonCancel: {
      padding: '12px 30px',
      border: '2px solid #ddd',
      borderRadius: '12px',
      background: 'white',
      color: '#666',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    confirmButtonAction: {
      padding: '12px 30px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'white',
    },
    viewModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)',
    },
    viewContent: {
      background: 'white',
      padding: '40px',
      borderRadius: '25px',
      maxWidth: '700px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    editModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)',
    },
    editContent: {
      background: 'white',
      padding: '40px',
      borderRadius: '25px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '2px solid #f0f0f0',
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#333',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '28px',
      cursor: 'pointer',
      color: '#666',
      padding: '5px',
      borderRadius: '50%',
      transition: 'all 0.3s ease',
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    detailItem: {
      padding: '15px',
      background: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#666',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '5px',
    },
    detailValue: {
      fontSize: '16px',
      fontWeight: 500,
      color: '#333',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    formLabel: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#333',
    },
    formInput: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      background: 'white',
    },
    modalButtons: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'flex-end',
      paddingTop: '20px',
      borderTop: '2px solid #f0f0f0',
    },
    fileSelected: {
      padding: '10px',
      background: '#e8f5e8',
      borderRadius: '8px',
      fontSize: '12px',
      border: '1px solid #c3e6cb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressBar: {
      background: '#e9ecef',
      borderRadius: '10px',
      height: '20px',
      overflow: 'hidden' as const,
      marginBottom: '10px',
    },
    progressFill: {
      background: 'linear-gradient(90deg, #28a745, #20c997)',
      height: '100%',
      transition: 'width 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 600,
    }
  };

  // Se non è autenticato, mostra la schermata di login
  if (!isAuthenticated) {
    return (
      <ConfigProvider locale={itIT}>
        <LoginScreen onLogin={handleLogin} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={itIT}>
      <div style={styles.body}>
        {/* Header utente */}
        {currentUser && (
          <UserHeader 
            user={currentUser} 
            onLogout={handleLogout}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.headerH1}>🏭 BOM Management System</h1>
            <p style={styles.headerP}>Sistema Avanzato di Gestione Distinte Base e Magazzino</p>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button 
              style={{...styles.tab, ...(activeTab === 'dashboard' ? styles.tabActive : {})}}
              onClick={() => showTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              style={{...styles.tab, ...(activeTab === 'commesse' ? styles.tabActive : {})}}
              onClick={() => showTab('commesse')}
            >
              📋 Commesse
            </button>
            <button 
              style={{...styles.tab, ...(activeTab === 'bom' ? styles.tabActive : {})}}
              onClick={() => showTab('bom')}
            >
              🔧 BOM
            </button>
            <button 
              style={{...styles.tab, ...(activeTab === 'import' ? styles.tabActive : {})}}
              onClick={() => showTab('import')}
            >
              📤 Import
            </button>
            <button 
              style={{...styles.tab, ...(activeTab === 'kpi' ? styles.tabActive : {})}}
              onClick={() => showTab('kpi')}
            >
              📈 KPI
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                <h2>📊 Dashboard KPI</h2>
                
                {/* KPI Cards */}
                <div style={styles.kpiGrid}>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>{commesseData.length}</div>
                    <div style={styles.kpiLabel}>Commesse Attive</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>{bomData.length}</div>
                    <div style={styles.kpiLabel}>Componenti BOM</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>{bomData.filter(item => item.quantita > 0).length}</div>
                    <div style={styles.kpiLabel}>Articoli Disponibili</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>€{commesseData.reduce((sum, c) => sum + c.valore_stimato, 0).toLocaleString()}</div>
                    <div style={styles.kpiLabel}>Valore Totale</div>
                  </div>
                </div>

                {/* Commesse Table */}
                <h3>📋 Commesse Recenti</h3>
                <div style={styles.tableContainer}>
                  <table style={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Codice</th>
                        <th style={styles.tableHeader}>Cliente</th>
                        <th style={styles.tableHeader}>Descrizione</th>
                        <th style={styles.tableHeader}>Stato</th>
                        <th style={styles.tableHeader}>Consegna</th>
                        <th style={styles.tableHeader}>Priorità</th>
                        <th style={styles.tableHeader}>Valore</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commesseData.map((commessa) => (
                        <tr key={commessa.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{commessa.codice}</td>
                          <td style={styles.tableCell}>{commessa.cliente}</td>
                          <td style={styles.tableCell}>{commessa.descrizione}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              ...(commessa.stato === 'aperta' ? styles.statusAperta :
                                  commessa.stato === 'in_corso' ? styles.statusInCorso :
                                  commessa.stato === 'completata' ? styles.statusCompletata :
                                  styles.statusSospesa)
                            }}>
                              {commessa.stato.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{formatDate(commessa.data_consegna)}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              ...(commessa.priorita === 'alta' ? styles.criticityHigh :
                                  commessa.priorita === 'media' ? styles.criticityMedium :
                                  styles.criticityLow)
                            }}>
                              {commessa.priorita === 'bassa' ? '🟢 Bassa' :
                               commessa.priorita === 'media' ? '🟡 Media' :
                               '🔴 Alta'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>€{commessa.valore_stimato.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Commesse Tab */}
            {activeTab === 'commesse' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>📋 Gestione Commesse</h2>
                  <button 
                    style={{...styles.button, ...styles.buttonPrimary}}
                    onClick={() => setShowNewCommessaModal(true)}
                  >
                    ➕ Nuova Commessa
                  </button>
                </div>

                {/* Filtri */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px', padding: '25px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Ricerca</label>
                    <input 
                      type="text" 
                      placeholder="Cerca commesse..." 
                      value={searchCommesse}
                      onChange={(e) => setSearchCommesse(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Stato</label>
                    <select 
                      value={filterStato}
                      onChange={(e) => setFilterStato(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                      <option value="">Tutti gli stati</option>
                      <option value="aperta">Aperta</option>
                      <option value="in_corso">In Corso</option>
                      <option value="completata">Completata</option>
                      <option value="sospesa">Sospesa</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Cliente</label>
                    <input 
                      type="text" 
                      placeholder="Filtra per cliente..." 
                      value={filterCliente}
                      onChange={(e) => setFilterCliente(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>
                
                <div style={styles.tableContainer}>
                  <table style={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Codice</th>
                        <th style={styles.tableHeader}>Cliente</th>
                        <th style={styles.tableHeader}>Descrizione</th>
                        <th style={styles.tableHeader}>Stato</th>
                        <th style={styles.tableHeader}>Priorità</th>
                        <th style={styles.tableHeader}>Consegna</th>
                        <th style={styles.tableHeader}>Componenti</th>
                        <th style={styles.tableHeader}>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommesse.map((commessa) => (
                        <tr key={commessa.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{commessa.codice}</td>
                          <td style={styles.tableCell}>{commessa.cliente}</td>
                          <td style={styles.tableCell}>{commessa.descrizione}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              ...(commessa.stato === 'aperta' ? styles.statusAperta :
                                  commessa.stato === 'in_corso' ? styles.statusInCorso :
                                  commessa.stato === 'completata' ? styles.statusCompletata :
                                  styles.statusSospesa)
                            }}>
                              {commessa.stato.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              ...(commessa.priorita === 'alta' ? styles.criticityHigh :
                                  commessa.priorita === 'media' ? styles.criticityMedium :
                                  styles.criticityLow)
                            }}>
                              {commessa.priorita === 'bassa' ? '🟢 Bassa' :
                               commessa.priorita === 'media' ? '🟡 Media' :
                               '🔴 Alta'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{formatDate(commessa.data_consegna)}</td>
                          <td style={styles.tableCell}>{commessa.componenti}/{commessa.componenti_totali}</td>
                          <td style={styles.tableCell}>
                            <button 
                              style={{...styles.button, ...styles.buttonPrimary, fontSize: '12px', padding: '6px 12px'}}
                              onClick={() => viewCommessa(commessa)}
                            >
                              👁️ Vedi
                            </button>
                            <button 
                              style={{...styles.button, ...styles.buttonWarning, fontSize: '12px', padding: '6px 12px'}}
                              onClick={() => editCommessa(commessa)}
                            >
                              ✏️ Modifica
                            </button>
                            <button 
                              style={{...styles.button, ...styles.buttonDanger, fontSize: '12px', padding: '6px 12px'}}
                              onClick={() => deleteCommessa(commessa.id)}
                            >
                              🗑️ Elimina
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOM Tab */}
            {activeTab === 'bom' && (
              <BOMTableDemo />
            )}

            {/* KPI Tab */}
            {activeTab === 'kpi' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>📈 Dashboard KPI Avanzata</h2>
                  <button 
                    style={{...styles.button, ...styles.buttonPrimary}}
                    onClick={refreshKPI}
                  >
                    🔄 Aggiorna Dati
                  </button>
                </div>
                
                <div style={styles.kpiGrid}>
                  <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #28a745, #20c997)'}}>
                    <div style={styles.kpiNumber}>€ {bomData.reduce((sum, item) => sum + item.totale, 0).toLocaleString()}</div>
                    <div style={styles.kpiLabel}>Valore Totale BOM</div>
                  </div>
                  <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #ffc107, #fd7e14)'}}>
                    <div style={styles.kpiNumber}>{bomData.reduce((sum, item) => sum + item.quantita, 0).toLocaleString()}</div>
                    <div style={styles.kpiLabel}>Componenti Totali</div>
                  </div>
                  <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #17a2b8, #6f42c1)'}}>
                    <div style={styles.kpiNumber}>{new Set(bomData.map(item => item.costruttore)).size}</div>
                    <div style={styles.kpiLabel}>Fornitori Attivi</div>
                  </div>
                  <div style={{...styles.kpiCard, background: 'linear-gradient(135deg, #dc3545, #e83e8c)'}}>
                    <div style={styles.kpiNumber}>{bomData.filter(item => item.quantita < item.moq).length}</div>
                    <div style={styles.kpiLabel}>Sotto MOQ</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
                  <div style={{ padding: '25px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <h3>📊 Analisi per Categoria</h3>
                    {['COMPONENTE', 'ELETTRONICO', 'VITERIA', 'SENSORE'].map(categoria => {
                      const count = bomData.filter(item => item.tipologia === categoria).length;
                      const percentage = bomData.length > 0 ? (count / bomData.length * 100).toFixed(1) : 0;
                      return (
                        <div key={categoria} style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>{categoria}</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div style={{ background: '#e9ecef', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                            <div style={{ 
                              background: 'linear-gradient(90deg, #667eea, #764ba2)', 
                              height: '100%', 
                              width: `${percentage}%`,
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: '25px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <h3>🏭 Top Fornitori</h3>
                    {Array.from(new Set(bomData.map(item => item.costruttore))).slice(0, 5).map(fornitore => {
                      const count = bomData.filter(item => item.costruttore === fornitore).length;
                      const valore = bomData.filter(item => item.costruttore === fornitore).reduce((sum, item) => sum + item.totale, 0);
                      return (
                        <div key={fornitore} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '10px', 
                          background: 'white', 
                          borderRadius: '8px', 
                          marginBottom: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <span style={{ fontWeight: 600 }}>{fornitore}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div>{count} componenti</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>€{valore.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Import/Export Tab */}
            {activeTab === 'import' && (
              <div>
                <h2>📤 Import/Export Dati</h2>
                
                <div style={styles.kpiGrid}>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>15</div>
                    <div style={styles.kpiLabel}>Import Completati</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>8</div>
                    <div style={styles.kpiLabel}>Export Generati</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>0</div>
                    <div style={styles.kpiLabel}>Errori Rilevati</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiNumber}>99%</div>
                    <div style={styles.kpiLabel}>Successo Rate</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
                  <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '15px' }}>
                    <h3>📥 Import Dati</h3>
                    <p>Importa dati da file Excel o CSV</p>
                    <button 
                      style={{...styles.button, ...styles.buttonPrimary, width: '100%', marginBottom: '10px'}}
                      onClick={handleBOMFileSelect}
                    >
                      📄 Seleziona File BOM
                    </button>
                    {selectedBOMFile && (
                      <div style={{...styles.fileSelected, marginBottom: '10px'}}>
                        <span>✅ File selezionato: <strong>{selectedBOMFile.name}</strong></span>
                        <button 
                          style={{...styles.button, ...styles.buttonSuccess, fontSize: '11px', padding: '4px 8px'}}
                          onClick={processBOMImport}
                          disabled={showImportProgress}
                        >
                          🚀 Importa
                        </button>
                      </div>
                    )}
                    <button 
                      style={{...styles.button, ...styles.buttonPrimary, width: '100%'}}
                      onClick={handleStockFileSelect}
                    >
                      📦 Seleziona File Stock
                    </button>
                    {selectedStockFile && (
                      <div style={{...styles.fileSelected, marginTop: '10px'}}>
                        <span>✅ File selezionato: <strong>{selectedStockFile.name}</strong></span>
                        <button 
                          style={{...styles.button, ...styles.buttonSuccess, fontSize: '11px', padding: '4px 8px'}}
                          onClick={processStockImport}
                          disabled={showImportProgress}
                        >
                          🚀 Importa
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '15px' }}>
                    <h3>📊 Export Dati</h3>
                    <p>Esporta dati in formato Excel</p>
                    <button 
                      style={{...styles.button, ...styles.buttonSuccess, width: '100%', marginBottom: '10px'}}
                      onClick={exportBOM}
                    >
                      🔧 Esporta BOM Completa
                    </button>
                    <button 
                      style={{...styles.button, ...styles.buttonSuccess, width: '100%', marginBottom: '10px'}}
                      onClick={exportBOM}
                    >
                      📦 Esporta Componenti
                    </button>
                    <button 
                      style={{...styles.button, ...styles.buttonSuccess, width: '100%'}}
                      onClick={exportKPI}
                    >
                      📈 Esporta Report KPI
                    </button>
                  </div>
                </div>

                {/* Barra di Progresso Import */}
                {showImportProgress && (
                  <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '15px', border: '1px solid #ffeaa7' }}>
                    <h4>🔄 Import in Corso...</h4>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${importProgress}%`}}>
                        {importProgress}%
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#856404' }}>
                      {importProgress < 30 ? 'Lettura file...' :
                       importProgress < 60 ? 'Validazione dati...' :
                       importProgress < 90 ? 'Importazione in corso...' :
                       'Finalizzazione...'}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e8', borderRadius: '15px' }}>
                  <h3>📋 Operazioni Recenti</h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>✅ Export BOM Completa</span>
                      <span style={{ color: '#666' }}>2 minuti fa</span>
                    </div>
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📥 Import Stock da Excel</span>
                      <span style={{ color: '#666' }}>15 minuti fa</span>
                    </div>
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📊 Export Report KPI</span>
                      <span style={{ color: '#666' }}>1 ora fa</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={styles.notificationContainer}>
            {notifications.map((notification) => (
              <div key={notification.id} style={styles.notification}>
                {notification.message}
              </div>
            ))}
          </div>

          {/* Modal Nuova Commessa */}
          {showNewCommessaModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>➕ Nuova Commessa</h3>
                  <button onClick={() => setShowNewCommessaModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Codice Commessa *</label>
                  <input 
                    type="text" 
                    value={newCommessa.codice}
                    onChange={(e) => setNewCommessa({...newCommessa, codice: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="es. COM-2024-004"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Cliente *</label>
                  <input 
                    type="text" 
                    value={newCommessa.cliente}
                    onChange={(e) => setNewCommessa({...newCommessa, cliente: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="Nome cliente"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Descrizione</label>
                  <textarea 
                    value={newCommessa.descrizione}
                    onChange={(e) => setNewCommessa({...newCommessa, descrizione: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
                    placeholder="Descrizione della commessa"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Priorità</label>
                  <select 
                    value={newCommessa.priorita}
                    onChange={(e) => setNewCommessa({...newCommessa, priorita: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                  >
                    <option value="bassa">🟢 Bassa</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Data Consegna</label>
                  <input 
                    type="date" 
                    value={newCommessa.dataConsegna}
                    onChange={(e) => setNewCommessa({...newCommessa, dataConsegna: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowNewCommessaModal(false)}
                    style={{...styles.button, ...styles.buttonSecondary}}
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleNewCommessa}
                    style={{...styles.button, ...styles.buttonPrimary}}
                  >
                    Crea Commessa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Nuovo Articolo */}
          {showNewArticleModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>➕ Nuovo Articolo BOM</h3>
                  <button onClick={() => setShowNewArticleModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Codice Articolo *</label>
                  <input 
                    type="text" 
                    value={newArticle.codice}
                    onChange={(e) => setNewArticle({...newArticle, codice: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="es. ART-001"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Descrizione *</label>
                  <input 
                    type="text" 
                    value={newArticle.descrizione}
                    onChange={(e) => setNewArticle({...newArticle, descrizione: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="Descrizione articolo"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Materiale</label>
                  <input 
                    type="text" 
                    value={newArticle.materiale}
                    onChange={(e) => setNewArticle({...newArticle, materiale: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="es. ACCIAIO, ALLUMINIO"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Livello BOM</label>
                  <select 
                    value={newArticle.livello}
                    onChange={(e) => setNewArticle({...newArticle, livello: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                  >
                    <option value="Padre">🏭 Livello Padre (Assieme Principale)</option>
                    <option value="1">🔧 Livello 1 (Sottoassiemi Principali)</option>
                    <option value="2">⚙️ Livello 2 (Componenti Intermedi)</option>
                    <option value="3">🔩 Livello 3 (Parti Singole)</option>
                    <option value="4">📦 Livello 4 (Materiali Base)</option>
                    <option value="5">🧰 Livello 5 (Accessori/Viteria)</option>
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Prezzo Unitario</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newArticle.prezzo}
                    onChange={(e) => setNewArticle({...newArticle, prezzo: parseFloat(e.target.value) || 0})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowNewArticleModal(false)}
                    style={{...styles.button, ...styles.buttonSecondary}}
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleNewArticle}
                    style={{...styles.button, ...styles.buttonSuccess}}
                  >
                    Aggiungi Articolo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Import BOM */}
          {showImportBOMModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>📤 Import BOM</h3>
                  <button onClick={() => setShowImportBOMModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Seleziona File</label>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Commessa Destinazione</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="">Seleziona commessa...</option>
                    {commesseData.map(commessa => (
                      <option key={commessa.id} value={commessa.codice}>
                        {commessa.codice} - {commessa.cliente}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowImportBOMModal(false)}
                    style={{...styles.button, ...styles.buttonSecondary}}
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={() => { processImport(); setShowImportBOMModal(false); }}
                    style={{...styles.button, ...styles.buttonPrimary}}
                  >
                    🚀 Avvia Import
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal di Visualizzazione */}
          {showViewModal && selectedItem && (
            <div style={styles.viewModal}>
              <div style={styles.viewContent}>
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>
                    {selectedItem.codice ? `👁️ Dettagli Commessa ${selectedItem.codice}` : `👁️ Dettagli Articolo ${selectedItem.n_parte_doc}`}
                  </h3>
                  <button 
                    style={styles.closeButton}
                    onClick={closeViewModal}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#666';
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={styles.detailGrid}>
                  {selectedItem.codice ? (
                    // Visualizzazione Commessa
                    <>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Codice Commessa</div>
                        <div style={styles.detailValue}>{selectedItem.codice}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Cliente</div>
                        <div style={styles.detailValue}>{selectedItem.cliente}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Stato</div>
                        <div style={{
                          ...styles.detailValue,
                          ...styles.statusBadge,
                          ...(selectedItem.stato === 'aperta' ? styles.statusAperta :
                              selectedItem.stato === 'in_corso' ? styles.statusInCorso :
                              selectedItem.stato === 'completata' ? styles.statusCompletata :
                              styles.statusSospesa)
                        }}>
                          {selectedItem.stato.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Data Consegna</div>
                        <div style={styles.detailValue}>{formatDate(selectedItem.data_consegna)}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Priorità</div>
                        <div style={{
                          ...styles.detailValue,
                          ...styles.statusBadge,
                          ...(selectedItem.priorita === 'alta' ? styles.criticityHigh :
                              selectedItem.priorita === 'media' ? styles.criticityMedium :
                              styles.criticityLow)
                        }}>
                          {selectedItem.priorita === 'bassa' ? '🟢 Bassa' :
                           selectedItem.priorita === 'media' ? '🟡 Media' :
                           '🔴 Alta'}
                        </div>
                      </div>

                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Componenti</div>
                        <div style={styles.detailValue}>{selectedItem.componenti}/{selectedItem.componenti_totali}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Valore Stimato</div>
                        <div style={styles.detailValue}>€{selectedItem.valore_stimato.toLocaleString()}</div>
                      </div>
                      <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                        <div style={styles.detailLabel}>Descrizione</div>
                        <div style={styles.detailValue}>{selectedItem.descrizione}</div>
                      </div>
                    </>
                  ) : (
                    // Visualizzazione Articolo BOM
                    <>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Codice Parte</div>
                        <div style={styles.detailValue}>{selectedItem.n_parte_doc}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Tipologia</div>
                        <div style={styles.detailValue}>{selectedItem.tipologia}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Materiale</div>
                        <div style={styles.detailValue}>{selectedItem.materiale}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Trattamento</div>
                        <div style={styles.detailValue}>{selectedItem.trattamento}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Quantità</div>
                        <div style={styles.detailValue}>{selectedItem.quantita} {selectedItem.unita_misura}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Prezzo Unitario</div>
                        <div style={styles.detailValue}>€{selectedItem.prezzo.toFixed(2)}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Totale</div>
                        <div style={styles.detailValue}>€{selectedItem.totale.toFixed(2)}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Costruttore</div>
                        <div style={styles.detailValue}>{selectedItem.costruttore}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>Sigla Commerciale</div>
                        <div style={styles.detailValue}>{selectedItem.sigla_commerciale}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>RDO</div>
                        <div style={styles.detailValue}>{selectedItem.rdo}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>N° Ordine</div>
                        <div style={styles.detailValue}>{selectedItem.n_ordine}</div>
                      </div>
                      <div style={styles.detailItem}>
                        <div style={styles.detailLabel}>MOQ</div>
                        <div style={styles.detailValue}>{selectedItem.moq}</div>
                      </div>
                      <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                        <div style={styles.detailLabel}>Descrizione</div>
                        <div style={styles.detailValue}>{selectedItem.descrizione}</div>
                      </div>
                      <div style={{...styles.detailItem, gridColumn: '1 / -1'}}>
                        <div style={styles.detailLabel}>Note</div>
                        <div style={styles.detailValue}>{selectedItem.note}</div>
                      </div>
                    </>
                  )}
                </div>
                
                <div style={styles.modalButtons}>
                  <button 
                    style={{...styles.button, ...styles.buttonSecondary, padding: '12px 24px'}}
                    onClick={closeViewModal}
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal di Modifica */}
          {showEditModal && selectedItem && (
            <div style={styles.editModal}>
              <div style={styles.editContent}>
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>
                    {selectedItem.codice ? `✏️ Modifica Commessa ${selectedItem.codice}` : `✏️ Modifica Articolo ${selectedItem.n_parte_doc}`}
                  </h3>
                  <button 
                    style={styles.closeButton}
                    onClick={closeEditModal}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#666';
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={styles.formGrid}>
                  {selectedItem.codice ? (
                    // Form Modifica Commessa
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Codice Commessa</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.codice || ''}
                          onChange={(e) => setEditForm({...editForm, codice: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Cliente</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.cliente || ''}
                          onChange={(e) => setEditForm({...editForm, cliente: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Stato</label>
                        <select 
                          style={styles.formInput}
                          value={editForm.stato || ''}
                          onChange={(e) => setEditForm({...editForm, stato: e.target.value})}
                        >
                          <option value="aperta">Aperta</option>
                          <option value="in_corso">In Corso</option>
                          <option value="completata">Completata</option>
                          <option value="sospesa">Sospesa</option>
                        </select>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Data Consegna</label>
                        <input 
                          type="date" 
                          style={styles.formInput}
                          value={editForm.data_consegna || ''}
                          onChange={(e) => setEditForm({...editForm, data_consegna: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Priorità</label>
                        <select 
                          style={styles.formInput}
                          value={editForm.priorita || ''}
                          onChange={(e) => setEditForm({...editForm, priorita: e.target.value})}
                        >
                          <option value="bassa">🟢 Bassa</option>
                          <option value="media">🟡 Media</option>
                          <option value="alta">🔴 Alta</option>
                        </select>
                      </div>

                      <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                        <label style={styles.formLabel}>Descrizione</label>
                        <textarea 
                          style={{...styles.formInput, minHeight: '80px', resize: 'vertical' as const}}
                          value={editForm.descrizione || ''}
                          onChange={(e) => setEditForm({...editForm, descrizione: e.target.value})}
                        />
                      </div>
                    </>
                  ) : (
                    // Form Modifica Articolo BOM
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Codice Parte</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.n_parte_doc || ''}
                          onChange={(e) => setEditForm({...editForm, n_parte_doc: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Tipologia</label>
                        <select 
                          style={styles.formInput}
                          value={editForm.tipologia || ''}
                          onChange={(e) => setEditForm({...editForm, tipologia: e.target.value})}
                        >
                          <option value="COMPONENTE">COMPONENTE</option>
                          <option value="ELETTRONICO">ELETTRONICO</option>
                          <option value="VITERIA">VITERIA</option>
                          <option value="SENSORE">SENSORE</option>
                        </select>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Materiale</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.materiale || ''}
                          onChange={(e) => setEditForm({...editForm, materiale: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Trattamento</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.trattamento || ''}
                          onChange={(e) => setEditForm({...editForm, trattamento: e.target.value})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Quantità</label>
                        <input 
                          type="number" 
                          style={styles.formInput}
                          value={editForm.quantita || ''}
                          onChange={(e) => setEditForm({...editForm, quantita: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Prezzo Unitario</label>
                        <input 
                          type="number" 
                          step="0.01"
                          style={styles.formInput}
                          value={editForm.prezzo || ''}
                          onChange={(e) => setEditForm({...editForm, prezzo: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Costruttore</label>
                        <input 
                          type="text" 
                          style={styles.formInput}
                          value={editForm.costruttore || ''}
                          onChange={(e) => setEditForm({...editForm, costruttore: e.target.value})}
                        />
                      </div>
                      <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                        <label style={styles.formLabel}>Descrizione</label>
                        <textarea 
                          style={{...styles.formInput, minHeight: '60px', resize: 'vertical' as const}}
                          value={editForm.descrizione || ''}
                          onChange={(e) => setEditForm({...editForm, descrizione: e.target.value})}
                        />
                      </div>
                      <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                        <label style={styles.formLabel}>Note</label>
                        <textarea 
                          style={{...styles.formInput, minHeight: '60px', resize: 'vertical' as const}}
                          value={editForm.note || ''}
                          onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <div style={styles.modalButtons}>
                  <button 
                    style={{...styles.button, ...styles.buttonSecondary, padding: '12px 24px'}}
                    onClick={closeEditModal}
                  >
                    Annulla
                  </button>
                  <button 
                    style={{...styles.button, ...styles.buttonSuccess, padding: '12px 24px'}}
                    onClick={handleSaveEdit}
                  >
                    💾 Salva Modifiche
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal di Conferma */}
          {showConfirmModal && confirmAction && (
            <div style={styles.confirmModal}>
              <div style={styles.confirmContent}>
                <div style={{
                  ...styles.confirmIcon,
                  color: confirmAction.type === 'danger' ? '#dc3545' : 
                         confirmAction.type === 'warning' ? '#ffc107' : '#17a2b8'
                }}>
                  {confirmAction.type === 'danger' ? '⚠️' : 
                   confirmAction.type === 'warning' ? '❓' : 'ℹ️'}
                </div>
                <h3 style={styles.confirmTitle}>{confirmAction.title}</h3>
                <p style={styles.confirmMessage}>{confirmAction.message}</p>
                <div style={styles.confirmButtons}>
                  <button 
                    style={styles.confirmButtonCancel}
                    onClick={handleCancel}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#adb5bd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    Annulla
                  </button>
                  <button 
                    style={{
                      ...styles.confirmButtonAction,
                      background: confirmAction.type === 'danger' ? 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)' :
                                  confirmAction.type === 'warning' ? 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)' :
                                  'linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%)'
                    }}
                    onClick={handleConfirm}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {confirmAction.type === 'danger' ? 'Elimina' : 'Conferma'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Impostazioni */}
        {currentUser && (
          <SettingsModal
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            currentUser={currentUser}
          />
        )}
      </div>
    </ConfigProvider>
  );
};

export default App;