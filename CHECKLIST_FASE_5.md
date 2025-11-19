# ✅ Checklist Pre-Fase 5

## 🔍 Verificaciones Antes de Deploy

### 1. Cloud SQL ✅
- [ ] Instancia PostgreSQL creada y funcionando
- [ ] Usuario `backend` creado
- [ ] Contraseña guardada en Secret Manager como `pg-database-password`
- [ ] IP pública habilitada (temporalmente)
- [ ] **Anotar IP pública**: `_________________`
- [ ] **Anotar nombre de base de datos**: `_________________`
- [ ] **Crear secreto `pg-database-url`** con formato:
  ```
  postgresql://backend:PASSWORD@IP:5432/DATABASE_NAME
  ```

### 2. Secret Manager ✅
Verificar que estos secretos existen:

- [ ] `pg-database-url` - URL completa de conexión PostgreSQL
- [ ] `app-secret` - String aleatorio seguro (ej: generado con `openssl rand -hex 32`)
- [ ] `redis-url` - URL de Redis (formato: `redis://IP:6379` o `rediss://IP:6379`)

**Secretos que se crearán después del deploy:**
- [ ] `server-url` - Se actualizará después del deploy de Cloud Run
- [ ] `auth-google-client-id` - Se creará en Fase 6
- [ ] `auth-google-client-secret` - Se creará en Fase 6

### 3. Redis ⚠️ **IMPORTANTE**
Twenty CRM requiere Redis. Elige una opción:

**Opción A: Memorystore Redis (Recomendado)**
- [ ] Crear instancia Redis en Memorystore
- [ ] Anotar IP interna: `_________________`
- [ ] Crear secreto `redis-url` con formato: `redis://IP:6379`

**Opción B: Redis Externo**
- [ ] Configurar servicio Redis externo
- [ ] Crear secreto `redis-url` con la URL completa

**Opción C: Temporalmente sin Redis (NO recomendado)**
- [ ] ⚠️ Solo para pruebas iniciales
- [ ] El backend puede fallar sin Redis

### 4. Service Account ✅
- [ ] Service Account creada: `backend-runner@crm-cliente.iam.gserviceaccount.com`
- [ ] Permisos verificados:
  - [ ] Cloud SQL Client
  - [ ] Secret Manager Secret Accessor
  - [ ] Cloud Run Invoker

### 5. Artifact Registry ✅
- [ ] Repositorio creado: `backend-repo`
- [ ] Región: `us-central1`
- [ ] Formato: `docker`

### 6. Dockerfile ✅
- [ ] Dockerfile creado: `packages/twenty-server/Dockerfile.cloudrun`
- [ ] `.dockerignore` creado: `packages/twenty-server/.dockerignore`

### 7. Google Cloud CLI ✅
- [ ] `gcloud` instalado y configurado
- [ ] Autenticado: `gcloud auth login`
- [ ] Proyecto configurado: `gcloud config set project crm-cliente`

---

## 🚀 Comandos Listos para Ejecutar

### Paso 1: Crear Secretos (si faltan)

```bash
# Crear pg-database-url
echo "postgresql://backend:PASSWORD@IP:5432/DATABASE_NAME" | \
  gcloud secrets create pg-database-url --data-file=-

# Crear app-secret (generar uno nuevo)
openssl rand -hex 32 | gcloud secrets create app-secret --data-file=-

# Crear redis-url (si ya tienes Redis)
echo "redis://IP:6379" | \
  gcloud secrets create redis-url --data-file=-
```

### Paso 2: Crear Artifact Registry (si no existe)

```bash
gcloud artifacts repositories create backend-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for Twenty CRM backend"
```

### Paso 3: Build y Push de Imagen

```bash
# Desde la raíz del proyecto
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --file packages/twenty-server/Dockerfile.cloudrun \
  .
```

### Paso 4: Deploy a Cloud Run

```bash
gcloud run deploy twenty-backend \
  --image us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account backend-runner@crm-cliente.iam.gserviceaccount.com \
  --set-secrets PG_DATABASE_URL=pg-database-url:latest,APP_SECRET=app-secret:latest,REDIS_URL=redis-url:latest \
  --set-env-vars NODE_ENV=production \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 1
```

### Paso 5: Obtener URL y Actualizar Secretos

```bash
# Obtener URL del servicio
BACKEND_URL=$(gcloud run services describe twenty-backend --region us-central1 --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"

# Actualizar server-url en Secret Manager
echo "$BACKEND_URL" | gcloud secrets versions add server-url --data-file=-
```

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "Secret not found"
- Verificar que el secreto existe: `gcloud secrets list`
- Verificar el nombre exacto del secreto (case-sensitive)

### Error: "Permission denied"
- Verificar permisos de la Service Account
- Verificar que estás autenticado: `gcloud auth list`

### Error: "Image not found"
- Verificar que la imagen se subió correctamente
- Verificar el nombre completo de la imagen

### Error: "Database connection failed"
- Verificar que la IP pública de Cloud SQL está habilitada
- Verificar el formato de `PG_DATABASE_URL`
- Verificar credenciales en Secret Manager

### Error: "Redis connection failed"
- Verificar que Redis está corriendo
- Verificar el formato de `REDIS_URL`
- Si usas Memorystore, verificar que está en la misma región

---

## 📝 Notas

- El deploy puede tomar 5-10 minutos la primera vez
- Los logs están disponibles en: `gcloud run services logs read twenty-backend --region us-central1`
- Puedes ver el estado en: Google Cloud Console → Cloud Run → twenty-backend

