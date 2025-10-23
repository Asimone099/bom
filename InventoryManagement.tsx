import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  InputNumber, 
  Select, 
  message,
  Typography,
  Alert,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  InboxOutlined, 
  EditOutlined, 
  WarningOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { BOMItem } from '../types/bom.types';

const { Title, Text } = Typography;
const { Search } = Input;

interface InventoryItem {
  partNumber: string;
  description: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  maxStock?: number;
  unitCost?: number;
  supplier?: string;
  location?: string;
  lastUpdated: Date;
  needsReorder: boolean;
  stockStatus: 'ok' | 'low' | 'critical' | 'out';
  category?: string;
}

interface InventoryManagementProps {
  bomData: BOMItem[];
  onUpdateStock?: (partNumber: string, newStock: number) => void;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ 
  bomData, 
  onUpdateStock 
}) => {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addStockModalVisible, setAddStockModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form] = Form.useForm();
  const [addStockForm] = Form.useForm();

  // Genera dati inventario dai dati BOM
  useEffect(() => {
    const inventory = bomData
      .filter(item => item.itemType === 'part') // Solo parti, non assiemi
      .reduce((acc, item) => {
        const existing = acc.find(inv => inv.partNumber === item.partNumber);
        
        if (existing) {
          // Aggrega quantità richieste per lo stesso codice
          return acc;
        }
        
        const currentStock = item.stockQuantity || 0;
        const reorderPoint = item.reorderPoint || 0;
        const safetyStock = item.safetyStock || 0;
        
        let stockStatus: 'ok' | 'low' | 'critical' | 'out' = 'ok';
        if (currentStock === 0) {
          stockStatus = 'out';
        } else if (currentStock <= safetyStock) {
          stockStatus = 'critical';
        } else if (currentStock <= reorderPoint) {
          stockStatus = 'low';
        }
        
        acc.push({
          partNumber: item.partNumber,
          description: item.description,
          currentStock,
          reorderPoint,
          safetyStock,
          maxStock: (reorderPoint + safetyStock) * 3, // Stima
          unitCost: item.actualCost || item.estimatedCost,
          supplier: item.supplier,
          location: item.inventoryLocation,
          lastUpdated: new Date(),
          needsReorder: currentStock <= reorderPoint && reorderPoint > 0,
          stockStatus,
          category: item.category
        });
        
        return acc;
      }, [] as InventoryItem[]);
    
    setInventoryData(inventory);
    setFilteredData(inventory);
  }, [bomData]);

  // Filtra dati in base a ricerca e stato
  useEffect(() => {
    let filtered = inventoryData;
    
    // Filtro per testo
    if (searchText) {
      filtered = filtered.filter(item => 
        item.partNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Filtro per stato
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        switch (statusFilter) {
          case 'reorder':
            return item.needsReorder;
          case 'critical':
            return item.stockStatus === 'critical';
          case 'out':
            return item.stockStatus === 'out';
          case 'ok':
            return item.stockStatus === 'ok';
          default:
            return true;
        }
      });
    }
    
    setFilteredData(filtered);
  }, [inventoryData, searchText, statusFilter]);

  // Statistiche inventario
  const stats = {
    totalItems: inventoryData.length,
    needReorder: inventoryData.filter(item => item.needsReorder).length,
    critical: inventoryData.filter(item => item.stockStatus === 'critical').length,
    outOfStock: inventoryData.filter(item => item.stockStatus === 'out').length,
    totalValue: inventoryData.reduce((sum, item) => 
      sum + (item.currentStock * (item.unitCost || 0)), 0
    )
  };

  const handleEditStock = (item: InventoryItem) => {
    setSelectedItem(item);
    form.setFieldsValue({
      partNumber: item.partNumber,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      location: item.location,
      supplier: item.supplier
    });
    setEditModalVisible(true);
  };

  const handleUpdateStock = async (values: any) => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      
      // Aggiorna i dati locali
      const updatedInventory = inventoryData.map(item => {
        if (item.partNumber === selectedItem.partNumber) {
          const newStock = values.currentStock;
          let stockStatus: 'ok' | 'low' | 'critical' | 'out' = 'ok';
          
          if (newStock === 0) {
            stockStatus = 'out';
          } else if (newStock <= values.safetyStock) {
            stockStatus = 'critical';
          } else if (newStock <= values.reorderPoint) {
            stockStatus = 'low';
          }
          
          return {
            ...item,
            currentStock: newStock,
            reorderPoint: values.reorderPoint,
            safetyStock: values.safetyStock,
            location: values.location,
            supplier: values.supplier,
            lastUpdated: new Date(),
            needsReorder: newStock <= values.reorderPoint && values.reorderPoint > 0,
            stockStatus
          };
        }
        return item;
      });
      
      setInventoryData(updatedInventory);
      
      // Callback per aggiornare i dati BOM
      if (onUpdateStock) {
        onUpdateStock(selectedItem.partNumber, values.currentStock);
      }
      
      message.success('Giacenza aggiornata con successo');
      setEditModalVisible(false);
      setSelectedItem(null);
      form.resetFields();
      
    } catch (error) {
      message.error('Errore nell\'aggiornamento della giacenza');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (values: any) => {
    try {
      setLoading(true);
      
      // Trova l'articolo selezionato
      const targetItem = inventoryData.find(item => item.partNumber === values.partNumber);
      
      if (!targetItem) {
        message.error('Articolo non trovato');
        return;
      }
      
      // Calcola la nuova giacenza
      const newStock = targetItem.currentStock + values.quantity;
      
      // Aggiorna i dati locali
      const updatedInventory = inventoryData.map(item => {
        if (item.partNumber === values.partNumber) {
          let stockStatus: 'ok' | 'low' | 'critical' | 'out' = 'ok';
          
          if (newStock === 0) {
            stockStatus = 'out';
          } else if (newStock <= item.safetyStock) {
            stockStatus = 'critical';
          } else if (newStock <= item.reorderPoint) {
            stockStatus = 'low';
          }
          
          return {
            ...item,
            currentStock: newStock,
            unitCost: values.unitCost || item.unitCost,
            supplier: values.supplier || item.supplier,
            location: values.location || item.location,
            lastUpdated: new Date(),
            needsReorder: newStock <= item.reorderPoint && item.reorderPoint > 0,
            stockStatus
          };
        }
        return item;
      });
      
      setInventoryData(updatedInventory);
      
      // Callback per aggiornare i dati BOM
      if (onUpdateStock) {
        onUpdateStock(values.partNumber, newStock);
      }
      
      message.success(`Aggiunte ${values.quantity} unità di ${values.partNumber} al magazzino`);
      setAddStockModalVisible(false);
      addStockForm.resetFields();
      
    } catch (error) {
      message.error('Errore nell\'aggiunta del stock');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Codice Parte',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 120,
      fixed: 'left' as const,
      render: (text: string, record: InventoryItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.category && (
            <Tag>{record.category}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Descrizione',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Giacenza',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 100,
      align: 'center' as const,
      render: (stock: number, record: InventoryItem) => {
        const color = 
          record.stockStatus === 'out' ? '#ff4d4f' :
          record.stockStatus === 'critical' ? '#fa8c16' :
          record.stockStatus === 'low' ? '#faad14' : '#52c41a';
        
        return (
          <Text strong style={{ color, fontSize: '16px' }}>
            {stock}
          </Text>
        );
      },
    },
    {
      title: 'Stato',
      key: 'status',
      width: 120,
      render: (_: any, record: InventoryItem) => {
        const statusConfig = {
          out: { color: 'red', text: 'Esaurito', icon: <ExclamationCircleOutlined /> },
          critical: { color: 'orange', text: 'Critico', icon: <WarningOutlined /> },
          low: { color: 'gold', text: 'Basso', icon: <WarningOutlined /> },
          ok: { color: 'green', text: 'OK', icon: <CheckCircleOutlined /> }
        };
        
        const config = statusConfig[record.stockStatus];
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {record.needsReorder && (
              <Tag color="red">
                <TruckOutlined /> Riordino
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Punto Riordino',
      dataIndex: 'reorderPoint',
      key: 'reorderPoint',
      width: 100,
      align: 'center' as const,
    },
    {
      title: 'Scorta Sicurezza',
      dataIndex: 'safetyStock',
      key: 'safetyStock',
      width: 100,
      align: 'center' as const,
    },
    {
      title: 'Valore',
      key: 'value',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: InventoryItem) => {
        const value = record.currentStock * (record.unitCost || 0);
        return value > 0 ? `€ ${value.toFixed(2)}` : '-';
      },
    },
    {
      title: 'Fornitore',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      ellipsis: true,
      render: (supplier?: string) => supplier || '-',
    },
    {
      title: 'Ubicazione',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: (location?: string) => location || '-',
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: InventoryItem) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEditStock(record)}
          size="small"
        />
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, marginBottom: '16px' }}>
          <InboxOutlined /> Gestione Giacenze
        </Title>
        
        {/* Statistiche */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={4}>
            <Statistic 
              title="Totale Articoli" 
              value={stats.totalItems} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Da Riordinare" 
              value={stats.needReorder} 
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Critici" 
              value={stats.critical} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Esauriti" 
              value={stats.outOfStock} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Valore Totale" 
              value={stats.totalValue} 
              precision={2}
              prefix="€"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>

        {/* Alert per articoli critici */}
        {stats.needReorder > 0 && (
          <Alert
            message={`Attenzione: ${stats.needReorder} articoli necessitano di riordino`}
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Filtri */}
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="Cerca per codice, descrizione o fornitore"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="all">Tutti gli stati</Select.Option>
              <Select.Option value="reorder">Da riordinare</Select.Option>
              <Select.Option value="critical">Critici</Select.Option>
              <Select.Option value="out">Esauriti</Select.Option>
              <Select.Option value="ok">OK</Select.Option>
            </Select>
          </Space>
          
          <Button
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => setAddStockModalVisible(true)}
            size="large"
          >
            📦 Aggiungi a Magazzino
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="partNumber"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} di ${total} articoli`,
          }}
          scroll={{ x: 1200 }}
          size="small"
          onRow={(record) => ({
            style: {
              backgroundColor: record.stockStatus === 'out' ? '#fff2f0' : 
                             record.stockStatus === 'critical' ? '#fff7e6' : 
                             record.needsReorder ? '#fffbe6' : undefined
            }
          })}
        />
      </Card>

      {/* Modal per modifica giacenza */}
      <Modal
        title={`Modifica Giacenza - ${selectedItem?.partNumber}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateStock}
        >
          <Form.Item
            name="partNumber"
            label="Codice Parte"
          >
            <Input disabled />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currentStock"
                label="Giacenza Attuale"
                rules={[{ required: true, message: 'Inserisci la giacenza' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="reorderPoint"
                label="Punto di Riordino"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="safetyStock"
                label="Scorta di Sicurezza"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Fornitore"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Ubicazione"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal per aggiungere stock */}
      <Modal
        title="📦 Aggiungi Articoli a Magazzino"
        open={addStockModalVisible}
        onCancel={() => {
          setAddStockModalVisible(false);
          addStockForm.resetFields();
        }}
        onOk={() => addStockForm.submit()}
        confirmLoading={loading}
        width={700}
        okText="Aggiungi al Magazzino"
        cancelText="Annulla"
      >
        <Form
          form={addStockForm}
          layout="vertical"
          onFinish={handleAddStock}
        >
          <Alert
            message="Seleziona l'articolo e inserisci la quantità da aggiungere al magazzino"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <Form.Item
            name="partNumber"
            label="Codice Parte"
            rules={[{ required: true, message: 'Seleziona un articolo' }]}
          >
            <Select
              placeholder="Seleziona l'articolo da aggiungere"
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {inventoryData.map(item => (
                <Select.Option key={item.partNumber} value={item.partNumber}>
                  {item.partNumber} - {item.description}
                  <Text type="secondary" style={{ marginLeft: '8px' }}>
                    (Giacenza: {item.currentStock})
                  </Text>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Quantità da Aggiungere"
                rules={[
                  { required: true, message: 'Inserisci la quantità' },
                  { type: 'number', min: 1, message: 'La quantità deve essere maggiore di 0' }
                ]}
              >
                <InputNumber 
                  min={1} 
                  style={{ width: '100%' }} 
                  placeholder="Es. 50"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unitCost"
                label="Costo Unitario (€)"
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  style={{ width: '100%' }} 
                  placeholder="Es. 12.50"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="batchNumber"
                label="Numero Lotto"
              >
                <Input placeholder="Es. LOT2024001" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Fornitore"
              >
                <Input placeholder="Nome fornitore" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Ubicazione Magazzino"
              >
                <Input placeholder="Es. A-01-02" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="reason"
            label="Motivo"
            rules={[{ required: true, message: 'Inserisci il motivo' }]}
          >
            <Select placeholder="Seleziona il motivo dell'aggiunta">
              <Select.Option value="purchase">Acquisto</Select.Option>
              <Select.Option value="production">Produzione</Select.Option>
              <Select.Option value="return">Reso</Select.Option>
              <Select.Option value="adjustment">Rettifica inventario</Select.Option>
              <Select.Option value="transfer">Trasferimento</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Note (opzionale)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Note aggiuntive sul movimento..."
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default InventoryManagement;