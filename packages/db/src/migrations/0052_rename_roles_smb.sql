-- Rename C-suite and tech roles to SMB-friendly equivalents
UPDATE agents SET role = 'gm'      WHERE role = 'ceo';
UPDATE agents SET role = 'manager' WHERE role = 'cto';
UPDATE agents SET role = 'sales'   WHERE role = 'cmo';
UPDATE agents SET role = 'finance' WHERE role = 'cfo';
UPDATE agents SET role = 'support' WHERE role = 'qa';
UPDATE agents SET role = 'admin'   WHERE role = 'devops';
