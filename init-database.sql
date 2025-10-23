-- Script di inizializzazione database BOM Management
-- Esegui questo script per creare tutte le tabelle necessarie

-- Elimina tabelle esistenti (se presenti)
DROP TABLE IF EXISTS bom_items CASCADE;
DROP TABLE IF EXISTS bom_headers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tabella utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'viewer',
    permissions TEXT[] DEFAULT ARRAY['read'],
    provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella header BOM
CREATE TABLE bom_headers (
    id SERIAL PRIMARY KEY,
    bom_number VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella items BOM
CREATE TABLE bom_items (
    id SERIAL PRIMARY KEY,
    bom_header_id INTEGER REFERENCES bom_headers(id) ON DELETE CASCADE,
    item_number VARCHAR(100) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'pcs',
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    supplier VARCHAR(255),
    lead_time INTEGER,
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_bom_headers_number ON bom_headers(bom_number);
CREATE INDEX idx_bom_items_header_id ON bom_items(bom_header_id);
CREATE INDEX idx_bom_items_number ON bom_items(item_number);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_headers_updated_at BEFORE UPDATE ON bom_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserisci utenti di default
INSERT INTO users (email, name, role, permissions, provider) VALUES
('a.simone@powerflex.it', 'A. Simone', 'admin', 
 ARRAY['read', 'write', 'delete', 'manage_users', 'system_settings', 'export', 'import'], 'system'),
('g.bejenaru.powerflex@gmail.com', 'Gabriel Bejenaru', 'manager', 
 ARRAY['read', 'write', 'delete', 'export', 'import'], 'system');

-- Inserisci BOM di esempio
INSERT INTO bom_headers (bom_number, description, version, status, created_by) VALUES
('BOM-001', 'Esempio Distinta Base Elettronica', '1.0', 'active', 1),
('BOM-002', 'Esempio Distinta Base Meccanica', '1.0', 'draft', 1);

-- Inserisci items di esempio per BOM-001
INSERT INTO bom_items (bom_header_id, item_number, description, quantity, unit, unit_cost, total_cost, supplier, category) VALUES
(1, 'R001', 'Resistenza 10K Ohm', 10, 'pcs', 0.05, 0.50, 'Farnell', 'Elettronica'),
(1, 'C001', 'Condensatore 100nF', 5, 'pcs', 0.10, 0.50, 'Mouser', 'Elettronica'),
(1, 'IC001', 'Microcontrollore Arduino Nano', 1, 'pcs', 15.00, 15.00, 'Arduino Store', 'Elettronica'),
(1, 'PCB001', 'Circuito Stampato Personalizzato', 1, 'pcs', 25.00, 25.00, 'PCBWay', 'PCB');

-- Inserisci items di esempio per BOM-002
INSERT INTO bom_items (bom_header_id, item_number, description, quantity, unit, unit_cost, total_cost, supplier, category) VALUES
(2, 'SCREW001', 'Vite M3x10mm', 20, 'pcs', 0.02, 0.40, 'Würth', 'Meccanica'),
(2, 'PLATE001', 'Piastra Alluminio 100x50x2mm', 2, 'pcs', 5.00, 10.00, 'Metalli SRL', 'Meccanica'),
(2, 'BEARING001', 'Cuscinetto 608ZZ', 4, 'pcs', 2.50, 10.00, 'SKF', 'Meccanica');

-- Visualizza riepilogo
SELECT 'Database inizializzato con successo!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_bom_headers FROM bom_headers;
SELECT COUNT(*) as total_bom_items FROM bom_items;