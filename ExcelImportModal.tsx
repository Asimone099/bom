import React, { useState, useEffect } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Table,
  Select,
  Form,
  Alert,
  Typography,
  Space,
  Divider,
  Card,
  message
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import ApiService from '../services/api.service';

const { Step } = Steps;
const { Option } = Select;
const { Title, Text } = Typography;

interface ExcelImportModalProps {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ColumnMapping {
  [excelColumn: string]: string;
}

interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  errors: Array<{
    row: number;
    column?: string;
    message: string;
    data?: any;
  }>;
  preview: string;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  visible,
  projectId,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [standardMappings, setStandardMappings] = useState<any>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      loadStandardMappings();
    }
  }, [visible]);

  const loadStandardMappings = async () => {
    try {
      const mappings = await ApiService.getStandardColumnMappings();
      setStandardMappings(mappings);
    } catch (error) {
      console.error('Error loading standard mappings:', error);
    }
  };

  const handleFileUpload: UploadProps['onChange'] = (info: any) => {
    const { fileList: newFileList } = info;
    setFileList(newFileList);

    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      setSelectedFile(newFileList[0].originFileObj);
      // Extract column headers from Excel file (simplified - in real implementation you'd parse the file)
      // For demo, we'll use standard columns
      setAvailableColumns([
        'Part Number', 'Descrizione', 'Quantità', 'Tipo', 'Costo Stimato',
        'RFQ Status', 'Data RFQ', 'MOQ', 'Data Consegna', 'Obsoleto', 'Stato Evasione'
      ]);
      setCurrentStep(1);
    }
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setSelectedFile(null);
    setAvailableColumns([]);
    setCurrentStep(0);
  };

  const applyStandardMapping = (language: 'italian' | 'english') => {
    const mapping = standardMappings[language] || {};
    const newMapping: ColumnMapping = {};
    
    availableColumns.forEach(column => {
      if (mapping[column]) {
        newMapping[column] = mapping[column];
      }
    });
    
    setColumnMapping(newMapping);
    form.setFieldsValue(newMapping);
  };

  const handleMappingChange = (excelColumn: string, bomField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: bomField
    }));
  };

  const validateFile = async () => {
    if (!selectedFile) {
      message.error('Nessun file selezionato');
      return;
    }

    try {
      const result = await ApiService.validateExcel(projectId, selectedFile, columnMapping);
      setValidationResult(result);
      setCurrentStep(2);
    } catch (error) {
      message.error('Errore nella validazione del file');
      console.error('Validation error:', error);
    }
  };

  const performImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const result = await ApiService.importExcel(projectId, selectedFile, columnMapping, {
        skipFirstRow: true,
        validateOnly: false
      });
      
      setImportResult(result);
      setCurrentStep(3);
      
      if (result.success) {
        message.success(`Import completato! ${result.successfulRows} righe importate.`);
        onSuccess();
      } else {
        message.warning(`Import completato con errori. ${result.successfulRows}/${result.totalRows} righe importate.`);
      }
    } catch (error) {
      message.error('Errore durante l\'import');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await ApiService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'BOM_Import_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Template scaricato con successo');
    } catch (error) {
      message.error('Errore nel download del template');
      console.error('Template download error:', error);
    }
  };

  const resetModal = () => {
    setCurrentStep(0);
    setFileList([]);
    setSelectedFile(null);
    setColumnMapping({});
    setAvailableColumns([]);
    setValidationResult(null);
    setImportResult(null);
    form.resetFields();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const bomFields = [
    { value: 'partNumber', label: 'Part Number *' },
    { value: 'description', label: 'Descrizione *' },
    { value: 'quantity', label: 'Quantità *' },
    { value: 'itemType', label: 'Tipo *' },
    { value: 'estimatedCost', label: 'Costo Stimato' },
    { value: 'rfqStatus', label: 'RFQ Status' },
    { value: 'rfqDate', label: 'Data RFQ' },
    { value: 'moq', label: 'MOQ' },
    { value: 'expectedDelivery', label: 'Data Consegna' },
    { value: 'obsolete', label: 'Obsoleto' },
    { value: 'procurementStatus', label: 'Stato Evasione' },
    { value: 'actualCost', label: 'Costo Effettivo' },
    { value: 'receivedDate', label: 'Data Ricevimento' }
  ];

  const errorColumns = [
    {
      title: 'Riga',
      dataIndex: 'row',
      key: 'row',
      width: 80,
    },
    {
      title: 'Colonna',
      dataIndex: 'column',
      key: 'column',
      width: 120,
    },
    {
      title: 'Errore',
      dataIndex: 'message',
      key: 'message',
    }
  ];

  return (
    <Modal
      title="Import Excel BOM"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Upload File" icon={<UploadOutlined />} />
        <Step title="Mappatura Colonne" icon={<FileExcelOutlined />} />
        <Step title="Validazione" icon={<CheckCircleOutlined />} />
        <Step title="Import" icon={<ExclamationCircleOutlined />} />
      </Steps>

      {/* Step 0: File Upload */}
      {currentStep === 0 && (
        <div>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Button
                  type="dashed"
                  icon={<DownloadOutlined />}
                  onClick={downloadTemplate}
                  style={{ marginBottom: 16 }}
                >
                  Scarica Template Excel
                </Button>
                <Text type="secondary" style={{ display: 'block' }}>
                  Usa il template per assicurarti che il formato sia corretto
                </Text>
              </div>

              <Divider>oppure</Divider>

              <Upload.Dragger
                fileList={fileList}
                onChange={handleFileUpload}
                onRemove={handleRemoveFile}
                beforeUpload={() => false}
                accept=".xlsx,.xls"
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  Clicca o trascina il file Excel qui
                </p>
                <p className="ant-upload-hint">
                  Supporta solo file .xlsx e .xls (max 10MB)
                </p>
              </Upload.Dragger>
            </Space>
          </Card>
        </div>
      )}

      {/* Step 1: Column Mapping */}
      {currentStep === 1 && (
        <div>
          <Card title="Mappatura Colonne Excel">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Mappa le colonne del tuo file Excel ai campi BOM"
                description="I campi marcati con * sono obbligatori"
                type="info"
                showIcon
              />

              <Space>
                <Button onClick={() => applyStandardMapping('italian')}>
                  Mappatura Standard (Italiano)
                </Button>
                <Button onClick={() => applyStandardMapping('english')}>
                  Mappatura Standard (English)
                </Button>
              </Space>

              <Form form={form} layout="vertical">
                {availableColumns.map((column: string) => (
                  <Form.Item
                    key={column}
                    label={`Colonna Excel: "${column}"`}
                    name={column}
                  >
                    <Select
                      placeholder="Seleziona campo BOM..."
                      allowClear
                      onChange={(value: string) => handleMappingChange(column, value)}
                    >
                      {bomFields.map(field => (
                        <Option key={field.value} value={field.value}>
                          {field.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                ))}
              </Form>

              <Space>
                <Button onClick={() => setCurrentStep(0)}>
                  Indietro
                </Button>
                <Button type="primary" onClick={validateFile}>
                  Valida File
                </Button>
              </Space>
            </Space>
          </Card>
        </div>
      )}

      {/* Step 2: Validation */}
      {currentStep === 2 && validationResult && (
        <div>
          <Card title="Risultato Validazione">
            <Space direction="vertical" style={{ width: '100%' }}>
              {validationResult.isValid ? (
                <Alert
                  message="File Valido"
                  description={`Il file è pronto per l'import. ${validationResult.totalRows} righe trovate.`}
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message="Errori Trovati"
                  description={`Il file contiene ${validationResult.errors.length} errori che devono essere corretti.`}
                  type="error"
                  showIcon
                />
              )}

              {validationResult.errors.length > 0 && (
                <div>
                  <Title level={5}>Errori di Validazione:</Title>
                  <Table
                    dataSource={validationResult.errors}
                    columns={errorColumns}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    rowKey={(record: any, index?: number) => `${record.row}-${index}`}
                  />
                </div>
              )}

              <Space>
                <Button onClick={() => setCurrentStep(1)}>
                  Modifica Mappatura
                </Button>
                <Button onClick={() => setCurrentStep(0)}>
                  Cambia File
                </Button>
                {validationResult.isValid && (
                  <Button
                    type="primary"
                    onClick={performImport}
                    loading={importing}
                  >
                    Procedi con Import
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        </div>
      )}

      {/* Step 3: Import Results */}
      {currentStep === 3 && importResult && (
        <div>
          <Card title="Risultato Import">
            <Space direction="vertical" style={{ width: '100%' }}>
              {importResult.success ? (
                <Alert
                  message="Import Completato"
                  description={`${importResult.successfulRows} righe importate con successo.`}
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message="Import Completato con Errori"
                  description={`${importResult.successfulRows}/${importResult.totalRows} righe importate. ${importResult.errors.length} errori.`}
                  type="warning"
                  showIcon
                />
              )}

              <div>
                <Text strong>Statistiche Import:</Text>
                <ul>
                  <li>Righe totali: {importResult.totalRows}</li>
                  <li>Righe importate: {importResult.successfulRows}</li>
                  <li>Errori: {importResult.errors.length}</li>
                  <li>Item creati: {importResult.createdItems.length}</li>
                </ul>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <Title level={5}>Errori Import:</Title>
                  <Table
                    dataSource={importResult.errors}
                    columns={errorColumns}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    rowKey={(record: any, index?: number) => `${record.row}-${index}`}
                  />
                </div>
              )}

              <Space>
                <Button onClick={handleClose}>
                  Chiudi
                </Button>
                <Button type="primary" onClick={() => {
                  handleClose();
                  onSuccess();
                }}>
                  Vai alla BOM
                </Button>
              </Space>
            </Space>
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default ExcelImportModal;