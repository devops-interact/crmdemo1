#!/bin/sh
set -e

# Debug: Print environment variables
echo "=== Environment Variables ==="
echo "PORT: ${PORT:-not set}"
echo "NODE_PORT: ${NODE_PORT:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo ""

# Set NODE_PORT from PORT if not already set
export NODE_PORT=${PORT:-8080}
echo "Using NODE_PORT: $NODE_PORT"
echo ""

# Debug: Check if files exist
echo "=== File Check ==="
pwd
ls -la dist/src/main* 2>&1 || echo "ERROR: dist/src/main not found!"
echo ""

# Debug: Check Node.js version
echo "=== Node.js Info ==="
node --version
echo ""

# Start the application
echo "=== Starting Application ==="
exec node dist/src/main

