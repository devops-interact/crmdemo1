# 🚀 Plan de Deploy a Google Cloud - Twenty CRM

## ✅ Estado Actual
- **Fase 1**: ✅ Completada (Proyecto creado)
- **Fase 2**: ✅ Completada (Cloud SQL PostgreSQL creada)
- **Fase 3**: ✅ Completada (Secret Manager configurado)
- **Fase 4**: ✅ Completada (Service Account creada: `backend-runner@crm-cliente.iam.gserviceaccount.com`)
- **Fase 5**: 🔄 **EN PROGRESO** (Deploy del backend a Cloud Run)

---

## 📋 Revisión del Plan Original

### ✅ Fases Completadas (1-4)
Las fases 1-4 están bien estructuradas y completadas. No se requieren cambios.

### 🔍 Verificaciones Antes de Continuar

**ANTES de avanzar con la Fase 5, verifica:**

1. ✅ **Cloud SQL**:
   - Instancia PostgreSQL creada
   - Usuario `backend` creado
   - IP pública habilitada (temporalmente)
   - **Acción requerida**: Anotar la IP pública de la instancia

2. ✅ **Secret Manager**:
   - Verificar que tienes estos secretos creados:
     - `pg-database-url` (formato: `postgresql://backend:PASSWORD@IP:5432/DATABASE_NAME`)
     - `app-secret` (string aleatorio seguro)
     - `server-url` (será la URL de Cloud Run después del deploy)
     - `redis-url` (si usas Redis, formato: `redis://IP:6379`)
   - **Nota**: `AUTH_GOOGLE_CLIENT_ID` y `AUTH_GOOGLE_CLIENT_SECRET` se crearán en la Fase 6

3. ✅ **Service Account**:
   - Nombre: `backend-runner@crm-cliente.iam.gserviceaccount.com`
   - Permisos verificados:
     - ✅ Cloud SQL Client
     - ✅ Secret Manager Secret Accessor
     - ✅ Cloud Run Invoker

4. ⚠️ **Redis (Requerido por Twenty CRM)**:
   - Twenty CRM requiere Redis para colas y caché
   - **Opciones**:
     - **Opción A**: Crear instancia de Redis en Google Cloud (Memorystore)
     - **Opción B**: Usar Redis en Cloud Run (contenedor adicional)
     - **Opción C**: Temporalmente deshabilitar Redis (no recomendado para producción)
   - **Recomendación**: Crear Memorystore Redis antes de continuar

---

## 🟦 FASE 5 — Deploy del Backend a Cloud Run

### **Paso 5.1: Preparar Dockerfile para Cloud Run**

El proyecto tiene un Dockerfile existente en `packages/twenty-docker/twenty/Dockerfile`, pero está diseñado para un build completo (backend + frontend). Para Cloud Run necesitamos uno optimizado solo para el backend.

**Crear nuevo Dockerfile específico para Cloud Run:**

```dockerfile
# packages/twenty-server/Dockerfile.cloudrun
FROM node:24-alpine AS common-deps

WORKDIR /app

# Copy dependency files
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches
COPY ./.prettierrc /app/

# Copy package.json files for workspace dependencies
COPY ./packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY ./packages/twenty-server/package.json /app/packages/twenty-server/
COPY ./packages/twenty-server/patches /app/packages/twenty-server/patches
COPY ./packages/twenty-ui/package.json /app/packages/twenty-ui/
COPY ./packages/twenty-shared/package.json /app/packages/twenty-shared/

# Install dependencies
RUN yarn && yarn cache clean && npx nx reset

# Build stage
FROM common-deps AS build

COPY ./packages/twenty-emails /app/packages/twenty-emails
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-server /app/packages/twenty-server

# Build the backend
RUN npx nx run twenty-server:build

# Install only production dependencies
RUN yarn workspaces focus --production twenty-emails twenty-shared twenty-server

# Production stage
FROM node:24-alpine

RUN apk add --no-cache curl postgresql-client

WORKDIR /app/packages/twenty-server

# Copy built application and dependencies
COPY --from=build /app /app
COPY --from=build /app/packages/twenty-server /app/packages/twenty-server

# Create storage directory
RUN mkdir -p /app/.local-storage && chown -R 1000:1000 /app

USER 1000

# Cloud Run expects the container to listen on PORT env variable
ENV NODE_PORT=${PORT:-3000}
EXPOSE ${PORT:-3000}

CMD ["node", "dist/src/main"]
```

### **Paso 5.2: Crear .dockerignore**

Crear `packages/twenty-server/.dockerignore`:

```
node_modules
dist
.env
.env.*
*.log
.git
.gitignore
README.md
test
*.test.ts
*.spec.ts
coverage
```

### **Paso 5.3: Configurar Artifact Registry**

```bash
# Autenticarse en Google Cloud
gcloud auth login

# Configurar proyecto
gcloud config set project crm-cliente

# Crear repositorio en Artifact Registry
gcloud artifacts repositories create backend-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for Twenty CRM backend"
```

### **Paso 5.4: Construir y Subir la Imagen Docker**

**Desde la raíz del proyecto:**

```bash
# Construir la imagen
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --file packages/twenty-server/Dockerfile.cloudrun \
  .

# Nota: El punto al final indica que el contexto es la raíz del proyecto
```

### **Paso 5.5: Preparar Variables de Entorno desde Secret Manager**

Antes del deploy, necesitas tener estos secretos en Secret Manager:

```bash
# Listar secretos existentes
gcloud secrets list

# Si falta alguno, crearlo:
# gcloud secrets create pg-database-url --data-file=- <<< "postgresql://backend:PASSWORD@IP:5432/DATABASE_NAME"
# gcloud secrets create app-secret --data-file=- <<< "TU_SECRET_AQUI"
# gcloud secrets create redis-url --data-file=- <<< "redis://IP:6379"
```

### **Paso 5.6: Deploy a Cloud Run**

```bash
gcloud run deploy twenty-backend \
  --image us-central1-docker.pkg.dev/crm-cliente/backend-repo/twenty-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account backend-runner@crm-cliente.iam.gserviceaccount.com \
  --set-secrets PG_DATABASE_URL=pg-database-url:latest,APP_SECRET=app-secret:latest,REDIS_URL=redis-url:latest \
  --set-env-vars NODE_ENV=production,NODE_PORT=8080 \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 1
```

**Notas importantes:**
- Cloud Run usa la variable `PORT` automáticamente (por defecto 8080)
- El comando `--set-secrets` mapea secretos a variables de entorno
- `--allow-unauthenticated` permite acceso público (cambiar después si es necesario)
- Ajusta `--memory` y `--cpu` según tus necesidades

### **Paso 5.7: Obtener URL del Servicio**

Después del deploy, Cloud Run te dará una URL tipo:
```
https://twenty-backend-abc123-uc.a.run.app
```

**Guarda esta URL** - la necesitarás para:
- Configurar `SERVER_URL` en Secret Manager
- Configurar OAuth de Google (Fase 6)
- Configurar el frontend (Fase 7)

### **Paso 5.8: Actualizar SERVER_URL en Secret Manager**

```bash
# Actualizar el secreto con la URL real de Cloud Run
echo "https://twenty-backend-abc123-uc.a.run.app" | \
  gcloud secrets versions add server-url --data-file=-

# O si ya existe:
echo "https://twenty-backend-abc123-uc.a.run.app" | \
  gcloud secrets versions add server-url --data-file=-
```

### **Paso 5.9: Verificar el Deploy**

```bash
# Ver logs del servicio
gcloud run services logs read twenty-backend --region us-central1

# Probar el endpoint de health (si existe)
curl https://twenty-backend-abc123-uc.a.run.app/health

# Ver detalles del servicio
gcloud run services describe twenty-backend --region us-central1
```

---

## 🟦 FASE 6 — Configurar OAuth con Google

### **Paso 6.1: Habilitar APIs de Google**

```bash
# Habilitar Google+ API y OAuth2 API
gcloud services enable oauth2.googleapis.com
gcloud services enable plus.googleapis.com
```

### **Paso 6.2: Crear Credenciales OAuth**

1. Ve a: **Google Cloud Console → APIs & Services → Credentials**
2. Click en **"Create Credentials" → "OAuth client ID"**
3. Tipo: **"Web application"**
4. Configurar:
   - **Name**: `twenty-oauth-client`
   - **Authorized JavaScript origins**:
     ```
     https://twenty-backend-abc123-uc.a.run.app
     ```
   - **Authorized redirect URIs**:
     ```
     https://twenty-backend-abc123-uc.a.run.app/auth/google/callback
     https://twenty-backend-abc123-uc.a.run.app/auth/google/apis/callback
     ```

5. Guardar **Client ID** y **Client Secret**

### **Paso 6.3: Guardar Credenciales en Secret Manager**

```bash
# Guardar Client ID
echo "TU_CLIENT_ID_AQUI" | \
  gcloud secrets create auth-google-client-id --data-file=-

# Guardar Client Secret
echo "TU_CLIENT_SECRET_AQUI" | \
  gcloud secrets create auth-google-client-secret --data-file=-
```

### **Paso 6.4: Actualizar Cloud Run con Nuevos Secretos**

```bash
gcloud run services update twenty-backend \
  --region us-central1 \
  --update-secrets \
    PG_DATABASE_URL=pg-database-url:latest,\
    APP_SECRET=app-secret:latest,\
    REDIS_URL=redis-url:latest,\
    SERVER_URL=server-url:latest,\
    AUTH_GOOGLE_CLIENT_ID=auth-google-client-id:latest,\
    AUTH_GOOGLE_CLIENT_SECRET=auth-google-client-secret:latest,\
    AUTH_GOOGLE_CALLBACK_URL=server-url:latest,\
    AUTH_GOOGLE_APIS_CALLBACK_URL=server-url:latest
```

**Nota**: `AUTH_GOOGLE_CALLBACK_URL` debe ser `{SERVER_URL}/auth/google/callback`

---

## 🟦 FASE 7 — Deploy del Frontend

### **Opción A: Google Cloud Storage + Cloud CDN (Recomendado - Más Barato)**

#### **Paso 7.1: Build del Frontend**

```bash
# Desde la raíz del proyecto
cd packages/twenty-front

# Configurar variable de entorno con la URL del backend
export VITE_SERVER_URL=https://twenty-backend-abc123-uc.a.run.app

# Build
yarn build

# El build estará en packages/twenty-front/build
```

#### **Paso 7.2: Crear Bucket en Cloud Storage**

```bash
# Crear bucket
gsutil mb -p crm-cliente -c STANDARD -l us-central1 gs://crm-cliente-frontend

# Habilitar hosting estático
gsutil web set -m index.html -e index.html gs://crm-cliente-frontend

# Configurar permisos (público para lectura)
gsutil iam ch allUsers:objectViewer gs://crm-cliente-frontend
```

#### **Paso 7.3: Subir Archivos del Build**

```bash
# Subir todos los archivos del build
gsutil -m cp -r packages/twenty-front/build/* gs://crm-cliente-frontend/

# O usando rsync (más eficiente para updates)
gsutil -m rsync -r packages/twenty-front/build gs://crm-cliente-frontend
```

#### **Paso 7.4: Configurar Cloud CDN (Opcional pero Recomendado)**

```bash
# Crear backend bucket
gcloud compute backend-buckets create crm-frontend-backend \
  --gcs-bucket-name=crm-cliente-frontend

# Crear URL map
gcloud compute url-maps create crm-frontend-map \
  --default-backend-bucket=crm-frontend-backend

# Crear proxy HTTPS
gcloud compute target-https-proxies create crm-frontend-proxy \
  --url-map=crm-frontend-map \
  --ssl-certificates=YOUR_SSL_CERT

# Crear forwarding rule
gcloud compute forwarding-rules create crm-frontend-rule \
  --global \
  --target-https-proxy=crm-frontend-proxy \
  --ports=443
```

### **Opción B: Cloud Run para Frontend (Más Simple, Más Costoso)**

Si prefieres usar Cloud Run también para el frontend:

1. Crear un Dockerfile simple que sirva archivos estáticos
2. Deploy a Cloud Run usando `nginx` o `serve`
3. Configurar dominio después

---

## 🟦 FASE 8 — Configurar Dominio Personalizado

### **Paso 8.1: Verificar Dominio**

```bash
# Verificar propiedad del dominio
gcloud domains verify DOMINIO.com
```

### **Paso 8.2: Mapear Dominio a Cloud Run**

```bash
# Para Backend
gcloud run domain-mappings create \
  --service twenty-backend \
  --domain api.tudominio.com \
  --region us-central1

# Para Frontend (si usas Cloud Run)
gcloud run domain-mappings create \
  --service twenty-frontend \
  --domain tudominio.com \
  --region us-central1
```

### **Paso 8.3: Configurar DNS**

Seguir las instrucciones que Google Cloud te proporciona para configurar los registros DNS en tu proveedor de dominio.

---

## 🟦 FASE 9 — Pruebas Finales

### **Checklist de Pruebas:**

- [ ] Backend responde en `/health` o endpoint raíz
- [ ] Conexión a base de datos funciona
- [ ] Redis está conectado
- [ ] Login con Google funciona
- [ ] Frontend carga correctamente
- [ ] Frontend se conecta al backend
- [ ] HTTPS funciona correctamente
- [ ] Variables de entorno están configuradas

---

## 🟦 FASE 10 — CI/CD (Opcional)

### **Configurar Cloud Build para Deploy Automático**

1. Conectar repositorio GitHub a Cloud Build
2. Crear `cloudbuild.yaml` en la raíz del proyecto
3. Configurar triggers para deploy automático en push a `main`

---

## ⚠️ Consideraciones Importantes

### **Redis**
Twenty CRM **requiere Redis**. Antes de continuar con la Fase 5, decide:

1. **Memorystore Redis** (Recomendado para producción):
   ```bash
   gcloud redis instances create twenty-redis \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7_0
   ```

2. **Redis en Cloud Run** (Más económico, menos escalable):
   - Usar un contenedor Redis adicional en Cloud Run
   - O usar un servicio Redis externo

### **Base de Datos**
- Asegúrate de que la IP pública de Cloud SQL esté habilitada temporalmente
- Después del deploy, configura Cloud SQL Proxy para mejor seguridad
- O usa Private IP si Cloud Run y Cloud SQL están en la misma VPC

### **Costos**
- Cloud Run: Pay-per-use (muy económico para empezar)
- Cloud SQL: ~$10-20/mes para instancia pequeña
- Cloud Storage: ~$0.02/GB/mes
- Memorystore Redis: ~$30/mes para instancia pequeña

---

## 📝 Próximos Pasos Inmediatos

1. ✅ **Verificar Redis** - Crear instancia o decidir alternativa
2. ✅ **Revisar Secret Manager** - Asegurar que todos los secretos están creados
3. ✅ **Crear Dockerfile para Cloud Run** - Usar el proporcionado arriba
4. ✅ **Ejecutar Fase 5 paso a paso** - Comenzar con el deploy del backend

---

## 🔗 Recursos Útiles

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs)

