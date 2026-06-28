-- BookFlow 初期スキーマ
-- H2 PostgreSQL 互換モードで動作する SQL のみ使用（jsonb・gen_random_uuid 等の PostgreSQL 固有機能は使用しない）

CREATE TABLE departments (
    id          UUID        NOT NULL,
    name        VARCHAR(100) NOT NULL,
    parent_id   UUID,
    CONSTRAINT pk_departments PRIMARY KEY (id),
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments (id)
);

CREATE TABLE users (
    id              UUID        NOT NULL,
    cognito_sub     VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    department_id   UUID        NOT NULL,
    role            VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_cognito_sub UNIQUE (cognito_sub),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT chk_users_role CHECK (role IN ('MEMBER', 'APPROVER', 'ADMIN'))
);

CREATE TABLE resources (
    id                  UUID        NOT NULL,
    name                VARCHAR(100) NOT NULL,
    category            VARCHAR(20)  NOT NULL,
    capacity            INTEGER,
    location            VARCHAR(200),
    requires_approval   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    description         TEXT,
    created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_resources PRIMARY KEY (id),
    CONSTRAINT chk_resources_category CHECK (category IN ('ROOM', 'EQUIPMENT', 'VEHICLE'))
);

CREATE TABLE reservations (
    id              UUID        NOT NULL,
    resource_id     UUID        NOT NULL,
    requester_id    UUID        NOT NULL,
    start_at        TIMESTAMP   NOT NULL,
    end_at          TIMESTAMP   NOT NULL,
    purpose         VARCHAR(255) NOT NULL,
    attendees_count INTEGER,
    status          VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_reservations PRIMARY KEY (id),
    CONSTRAINT fk_reservations_resource FOREIGN KEY (resource_id) REFERENCES resources (id),
    CONSTRAINT fk_reservations_requester FOREIGN KEY (requester_id) REFERENCES users (id),
    CONSTRAINT chk_reservations_status CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_reservations_time CHECK (end_at > start_at)
);

CREATE TABLE approval_steps (
    id              UUID        NOT NULL,
    reservation_id  UUID        NOT NULL,
    approver_id     UUID        NOT NULL,
    step_order      INTEGER     NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    comment         TEXT,
    decided_at      TIMESTAMP,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_approval_steps PRIMARY KEY (id),
    CONSTRAINT fk_approval_steps_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_approval_steps_approver FOREIGN KEY (approver_id) REFERENCES users (id),
    CONSTRAINT chk_approval_steps_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- インデックス
CREATE INDEX idx_reservations_resource_id ON reservations (resource_id);
CREATE INDEX idx_reservations_requester_id ON reservations (requester_id);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_approval_steps_reservation_id ON approval_steps (reservation_id);
CREATE INDEX idx_approval_steps_approver_id ON approval_steps (approver_id);
