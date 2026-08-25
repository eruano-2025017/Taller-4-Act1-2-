## CONTROL DE GASTOS

Este es mi proyecto de control de gastos personales. Es una aplicacion para llevar el registro de ingresos y egresos, con un login que diferencia entre usuario admin y usuario normal. Hice el backend con Node, Express y PostgreSQL, y el frontend con Angular. El backend maneja el login con JWT y ya tiene la estructura lista para agregar el modulo de gastos (controllers, services, models, router).

# STACK QUE USE
- Backend: Node + Express + TypeScript
- Base de datos: PostgreSQL
- Queries: pg (sin ORM, SQL directo)
- Login: JWT + bcrypt
- Frontend: Angular (standalone)
- Estilos: Tailwind CSS
- Paquetes: pnpm, en un monorepo con workspace (backend y front como dos paquetes separados)

# 1. LO QUE TENGO QUE TENER INSTALADO
- Node.js 18 o 20
- PostgreSQL 14+
- pnpm: npm install -g pnpm
- Editor de codigo

Para verificar que quedo bien instalado:
node -v
pnpm -v
psql --version

# 2. INSTALAR TODO EL WORKSPACE
Desde la raiz del proyecto (control-de-gastos):
pnpm install

Esto instala las dependencias del backend y del front juntas, gracias al pnpm-workspace.yaml.

# 3. CREAR LA BASE DE DATOS
Entro a psql (o pgAdmin) y corro:
CREATE DATABASE control_gastos;

Las tablas las creo yo con el script de migracion, no uso ORM todavia.

# 4. BACKEND
cd backend

Configuro las variables de entorno:
cp .env.example .env
Edito DATABASE_URL y JWT_SECRET en el .env con mi usuario y password de PostgreSQL.

Creo la tabla de usuarios:
psql -d control_gastos -f src/db/migrations/001_init.sql

Cargo los usuarios de prueba (admin y user):
pnpm run seed

Levanto el servidor:
pnpm run dev
Queda corriendo en http://localhost:3000

Para probar que funciona:
http://localhost:3000/api/health

Usuarios que se crean con el seed:
admin@kinalfinance.com / Admin123!
user@kinalfinance.com / User123!

# 5. FRONTEND
cd front
pnpm install
pnpm start
Se abre en http://localhost:4200 y consume la API en el puerto 3000.

Como lo pruebo:
#1. Entro con admin@kinalfinance.com o user@kinalfinance.com
#2. Si las credenciales son correctas me manda al dashboard
#3. Si pongo mal el correo o la contrasena me marca el error
(El modulo de gastos todavia no lo tengo implementado, por ahora solo esta funcional el login)

# 6. ESTILOS (CSS)
Use Tailwind para no repetir clases de CSS en cada componente. Los colores y tipografias del login (navy, naranja, Hanken Grotesk, Manrope, JetBrains Mono) los deje configurados en tailwind.config.js para poder usarlos despues en el resto de la app y que todo quede con el mismo estilo.

# 7. COMANDOS QUE UTILICE
npm install -g pnpm
pnpm install
cd backend
cp .env.example .env
psql -d control_gastos -f src/db/migrations/001_init.sql
pnpm run seed
pnpm run dev
cd front
pnpm install
pnpm start