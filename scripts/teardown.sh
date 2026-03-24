#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo " Scalar IST ローカル環境停止"
echo "=========================================="

cd "$PROJECT_DIR"
docker compose down -v

echo ""
echo "環境を停止しました。"
