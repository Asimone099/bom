-- Migration 001: Create core tables for BOM Management System
-- Created: 2024-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ROLES table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create USERS table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create PROJECTS table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    budget DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Create BOM_ITEMS table
CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES bom_items(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('assembly', 'subassembly', 'part')),
    estimated_cost DECIMAL(10,2) CHECK (estimated_cost >= 0),
    rfq_status VARCHAR(100),
    rfq_date TIMESTAMP WITH TIME ZONE,
    moq INTEGER CHECK (moq > 0),
    expected_delivery TIMESTAMP WITH TIME ZONE,
    obsolete BOOLEAN DEFAULT false,
    procurement_status VARCHAR(20) DEFAULT 'pending' CHECK (procurement_status IN ('pending', 'in_progress', 'completed', 'delayed')),
    actual_cost DECIMAL(10,2) CHECK (actual_cost >= 0),
    received_date TIMESTAMP WITH TIME ZONE,
    level INTEGER NOT NULL DEFAULT 0,
    path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure part number is unique within a project
    CONSTRAINT unique_part_number_per_project UNIQUE (project_id, part_number)
);

-- Create CUSTOM_FIELDS table
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('string', 'number', 'date', 'boolean', 'select')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ATTACHMENTS table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

-- Create AUDIT_LOG table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_item_id UUID REFERENCES bom_items(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Create indexes for performance
CREATE INDEX idx_bom_items_project_id ON bom_items(project_id);
CREATE INDEX idx_bom_items_parent_id ON bom_items(parent_id);
CREATE INDEX idx_bom_items_part_number ON bom_items(part_number);
CREATE INDEX idx_bom_items_path ON bom_items(path);
CREATE INDEX idx_bom_items_item_type ON bom_items(item_type);
CREATE INDEX idx_bom_items_procurement_status ON bom_items(procurement_status);
CREATE INDEX idx_bom_items_obsolete ON bom_items(obsolete);
CREATE INDEX idx_custom_fields_bom_item_id ON custom_fields(bom_item_id);
CREATE INDEX idx_attachments_bom_item_id ON attachments(bom_item_id);
CREATE INDEX idx_audit_log_bom_item_id ON audit_log(bom_item_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (name, permissions, description) VALUES 
('admin', '{"all": true}', 'Amministratore sistema con accesso completo'),
('progettista', '{"bom": {"read": true, "write": true}, "projects": {"read": true, "write": true}}', 'Progettista con accesso completo a BOM e progetti'),
('acquisti', '{"bom": {"read": true, "write": true}, "procurement": {"read": true, "write": true}}', 'Responsabile acquisti con accesso a procurement'),
('produzione', '{"bom": {"read": true}, "production": {"read": true, "write": true}}', 'Produzione con accesso in lettura BOM');

-- Create function to calculate BOM path
CREATE OR REPLACE FUNCTION calculate_bom_path(item_id UUID, parent_path VARCHAR DEFAULT '')
RETURNS VARCHAR AS $$
DECLARE
    current_level INTEGER;
    new_path VARCHAR;
BEGIN
    -- Get current level from parent
    IF parent_path = '' THEN
        current_level := 0;
        new_path := '1';
    ELSE
        SELECT level + 1 INTO current_level FROM bom_items WHERE id = (
            SELECT parent_id FROM bom_items WHERE id = item_id
        );
        
        -- Calculate next sibling number
        SELECT COALESCE(MAX(CAST(split_part(path, '.', array_length(string_to_array(path, '.'), 1)) AS INTEGER)), 0) + 1
        INTO current_level
        FROM bom_items 
        WHERE parent_id = (SELECT parent_id FROM bom_items WHERE id = item_id)
        AND id != item_id;
        
        new_path := parent_path || '.' || current_level::VARCHAR;
    END IF;
    
    RETURN new_path;
END;
$$ LANGUAGE plpgsql;