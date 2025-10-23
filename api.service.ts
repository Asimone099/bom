import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { BOMItem, BOMFilterCriteria, CreateBOMItemDto, UpdateBOMItemDto } from '../types/bom.types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Determina l'URL dell'API basato sull'ambiente
    let apiUrl: string;
    
    // In produzione, usa lo stesso dominio (stesso server serve frontend e backend)
    if (import.meta.env.PROD) {
      apiUrl = window.location.origin;
    } else {
      // In sviluppo, usa le variabili ambiente o fallback locale
      apiUrl = import.meta.env.VITE_API_URL || 
               import.meta.env.REACT_APP_API_URL || 
               'http://localhost:5001';
    }
    
    this.api = axios.create({
      baseURL: `${apiUrl}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // BOM API methods
  async getBOMTree(projectId: string): Promise<BOMItem[]> {
    const response = await this.api.get<ApiResponse<BOMItem[]>>(`/projects/${projectId}/bom`);
    return response.data.data || [];
  }

  async searchBOM(projectId: string, filters: BOMFilterCriteria): Promise<BOMItem[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await this.api.get<ApiResponse<BOMItem[]>>(
      `/projects/${projectId}/bom/search?${params.toString()}`
    );
    return response.data.data || [];
  }

  async createBOMItem(projectId: string, item: Omit<CreateBOMItemDto, 'projectId'>): Promise<BOMItem> {
    const response = await this.api.post<ApiResponse<BOMItem>>(
      `/projects/${projectId}/bom`,
      item
    );
    return response.data.data!;
  }

  async updateBOMItem(id: string, item: UpdateBOMItemDto): Promise<BOMItem> {
    const response = await this.api.put<ApiResponse<BOMItem>>(
      `/bom-items/${id}`,
      item
    );
    return response.data.data!;
  }

  async deleteBOMItem(id: string): Promise<void> {
    await this.api.delete(`/bom-items/${id}`);
  }

  async getBOMItem(id: string): Promise<BOMItem> {
    const response = await this.api.get<ApiResponse<BOMItem>>(`/bom-items/${id}`);
    return response.data.data!;
  }

  async getTotalQuantities(projectId: string): Promise<Record<string, number>> {
    const response = await this.api.get<ApiResponse<Record<string, number>>>(
      `/projects/${projectId}/bom/quantities`
    );
    return response.data.data || {};
  }

  async getDuplicatePartNumbers(projectId: string): Promise<string[]> {
    const response = await this.api.get<ApiResponse<string[]>>(
      `/projects/${projectId}/bom/duplicates`
    );
    return response.data.data || [];
  }

  // Excel Import/Export methods
  async importExcel(projectId: string, file: File, mapping: Record<string, string>, options?: {
    skipFirstRow?: boolean;
    validateOnly?: boolean;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (options?.skipFirstRow !== undefined) {
      formData.append('skipFirstRow', options.skipFirstRow.toString());
    }
    if (options?.validateOnly !== undefined) {
      formData.append('validateOnly', options.validateOnly.toString());
    }

    const response = await this.api.post<ApiResponse>(
      `/projects/${projectId}/import-excel`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async validateExcel(projectId: string, file: File, mapping: Record<string, string>): Promise<any> {
    return this.importExcel(projectId, file, mapping, { validateOnly: true });
  }

  async exportExcel(projectId: string, options?: {
    includeHierarchy?: boolean;
    includeCustomFields?: boolean;
    filters?: any;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.includeHierarchy !== undefined) {
      params.append('includeHierarchy', options.includeHierarchy.toString());
    }
    if (options?.includeCustomFields !== undefined) {
      params.append('includeCustomFields', options.includeCustomFields.toString());
    }
    if (options?.filters) {
      params.append('filters', JSON.stringify(options.filters));
    }

    const response = await this.api.get(
      `/projects/${projectId}/export-excel?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async exportKPIReport(projectId: string): Promise<Blob> {
    const response = await this.api.get(
      `/projects/${projectId}/export-kpi-report`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async downloadImportTemplate(): Promise<Blob> {
    const response = await this.api.get('/excel/import-template', {
      responseType: 'blob',
    });
    return response.data;
  }

  async getStandardColumnMappings(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/excel/column-mappings');
    return response.data.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Usa l'URL base configurato per l'health check
      let apiUrl: string;
      
      if (import.meta.env.PROD) {
        apiUrl = window.location.origin;
      } else {
        apiUrl = import.meta.env.VITE_API_URL || 
                 import.meta.env.REACT_APP_API_URL || 
                 'http://localhost:5001';
      }
      
      const response = await axios.get(`${apiUrl}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export default new ApiService();