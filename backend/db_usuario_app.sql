-- Usuario de base de datos con permisos mínimos para el backend de SupportAI.
-- Ejecutar conectado como superusuario (postgres) sobre la base supportai_db,
-- pasando la contraseña como variable para no guardarla en el repositorio:
--
--   psql -U postgres -d supportai_db -v app_password='CONTRASEÑA_SEGURA' -f db_usuario_app.sql
--
-- Luego usar en el .env:
--   DATABASE_URL="postgresql://supportai_app:CONTRASEÑA_SEGURA@localhost:5432/supportai_db"

CREATE ROLE supportai_app LOGIN PASSWORD :'app_password';

-- Solo puede conectarse a esta base y usar el esquema public (sin crear tablas)
GRANT CONNECT ON DATABASE supportai_db TO supportai_app;
GRANT USAGE ON SCHEMA public TO supportai_app;

-- Lectura y escritura de datos en todas las tablas; nunca cambiar su estructura
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO supportai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supportai_app;

-- El log de auditoría solo se lee y se agrega: la aplicación no puede modificarlo ni borrarlo
REVOKE UPDATE, DELETE ON log_auditoria FROM supportai_app;

-- Las tablas que se creen más adelante (como postgres) reciben los mismos permisos
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO supportai_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO supportai_app;
