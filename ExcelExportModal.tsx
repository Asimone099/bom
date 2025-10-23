import React, { useState } from 'react';
import {
  Modal,
  Form,
  Checkbox,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Alert,
  message
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import ApiService from '../services/api.service';
import type { BOMFilterCriteria } from '../types/bom.types';

const { Title, Text } = Typography;

interface ExcelExportModalProps {
  visible: boolean;
  projectId: string;
  currentFilters?: BOMFilterCriteria;
  onClose: () => void;
}

const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  visible,
  projectId,
  currentFilters,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [form] = Form.useForm();

  const handleExportBOM = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      
      const options = {
        includeHierarchy: values.includeHierarchy,
        includeCustomFields: values.includeCustomFields,
        filters: values.applyCurrentFilters ? currentFilters : undefined
      };

      const blob = await ApiService.exportExcel(projectId, options);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filterSuffix = values.applyCurrentFilters ? '_Filtered' : '';
      link.download = `BOM_Export_${timestamp}${filterSuffix}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Export BOM completato con successo');
      onClose();
    } catch (error) {
      message.error('Errore durante l\'export BOM');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportKPI = async () => {
    setKpiLoading(true);
    try {
      const blob = await ApiService.exportKPIReport(projectId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `KPI_Report_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Export KPI Report completato con successo');
      onClose();
    } catch (error) {
      message.error('Errore durante l\'export KPI Report');
      console.error('KPI export error:', error);
    } finally {
      setKpiLoading(false);
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

  const hasActiveFilters = currentFilters && Object.keys(currentFilters).some(
    key => currentFilters[key as keyof BOMFilterCriteria] !== undefined && 
           currentFilters[key as keyof BOMFilterCriteria] !== null && 
           currentFilters[key as keyof BOMFilterCriteria] !== ''
  );

  return (
    <Modal
      title="Export Excel"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={null}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* BOM Export Section */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <FileExcelOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
              <Title level={4} style={{ margin: 0 }}>Export Distinta Base (BOM)</Title>
            </div>

            <Text type="secondary">
              Esporta la distinta base completa o filtrata in formato Excel
            </Text>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                includeHierarchy: true,
                includeCustomFields: false,
                applyCurrentFilters: hasActiveFilters
              }}
            >
              <Form.Item name="includeHierarchy" valuePropName="checked">
                <Checkbox>
                  Includi struttura gerarchica (indentazione per livelli)
                </Checkbox>
              </Form.Item>

              <Form.Item name="includeCustomFields" valuePropName="checked">
                <Checkbox>
                  Includi campi personalizzati
                </Checkbox>
              </Form.Item>

              {hasActiveFilters && (
                <Form.Item name="applyCurrentFilters" valuePropName="checked">
                  <Checkbox>
                    Applica filtri correnti ({Object.keys(currentFilters!).length} filtri attivi)
                  </Checkbox>
                </Form.Item>
              )}

              {!hasActiveFilters && (
                <Alert
                  message="Nessun filtro attivo"
                  description="Verrà esportata l'intera distinta base del progetto"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </Form>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportBOM}
              loading={loading}
              block
            >
              Esporta BOM
            </Button>
          </Space>
        </Card>

        {/* KPI Report Section */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <BarChartOutlined style={{ fontSize: 24, color: '#52c41a', marginRight: 8 }} />
              <Title level={4} style={{ margin: 0 }}>Export Report KPI</Title>
            </div>

            <Text type="secondary">
              Esporta un report completo con KPI, metriche e analisi della commessa
            </Text>

            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12 }}>
              <Text strong>Il report KPI include:</Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>Statistiche generali (totale item, completamento, ritardi)</li>
                <li>Metriche economiche (costi stimati vs effettivi)</li>
                <li>Distinta base completa con dettagli</li>
                <li>Analisi parti critiche e obsolete</li>
              </ul>
            </div>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportKPI}
              loading={kpiLoading}
              block
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Esporta Report KPI
            </Button>
          </Space>
        </Card>

        <Divider>Template e Utilità</Divider>

        {/* Template Section */}
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Template Import Excel</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Scarica il template Excel con formato e istruzioni per l'import
            </Text>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadTemplate}
              size="small"
              block
            >
              Scarica Template
            </Button>
          </Space>
        </Card>

        {/* Footer Actions */}
        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Button onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </Space>
    </Modal>
  );
};

export default ExcelExportModal;