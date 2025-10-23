import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Card,
  Row,
  Col,
  Collapse,
  Form,
  Typography,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { BOMItem, BOMFilterCriteria } from '../types/bom.types';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;
const { Panel } = Collapse;

interface BOMTableProps {
  data: BOMItem[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (item: BOMItem) => void;
  onDelete?: (item: BOMItem) => void;
  onImport?: () => void;
  onExport?: () => void;
}

const BOMTable: React.FC<BOMTableProps> = ({
  data,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onExport
}) => {
  const [filters, setFilters] = useState<BOMFilterCriteria>({});
  const [showSummary, setShowSummary] = useState(false);
  const [form] = Form.useForm();

  // Filtri applicati ai dati
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filtro per tipo item
      if (filters.itemType && item.itemType !== filters.itemType) {
        return false;
      }

      // Filtro per stato procurement
      if (filters.procurementStatus && item.procurementStatus !== filters.procurementStatus) {
        return false;
      }

      // Filtro per obsolescenza
      if (filters.obsolete !== undefined && item.obsolete !== filters.obsolete) {
        return false;
      }

      // Filtro per Part Number (ricerca parziale)
      if (filters.partNumber && !item.partNumber.toLowerCase().includes(filters.partNumber.toLowerCase())) {
        return false;
      }

      // Filtro per Descrizione (ricerca parziale)
      if (filters.description && !item.description.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      // Filtro per costo minimo
      if (filters.minCost && (!item.estimatedCost || item.estimatedCost < filters.minCost)) {
        return false;
      }

      // Filtro per costo massimo
      if (filters.maxCost && (!item.estimatedCost || item.estimatedCost > filters.maxCost)) {
        return false;
      }

      // Filtro per RFQ Status
      if (filters.rfqStatus && item.rfqStatus !== filters.rfqStatus) {
        return false;
      }

      // Filtro per data consegna
      if (filters.expectedDeliveryFrom && item.expectedDelivery) {
        if (new Date(item.expectedDelivery) < filters.expectedDeliveryFrom) {
          return false;
        }
      }

      if (filters.expectedDeliveryTo && item.expectedDelivery) {
        if (new Date(item.expectedDelivery) > filters.expectedDeliveryTo) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Dati sommarizzati raggruppati per Part Number
  const summaryData = useMemo(() => {
    const grouped = new Map<string, {
      partNumber: string;
      description: string;
      totalQuantity: number;
      itemType: string;
      estimatedCost?: number;
      totalCost: number;
      occurrences: number;
      unit?: string;
    }>();

    filteredData.forEach(item => {
      const key = item.partNumber;
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.totalQuantity += item.quantity;
        existing.totalCost += (item.estimatedCost || 0) * item.quantity;
        existing.occurrences += 1;
      } else {
        grouped.set(key, {
          partNumber: item.partNumber,
          description: item.description,
          totalQuantity: item.quantity,
          itemType: item.itemType,
          estimatedCost: item.estimatedCost,
          totalCost: (item.estimatedCost || 0) * item.quantity,
          occurrences: 1,
          unit: item.unit
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.partNumber.localeCompare(b.partNumber));
  }, [filteredData]);

  // Definizione colonne tabella
  const columns: ColumnsType<BOMItem> = [
    {
      title: 'PN (Part Number)',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 150,
      fixed: 'left',
      render: (text: string, record: BOMItem) => (
        <div style={{ paddingLeft: record.level * 20 }}>
          <strong>{text}</strong>
          {record.obsolete && <Tag color="red" style={{ marginLeft: 8 }}>OBSOLETO</Tag>}
          {record.critical && <Tag color="orange" style={{ marginLeft: 8 }}>CRITICO</Tag>}
        </div>
      ),
    },
    {
      title: 'Descrizione',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'itemType',
      key: 'itemType',
      width: 120,
      render: (type: string) => {
        const colorMap = {
          assembly: 'blue',
          subassembly: 'green',
          part: 'orange'
        };
        const labelMap = {
          assembly: 'Assieme',
          subassembly: 'Sottoassieme',
          part: 'Parte'
        };
        return <Tag color={colorMap[type as keyof typeof colorMap]}>{labelMap[type as keyof typeof labelMap]}</Tag>;
      },
    },
    {
      title: 'Livello',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center',
      render: (level: number) => (
        <Tag color={level === 0 ? 'blue' : level === 1 ? 'green' : level === 2 ? 'orange' : 'red'}>
          {level}
        </Tag>
      ),
    },
    {
      title: 'Quantità',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number, record: BOMItem) => (
        <span>
          {qty} {record.unit || 'pcs'}
        </span>
      ),
    },
    {
      title: 'Fornitore',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      render: (supplier: string) => supplier || '-',
    },
    {
      title: 'Codice Fornitore',
      dataIndex: 'supplierPartNumber',
      key: 'supplierPartNumber',
      width: 140,
      render: (spn: string) => spn || '-',
    },
    {
      title: 'Produttore',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 150,
      render: (manufacturer: string) => manufacturer || '-',
    },
    {
      title: 'Categoria',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => category || '-',
    },
    {
      title: 'Costo Stimato',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      align: 'right',
      render: (cost: number) => cost ? `€ ${cost.toFixed(2)}` : '-',
    },
    {
      title: 'RFQ',
      dataIndex: 'rfqStatus',
      key: 'rfqStatus',
      width: 100,
      render: (status: string) => status || '-',
    },
    {
      title: 'MOQ',
      dataIndex: 'moq',
      key: 'moq',
      width: 80,
      align: 'right',
      render: (moq: number) => moq || '-',
    },
    {
      title: 'Lead Time',
      dataIndex: 'leadTimeDays',
      key: 'leadTimeDays',
      width: 100,
      align: 'right',
      render: (days: number) => days ? `${days} gg` : '-',
    },
    {
      title: 'Data Arrivo',
      dataIndex: 'expectedDelivery',
      key: 'expectedDelivery',
      width: 120,
      render: (date: Date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Stato Evasione',
      dataIndex: 'procurementStatus',
      key: 'procurementStatus',
      width: 130,
      render: (status: string) => {
        const colorMap = {
          pending: 'default',
          in_progress: 'processing',
          completed: 'success',
          delayed: 'error'
        };
        const labelMap = {
          pending: 'In Attesa',
          in_progress: 'In Corso',
          completed: 'Completato',
          delayed: 'In Ritardo'
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{labelMap[status as keyof typeof labelMap]}</Tag>;
      },
    },
    {
      title: 'Stock',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 80,
      align: 'right',
      render: (stock: number) => stock || 0,
    },
    {
      title: 'Revisione',
      dataIndex: 'revision',
      key: 'revision',
      width: 100,
      render: (revision: string) => revision || '-',
    },
    {
      title: 'Note',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (notes: string) => notes ? (
        <Tooltip placement="topLeft" title={notes}>
          {notes}
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: any, record: BOMItem) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit?.(record)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => onDelete?.(record)}
          />
        </Space>
      ),
    },
  ];

  // Colonne per la tabella sommarizzata
  const summaryColumns: ColumnsType<any> = [
    {
      title: 'PN (Part Number)',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 150,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Descrizione',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'itemType',
      key: 'itemType',
      width: 120,
      render: (type: string) => {
        const colorMap = {
          assembly: 'blue',
          subassembly: 'green',
          part: 'orange'
        };
        const labelMap = {
          assembly: 'Assieme',
          subassembly: 'Sottoassieme',
          part: 'Parte'
        };
        return <Tag color={colorMap[type as keyof typeof colorMap]}>{labelMap[type as keyof typeof labelMap]}</Tag>;
      },
    },
    {
      title: 'Quantità Totale',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      width: 120,
      align: 'right',
      render: (qty: number, record: any) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {qty} {record.unit || 'pcs'}
        </span>
      ),
    },
    {
      title: 'Occorrenze',
      dataIndex: 'occurrences',
      key: 'occurrences',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: 'Costo Unitario',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      align: 'right',
      render: (cost: number) => cost ? `€ ${cost.toFixed(2)}` : 'N/A',
    },
    {
      title: 'Costo Totale',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right',
      render: (cost: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          € {cost.toFixed(2)}
        </span>
      ),
    },
  ];

  // Gestione filtri
  const handleFilterChange = (_changedValues: any, allValues: any) => {
    setFilters(allValues);
  };

  const clearFilters = () => {
    form.resetFields();
    setFilters({});
  };

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Distinta Base (BOM)
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                type={showSummary ? 'primary' : 'default'}
                onClick={() => setShowSummary(!showSummary)}
              >
                {showSummary ? '📋 Vista Dettagliata' : '📊 Vista Sommarizzata'}
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={onImport}
              >
                Import Excel
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={onExport}
              >
                Export Excel
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAdd}
              >
                Aggiungi Item
              </Button>
            </Space>
          </Col>
        </Row>

        <Collapse ghost>
          <Panel
            header={
              <Space>
                <FilterOutlined />
                Filtri Avanzati
                {Object.keys(filters).length > 0 && (
                  <Tag color="blue">{Object.keys(filters).length} attivi</Tag>
                )}
              </Space>
            }
            key="filters"
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFilterChange}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Part Number" name="partNumber">
                    <Input
                      placeholder="Cerca per PN..."
                      prefix={<SearchOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Descrizione" name="description">
                    <Input
                      placeholder="Cerca per descrizione..."
                      prefix={<SearchOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Tipo Item" name="itemType">
                    <Select placeholder="Seleziona tipo..." allowClear>
                      <Option value="assembly">Assieme</Option>
                      <Option value="subassembly">Sottoassieme</Option>
                      <Option value="part">Parte</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Stato Evasione" name="procurementStatus">
                    <Select placeholder="Seleziona stato..." allowClear>
                      <Option value="pending">In Attesa</Option>
                      <Option value="in_progress">In Corso</Option>
                      <Option value="completed">Completato</Option>
                      <Option value="delayed">In Ritardo</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Obsolescenza" name="obsolete">
                    <Select placeholder="Seleziona..." allowClear>
                      <Option value={true}>Sì</Option>
                      <Option value={false}>No</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="RFQ Status" name="rfqStatus">
                    <Input placeholder="Stato RFQ..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Costo Min" name="minCost">
                    <InputNumber
                      placeholder="€ 0.00"
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Costo Max" name="maxCost">
                    <InputNumber
                      placeholder="€ 0.00"
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={16} lg={12}>
                  <Form.Item label="Data Consegna" name="expectedDeliveryRange">
                    <RangePicker
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      onChange={(dates: any) => {
                        if (dates) {
                          setFilters((prev: any) => ({
                            ...prev,
                            expectedDeliveryFrom: dates[0]?.toDate(),
                            expectedDeliveryTo: dates[1]?.toDate()
                          }));
                        } else {
                          setFilters((prev: any) => {
                            const { expectedDeliveryFrom, expectedDeliveryTo, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={clearFilters}
                  >
                    Pulisci Filtri
                  </Button>
                </Col>
              </Row>
            </Form>
          </Panel>
        </Collapse>

        <Table
          columns={showSummary ? summaryColumns : columns}
          dataSource={showSummary ? summaryData : filteredData}
          loading={loading}
          rowKey={showSummary ? 'partNumber' : 'id'}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number, range: number[]) =>
              `${range[0]}-${range[1]} di ${total} elementi`,
          }}
          summary={(pageData: readonly any[]) => {
            if (showSummary) {
              const totalCost = pageData.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);
              const totalQuantity = pageData.reduce((sum: number, item: any) => sum + item.totalQuantity, 0);
              const totalItems = pageData.length;
              
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong>Totali ({totalItems} articoli unici):</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <strong style={{ color: '#1890ff' }}>{totalQuantity}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={2} />
                  <Table.Summary.Cell index={6}>
                    <strong style={{ color: '#52c41a' }}>€ {totalCost.toFixed(2)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            } else {
              const totalQuantity = pageData.reduce((sum: number, item: any) => sum + item.quantity, 0);
            
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <strong>Totali Pagina:</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong>{totalQuantity}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} colSpan={5} />
                </Table.Summary.Row>
              );
            }
          }}
        />
      </Card>
    </div>
  );
};

export default BOMTable;