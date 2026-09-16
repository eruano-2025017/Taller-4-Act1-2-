# Control de Gastos — Kinal Finance

**Kinal Finance** es una plataforma integral de gestión financiera y contable personal. Permite registrar y monitorear ingresos y egresos en tiempo real, clasificar transacciones con categorías personalizadas, emitir facturas electrónicas con formato fiscal, analizar la salud financiera mediante métricas avanzadas y mantener la seguridad mediante autenticación dual (credenciales tradicionales + Google OAuth 2.0) y control de sesión por inactividad.

El proyecto está estructurado como un **monorepo con pnpm workspaces**, separando de forma limpia el backend (Node.js + Express con TypeScript y SQL nativo) del frontend (Angular 18 con Signals reactivos y Tailwind CSS).

---

## Tecnologías Utilizadas

### Backend
* **Node.js & Express:** Servidor API REST desarrollado íntegramente en TypeScript.
* **PostgreSQL:** Base de datos relacional robusta para el almacenamiento de usuarios, transacciones, categorías, facturas y registros de auditoría/actividades.
* **Librería `pg` (node-postgres):** Consultas SQL puras y parametrizadas para máxima eficiencia, control de tipos y prevención estricta de inyecciones SQL, sin capas de ORM intermedias.
* **JWT (JSON Web Tokens) & bcryptjs:** Emisión y validación de tokens de sesión con expiración configurable y encriptación unidireccional de contraseñas mediante hashing con sal.
* **Google Identity Services (OAuth 2.0):** Validación y decodificación de credenciales JWT emitidas por Google con aprovisionamiento automático de cuentas.
* **Zod:** Validación y tipado estricto de los esquemas de entrada en los endpoints de la API.
* **CORS & Dotenv:** Manejo seguro de orígenes cruzados y variables de entorno.

### Frontend
* **Angular 18:** Arquitectura moderna basada en *Standalone Components*, *Signals* reactivos (`signal`, `computed`, `effect`), y formularios con *Reactive Forms* y *FormsModule*.
* **Tailwind CSS:** Diseño adaptable (responsive), moderno y minimalista con estética *Glassmorphism*, microinteracciones y paleta de colores personalizada.
* **Gráficas Nativas (Zero Dependencias):** Visualizaciones de evolución mensual construidas con porcentajes dinámicos de CSS y diagramas de dona/distribución vectoriales mediante `<svg>` nativo, garantizando un bundle ultraligero sin librerías externas pesadas.
* **Control de Sesión Preventivo:** Sistema reactivo de detección de actividad del usuario con ventana flotante de advertencia y renovación silenciosa (*token refresh*).
* **Soporte de Impresión Fiscal:** Formato de Facturación Electrónica con hojas de estilo específicas para impresión directa y exportación a PDF (`@media print`).

### Herramientas y Monorepo
* **pnpm & Workspaces:** Gestión centralizada de dependencias compartidas y scripts de ejecución entre cliente y servidor.
* **TypeScript:** Tipado estático de extremo a extremo tanto en la API como en la aplicación web.

---

## Estructura del Repositorio

El monorepo organiza las responsabilidades en dos áreas principales:

```text
control-de-gastos/
├── backend/
│   ├── src/
│   │   ├── config/              # Conexión a PostgreSQL (Pool singleton con pg)
│   │   ├── db/                  # Scripts de inicialización, seed y migraciones SQL
│   │   │   ├── migrations/      # Scripts SQL (001_init, 002_transactions, 003_activities)
│   │   │   ├── init.ts          # Inicializador automático e idempotente de tablas e índices
│   │   │   └── seed.ts          # Carga de usuarios y datos de prueba
│   │   ├── middlewares/         # Middlewares globales (autenticación JWT: verificarToken)
│   │   ├── modules/             # Módulos de la arquitectura por dominio
│   │   │   ├── activity/        # Registro de actividades y centro de notificaciones
│   │   │   ├── analysis/        # Métricas financieras, balances y comparativas mensuales
│   │   │   ├── auth/            # Login tradicional, Google OAuth y renovación de tokens
│   │   │   ├── category/        # CRUD de categorías personalizadas e índices únicos
│   │   │   ├── common/          # Reglas financieras de negocio y validación de saldos
│   │   │   ├── dashboard/       # Consultas agregadas de KPIs, saldo y gráficos
│   │   │   ├── expense/         # Gestión de egresos/gastos con validación de saldo
│   │   │   ├── income/          # Registro, edición y consulta de ingresos
│   │   │   ├── invoice/         # Emisión, cálculo de IVA y consulta de facturas electrónicas
│   │   │   └── user/            # Perfil de usuario, configuración y cambio de contraseña
│   │   ├── app.ts               # Ensamblaje de Express, CORS y registro de rutas
│   │   └── server.ts            # Punto de entrada y arranque del servidor HTTP
│   └── package.json
│
├── front/
│   ├── src/
│   │   ├── app/
│   │   │   ├── analysis/        # Pantalla de análisis financiero con gráficos y métricas
│   │   │   ├── categories/      # Administrador de categorías (vistas Grid / Tabla)
│   │   │   ├── config/          # Preferencias, datos de perfil, seguridad y tiempos de sesión
│   │   │   ├── dashboard/       # Resumen general con KPIs, balance y actividad reciente
│   │   │   ├── expenses/        # Módulo de egresos con formulario y drawer interactivo
│   │   │   ├── incomes/         # Módulo de ingresos con live preview
│   │   │   ├── invoices/        # Emisor e histórico de Facturas Electrónicas (formato SAT)
│   │   │   ├── login/           # Autenticación con formulario y botón de Google Sign-In
│   │   │   ├── services/        # Servicios Angular (Auth, Dashboard, Incomes, Expenses, etc.)
│   │   │   └── shared/          # Componentes reutilizables, guards, interceptores y modelos
│   │   │       ├── components/  # Header con campana de notificaciones, sidebar, live preview
│   │   │       └── models/      # Interfaces TypeScript de cada entidad del dominio
│   │   ├── environments/        # Configuración de URLs de API, Google Client ID y sesión
│   │   └── styles.scss          # Estilos globales y utilidades personalizadas
│   └── package.json
│
├── docs/                        # Documentación complementaria y diseños de referencia
├── package.json                 # Scripts raíz del monorepo
└── pnpm-workspace.yaml          # Configuración del espacio de trabajo pnpm
```

---

## Estado del Proyecto (Módulos 100% Completados)

Todos los módulos previstos han sido desarrollados, integrados y probados satisfactoriamente:

| Módulo | Estado | Características Implementadas |
| :--- | :---: | :--- |
| **Login y Autenticación** | ✅ Completado | Autenticación clásica con correo y contraseña encriptada (bcrypt), integración nativa con **Google Sign-In (OAuth 2.0)** y aprovisionamiento automático de usuarios. |
| **Control de Sesión e Inactividad** | ✅ Completado | Detección continua de eventos de usuario (clicks, teclas, scroll). Alerta modal 2 minutos antes de expirar con opción de renovar sesión y cierre seguro automático. |
| **Dashboard Principal** | ✅ Completado | Saldo total disponible, desglose de gastos fijos vs. variables, resumen de ingresos vs. egresos, gráfica mensual nativa y listado de actividad reciente en vivo. |
| **Módulo de Ingresos** | ✅ Completado | CRUD completo de ingresos con panel deslizable (*drawer*), vista previa en vivo (*Live Preview*), filtros dinámicos por texto y categoría, y métodos de pago. |
| **Módulo de Egresos / Gastos** | ✅ Completado | Registro de egresos con regla de negocio de **saldo suficiente** (impide gastar más del dinero disponible), filtros avanzados, clasificación y visualización en tiempo real. |
| **Gestión de Categorías** | ✅ Completado | 12 categorías base predeterminadas + creación, edición y eliminación de categorías personalizadas por usuario con selección de color HEX e iconos. Vistas en cuadrícula y tabla. |
| **Inteligencia y Análisis Financiero** | ✅ Completado | Cálculo automático del ratio de ahorro, balance neto, análisis de tendencias mes a mes con comparativa porcentual y desglose proporcional por categoría. |
| **Facturación Electrónica (DTE SAT)** | ✅ Completado | Emisión de facturas comerciales con formato regulatorio de SAT Guatemala: correlativo automático, cálculo de subtotal, desglose de IVA (12%), partidas dinámicas, histórico e impresión fiscal / PDF. |
| **Centro de Notificaciones** | ✅ Completado | Notificaciones interactivas en el encabezado (`app-header`), conteo de no leídas con badge visual, marcado individual o masivo como leídas y registro automático de cada movimiento. |
| **Perfil y Configuración de Cuenta** | ✅ Completado | Actualización de datos de usuario (nombre, teléfono, NIT, dirección), cambio seguro de contraseña, consulta de parámetros de sesión y preferencias de moneda. |

---

## Guía de Instalación y Ejecución Local

### 1. Requisitos Previos
* **Node.js**: Versión 18.x o 20.x LTS.
* **PostgreSQL**: Versión 14 o superior en ejecución local o remota.
* **pnpm**: Gestor de paquetes (`npm install -g pnpm`).

### 2. Clonación e Instalación de Dependencias
Clona el repositorio e instala las dependencias de todos los paquetes del monorepo:

```bash
git clone https://github.com/eruano-2025017/Taller-4-Act1-2-.git
cd Taller-4-Act1-2-
pnpm install
```

### 3. Configuración de la Base de Datos

1. Ingresa a PostgreSQL y crea la base de datos:
   ```sql
   CREATE DATABASE control_gastos;
   ```

2. Configura las variables de entorno en `backend/.env` (puedes copiar `backend/.env.example`):
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/control_gastos
   JWT_SECRET=tu_clave_secreta_para_firmar_jwt
   JWT_EXPIRES_IN=15m
   CORS_ORIGIN=http://localhost:4200
   ```

3. **Creación de Tablas e Índices:**  
   Al arrancar el servidor backend por primera vez, la función `initDb()` verificará y creará de manera automática e idempotente todas las tablas (`users`, `transactions`, `activities`, `categories`, `invoices`, `invoice_items`) e índices optimizados.  
   *(Opcional: si deseas crearlas manualmente, puedes ejecutar los scripts situados en `backend/src/db/migrations/`).*

4. **Carga de Datos Iniciales (Seed):**  
   Ejecuta el script para poblar los usuarios de prueba:
   ```bash
   cd backend
   pnpm run seed
   ```

   **Usuarios creados por defecto:**
   * **Administrador:** `admin@kinalfinance.com` — Contraseña: `Admin123!`
   * **Usuario Estándar:** `user@kinalfinance.com` — Contraseña: `User123!`
   * *(También puedes iniciar sesión directamente con tu cuenta de Google mediante el botón en el login).*

### 4. Puesta en Marcha

Inicia el entorno de desarrollo en dos terminales independientes:

**Terminal 1 — Backend (API REST):**
```bash
cd backend
pnpm run dev
```
El servidor quedará escuchando en `http://localhost:3000`. Puedes verificar su estado en `http://localhost:3000/api/health`.

**Terminal 2 — Frontend (Angular):**
```bash
cd front
pnpm start
```
La aplicación compilará y estará disponible en `http://localhost:4200`.

---

## Principales Decisiones de Arquitectura e Implementación

1. **SQL Nativo con `pg` vs. ORM:**
   Se optó conscientemente por prescindir de ORMs pesados como Prisma o TypeORM. Esto permitió formular consultas directas de agregación con `SUM(CASE WHEN ...)`, cálculo de promedios, balances netos y correlativos numéricos de facturación con total predictibilidad, cero sobrecarga y máximo rendimiento.

2. **Seguridad Basada en Identidad del Token:**
   En todos los endpoints protegidos, el identificador del usuario (`user_id`) no se lee del cuerpo de la petición ni de parámetros manipulables por el cliente; se extrae estrictamente del *payload* del JWT verificado en el middleware (`req.user.sub`).

3. **Arquitectura Reactiva con Angular Signals:**
   La reactividad de la interfaz de usuario se maneja con el nuevo modelo de reactividad fina de Angular (`signal`, `computed`). Esto elimina la necesidad de librerías de gestión de estado adicionales (como NgRx) y simplifica los flujos de datos entre componentes.

4. **Reglas de Negocio en Finanzas Personales:**
   El backend valida que ningún egreso pueda registrarse si supera el saldo acumulado actual del usuario (salvo transacciones de ajuste), asegurando coherencia contable y evitando saldos negativos incongruentes.

5. **Alineación Tributaria en Facturación:**
   El módulo de facturación está diseñado de acuerdo a los lineamientos del régimen tributario guatemalteco (desglose del 12% de IVA, soporte para NIT y Consumidor Final `C/F`, fechas de emisión/vencimiento e impresión directa con layout fiscal limpio).