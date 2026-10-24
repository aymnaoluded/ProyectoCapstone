-- Script BDD SupportAI (ajustado a lo que usa el backend)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ROL (
    id_rol  SERIAL PRIMARY KEY,
    nombre  VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ROL (nombre) VALUES ('Administrador'), ('Ejecutivo'), ('Cliente');

CREATE TABLE ESTADO_TICKET (
    id_estado  SERIAL PRIMARY KEY,
    estado     VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ESTADO_TICKET (estado) VALUES ('Pendiente'), ('En Proceso'), ('En Espera'), ('Resuelto'), ('Cerrado');

CREATE TABLE USUARIO (
    id_usuario       SERIAL PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    apellido         VARCHAR(100) NOT NULL,
    correo           VARCHAR(150) NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    ultima_conexion  TIMESTAMP DEFAULT NULL,
    rol              INT NOT NULL REFERENCES ROL(id_rol),
    cuenta_activada  BOOLEAN NOT NULL DEFAULT TRUE,
    version_sesion   INT NOT NULL DEFAULT 0
);

-- Contraseña de las 3 cuentas: Hola1234 (hash PBKDF2, formato salt$hash de security.py)
INSERT INTO USUARIO (nombre, apellido, correo, password, rol) VALUES
('Martin',   'Irarrazabal', 'mirarrazabal@gmail.com', 'bb1884737ac0200fb2b1a0242d3a636a$a8e330f0fc7e7d6590160f27eef098cc81a43fb5d2a4074ef860ce07125e5437', 1),
('Benjamin', 'Vega',        'bvega@gmail.com',        'e827a82b2108f247d6bef74885684597$2d940455f6964f3b55ace6525fa9599ac5ad5ffb7434966009dfffba9f281214', 2),
('Nicolas',  'Raguileo',    'nraguileo@gmail.com',    '9e79aec6658f4e474317a8fb11e6cf15$975d3925a801f90af843d11b956bcf8702f773c4b9c4dc16d08f5de8cd318550', 3);

CREATE TABLE TOKEN_ACTIVACION (
    id_token          SERIAL PRIMARY KEY,
    usuario_id        INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    token_hash        VARCHAR(64) NOT NULL UNIQUE,
    tipo_token        VARCHAR(30) NOT NULL DEFAULT 'ACTIVACION',
    fecha_creacion    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_expiracion  TIMESTAMPTZ NOT NULL,
    utilizado         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_tipo_token CHECK (tipo_token IN ('ACTIVACION', 'RECUPERACION'))
);

CREATE INDEX IF NOT EXISTS idx_token_activacion_usuario
ON TOKEN_ACTIVACION(usuario_id);

CREATE TABLE DOCUMENTO (
    id_documento  SERIAL PRIMARY KEY,
    titulo        VARCHAR(200) NOT NULL,
    ruta_archivo  VARCHAR(255) NOT NULL,
    fecha_carga   TIMESTAMP NOT NULL DEFAULT NOW(),
    admin_id      INT NOT NULL REFERENCES USUARIO(id_usuario),
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE FRAGMENTO (
    id_fragmento  SERIAL PRIMARY KEY,
    documento_id  INT NOT NULL REFERENCES DOCUMENTO(id_documento),
    contenido     TEXT NOT NULL,
    embedding     VECTOR(1024),
    orden         INT NOT NULL
);

CREATE TABLE CONVERSACION (
    id_conversacion  SERIAL PRIMARY KEY,
    cliente_id       INT NOT NULL REFERENCES USUARIO(id_usuario),
    fecha_inicio     TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin        TIMESTAMP,
    escalada         BOOLEAN NOT NULL DEFAULT FALSE,
    calificacion     INTEGER,
    titulo           VARCHAR(255)
);

CREATE TABLE TICKET (
    id_ticket           SERIAL PRIMARY KEY,
    titulo              VARCHAR(200) NOT NULL,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    ejecutivo_asignado  INT REFERENCES USUARIO(id_usuario),
    cliente             INT NOT NULL REFERENCES USUARIO(id_usuario),
    estado              INT NOT NULL REFERENCES ESTADO_TICKET(id_estado),
    conversacion_id     INT REFERENCES CONVERSACION(id_conversacion),
    descripcion         TEXT,
    calificacion        INT CHECK (calificacion BETWEEN 1 AND 5)
);

CREATE TABLE MENSAJE (
    id_mensaje             SERIAL PRIMARY KEY,
    conversacion_id        INT NOT NULL REFERENCES CONVERSACION(id_conversacion),
    emisor                 VARCHAR(20) NOT NULL, -- 'bot' | 'cliente' | 'ejecutivo'
    contenido              TEXT NOT NULL,
    fecha                  TIMESTAMP NOT NULL DEFAULT NOW(),
    fragmento_id           INT REFERENCES FRAGMENTO(id_fragmento),
    nivel_confianza        DECIMAL(4,3),
    requiere_escalamiento  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE log_auditoria (
    id_log      SERIAL PRIMARY KEY,
    usuario_id  INT NOT NULL REFERENCES USUARIO(id_usuario),
    accion      VARCHAR(100) NOT NULL,
    fecha       TIMESTAMP NOT NULL DEFAULT NOW(),
    detalle     TEXT
);

CREATE TABLE mensaje_fragmento (
    mensaje_id    INT NOT NULL REFERENCES MENSAJE(id_mensaje),
    fragmento_id  INT NOT NULL REFERENCES FRAGMENTO(id_fragmento),
    score         DECIMAL(4,3),
    PRIMARY KEY (mensaje_id, fragmento_id)
);

CREATE TABLE ticket_mensaje (
    id_ticket_mensaje  SERIAL PRIMARY KEY,
    ticket_id          INT NOT NULL REFERENCES TICKET(id_ticket),
    autor_id           INT NOT NULL REFERENCES USUARIO(id_usuario),
    contenido          TEXT NOT NULL,
    fecha              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fragmento_embedding
ON FRAGMENTO USING hnsw (embedding vector_cosine_ops);
