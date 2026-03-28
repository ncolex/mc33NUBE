# Deploy Mission Control en Vercel

Esta guía te ayudará a desplegar Mission Control en Vercel usando **Vercel Postgres (Neon)**.

## ⚠️ Importante

Mission Control fue diseñado originalmente para SQLite. Para Vercel, hemos creado una capa de compatibilidad con PostgreSQL.

## Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Cuenta en [Neon](https://neon.tech) (o usar Vercel Postgres integration)
3. Node.js 22+ instalado localmente

## Pasos de Implementación

### 1. Crear Base de Datos PostgreSQL

#### Opción A: Vercel Postgres Integration (Recomendado)

1. Ve a tu proyecto en Vercel
2. **Storage** → **Add Database** → **Vercel Postgres**
3. Sigue el flujo para crear una base de datos Neon
4. Vercel automáticamente agregará `POSTGRES_URL` a tus variables

#### Opción B: Neon Directo

1. Crea cuenta en [Neon](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia el **Connection String** (pooler mode recomendado)
4. Lo usarás como `DATABASE_URL`

### 2. Configurar Variables de Entorno

En Vercel (**Settings** → **Environment Variables**), agrega:

```bash
# Base de datos (obligatorio)
DATABASE_URL=postgres://...

# Autenticación (obligatorio para producción)
AUTH_USER=admin
AUTH_PASS=tu-password-seguro

# Opcional: Gateway
NEXT_PUBLIC_GATEWAY_OPTIONAL=true
OPENCLAW_GATEWAY_HOST=localhost
OPENCLAW_GATEWAY_PORT=18789

# Opcional: API Key
API_KEY=tu-api-key-segura
```

### 3. Conectar Repositorio a Vercel

1. En Vercel: **Add New Project**
2. Importa tu repositorio de GitHub
3. En **Build & Development Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

4. Agrega las variables de entorno (o usa las del paso 2)
5. Click en **Deploy**

### 4. Primer Acceso

Después del deploy:

1. Ve a `https://tu-proyecto.vercel.app/setup`
2. Crea tu cuenta admin
3. ¡Listo!

## Configuración Local para Desarrollo

Para desarrollar localmente con PostgreSQL (opcional):

```bash
# Copia .env.example
cp .env.example .env.local

# Agrega tu DATABASE_URL de Neon
DATABASE_URL=postgres://...

# El resto de variables
AUTH_USER=admin
AUTH_PASS=devpassword
```

El código automáticamente usará:
- **SQLite** localmente (por defecto)
- **PostgreSQL** en Vercel (cuando `DATABASE_URL` está presente)

## Limitaciones Conocidas

### Funcionalidades que requieren SQLite

Algunas características pueden no estar completamente disponibles en modo PostgreSQL:

1. **WebSockets en tiempo real** - Funcionan, pero requieren configuración adicional
2. **Scheduler de tareas** - Funciona en serverless con limitaciones
3. **Archivos locales** - No persisten en Vercel (usa almacenamiento externo)

### Workarounds

- **Datos persistentes**: Usa la base de datos PostgreSQL
- **Archivos de agentes**: Configura un bucket S3 o usa GitHub sync
- **WebSockets**: Usa polling o considera Railway/Fly.io para WebSockets nativos

## Solución de Problemas

### Error: "DATABASE_URL is not set"

Asegúrate de que la variable esté configurada en Vercel:
- **Settings** → **Environment Variables** → Agrega `DATABASE_URL`

### Error: "relation does not exist"

Las migraciones no se ejecutaron. Verifica los logs:
- **Deployment** → **View Build Logs**

### Error: "too many clients"

Neon tiene límite de conexiones. Usa **connection pooling**:
```bash
DATABASE_URL=postgres://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&pool=true
```

### Build excede 250MB

El archivo `.vercelignore` debería excluir archivos grandes. Verifica que esté en la raíz del proyecto.

## Migración de SQLite a PostgreSQL

Si ya tienes datos en SQLite local y quieres migrar:

```bash
# Exportar SQLite
sqlite3 .data/mission-control.db .dump > backup.sql

# Convertir a PostgreSQL (script manual requerido)
# Importar a Neon
psql $DATABASE_URL < backup-converted.sql
```

**Nota**: La migración automática no está implementada. Para producción, considera usar herramientas como `pgloader`.

## Alternativas a Vercel

Si necesitas SQLite nativo o WebSockets persistentes:

1. **Railway.app** - SQLite + Docker
2. **Fly.io** - Volúmenes persistentes para SQLite
3. **Render.com** - Aplicaciones con disco persistente

## Soporte

- Issues: https://github.com/ncolex/mc33NUBE/issues
- Docs: `/docs` en el repositorio
