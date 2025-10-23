import React, { useMemo } from 'react';
import { Table, Card, Typography, Tag, Space, Tooltip, Button } from 'antd';
import { BarChartOutlined, ExportOutlined, WarningOutlined } from '@ant-design/icons';
import type { BOMItem } from '../types/bom.types';

const { Title, Text } = Typography;

interface SummaryItem {
  partNumber: string;
  description: string;
  totalQuantity: number;
  unitCost?: number;
  totalCost?: number;
  procurementStatus: string;
  stockQuantity?: number;
  reorderPoint?: number;
  needsReorder: boolean;
  supplier?: string;
  category?: string;
  criticalItem?: boolean;
  obsolete: boolean;
  occurrences: number; // Numero di volte che appare nella BOM
}

interface BOMSummaryTableProps {
  bomData: BOMItem[];
  loading?: boolean;
  onExportSummary?: () => void;
}

const BOMSummaryTable: React.FC<BOMSummaryTableProps> = ({ 
  bomData, 
  loading = false,
  onExportSummary 
}) => {
  // Calcola i dati aggregati
  const summaryData = useMemo(() => {
    const aggregated = new Map<string, SummaryItem>();

    bomData.forEach(item => {
      const key = item.partNumber;
      
      if (aggregated.has(key)) {
        // Aggrega quantità per codici duplicati
        const existing = aggregated.get(key)!;
        existing.totalQuantity += item.quantity;
        existing.occurrences += 1;
        
        // Aggiorna costo totale se disponibile
        if (item.actualCost || item.estimatedCost) {
          const cost = item.actualCost || item.estimatedCost || 0;
          existing.totalCost = (existing.totalCost || 0) + (cost * item.quantity);
        }
      } else {
        // Nuovo item
        const cost = item.actualCost || item.estimatedCost || 0;
        const stockQty = item.stockQuantity || 0;
        const reorderPoint = item.reorderPoint || 0;
        
        aggregated.set(key, {
          partNumber: item.partNumber,
          description: item.description,
          totalQuantity: item.quantity,
          unitCost: cost,
          totalCost: cost * item.quantity,
          procurementStatus: item.procurementStatus,
          stockQuantity: stockQty,
          reorderPoint: reorderPoint,
          needsReorder: stockQty <= reorderPoint && reorderPoint > 0,
          supplier: item.supplier,
          category: item.category,
          criticalItem: item.criticalItem,
          obsolete: item.obsolete,
          occurrences: 1
        });
      }
    });

    return Array.from(aggregated.values()).sort((a, b) => 
      a.partNumber.localeCompare(b.partNumber)
    );
  }, [bomData]);

  // Statistiche riassuntive
  const stats = useMemo(() => {
    const totalItems = summaryData.length;
    const totalQuantity = summaryData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalValue = summaryData.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const criticalItems = summaryData.filter(item => item.criticalItem).length;
    const obsoleteItems = summaryData.filter(item => item.obsolete).length;
    const needReorder = summaryData.filter(item => item.needsReorder).length;
    
    return {
      totalItems,
      totalQuantity,
      totalValue,
      criticalItems,
      obsoleteItems,
      needReorder
    };
  }, [summaryData]);

  const columns = [
    {
      title: 'Codice Parte',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 120,
      fixed: 'left' as const,
      render: (text: string, record: SummaryItem) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: record.obsolete ? '#ff4d4f' : undefined }}>
            {text}
          </Text>
          {record.occurrences > 1 && (
            <Tag color="blue">
              {record.occurrences}x nella BOM
            </Tag>
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
      render: (text: string, record: SummaryItem) => (
        <Tooltip title={text}>
          <Space>
            {record.criticalItem && (
              <WarningOutlined style={{ color: '#faad14' }} />
            )}
            <Text style={{ color: record.obsolete ? '#ff4d4f' : undefined }}>
              {text}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Qtà Totale',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      width: 100,
      align: 'right' as const,
      render: (qty: number) => (
        <Text strong style={{ fontSize: '14px' }}>
          {qty.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Costo Unit.',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 100,
      align: 'right' as const,
      render: (cost?: number) => 
        cost ? `€ ${cost.toFixed(2)}` : '-',
    },
    {
      title: 'Costo Totale',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right' as const,
      render: (cost?: number) => 
        cost ? (
          <Text strong style={{ color: '#1890ff' }}>
            € {cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
        ) : '-',
    },
    {
      title: 'Stato',
      dataIndex: 'procurementStatus',
      key: 'procurementStatus',
      width: 120,
      render: (status: string, record: SummaryItem) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'In Attesa' },
          in_progress: { color: 'blue', text: 'In Corso' },
          completed: { color: 'green', text: 'Completato' },
          delayed: { color: 'red', text: 'Ritardato' },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || 
          { color: 'default', text: status };
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={config.color}>{config.text}</Tag>
            {record.obsolete && (
              <Tag color="red">OBSOLETO</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Giacenza',
      key: 'stock',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: SummaryItem) => {
        if (record.stockQuantity === undefined) return '-';
        
        const isLowStock = record.needsReorder;
        
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ 
              color: isLowStock ? '#ff4d4f' : '#52c41a',
              fontWeight: 'bold'
            }}>
              {record.stockQuantity}
            </Text>
            {isLowStock && (
              <Tag color="red">
                Riordino
              </Tag>
            )}
          </Space>
        );
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
      title: 'Categoria',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category?: string) => 
        category ? <Tag>{category}</Tag> : '-',
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <BarChartOutlined /> Riepilogo Materiali Aggregato
        </Title>
        <Button 
          icon={<ExportOutlined />} 
          onClick={onExportSummary}
          type="primary"
        >
          Esporta Riepilogo
        </Button>
      </div>

      {/* Statistiche riassuntive */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px',
        padding: '16px',
        background: '#fafafa',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Codici Unici</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
            {stats.totalItems}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Quantità Totale</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
            {stats.totalQuantity.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Valore Totale</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
            € {stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Critici</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
            {stats.criticalItems}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Obsoleti</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
            {stats.obsoleteItems}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Da Riordinare</Text>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff7a45' }}>
            {stats.needReorder}
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={summaryData}
        rowKey="partNumber"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} di ${total} codici`,
        }}
        scroll={{ x: 1200 }}
        size="small"
        onRow={(record) => ({
          style: {
            backgroundColor: record.obsolete ? '#fff2f0' : 
                           record.needsReorder ? '#fff7e6' : 
                           record.criticalItem ? '#fffbe6' : undefined
          }
        })}
      />


    </Card>
  );
};

export default BOMSummaryTable;