#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCALAR_IST_DIR="/Users/kanekomasato/scalar-ist"
SDK_VERSION="3.12.2"

echo "=========================================="
echo " Scalar IST ローカル環境セットアップ"
echo "=========================================="

# .env 確認
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "ERROR: .env ファイルが見つかりません。"
  echo ".env.example をコピーして .env を作成し、ライセンスキーを設定してください。"
  echo "  cp .env.example .env"
  exit 1
fi

# Docker Compose起動
echo ""
echo "[1/6] Docker環境を起動中..."
cd "$PROJECT_DIR"
docker compose up -d cassandra
echo "  Cassandra起動待機中..."
until docker exec scalar-ist-cassandra cqlsh -e "describe cluster" 2>/dev/null; do
  sleep 2
  echo -n "."
done
echo " OK"

# ScalarDL Ledgerスキーマ作成
echo ""
echo "[2/6] ScalarDL Ledgerスキーマを作成中..."
docker compose up scalardl-ledger-schema-loader
echo "  OK"

# IST スキーマ作成
echo ""
echo "[3/6] IST スキーマを作成中..."
docker compose up ist-schema-loader
echo "  OK"

# ScalarDL Ledger起動
echo ""
echo "[4/6] ScalarDL Ledgerを起動中..."
docker compose up -d scalar-ledger
echo "  30秒待機中..."
sleep 30
echo "  OK"

# コントラクト/ファンクションビルド
echo ""
echo "[5/6] Scalar IST コントラクト/ファンクションをビルド中..."
cd "$SCALAR_IST_DIR/contracts_and_functions"
./gradlew build -q
echo "  OK"

# ScalarDL Client SDKダウンロード
echo ""
echo "[6/6] ScalarDL Client SDK を準備中..."
if [ ! -d "$SCALAR_IST_DIR/scalardl-java-client-sdk" ]; then
  cd "$SCALAR_IST_DIR"
  wget -q -O scalardl-java-client-sdk.zip \
    "https://github.com/scalar-labs/scalardl-java-client-sdk/releases/download/v${SDK_VERSION}/scalardl-java-client-sdk-${SDK_VERSION}.zip"
  unzip -q -o scalardl-java-client-sdk.zip
  mv "scalardl-java-client-sdk-${SDK_VERSION}" scalardl-java-client-sdk 2>/dev/null || true
  rm -f scalardl-java-client-sdk.zip
fi
echo "  OK"

echo ""
echo "=========================================="
echo " セットアップ完了"
echo ""
echo " 次のステップ:"
echo "   cd $SCALAR_IST_DIR/tools/deploy"
echo "   ./functions           # ファンクション登録"
echo "   ./initialize          # システム初期化"
echo "   ./register_company    # 企業登録"
echo "=========================================="
