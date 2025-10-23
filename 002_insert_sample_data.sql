-- Migration 002: Insert sample data for development and testing
-- Created: 2024-01-01

-- Insert sample admin user (password: admin123)
INSERT INTO users (id, username, email, password_hash, role_id) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@bomapp.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 (SELECT id FROM roles WHERE name = 'admin'));

-- Insert sample progettista user (password: prog123)
INSERT INTO users (id, username, email, password_hash, role_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'progettista', 'prog@bomapp.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 (SELECT id FROM roles WHERE name = 'progettista'));

-- Insert sample project
INSERT INTO projects (id, name, description, budget, created_by) VALUES 
('660e8400-e29b-41d4-a716-446655440000', 'Motore V6 Turbo', 'Sviluppo nuovo motore V6 con turbocompressore', 50000.00, 
 '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample BOM items (matching the frontend demo data)
INSERT INTO bom_items (
    id, project_id, parent_id, part_number, description, quantity, item_type, 
    estimated_cost, rfq_status, rfq_date, moq, expected_delivery, obsolete, 
    procurement_status, actual_cost, received_date, level, path,
    supplier, manufacturer, category, revision, unit_of_measure, lead_time_days,
    critical_item, stock_quantity, reorder_point, lifecycle_status
) VALUES 
-- Level 0 - Main Assemblies
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', NULL, 
 'ASM-001', 'Assieme Principale Motore', 1, 'assembly', 1500.00, 'Inviata', 
 '2024-01-15', 1, '2024-03-15', false, 'in_progress', 1450.00, NULL, 0, '1',
 'Motori SRL', 'Engine Corp', 'Motori', 'Rev.A', 'pcs', 45, true, 2, 1, 'active'),

('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440000', NULL, 
 'ASM-002', 'Assieme Sistema Elettrico', 1, 'assembly', 350.00, 'In preparazione', 
 NULL, 1, '2024-04-01', false, 'pending', NULL, NULL, 0, '2',
 'Electronics SRL', 'ElectroTech', 'Elettronica', 'Rev.B', 'pcs', 30, false, 1, 1, 'active'),

-- Level 1 - Subassemblies under ASM-001
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 
 'SUB-001', 'Sottoassieme Testata Cilindri', 1, 'subassembly', 800.00, 'Ricevuta', 
 '2024-01-20', 1, '2024-02-28', false, 'completed', 780.00, '2024-02-25', 1, '1.1',
 'Testata SRL', 'CylinderHead Inc', 'Testate', 'Rev.C', 'pcs', 25, true, 3, 2, 'active'),

('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 
 'SUB-002', 'Sottoassieme Blocco Motore', 1, 'subassembly', 600.00, 'Inviata', 
 '2024-01-25', 1, '2024-03-10', false, 'pending', NULL, NULL, 1, '1.2'),

-- Level 2 - Parts under SUB-001
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 
 'PRT-001', 'Valvola di Aspirazione', 4, 'part', 45.50, 'In attesa', 
 NULL, 10, '2024-02-20', false, 'delayed', NULL, NULL, 2, '1.1.1'),

('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 
 'PRT-002', 'Valvola di Scarico', 4, 'part', 48.00, 'Approvata', 
 '2024-01-18', 10, '2024-02-15', false, 'completed', 46.50, '2024-02-12', 2, '1.1.2'),

-- Level 2 - Parts under SUB-002
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440005', 
 'PRT-003', 'Pistone Ø 85mm', 4, 'part', 120.00, 'Ricevuta', 
 NULL, 4, '2024-03-05', false, 'in_progress', NULL, NULL, 2, '1.2.1'),

('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440005', 
 'PRT-004-OLD', 'Biella Forgiata (OBSOLETA)', 4, 'part', 85.00, NULL, 
 NULL, NULL, NULL, true, 'pending', NULL, NULL, 2, '1.2.2'),

-- Level 1 - Parts under ASM-002
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440008', 
 'PRT-005', 'Centralina ECU', 1, 'part', 280.00, 'Inviata', 
 '2024-01-28', 1, '2024-03-30', false, 'in_progress', NULL, NULL, 1, '2.1'),

('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440008', 
 'PRT-006', 'Cablaggio Principale', 1, 'part', 65.00, NULL, 
 NULL, 5, '2024-03-25', false, 'pending', NULL, NULL, 1, '2.2');

-- Insert sample custom fields
INSERT INTO custom_fields (bom_item_id, field_name, field_value, field_type) VALUES 
('770e8400-e29b-41d4-a716-446655440003', 'fornitore', 'Valvole SRL', 'string'),
('770e8400-e29b-41d4-a716-446655440003', 'note', 'Verificare compatibilità con nuovo design', 'string'),
('770e8400-e29b-41d4-a716-446655440004', 'fornitore', 'Valvole SRL', 'string'),
('770e8400-e29b-41d4-a716-446655440006', 'fornitore', 'Pistoni Italia', 'string'),
('770e8400-e29b-41d4-a716-446655440006', 'revisione', 'Rev. C', 'string'),
('770e8400-e29b-41d4-a716-446655440009', 'fornitore', 'Electronics Corp', 'string'),
('770e8400-e29b-41d4-a716-446655440009', 'certificazione', 'ISO 26262', 'string');

-- Insert sample audit log entries
INSERT INTO audit_log (bom_item_id, user_id, action, old_values, new_values, ip_address) VALUES 
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'UPDATE', 
 '{"procurement_status": "in_progress"}', '{"procurement_status": "completed", "received_date": "2024-02-12", "actual_cost": 46.50}', 
 '192.168.1.100'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'UPDATE', 
 '{"procurement_status": "in_progress"}', '{"procurement_status": "completed", "received_date": "2024-02-25", "actual_cost": 780.00}', 
 '192.168.1.100'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'UPDATE', 
 '{"procurement_status": "in_progress"}', '{"procurement_status": "delayed"}', 
 '192.168.1.100');