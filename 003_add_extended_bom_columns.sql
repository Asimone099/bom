-- Migration 003: Add extended BOM columns based on requirements
-- Created: 2024-01-01

-- Add additional columns to bom_items table
ALTER TABLE bom_items ADD COLUMN supplier VARCHAR(255);
ALTER TABLE bom_items ADD COLUMN supplier_part_number VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN manufacturer VARCHAR(255);
ALTER TABLE bom_items ADD COLUMN manufacturer_part_number VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN revision VARCHAR(50);
ALTER TABLE bom_items ADD COLUMN notes TEXT;
ALTER TABLE bom_items ADD COLUMN unit_of_measure VARCHAR(20) DEFAULT 'pcs';
ALTER TABLE bom_items ADD COLUMN lead_time_days INTEGER;
ALTER TABLE bom_items ADD COLUMN category VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN subcategory VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN material VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN finish VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN weight_kg DECIMAL(10,4);
ALTER TABLE bom_items ADD COLUMN dimensions VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN tolerance VARCHAR(50);
ALTER TABLE bom_items ADD COLUMN critical_item BOOLEAN DEFAULT false;
ALTER TABLE bom_items ADD COLUMN substitute_part_number VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN compliance_standards TEXT;
ALTER TABLE bom_items ADD COLUMN environmental_rating VARCHAR(50);
ALTER TABLE bom_items ADD COLUMN lifecycle_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE bom_items ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE bom_items ADD COLUMN last_purchase_price DECIMAL(10,2);
ALTER TABLE bom_items ADD COLUMN inventory_location VARCHAR(100);
ALTER TABLE bom_items ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE bom_items ADD COLUMN reorder_point INTEGER DEFAULT 0;
ALTER TABLE bom_items ADD COLUMN safety_stock INTEGER DEFAULT 0;

-- Add indexes for new columns
CREATE INDEX idx_bom_items_supplier ON bom_items(supplier);
CREATE INDEX idx_bom_items_manufacturer ON bom_items(manufacturer);
CREATE INDEX idx_bom_items_category ON bom_items(category);
CREATE INDEX idx_bom_items_critical_item ON bom_items(critical_item);
CREATE INDEX idx_bom_items_lifecycle_status ON bom_items(lifecycle_status);
CREATE INDEX idx_bom_items_supplier_part_number ON bom_items(supplier_part_number);
CREATE INDEX idx_bom_items_manufacturer_part_number ON bom_items(manufacturer_part_number);

-- Add check constraints
ALTER TABLE bom_items ADD CONSTRAINT chk_lifecycle_status 
    CHECK (lifecycle_status IN ('active', 'obsolete', 'discontinued', 'development', 'prototype'));

ALTER TABLE bom_items ADD CONSTRAINT chk_lead_time_positive 
    CHECK (lead_time_days >= 0);

ALTER TABLE bom_items ADD CONSTRAINT chk_weight_positive 
    CHECK (weight_kg >= 0);

ALTER TABLE bom_items ADD CONSTRAINT chk_stock_quantities_positive 
    CHECK (stock_quantity >= 0 AND reorder_point >= 0 AND safety_stock >= 0);

-- Update existing records with default values where appropriate
UPDATE bom_items SET 
    unit_of_measure = 'pcs' WHERE unit_of_measure IS NULL,
    lifecycle_status = 'active' WHERE lifecycle_status IS NULL,
    stock_quantity = 0 WHERE stock_quantity IS NULL,
    reorder_point = 0 WHERE reorder_point IS NULL,
    safety_stock = 0 WHERE safety_stock IS NULL,
    critical_item = false WHERE critical_item IS NULL;

-- Create view for complete BOM information
CREATE OR REPLACE VIEW v_bom_complete AS
SELECT 
    b.*,
    p.name as project_name,
    p.description as project_description,
    COALESCE(
        json_agg(
            json_build_object(
                'id', cf.id,
                'fieldName', cf.field_name,
                'fieldValue', cf.field_value,
                'fieldType', cf.field_type
            )
        ) FILTER (WHERE cf.id IS NOT NULL), 
        '[]'::json
    ) as custom_fields,
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'filename', a.filename,
                'originalName', a.original_name,
                'mimeType', a.mime_type,
                'fileSize', a.file_size,
                'uploadedAt', a.uploaded_at
            )
        ) FILTER (WHERE a.id IS NOT NULL), 
        '[]'::json
    ) as attachments
FROM bom_items b
LEFT JOIN projects p ON b.project_id = p.id
LEFT JOIN custom_fields cf ON b.id = cf.bom_item_id
LEFT JOIN attachments a ON b.id = a.bom_item_id
GROUP BY b.id, p.id;

-- Add comments for documentation
COMMENT ON COLUMN bom_items.supplier IS 'Nome del fornitore principale';
COMMENT ON COLUMN bom_items.supplier_part_number IS 'Codice parte del fornitore';
COMMENT ON COLUMN bom_items.manufacturer IS 'Nome del produttore originale';
COMMENT ON COLUMN bom_items.manufacturer_part_number IS 'Codice parte del produttore';
COMMENT ON COLUMN bom_items.revision IS 'Revisione del componente';
COMMENT ON COLUMN bom_items.notes IS 'Note aggiuntive sul componente';
COMMENT ON COLUMN bom_items.unit_of_measure IS 'Unità di misura (pcs, kg, m, etc.)';
COMMENT ON COLUMN bom_items.lead_time_days IS 'Tempo di consegna in giorni';
COMMENT ON COLUMN bom_items.category IS 'Categoria principale del componente';
COMMENT ON COLUMN bom_items.subcategory IS 'Sottocategoria del componente';
COMMENT ON COLUMN bom_items.material IS 'Materiale del componente';
COMMENT ON COLUMN bom_items.finish IS 'Finitura superficiale';
COMMENT ON COLUMN bom_items.weight_kg IS 'Peso in chilogrammi';
COMMENT ON COLUMN bom_items.dimensions IS 'Dimensioni del componente';
COMMENT ON COLUMN bom_items.tolerance IS 'Tolleranze dimensionali';
COMMENT ON COLUMN bom_items.critical_item IS 'Indica se è un componente critico';
COMMENT ON COLUMN bom_items.substitute_part_number IS 'Codice parte sostitutiva';
COMMENT ON COLUMN bom_items.compliance_standards IS 'Standard di conformità applicabili';
COMMENT ON COLUMN bom_items.environmental_rating IS 'Classificazione ambientale';
COMMENT ON COLUMN bom_items.lifecycle_status IS 'Stato del ciclo di vita del prodotto';
COMMENT ON COLUMN bom_items.inventory_location IS 'Ubicazione in magazzino';
COMMENT ON COLUMN bom_items.stock_quantity IS 'Quantità disponibile in magazzino';
COMMENT ON COLUMN bom_items.reorder_point IS 'Punto di riordino';
COMMENT ON COLUMN bom_items.safety_stock IS 'Scorta di sicurezza';