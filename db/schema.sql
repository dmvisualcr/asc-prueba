-- Base de datos de asociados (Cloudflare D1).
-- Se ejecuta UNA vez al crear la base. Es seguro volver a correrlo: no borra nada.

CREATE TABLE IF NOT EXISTS socios (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_socio        TEXT NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  correo              TEXT NOT NULL,
  telefono            TEXT,
  fecha_nacimiento    TEXT,                          -- AAAA-MM-DD
  sector              TEXT,
  tipo_membresia      TEXT,
  vencimiento         TEXT,                          -- AAAA-MM-DD
  estado              TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  consentimiento_en   TEXT,                          -- cuándo aceptó el aviso de privacidad
  cuenta_activada_en  TEXT,                          -- primer ingreso exitoso
  ultimo_acceso       TEXT,
  creado_en           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_socios_correo ON socios (lower(correo));

-- Códigos de 6 dígitos (solo se guarda su huella, nunca el código)
CREATE TABLE IF NOT EXISTS codigos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id     INTEGER NOT NULL REFERENCES socios (id) ON DELETE CASCADE,
  codigo_hash  TEXT NOT NULL,
  expira_en    INTEGER NOT NULL,
  intentos     INTEGER NOT NULL DEFAULT 0,
  usado        INTEGER NOT NULL DEFAULT 0,
  creado_en    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codigos_socio ON codigos (socio_id, creado_en);

-- Sesiones abiertas (solo se guarda la huella del token de la cookie)
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash  TEXT PRIMARY KEY,
  socio_id    INTEGER NOT NULL REFERENCES socios (id) ON DELETE CASCADE,
  expira_en   INTEGER NOT NULL,
  creado_en   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sesiones_socio ON sesiones (socio_id);
