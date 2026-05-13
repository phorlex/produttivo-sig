CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  permissions JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id CHAR(36) NOT NULL,
  store VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id CHAR(36) PRIMARY KEY,
  plate VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(120),
  model VARCHAR(120),
  version VARCHAR(160),
  year INT,
  color VARCHAR(80),
  mileage INT,
  store VARCHAR(120),
  status VARCHAR(80),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36),
  scoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_templates_users FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS checklist_categories (
  id CHAR(36) PRIMARY KEY,
  template_id CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  scoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_templates FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_questions (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  response_type VARCHAR(60) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
  min_photos INT NOT NULL DEFAULT 0,
  max_photos INT,
  allows_observation BOOLEAN NOT NULL DEFAULT TRUE,
  observation_required BOOLEAN NOT NULL DEFAULT FALSE,
  scoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  score_weight DECIMAL(10,2) NOT NULL DEFAULT 1,
  `condition` JSON,
  config JSON,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_categories FOREIGN KEY (category_id) REFERENCES checklist_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_options (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  label VARCHAR(180) NOT NULL,
  value VARCHAR(180) NOT NULL,
  score DECIMAL(10,2),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_options_questions FOREIGN KEY (question_id) REFERENCES checklist_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_submissions (
  id CHAR(36) PRIMARY KEY,
  report_number VARCHAR(80) UNIQUE NOT NULL,
  template_id CHAR(36) NOT NULL,
  vehicle_id CHAR(36),
  user_id CHAR(36) NOT NULL,
  store VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  total_score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  metadata JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_submissions_templates FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
  CONSTRAINT fk_submissions_vehicles FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_submissions_users FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS checklist_answers (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  value JSON,
  observation TEXT,
  score DECIMAL(10,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_submission_question (submission_id, question_id),
  CONSTRAINT fk_answers_submissions FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_questions FOREIGN KEY (question_id) REFERENCES checklist_questions(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) NOT NULL,
  answer_id CHAR(36),
  question_id CHAR(36),
  kind VARCHAR(40) NOT NULL DEFAULT 'photo',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size INT NOT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  uploaded_by CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachments_submissions FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachments_answers FOREIGN KEY (answer_id) REFERENCES checklist_answers(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachments_questions FOREIGN KEY (question_id) REFERENCES checklist_questions(id),
  CONSTRAINT fk_attachments_users FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS signatures (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) NOT NULL,
  answer_id CHAR(36),
  signer_name VARCHAR(180) NOT NULL,
  signer_role VARCHAR(120),
  image_path VARCHAR(500) NOT NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_signatures_submissions FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_signatures_answers FOREIGN KEY (answer_id) REFERENCES checklist_answers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) NOT NULL,
  report_number VARCHAR(80) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  generated_by CHAR(36),
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_submissions FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_users FOREIGN KEY (generated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(120) NOT NULL,
  entity VARCHAR(120),
  entity_id CHAR(36),
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_users FOREIGN KEY (user_id) REFERENCES users(id)
);
