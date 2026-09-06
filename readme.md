# SupportAI - Plataforma Inteligente de Soporte y RAG

Plataforma modular y escalable para gestión de soporte al cliente impulsada por Inteligencia Artificial (RAG con pgvector + Google Gemini), desarrollada con **FastAPI** en el backend y **React (Vite + TypeScript + Tailwind CSS)** en el frontend.

---

## 👥 Cuentas de Prueba Preconfiguradas

Para probar los diferentes roles y flujos del sistema:

| Rol | Correo | Contraseña | Vistas y Funciones Clave |
| :--- | :--- | :--- | :--- |
| **Administrador** | `mirarrazabal@gmail.com` | `Hola1234` | Base de conocimiento (RAG), Gestión de usuarios en línea, Logs de auditoría, Métricas. |
| **Ejecutivo** | `bvega@gmail.com` | `Hola1234` | Bandeja de tickets de soporte, atención de conversaciones escaladas. |
| **Cliente** | `nraguileo@gmail.com` | `Hola1234` | Chat con IA interactivo, consulta de estado de tickets propios. |

> **Nota:** Para probar dos roles al mismo tiempo (ej: Cliente y Ejecutivo), utiliza una ventana estándar y una **ventana de incógnito** o navegadores distintos.

---

## 📋 Requisitos Previos

Asegúrate de tener instaladas las siguientes herramientas en tu equipo:

1. **Python 3.10+**: [Descargar Python](https://www.python.org/)
2. **Node.js 18+ y npm**: [Descargar Node.js](https://nodejs.org/)
3. **PostgreSQL 14+ con extensión `pgvector` activada**.
4. **Git**: [Descargar Git](https://git-scm.com/)

---

## 🗄️ Configuración de la Base de Datos (PostgreSQL)

1. Crea la base de datos para el proyecto (por ejemplo, `supportai_db`).
2. Conéctate a ella y asegúrate de activar la extensión vectorial:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
---

## ⚙️ Paso 1: Puesta en Marcha del Backend (FastAPI)

1. Abre una terminal y navega hasta la carpeta `backend`:
   ```bash
   cd backend
   ```

2. Crea y activa el entorno virtual de Python:
   * **En Windows (PowerShell):**
     ```powershell
     python -m venv venv
     
     .\venv\Scripts\Activate.ps1
     ```
   * **En Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Instala las dependencias del proyecto:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura las variables de entorno:
   Crea o verifica el archivo `.env` en la raíz de `backend/` con las credenciales correspondientes:
   ```env
    DATABASE_URL="postgresql://usuario:password@localhost:5432/base_de_datos"
    COHERE_API_KEY=""
    GEMINI_API_KEY=""
   ```

5. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   * El backend quedará escuchando en: `http://localhost:8000`
   * Documentación interactiva Swagger: `http://localhost:8000/docs`

---

## 💻 Paso 2: Puesta en Marcha del Frontend (React + Vite)

1. Abre **otra terminal** y dirígete a la carpeta `frontend`:
   ```bash
   cd frontend
   ```

2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```

3. Inicia el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   * La aplicación estará disponible en: `http://localhost:5173`

---

## 🔒 Consideraciones de Seguridad y Buenas Prácticas

* **Sesión en Navegador:** La información de usuario en `localStorage` se almacena bajo `user_session` de manera ofuscada/cifrada para prevenir exposición de datos sensibles.
* **Control de Acceso Basado en Roles (RBAC):** La interfaz y los endpoints validan privilegios según el perfil (`Administrador`, `Ejecutivo`, `Cliente`).
* **Presencia en Tiempo Real:** El frontend envía pulsos automáticos (`heartbeat`) cada 60 segundos para refrescar `ultima_conexion` en PostgreSQL y determinar si una cuenta está activa.
* **Trazabilidad:** Cualquier evento sensible (`LOGIN`, `LOGOUT`, `SUBIDA_DOCUMENTO`, `TOGGLE_DOCUMENTO`, `CREACION_TICKET`) se registra inmutablemente en la tabla `log_auditoria`.