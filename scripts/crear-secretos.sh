#!/bin/bash
# Script para crear secretos faltantes para Twenty CRM

set -e

echo "🔐 Creando secretos para Twenty CRM..."
echo ""

# Paso 1: Obtener valores existentes
echo "📥 Obteniendo valores de secretos existentes..."
DB_HOST=$(gcloud secrets versions access latest --secret="db_host" 2>/dev/null || echo "")
DB_USER=$(gcloud secrets versions access latest --secret="db_user" 2>/dev/null || echo "")
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db_password" 2>/dev/null || echo "")
DB_NAME=$(gcloud secrets versions access latest --secret="db_name" 2>/dev/null || echo "")
JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt_secret" 2>/dev/null || echo "")

# Verificar que tenemos los valores necesarios
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "❌ Error: Faltan secretos necesarios"
    echo "   Verifica que existan: db_host, db_user, db_password, db_name"
    exit 1
fi

echo "   ✓ Valores obtenidos correctamente"
echo ""

# Paso 2: Decidir formato de PG_DATABASE_URL
echo "¿Qué tipo de conexión usarás para PostgreSQL?"
echo "  1) IP Pública (temporal, menos seguro)"
echo "  2) IP Privada con Cloud SQL Proxy (recomendado, más seguro)"
echo ""
read -p "Elige opción (1 o 2): " OPCION

if [ "$OPCION" = "2" ]; then
    # Cloud SQL Proxy
    echo ""
    echo "📋 Necesitas el Connection Name de tu instancia Cloud SQL"
    echo "   Listando instancias disponibles..."
    gcloud sql instances list
    echo ""
    read -p "Ingresa el Connection Name completo (formato: PROJECT:REGION:INSTANCE_NAME): " CONNECTION_NAME

    if [ -z "$CONNECTION_NAME" ]; then
        echo "❌ Error: Connection Name es requerido"
        exit 1
    fi

    # Construir URL con formato Cloud SQL Proxy
    PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
    echo "   ✓ Usando formato Cloud SQL Proxy"
else
    # IP Pública
    PG_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"
    echo "   ✓ Usando formato IP Pública"
fi

echo ""

# Paso 3: Crear pg-database-url
echo "✅ Creando secreto: pg-database-url"
if echo "$PG_DATABASE_URL" | gcloud secrets create pg-database-url --data-file=- 2>/dev/null; then
    echo "   ✓ pg-database-url creado exitosamente"
else
    # Si ya existe, actualizar versión
    echo "   ⚠️  El secreto ya existe, actualizando versión..."
    echo "$PG_DATABASE_URL" | gcloud secrets versions add pg-database-url --data-file=-
    echo "   ✓ pg-database-url actualizado"
fi

echo ""

# Paso 4: Crear app-secret
if [ -n "$JWT_SECRET" ]; then
    echo "✅ Creando secreto: app-secret (desde jwt_secret existente)"
    if echo "$JWT_SECRET" | gcloud secrets create app-secret --data-file=- 2>/dev/null; then
        echo "   ✓ app-secret creado exitosamente"
    else
        echo "   ⚠️  El secreto ya existe, actualizando versión..."
        echo "$JWT_SECRET" | gcloud secrets versions add app-secret --data-file=-
        echo "   ✓ app-secret actualizado"
    fi
else
    echo "⚠️  jwt_secret no encontrado"
    read -p "¿Generar un nuevo app-secret aleatorio? (s/n): " GENERAR

    if [ "$GENERAR" = "s" ] || [ "$GENERAR" = "S" ]; then
        echo "   Generando nuevo secreto seguro..."
        NEW_SECRET=$(openssl rand -hex 32)
        if echo "$NEW_SECRET" | gcloud secrets create app-secret --data-file=- 2>/dev/null; then
            echo "   ✓ app-secret generado y creado"
        else
            echo "   ⚠️  El secreto ya existe, actualizando versión..."
            echo "$NEW_SECRET" | gcloud secrets versions add app-secret --data-file=-
            echo "   ✓ app-secret actualizado con nuevo valor"
        fi
    else
        echo "   ⏭️  Saltando creación de app-secret"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ¡Secretos creados exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumen de secretos creados:"
echo "   ✓ pg-database-url"
echo "   ✓ app-secret"
echo ""
echo "📝 Secretos que aún necesitas crear:"
echo "   ⏳ redis-url (después de configurar Redis)"
echo "   ⏳ server-url (después del deploy de Cloud Run)"
echo "   ⏳ auth-google-client-id (Fase 6)"
echo "   ⏳ auth-google-client-secret (Fase 6)"
echo ""
echo "⏭️  Próximos pasos:"
echo "   1. Configurar Redis"
echo "   2. Crear redis-url después de configurar Redis"
echo "   3. Deploy del backend a Cloud Run"
echo ""
