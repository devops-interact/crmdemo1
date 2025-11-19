# 🔧 Configuración Actualizada - Deploy Google Cloud

## 📊 Situación Actual

### ✅ Lo que ya tienes:
- **Cloud SQL**: IP privada `10.115.0.3` ✅
- **Secretos existentes**:
  - `db_host` → `10.115.0.3`
  - `db_name` → (tu nombre de BD)
  - `db_password` → (tu password)
  - `db_user` → (tu usuario, probablemente `backend`)
  - `jwt_secret` → (tu secret)
  - `google_client_id` → (para Fase 6)
  - `google_client_secret` → (para Fase 6)

### ⚠️ Lo que necesitamos ajustar:

1. **IP Privada**: Requiere Cloud SQL Proxy o VPC Connector
2. **Secretos**: Mapear nombres existentes a los que espera Twenty CRM
3. **Redis**: Necesario, pero podemos usar opción económica

---

## 🔐 Mapeo de Secretos

### Secretos que necesitas crear/actualizar:

| Secreto Existente | Secreto que espera Twenty CRM | Acción |
|-------------------|------------------------------|--------|
| `db_host` + `db_user` + `db_password` + `db_name` | `pg-database-url` | **CREAR** (URL completa) |
| `jwt_secret` | `app-secret` | **RENOMBRAR o CREAR** (mismo valor) |
| - | `redis-url` | **CREAR** (después de configurar Redis) |
| - | `server-url` | **CREAR** (después del deploy) |
| `google_client_id` | `auth-google-client-id` | **RENOMBRAR o CREAR** (Fase 6) |
| `google_client_secret` | `auth-google-client-secret` | **RENOMBRAR o CREAR** (Fase 6) |

### ✅ Plan de Acción para Secretos:

**Opción A: Crear nuevos secretos (Recomendado)**
- Mantener los existentes
- Crear los nuevos con los nombres que espera Twenty CRM
- Más claro y organizado

**Opción B: Renombrar/Reutilizar**
- Usar los existentes y crear alias
- Más complejo de mantener

**Recomendación: Opción A** - Crear los secretos nuevos ahora.

---

## 🗄️ Redis - Opciones para 30 Usuarios

### ⚠️ Importante: Redis es REQUERIDO
Twenty CRM usa Redis para:
- GraphQL Subscriptions (tiempo real)
- Cache (mejora rendimiento)
- Colas de trabajos (background jobs)

**Sin Redis, el backend NO funcionará correctamente.**

### 💰 Opciones Económicas:

#### **Opción 1: Redis en Cloud Run (MÁS ECONÓMICO) ⭐**
**Costo**: ~$0 (solo pago por uso de Cloud Run)
**Recomendado para**: 30 usuarios, desarrollo/pruebas

```bash
# Deploy Redis como servicio separado en Cloud Run
# Usaremos imagen oficial de Redis
```

**Ventajas**:
- Muy económico (casi gratis)
- Fácil de configurar
- Suficiente para 30 usuarios

**Desventajas**:
- No persistente (se pierde al reiniciar)
- Menos escalable
- No recomendado para producción crítica

#### **Opción 2: Memorystore Redis Básico**
**Costo**: ~$30-40/mes
**Recomendado para**: Producción con 30 usuarios

```bash
# Crear instancia básica de Memorystore
gcloud redis instances create twenty-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

**Ventajas**:
- Persistente
- Escalable
- Gestionado por Google
- Mejor para producción

**Desventajas**:
- Más costoso

#### **Opción 3: Redis Externo (Upstash, Redis Cloud)**
**Costo**: ~$0-10/mes (planes gratuitos disponibles)
**Recomendado para**: Presupuesto muy limitado

**Ventajas**:
- Planes gratuitos disponibles
- Gestionado
- Fácil de configurar

**Desventajas**:
- Dependencia externa
- Límites en planes gratuitos

### 🎯 Recomendación para tu caso (30 usuarios):

**Para empezar**: Opción 1 (Redis en Cloud Run) - Gratis
**Para producción**: Opción 2 (Memorystore básico) - $30/mes

---

## 🌐 Configuración IP Privada

### Problema:
Cloud SQL tiene IP privada (`10.115.0.3`), pero Cloud Run necesita conectarse.

### Solución: Cloud SQL Proxy o VPC Connector

#### **Opción A: Cloud SQL Proxy (Recomendado para empezar)**

Cloud Run puede usar Cloud SQL Proxy automáticamente si:
1. La Service Account tiene permisos de Cloud SQL Client
2. Configuras la conexión en el deploy

**Comando actualizado para deploy:**

```bash
gcloud run deploy twenty-backend \
  --image us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --platform managed \
  --region us-central1 \
  --add-cloudsql-instances crm-cliente:us-central1:TU_INSTANCE_NAME \
  --set-secrets PG_DATABASE_URL=pg-database-url:latest,APP_SECRET=app-secret:latest,REDIS_URL=redis-url:latest \
  --set-env-vars NODE_ENV=production \
  --service-account backend-runner@crm-cliente.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2
```

**Nota**: Necesitas el nombre completo de la instancia Cloud SQL (formato: `PROJECT:REGION:INSTANCE_NAME`)

#### **Opción B: VPC Connector (Más complejo)**

Requiere configurar VPC y Serverless VPC Access. Más complejo pero mejor para producción.

---

## 📝 Plan de Acción Inmediato

### Paso 1: Crear Secretos Faltantes

```bash
# 1. Obtener valores de secretos existentes
DB_HOST=$(gcloud secrets versions access latest --secret="db_host")
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret")

# 2. Crear pg-database-url (URL completa)
echo "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-

# 3. Crear app-secret (usar jwt_secret existente)
echo "${JWT_SECRET}" | \
  gcloud secrets create app-secret --data-file=-

# 4. Obtener nombre de instancia Cloud SQL (necesario para Cloud SQL Proxy)
# Ve a Cloud Console → SQL → Tu instancia → Copia el "Connection name"
```

### Paso 2: Configurar Redis (Elige una opción)

**Opción A: Redis en Cloud Run (Gratis)**

```bash
# Deploy Redis como servicio separado
gcloud run deploy redis-service \
  --image redis:7-alpine \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 6379 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars REDIS_ARGS="--maxmemory 256mb --maxmemory-policy allkeys-lru"

# Obtener URL del servicio Redis
REDIS_URL=$(gcloud run services describe redis-service --region us-central1 --format 'value(status.url)')

# Crear secreto redis-url
echo "redis://${REDIS_URL#https://}:6379" | \
  gcloud secrets create redis-url --data-file=-
```

**Opción B: Memorystore Redis**

```bash
# Crear instancia Redis
gcloud redis instances create twenty-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic

# Obtener IP de Redis
REDIS_IP=$(gcloud redis instances describe twenty-redis --region=us-central1 --format='value(host)')

# Crear secreto redis-url
echo "redis://${REDIS_IP}:6379" | \
  gcloud secrets create redis-url --data-file=-
```

### Paso 3: Obtener Connection Name de Cloud SQL

```bash
# Listar instancias Cloud SQL
gcloud sql instances list

# Obtener connection name (formato: PROJECT:REGION:INSTANCE_NAME)
gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)'
```

### Paso 4: Deploy Actualizado con IP Privada

```bash
# Reemplaza TU_CONNECTION_NAME con el valor obtenido arriba
gcloud run deploy twenty-backend \
  --image us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --platform managed \
  --region us-central1 \
  --add-cloudsql-instances TU_CONNECTION_NAME \
  --set-secrets PG_DATABASE_URL=pg-database-url:latest,APP_SECRET=app-secret:latest,REDIS_URL=redis-url:latest \
  --set-env-vars NODE_ENV=production \
  --service-account backend-runner@crm-cliente.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

**Importante**: En `pg-database-url`, usa `localhost` o el socket de Cloud SQL Proxy en lugar de la IP privada cuando uses `--add-cloudsql-instances`.

---

## 🔄 Actualizar pg-database-url para Cloud SQL Proxy

Cuando uses `--add-cloudsql-instances`, Cloud Run crea un socket Unix. El formato de conexión cambia:

**Formato con Cloud SQL Proxy:**
```
postgresql://USER:PASSWORD@/DATABASE_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE_NAME
```

O más simple:
```
postgresql://USER:PASSWORD@localhost/DATABASE_NAME
```

**Script para crear el secreto correcto:**

```bash
# Obtener valores
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
CONNECTION_NAME=$(gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)')

# Crear URL con formato Cloud SQL Proxy
echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-
```

---

## ✅ Checklist Actualizado

- [ ] Obtener valores de secretos existentes
- [ ] Crear `pg-database-url` con formato Cloud SQL Proxy
- [ ] Crear `app-secret` (usar valor de `jwt_secret`)
- [ ] Decidir opción de Redis (Recomendado: Redis en Cloud Run para empezar)
- [ ] Crear `redis-url` según opción elegida
- [ ] Obtener Connection Name de Cloud SQL
- [ ] Actualizar Dockerfile si es necesario
- [ ] Deploy con `--add-cloudsql-instances`

---

## 🎯 Próximos Pasos

1. **Ahora**: Crear secretos faltantes (`pg-database-url`, `app-secret`)
2. **Ahora**: Configurar Redis (elige opción económica o Memorystore)
3. **Después**: Obtener Connection Name de Cloud SQL
4. **Después**: Deploy con configuración de IP privada

¿Quieres que te ayude a ejecutar estos pasos ahora?

