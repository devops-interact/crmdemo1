# 📋 Resumen de Decisiones - Deploy Google Cloud

## ✅ Respuestas a tus Preguntas

### 1. ¿Crear los secretos faltantes ahora o después?

**Respuesta: CREARLOS AHORA** ✅

**Razón**:
- Twenty CRM espera nombres específicos de secretos
- Es mejor tenerlos listos antes del deploy
- Puedes mantener los existentes y crear los nuevos

**Secretos a crear ahora:**
- ✅ `pg-database-url` (combinar db_host, db_user, db_password, db_name)
- ✅ `app-secret` (usar valor de `jwt_secret` o generar nuevo)

**Secretos para después:**
- ⏳ `redis-url` (después de configurar Redis)
- ⏳ `server-url` (después del deploy de Cloud Run)
- ⏳ `auth-google-client-id` (Fase 6, renombrar `google_client_id`)
- ⏳ `auth-google-client-secret` (Fase 6, renombrar `google_client_secret`)

### 2. ¿Nombres de secretos?

**Respuesta: Usar los nombres que espera Twenty CRM** ✅

| Tu Secreto Actual | Nombre para Twenty CRM | Acción |
|-------------------|------------------------|--------|
| `db_host`, `db_user`, etc. | `pg-database-url` | Crear nuevo (URL completa) |
| `jwt_secret` | `app-secret` | Crear nuevo (mismo valor) |
| `google_client_id` | `auth-google-client-id` | Crear en Fase 6 |
| `google_client_secret` | `auth-google-client-secret` | Crear en Fase 6 |

**Recomendación**: Mantener los existentes Y crear los nuevos. Más organizado.

### 3. ¿Redis necesario para 30 usuarios?

**Respuesta: SÍ, Redis es REQUERIDO** ⚠️

**Razón**:
- Twenty CRM usa Redis para GraphQL Subscriptions (tiempo real)
- Cache para mejorar rendimiento
- Colas de trabajos en background
- Sin Redis, el backend NO funcionará correctamente

**Opción Recomendada para 30 usuarios:**

#### 🟢 Opción Económica: Redis en Cloud Run (GRATIS)
- **Costo**: ~$0 (solo pago por uso)
- **Suficiente para**: 30 usuarios, desarrollo/pruebas
- **Configuración**: Simple, deploy como servicio separado

#### 🟡 Opción Producción: Memorystore Redis Básico ($30/mes)
- **Costo**: ~$30-40/mes
- **Mejor para**: Producción estable
- **Ventajas**: Persistente, escalable, gestionado

**Mi Recomendación**:
- **Empezar con**: Redis en Cloud Run (gratis)
- **Migrar después a**: Memorystore si necesitas más estabilidad

---

## 🔧 Configuración IP Privada

### Tu Situación:
- Cloud SQL tiene IP privada: `10.115.0.3`
- Cloud Run necesita conectarse

### Solución: Cloud SQL Proxy ✅

**No necesitas IP pública**. Cloud Run puede usar Cloud SQL Proxy automáticamente:

```bash
# En el deploy, agregar:
--add-cloudsql-instances PROJECT:REGION:INSTANCE_NAME
```

**Ventajas**:
- ✅ Más seguro (sin IP pública)
- ✅ Automático (Google lo gestiona)
- ✅ Sin configuración adicional de VPC

**Lo que necesitas**:
- Connection Name de tu instancia Cloud SQL
- Formato: `crm-cliente:us-central1:TU_INSTANCE_NAME`

---

## 📝 Plan de Acción Paso a Paso

### Paso 1: Crear Secretos Faltantes (AHORA)

```bash
# Opción A: Usar script automático
chmod +x scripts/crear-secretos.sh
./scripts/crear-secretos.sh

# Opción B: Manual (ver CONFIGURACION_ACTUALIZADA.md)
```

**Secretos a crear:**
1. `pg-database-url` (URL completa con formato Cloud SQL Proxy)
2. `app-secret` (usar `jwt_secret` existente)

### Paso 2: Configurar Redis (AHORA)

**Elige una opción:**

**Opción A: Redis en Cloud Run (Recomendado para empezar)**
```bash
gcloud run deploy redis-service \
  --image redis:7-alpine \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 6379 \
  --memory 512Mi \
  --cpu 1
```

**Opción B: Memorystore Redis**
```bash
gcloud redis instances create twenty-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

### Paso 3: Crear Secreto redis-url (DESPUÉS de configurar Redis)

```bash
# Si usaste Cloud Run:
REDIS_URL=$(gcloud run services describe redis-service --region us-central1 --format 'value(status.url)')
echo "redis://${REDIS_URL#https://}:6379" | gcloud secrets create redis-url --data-file=-

# Si usaste Memorystore:
REDIS_IP=$(gcloud redis instances describe twenty-redis --region=us-central1 --format='value(host)')
echo "redis://${REDIS_IP}:6379" | gcloud secrets create redis-url --data-file=-
```

### Paso 4: Obtener Connection Name de Cloud SQL

```bash
# Listar instancias
gcloud sql instances list

# Obtener connection name
gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)'
```

### Paso 5: Deploy con IP Privada

```bash
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
  --cpu 2
```

---

## ✅ Checklist Final

- [ ] **Secretos**: Crear `pg-database-url` y `app-secret`
- [ ] **Redis**: Elegir opción (Cloud Run o Memorystore)
- [ ] **Redis URL**: Crear secreto `redis-url`
- [ ] **Cloud SQL**: Obtener Connection Name
- [ ] **Deploy**: Ejecutar con `--add-cloudsql-instances`

---

## 🎯 Decisión Rápida

**Para avanzar AHORA:**

1. ✅ **Secretos**: Crear `pg-database-url` y `app-secret` (usar script o manual)
2. ✅ **Redis**: Deploy Redis en Cloud Run (gratis, suficiente para empezar)
3. ✅ **Deploy**: Ejecutar Fase 5 con configuración IP privada

**¿Quieres que ejecutemos estos pasos ahora?**

