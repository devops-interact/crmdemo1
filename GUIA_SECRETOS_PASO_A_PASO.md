# 🔐 Guía Paso a Paso: Configurar Secretos para Twenty CRM

## 📋 Secretos que Espera el Código

Basado en el análisis del código de Twenty CRM, estos son los secretos **REQUERIDOS**:

| Variable de Entorno | Descripción | Requerido | Tu Secreto Actual |
|---------------------|-------------|-----------|-------------------|
| `PG_DATABASE_URL` | URL completa de PostgreSQL | ✅ SÍ | Combinar: `db_host`, `db_user`, `db_password`, `db_name` |
| `APP_SECRET` | Secreto para JWT y encriptación | ✅ SÍ | `jwt_secret` |
| `REDIS_URL` | URL de conexión a Redis | ✅ SÍ | Crear después |
| `SERVER_URL` | URL pública del backend | ✅ SÍ | Crear después del deploy |
| `AUTH_GOOGLE_CLIENT_ID` | Client ID de Google OAuth | ⏳ Fase 6 | `google_client_id` |
| `AUTH_GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth | ⏳ Fase 6 | `google_client_secret` |

---

## 🎯 Paso a Paso: Crear Secretos

### **Paso 1: Verificar Secretos Existentes**

Primero, vamos a verificar que tienes los secretos necesarios:

```bash
# Listar todos tus secretos
gcloud secrets list

# Verificar que existen estos secretos:
# - db_host
# - db_user
# - db_password
# - db_name
# - jwt_secret
```

**Si alguno no existe, créalo primero antes de continuar.**

---

### **Paso 2: Obtener Valores de Secretos Existentes**

Vamos a obtener los valores de tus secretos existentes y guardarlos temporalmente:

```bash
# Obtener valores (los guardaremos en variables)
DB_HOST=$(gcloud secrets versions access latest --secret="db_host")
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret")

# Verificar que obtuvimos los valores (opcional, para verificar)
echo "DB_HOST: $DB_HOST"
echo "DB_USER: $DB_USER"
echo "DB_NAME: $DB_NAME"
echo "JWT_SECRET: ${JWT_SECRET:0:10}..." # Solo muestra primeros 10 caracteres por seguridad
```

**⚠️ Nota**: Si alguno falla, verifica que el nombre del secreto sea exacto (case-sensitive).

---

### **Paso 3: Crear `pg-database-url` (Combinando los 4 secretos)**

El formato de `PG_DATABASE_URL` es una URL completa de PostgreSQL:

```
postgresql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_BD
```

#### **Opción A: Si usas IP Pública (temporal)**

```bash
# Construir la URL completa
PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"

# Crear el secreto
echo "$PG_DATABASE_URL" | gcloud secrets create pg-database-url --data-file=-

# Verificar que se creó correctamente (opcional)
echo "✅ Secreto pg-database-url creado"
```

#### **Opción B: Si usas IP Privada con Cloud SQL Proxy (Recomendado)**

Primero necesitas obtener el **Connection Name** de tu instancia Cloud SQL:

```bash
# Listar instancias Cloud SQL
gcloud sql instances list

# Obtener el Connection Name (formato: PROJECT:REGION:INSTANCE_NAME)
CONNECTION_NAME=$(gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)')

# Construir URL con formato Cloud SQL Proxy
PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

# Crear el secreto
echo "$PG_DATABASE_URL" | gcloud secrets create pg-database-url --data-file=-

# Verificar
echo "✅ Secreto pg-database-url creado con Cloud SQL Proxy"
```

**📝 Nota**: Reemplaza `TU_INSTANCE_NAME` con el nombre real de tu instancia Cloud SQL.

#### **Ejemplo Real:**

Si tus valores son:
- `db_host`: `10.115.0.3`
- `db_user`: `backend`
- `db_password`: `MiPassword123!`
- `db_name`: `twenty_db`

**Con IP Pública:**
```bash
PG_DATABASE_URL="postgresql://backend:MiPassword123!@10.115.0.3:5432/twenty_db"
```

**Con Cloud SQL Proxy:**
```bash
# Si tu Connection Name es: crm-cliente:us-central1:twenty-instance
PG_DATABASE_URL="postgresql://backend:MiPassword123!@localhost/twenty_db?host=/cloudsql/crm-cliente:us-central1:twenty-instance"
```

---

### **Paso 4: Crear `app-secret`**

Este secreto usa el valor de tu `jwt_secret` existente:

```bash
# Crear app-secret usando jwt_secret
echo "$JWT_SECRET" | gcloud secrets create app-secret --data-file=-

# Verificar
echo "✅ Secreto app-secret creado"
```

**Si no tienes `jwt_secret` o quieres generar uno nuevo:**

```bash
# Generar un nuevo secreto aleatorio seguro
NEW_SECRET=$(openssl rand -hex 32)
echo "$NEW_SECRET" | gcloud secrets create app-secret --data-file=-
echo "✅ Nuevo app-secret generado y creado"
```

---

### **Paso 5: Verificar Secretos Creados**

```bash
# Listar todos los secretos
gcloud secrets list

# Deberías ver:
# - pg-database-url ✅
# - app-secret ✅
# - (los demás que ya tenías)
```

---

## 📝 Script Completo (Todo en Uno)

Aquí tienes un script que hace todo automáticamente:

```bash
#!/bin/bash
# Script para crear secretos faltantes

set -e

echo "🔐 Creando secretos para Twenty CRM..."

# Paso 1: Obtener valores existentes
echo "📥 Obteniendo valores de secretos existentes..."
DB_HOST=$(gcloud secrets versions access latest --secret="db_host")
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret")

# Verificar que tenemos los valores
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "❌ Error: Faltan secretos necesarios"
    exit 1
fi

# Paso 2: Decidir formato de PG_DATABASE_URL
echo ""
echo "¿Qué tipo de conexión usarás?"
echo "1) IP Pública (temporal)"
echo "2) IP Privada con Cloud SQL Proxy (recomendado)"
read -p "Elige opción (1 o 2): " OPCION

if [ "$OPCION" = "2" ]; then
    # Cloud SQL Proxy
    echo "📋 Necesitas el Connection Name de tu instancia Cloud SQL"
    gcloud sql instances list
    read -p "Ingresa el Connection Name (formato: PROJECT:REGION:INSTANCE): " CONNECTION_NAME

    if [ -z "$CONNECTION_NAME" ]; then
        echo "❌ Error: Connection Name es requerido"
        exit 1
    fi

    PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
else
    # IP Pública
    PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"
fi

# Paso 3: Crear pg-database-url
echo "✅ Creando pg-database-url..."
echo "$PG_DATABASE_URL" | gcloud secrets create pg-database-url --data-file=- 2>/dev/null || \
    (echo "$PG_DATABASE_URL" | gcloud secrets versions add pg-database-url --data-file=- && echo "   (Actualizado versión existente)")
echo "   ✓ pg-database-url creado"

# Paso 4: Crear app-secret
if [ -n "$JWT_SECRET" ]; then
    echo "✅ Creando app-secret desde jwt_secret..."
    echo "$JWT_SECRET" | gcloud secrets create app-secret --data-file=- 2>/dev/null || \
        (echo "$JWT_SECRET" | gcloud secrets versions add app-secret --data-file=- && echo "   (Actualizado versión existente)")
    echo "   ✓ app-secret creado"
else
    echo "⚠️  jwt_secret no encontrado. Generando nuevo app-secret..."
    NEW_SECRET=$(openssl rand -hex 32)
    echo "$NEW_SECRET" | gcloud secrets create app-secret --data-file=-
    echo "   ✓ app-secret generado y creado"
fi

echo ""
echo "✅ ¡Secretos creados exitosamente!"
echo ""
echo "📋 Resumen:"
echo "   - pg-database-url: ✅"
echo "   - app-secret: ✅"
echo ""
echo "⏭️  Próximos pasos:"
echo "   1. Configurar Redis"
echo "   2. Crear redis-url después de configurar Redis"
echo "   3. Deploy del backend"
```

**Para usar el script:**

```bash
# Guardar el script en un archivo
nano crear-secretos.sh
# (pegar el contenido arriba)

# Dar permisos de ejecución
chmod +x crear-secretos.sh

# Ejecutar
./crear-secretos.sh
```

---

## 🔍 Verificación Manual (Sin Script)

Si prefieres hacerlo manualmente, aquí están los comandos uno por uno:

### **1. Obtener valores:**

```bash
DB_HOST=$(gcloud secrets versions access latest --secret="db_host")
DB_USER=$(gcloud secrets versions access latest --secret="db_user")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret")
```

### **2. Crear pg-database-url (IP Pública):**

```bash
echo "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-
```

### **3. Crear pg-database-url (IP Privada con Proxy):**

```bash
# Primero obtener Connection Name
CONNECTION_NAME=$(gcloud sql instances describe TU_INSTANCE_NAME --format='value(connectionName)')

# Luego crear el secreto
echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}" | \
  gcloud secrets create pg-database-url --data-file=-
```

### **4. Crear app-secret:**

```bash
echo "$JWT_SECRET" | gcloud secrets create app-secret --data-file=-
```

---

## ✅ Checklist Final

Después de ejecutar los pasos, verifica:

- [ ] `pg-database-url` creado correctamente
- [ ] `app-secret` creado correctamente
- [ ] Puedes ver los secretos en: `gcloud secrets list`
- [ ] Los valores son correctos (verificar formato de URL)

---

## 🆘 Solución de Problemas

### Error: "Secret already exists"

Si el secreto ya existe, puedes:
1. **Actualizar la versión existente:**
   ```bash
   echo "NUEVO_VALOR" | gcloud secrets versions add NOMBRE_SECRETO --data-file=-
   ```

2. **Eliminar y recrear:**
   ```bash
   gcloud secrets delete NOMBRE_SECRETO
   # Luego crear de nuevo
   ```

### Error: "Permission denied"

Verifica que tienes permisos:
```bash
gcloud projects get-iam-policy crm-cliente
```

### Error: "Secret not found"

Verifica el nombre exacto (case-sensitive):
```bash
gcloud secrets list
```

---

## 📚 Referencias

- **Formato PostgreSQL URL**: `postgresql://user:password@host:port/database`
- **Cloud SQL Proxy**: `postgresql://user:password@localhost/database?host=/cloudsql/CONNECTION_NAME`
- **Documentación**: [Google Secret Manager](https://cloud.google.com/secret-manager/docs)

---

¿Necesitas ayuda con algún paso específico?

