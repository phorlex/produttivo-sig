CREATE DATABASE IF NOT EXISTS sig_checklist
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Se quiser criar um usuario dedicado, descomente e ajuste a senha:
-- CREATE USER IF NOT EXISTS 'sig_user'@'localhost' IDENTIFIED BY 'sig_senha';
-- GRANT ALL PRIVILEGES ON sig_checklist.* TO 'sig_user'@'localhost';
-- FLUSH PRIVILEGES;
