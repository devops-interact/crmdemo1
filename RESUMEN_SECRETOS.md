# 📋 Resumen Rápido: Secretos para Twenty CRM

## 🎯 Secretos que el Código Espera

El código de Twenty CRM busca estas **variables de entorno** (que vendrán de Secret Manager):

```
✅ PG_DATABASE_URL      → URL completa de PostgreSQL
✅ APP_SECRET           → Secreto para JWT/encriptación
✅ REDIS_URL            → URL de Redis
✅ SERVER_URL           → URL pública del backend
⏳ AUTH_GOOGLE_CLIENT_ID → Client ID de Google (Fase 6)
⏳ AUTH_GOOGLE_CLIENT_SECRET → Client Secret de Google (Fase 6)
```

---

## 🔄 Mapeo: Tus Secretos → Secretos del Código

| Tu Secreto Actual | Secreto que Espera el Código | Acción |
|-------------------|------------------------------|--------|
| `db_host` | | |
| `db_user` | `PG_DATABASE_URL` | **COMBINAR** en una URL |
| `db_password` | | |
| `db_name` | | |
| `jwt_secret` | `APP_SECRET` | **RENOMBRAR** (mismo valor) |
| - | `REDIS_URL` | **CREAR** (después) |
| - | `SERVER_URL` | **CREAR** (después del deploy) |
| `google_client_id` | `AUTH_GOOGLE_CLIENT_ID` | **RENOMBRAR** (Fase 6) |
| `google_client_secret` | `AUTH_GOOGLE_CLIENT_SECRET` | **RENOMBRAR** (Fase 6) |

---

## 🚀 Opción Rápida: Usar el Script

```bash
# 1. Dar permisos al script
chmod +x scripts/crear-secretos.sh

# 2. Ejecutar
./scripts/crear-secretos.sh

# 3. Seguir las instrucciones en pantalla
```

---

## 📝 Opción Manual: Comandos Paso a Paso

### **Paso 1: Obtener Valores**

```bash
DB_HOST=$(gcloud secrets versions access latest --secret="db_host")
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret")
```

### **Paso 2: Crear `pg-database-url`**

**Si usas IP Pública:**
```bash
echo "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-
```

**Si usas IP Privada (Cloud SQL Proxy):**
```bash
# Primero obtener Connection Name
CONNECTION_NAME=$(gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)')

# Luego crear el secreto
echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-
```

### **Paso 3: Crear `app-secret`**

```bash
echo "$JWT_SECRET" | gcloud secrets create app-secret --data-file=-
```

---

## ✅ Verificar

```bash
# Listar secretos creados
gcloud secrets list | grep -E "pg-database-url|app-secret"

# Verificar valores (opcional, solo para debug)
gcloud secrets versions access latest --secret="pg-database-url"
```

---

## 📚 Documentación Completa

Para más detalles, ver: `GUIA_SECRETOS_PASO_A_PASO.md`

