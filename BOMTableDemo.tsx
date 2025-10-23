import React, { useState, useEffect } from 'react';
import { message, Spin, Tabs } from 'antd';
import { TableOutlined, BarChartOutlined, InboxOutlined } from '@ant-design/icons';
import BOMTable from './BOMTable';
import BOMSummaryTable from './BOMSummaryTable';
import InventoryManagement from './InventoryManagement';
import ExcelImportModal from './ExcelImportModal';
import ExcelExportModal from './ExcelExportModal';
import ApiService from '../services/api.service';
import type { BOMItem, BOMFilterCriteria } from '../types/bom.types';

// Dati mock per la demo
const mockBOMData: BOMItem[] = [
  {
    id: '1',
    projectId: 'proj-1',
    partNumber: 'ASM-001',
    description: 'Assieme Principale Motore',
    quantity: 1,
    itemType: 'assembly',
    estimatedCost: 1500.00,
    rfqStatus: 'Inviata',
    rfqDate: new Date('2024-01-15'),
    moq: 1,
    expectedDelivery: new Date('2024-03-15'),
    obsolete: false,
    procurementStatus: 'in_progress',
    actualCost: 1450.00,
    level: 0,
    path: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    projectId: 'proj-1',
    parentId: '1',
    partNumber: 'SUB-001',
    description: 'Sottoassieme Testata Cilindri',
    quantity: 1,
    itemType: 'subassembly',
    estimatedCost: 800.00,
    rfqStatus: 'Ricevuta',
    rfqDate: new Date('2024-01-20'),
    moq: 1,
    expectedDelivery: new Date('2024-02-28'),
    obsolete: false,
    procurementStatus: 'completed',
    actualCost: 780.00,
    receivedDate: new Date('2024-02-25'),
    level: 1,
    path: '1.1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-25'),
  },
  {
    id: '3',
    projectId: 'proj-1',
    parentId: '2',
    partNumber: 'PRT-001',
    description: 'Valvola di Aspirazione',
    quantity: 4,
    itemType: 'part',
    estimatedCost: 45.50,
    rfqStatus: 'In attesa',
    moq: 10,
    expectedDelivery: new Date('2024-02-20'),
    obsolete: false,
    procurementStatus: 'delayed',
    level: 2,
    path: '1.1.1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    // Dati giacenza
    stockQuantity: 8,
    reorderPoint: 15,
    safetyStock: 5,
    supplier: 'Valvole SRL',
    category: 'Valvole',
    inventoryLocation: 'A-01-02',
  },
  {
    id: '4',
    projectId: 'proj-1',
    parentId: '2',
    partNumber: 'PRT-002',
    description: 'Valvola di Scarico',
    quantity: 4,
    itemType: 'part',
    estimatedCost: 48.00,
    rfqStatus: 'Approvata',
    rfqDate: new Date('2024-01-18'),
    moq: 10,
    expectedDelivery: new Date('2024-02-15'),
    obsolete: false,
    procurementStatus: 'completed',
    actualCost: 46.50,
    receivedDate: new Date('2024-02-12'),
    level: 2,
    path: '1.1.2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-12'),
    // Dati giacenza
    stockQuantity: 25,
    reorderPoint: 20,
    safetyStock: 10,
    supplier: 'Valvole SRL',
    category: 'Valvole',
    inventoryLocation: 'A-01-03',
  },
  {
    id: '5',
    projectId: 'proj-1',
    parentId: '1',
    partNumber: 'SUB-002',
    description: 'Sottoassieme Blocco Motore',
    quantity: 1,
    itemType: 'subassembly',
    estimatedCost: 600.00,
    rfqStatus: 'Inviata',
    rfqDate: new Date('2024-01-25'),
    moq: 1,
    expectedDelivery: new Date('2024-03-10'),
    obsolete: false,
    procurementStatus: 'pending',
    level: 1,
    path: '1.2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: '6',
    projectId: 'proj-1',
    parentId: '5',
    partNumber: 'PRT-003',
    description: 'Pistone Ø 85mm',
    quantity: 4,
    itemType: 'part',
    estimatedCost: 120.00,
    rfqStatus: 'Ricevuta',
    moq: 4,
    expectedDelivery: new Date('2024-03-05'),
    obsolete: false,
    procurementStatus: 'in_progress',
    level: 2,
    path: '1.2.1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-30'),
    // Dati giacenza
    stockQuantity: 2,
    reorderPoint: 8,
    safetyStock: 4,
    supplier: 'Pistoni Italia',
    category: 'Pistoni',
    inventoryLocation: 'B-02-01',
    criticalItem: true,
  },
  {
    id: '7',
    projectId: 'proj-1',
    parentId: '5',
    partNumber: 'PRT-004-OLD',
    description: 'Biella Forgiata (OBSOLETA)',
    quantity: 4,
    itemType: 'part',
    estimatedCost: 85.00,
    obsolete: true,
    procurementStatus: 'pending',
    level: 2,
    path: '1.2.2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '8',
    projectId: 'proj-1',
    partNumber: 'ASM-002',
    description: 'Assieme Sistema Elettrico',
    quantity: 1,
    itemType: 'assembly',
    estimatedCost: 350.00,
    rfqStatus: 'In preparazione',
    moq: 1,
    expectedDelivery: new Date('2024-04-01'),
    obsolete: false,
    procurementStatus: 'pending',
    level: 0,
    path: '2',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: '9',
    projectId: 'proj-1',
    parentId: '8',
    partNumber: 'PRT-005',
    description: 'Centralina ECU',
    quantity: 1,
    itemType: 'part',
    estimatedCost: 280.00,
    rfqStatus: 'Inviata',
    rfqDate: new Date('2024-01-28'),
    moq: 1,
    expectedDelivery: new Date('2024-03-30'),
    obsolete: false,
    procurementStatus: 'in_progress',
    level: 1,
    path: '2.1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-28'),
    // Dati giacenza
    stockQuantity: 0,
    reorderPoint: 2,
    safetyStock: 1,
    supplier: 'Electronics Corp',
    category: 'Elettronica',
    inventoryLocation: 'C-01-01',
    criticalItem: true,
  },
  {
    id: '10',
    projectId: 'proj-1',
    parentId: '8',
    partNumber: 'PRT-006',
    description: 'Cablaggio Principale',
    quantity: 1,
    itemType: 'part',
    estimatedCost: 65.00,
    moq: 5,
    expectedDelivery: new Date('2024-03-25'),
    obsolete: false,
    procurementStatus: 'pending',
    level: 1,
    path: '2.2',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    // Dati giacenza
    stockQuantity: 12,
    reorderPoint: 10,
    safetyStock: 5,
    supplier: 'Cablaggi SRL',
    category: 'Cablaggi',
    inventoryLocation: 'C-02-01',
  },
  // Articoli duplicati per testare l'aggregazione
  {
    id: '11',
    projectId: 'proj-1',
    parentId: '8',
    partNumber: 'PRT-001', // Stesso codice di sopra
    description: 'Valvola di Aspirazione',
    quantity: 2, // Quantità aggiuntiva
    itemType: 'part',
    estimatedCost: 45.50,
    rfqStatus: 'In attesa',
    moq: 10,
    expectedDelivery: new Date('2024-02-20'),
    obsolete: false,
    procurementStatus: 'delayed',
    level: 1,
    path: '2.3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    // Stessi dati giacenza
    stockQuantity: 8,
    reorderPoint: 15,
    safetyStock: 5,
    supplier: 'Valvole SRL',
    category: 'Valvole',
    inventoryLocation: 'A-01-02',
  },
  {
    id: '12',
    projectId: 'proj-1',
    parentId: '5',
    partNumber: 'PRT-007',
    description: 'Guarnizione Testata',
    quantity: 1,
    itemType: 'part',
    estimatedCost: 15.00,
    rfqStatus: 'Approvata',
    moq: 20,
    expectedDelivery: new Date('2024-02-10'),
    obsolete: false,
    procurementStatus: 'completed',
    actualCost: 14.50,
    receivedDate: new Date('2024-02-08'),
    level: 2,
    path: '1.2.3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-08'),
    // Dati giacenza
    stockQuantity: 45,
    reorderPoint: 30,
    safetyStock: 15,
    supplier: 'Guarnizioni Italia',
    category: 'Guarnizioni',
    inventoryLocation: 'D-01-01',
  }
];

const BOMTableDemo: React.FC = () => {
  const [bomData, setBomData] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [currentFilters] = useState<BOMFilterCriteria>({});
  const [activeTab, setActiveTab] = useState('bom');
  const [apiNotificationShown, setApiNotificationShown] = useState(false);

  // Project ID di esempio - in un'app reale verrebbe dal routing/context
  const PROJECT_ID = '660e8400-e29b-41d4-a716-446655440000';

  useEffect(() => {
    loadBOMData();
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    // Controlla se la notifica è già stata mostrata in questa sessione
    const notificationShown = sessionStorage.getItem('apiNotificationShown');
    
    try {
      const isConnected = await ApiService.healthCheck();
      setApiConnected(isConnected);
      
      // Mostra la notifica solo se non è già stata mostrata
      if (!notificationShown) {
        if (!isConnected) {
          message.warning('Backend API non disponibile. Usando dati mock.');
        } else {
          message.success('Backend API connesso correttamente!');
        }
        // Segna che la notifica è stata mostrata
        sessionStorage.setItem('apiNotificationShown', 'true');
        setApiNotificationShown(true);
      }
    } catch (error) {
      console.error('API health check failed:', error);
      setApiConnected(false);
      
      // Mostra la notifica di errore solo se non è già stata mostrata
      if (!notificationShown) {
        message.warning('Backend API non disponibile. Usando dati mock.');
        sessionStorage.setItem('apiNotificationShown', 'true');
        setApiNotificationShown(true);
      }
    }
  };

  const loadBOMData = async () => {
    setLoading(true);
    try {
      if (apiConnected) {
        const data = await ApiService.getBOMTree(PROJECT_ID);
        setBomData(data);
        // Mostra notifica di successo solo per operazioni manuali, non al caricamento iniziale
        if (apiNotificationShown) {
          message.success('Dati BOM caricati dal server');
        }
      } else {
        // Fallback ai dati mock se API non disponibile
        setBomData(mockBOMData);
        // Non mostrare notifica info ripetitiva al caricamento iniziale
      }
    } catch (error) {
      console.error('Error loading BOM data:', error);
      setBomData(mockBOMData);
      // Mostra errore solo se non è il caricamento iniziale
      if (apiNotificationShown) {
        message.error('Errore nel caricamento dati. Usando dati di esempio.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    message.info('Funzione Aggiungi Item - Da implementare');
  };

  const handleImport = () => {
    setImportModalVisible(true);
  };

  const handleExport = () => {
    setExportModalVisible(true);
  };

  const handleImportSuccess = () => {
    loadBOMData();
    setImportModalVisible(false);
  };

  const handleExportSummary = () => {
    message.info('Esportazione riepilogo - Da implementare');
  };

  const handleUpdateStock = (partNumber: string, newStock: number) => {
    // Aggiorna i dati BOM con la nuova giacenza
    const updatedBomData = bomData.map(item => 
      item.partNumber === partNumber 
        ? { ...item, stockQuantity: newStock }
        : item
    );
    setBomData(updatedBomData);
    message.success(`Giacenza aggiornata per ${partNumber}`);
  };

  const handleEdit = async (item: BOMItem) => {
    if (!apiConnected) {
      message.info(`Modifica item: ${item.partNumber} (Demo mode)`);
      return;
    }

    try {
      // Esempio di aggiornamento
      await ApiService.updateBOMItem(item.id, {
        description: item.description + ' (Modificato)'
      });
      message.success(`Item ${item.partNumber} modificato con successo`);
      loadBOMData(); // Ricarica i dati
    } catch (error) {
      message.error('Errore nella modifica dell\'item');
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (item: BOMItem) => {
    if (!apiConnected) {
      message.warning(`Elimina item: ${item.partNumber} (Demo mode)`);
      return;
    }

    try {
      await ApiService.deleteBOMItem(item.id);
      message.success(`Item ${item.partNumber} eliminato con successo`);
      loadBOMData(); // Ricarica i dati
    } catch (error) {
      message.error('Errore nell\'eliminazione dell\'item');
      console.error('Delete error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Caricamento dati BOM...</p>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'bom',
      label: (
        <span>
          <TableOutlined />
          BOM Gerarchica
        </span>
      ),
      children: (
        <BOMTable
          data={bomData}
          loading={loading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onImport={handleImport}
          onExport={handleExport}
        />
      ),
    },
    {
      key: 'summary',
      label: (
        <span>
          <BarChartOutlined />
          Riepilogo Aggregato
        </span>
      ),
      children: (
        <BOMSummaryTable
          bomData={bomData}
          loading={loading}
          onExportSummary={handleExportSummary}
        />
      ),
    },
    {
      key: 'inventory',
      label: (
        <span>
          <InboxOutlined />
          Gestione Giacenze
        </span>
      ),
      children: (
        <InventoryManagement
          bomData={bomData}
          onUpdateStock={handleUpdateStock}
        />
      ),
    },
  ];

  return (
    <div>
      {!apiConnected && (
        <div style={{ 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          borderRadius: '6px', 
          padding: '12px', 
          marginBottom: '16px',
          color: '#d46b08'
        }}>
          ⚠️ Backend API non disponibile. Visualizzando dati di esempio. 
          Avvia il server backend per testare le funzionalità complete.
        </div>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{ marginTop: '16px' }}
      />

      <ExcelImportModal
        visible={importModalVisible}
        projectId={PROJECT_ID}
        onClose={() => setImportModalVisible(false)}
        onSuccess={handleImportSuccess}
      />

      <ExcelExportModal
        visible={exportModalVisible}
        projectId={PROJECT_ID}
        currentFilters={currentFilters}
        onClose={() => setExportModalVisible(false)}
      />
    </div>
  );
};

export default BOMTableDemo;