# Control de Gastos — Kinal Finance

Este es mi proyecto de control de finanzas personales. La aplicación permite registrar movimientos de dinero, ver un resumen gráfico de ingresos y egresos, y cuenta con un sistema de autenticación con control de sesión por inactividad. 

El proyecto está organizado en un **monorepo con pnpm workspaces**, separando el backend (Node.js + Express) del frontend (Angular 18).

---

## Tecnologías que utilicé

### Backend
* **Node.js y Express:** Para armar el servidor y la API REST en TypeScript.
* **PostgreSQL:** Base de datos relacional para guardar usuarios, transacciones y actividades.
* **Librería `pg` (node-postgres):** Consultas SQL directas y parametrizadas, sin usar ningún ORM.
* **JWT y bcryptjs:** Para generar los tokens de sesión y encriptar las contraseñas en la base de datos.
* **Zod:** Para validar que los datos que llegan en las peticiones vengan con el formato correcto.

### Frontend
* **Angular 18:** Utilizando componentes *standalone*, *signals* reactivos y formularios con *Reactive Forms*.
* **Tailwind CSS:** Para los estilos visuales, colores del tema y diseño adaptable (responsive).
* **Gráficas nativas (sin librerías):** Las barras están hechas con etiquetas `<div>` y porcentajes de CSS, y la dona/curvas con elementos `<svg>`.

### Herramientas
* **pnpm:** Gestor de paquetes que maneja las dependencias de ambas carpetas en un solo espacio de trabajo.

---

## Estructura de las carpetas

El repositorio está dividido en dos partes principales:

```text
control-de-gastos/
├── backend/
│   ├── src/
│   │   ├── config/              # Conexión a la base de datos (Pool de PostgreSQL)
│   │   ├── db/                  # Scripts SQL y migraciones
│   │   ├── middlewares/         # Middleware para validar el token (verificarToken)
│   │   ├── modules/
│   │   │   ├── auth/            # Login, renovación de token y contraseñas
│   │   │   ├── dashboard/       # Consultas para los totales y gráficas
│   │   │   ├── income/          # Registro y consulta de ingresos
│   │   │   └── expense/         # Estructura base para egresos
│   │   ├── app.ts               # Configuración de Express y rutas
│   │   └── server.ts            # Archivo que arranca el servidor
├── front/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Pantalla principal con tarjetas y gráficas
│   │   │   ├── incomes/         # Pantalla de ingresos y formulario deslizable
│   │   │   ├── login/           # Pantalla de inicio de sesión
│   │   │   ├── services/        # Servicios para conectar con el backend
│   │   │   └── shared/          # Modelos de datos y modales (aviso de inactividad)
│   │   ├── environments/        # Variables como la URL de la API y tiempos de sesión
│   │   └── styles.scss          # Estilos generales
├── docs/                        # Documentación y maquetado en PDF
├── package.json                 # Comandos generales
└── pnpm-workspace.yaml          # Configuración del monorepo
```

---

## Estado del proyecto (¿Qué está hecho y qué falta?)

| Módulo | Estado | Detalle |
| :--- | :---: | :--- |
| **Login y Autenticación** | ✅ Listo | Funciona con correo y contraseña. Si las credenciales son válidas devuelve un JWT. |
| **Control de Inactividad** | ✅ Listo | Si el usuario no interactúa en 15 minutos, la sesión se cierra automáticamente. Muestra un modal de aviso 2 minutos antes para renovar si sigue ahí. |
| **Dashboard** | ✅ Listo | Muestra el saldo disponible, desglose de gastos fijos vs variables, gráfica mensual y actividad reciente. |
| **Módulo de Ingresos** | ✅ Listo | Permite crear, listar, editar y eliminar ingresos. Incluye buscador, filtro por categoría y un panel lateral con vista previa en vivo. |
| **Módulo de Egresos / Gastos** | ⚠️ En progreso | Solo está creada la ruta base en el backend (`expense.router.ts`), pero aún no tiene controlador ni pantalla propia. |
| **Categorías** | ❌ Pendiente | En el menú lateral aparece la opción, pero las categorías todavía se guardan directamente como texto en la tabla de transacciones. |
| **Análisis y Configuración** | ❌ Pendiente | Están en la barra lateral como opciones visuales para futuras versiones. |
| **Registro de nuevos usuarios** | ❌ Pendiente | Por ahora los usuarios de prueba se crean directamente desde la base de datos o con el script de seed. |

---

## Cómo levantarlo en tu computadora

### 1. Requisitos
Necesitas tener instalado:
* Node.js (versión 18 o 20)
* PostgreSQL 14 o superior
* pnpm: si no lo tienes, instálalo con `npm install -g pnpm`

### 2. Instalar dependencias
Desde la raíz del proyecto, ejecuta:

```bash
pnpm install
```
Esto instalará los paquetes tanto del backend como del frontend gracias al workspace.

### 3. Crear la base de datos
Entra a tu terminal de PostgreSQL (`psql`) o a pgAdmin y crea la base de datos:

```sql
CREATE DATABASE control_gastos;
```

Las tablas (`users`, `transactions`, `activities`) se crean automáticamente la primera vez que inicia el backend. Si prefieres crearlas a mano, corre los scripts en orden:

```bash
psql -d control_gastos -f backend/src/db/migrations/001_init.sql
psql -d control_gastos -f backend/src/db/migrations/002_transactions.sql
psql -d control_gastos -f backend/src/db/migrations/003_activities.sql
```

Para cargar los usuarios de prueba:

```bash
cd backend
pnpm run seed
```

Esto creará estos usuarios:
* **Admin:** `admin@kinalfinance.com` / contraseña: `Admin123!`
* **Usuario normal:** `user@kinalfinance.com` / contraseña: `User123!`

### 4. Variables de entorno en el Backend
En la carpeta `backend`, copia el archivo `.env.example` y nómbralo `.env`:

```bash
cp backend/.env.example backend/.env
```

Asegúrate de colocar tu usuario y contraseña de PostgreSQL en `DATABASE_URL`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/control_gastos
JWT_SECRET=secreto_de_desarrollo_seguro
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:4200
```

### 5. Iniciar la aplicación

Puedes abrir dos terminales:

**Terminal 1 (Backend):**
```bash
cd backend
pnpm run dev
```
Quedará escuchando en `http://localhost:3000`. Para probar que responde, entra a: `http://localhost:3000/api/health`.

**Terminal 2 (Frontend):**
```bash
cd front
pnpm start
```
Se abrirá la aplicación en tu navegador en `http://localhost:4200`.

---

## Decisiones que tomé en el desarrollo

* **¿Por qué SQL puro y no un ORM?:** Quería practicar consultas SQL directas y tener control total sobre operaciones como `SUM(CASE WHEN ...)`, cálculos por mes y agregaciones numéricas sin depender de la magia de un ORM pesado.
* **¿Por qué JWT con sesión por inactividad?:** No quería que el usuario fuera expulsado abruptamente a los 5 o 10 minutos si estaba trabajando activamente. El frontend detecta la actividad (clicks, scroll, teclado) y si falta poco para que venza el token, pide una renovación silenciosa al servidor.
* **Identidad segura desde el token:** En el backend, el `user_id` nunca se toma del cuerpo (`body`) que envía el cliente, sino que se extrae directamente del token verificado en el middleware (`req.user.sub`), evitando que un usuario registre datos a nombre de otro.
* **Gráficas hechas a mano sin librerías externas:** Para no inflar el peso del frontend con paquetes como Chart.js, implementé la gráfica de barras con CSS (`height: %`) y la dona con SVG nativo (`stroke-dasharray`).

---

## Cosas a mejorar y puntos débiles conocidos

Como parte de la honestidad técnica del proyecto, tengo identificados estos puntos débiles:

1. **El token se guarda en `localStorage`:** Sé que esto tiene riesgo ante ataques de tipo XSS. La mejora ideal a futuro es migrarlo a cookies con la bandera `HttpOnly`.
2. **No hay Refresh Token en base de datos:** El sistema renueva el Access Token mientras siga vigente, pero no tengo una tabla de tokens para revocarlos individualmente.
3. **Falta rate limiting en el login:** El endpoint de inicio de sesión no limita la cantidad de intentos por minuto, por lo que podría ser vulnerable a intentos repetidos de contraseña (fuerza bruta).
4. **No hay pantalla de registro:** Por el momento solo se puede ingresar con los usuarios de prueba creados en el seed o agregados manualmente en PostgreSQL.

---

## Lo que sigue por implementar

1. Terminar el módulo completo de Egresos/Gastos (crear transacciones de tipo `egreso`, listado y estadísticas).
2. Crear la tabla y pantalla para administrar Categorías personalizadas.
3. Agregar la pantalla de registro de usuarios públicos.
4. Mejorar la seguridad del almacenamiento de tokens.