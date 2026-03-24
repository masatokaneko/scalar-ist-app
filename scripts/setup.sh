#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCALAR_IST_DIR="${SCALAR_IST_DIR:-/Users/kanekomasato/scalar-ist}"
SDK_VERSION="3.12.2"

echo "=========================================="
echo " Scalar IST ローカル環境セットアップ"
echo "=========================================="

# --- 前提条件チェック ---
echo ""
echo "[前提条件チェック]"

if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker がインストールされていません。"; exit 1
fi
if ! command -v java &> /dev/null; then
  echo "ERROR: Java がインストールされていません。"; exit 1
fi
echo "  Docker: $(docker --version | head -1)"
echo "  Java:   $(java -version 2>&1 | head -1)"

# .env 確認
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo ""
  echo "ERROR: .env ファイルが見つかりません。"
  echo "  cp .env.example .env"
  echo "  を実行し、ライセンスキーを設定してください。"
  echo ""
  echo "  ライセンスキー取得先:"
  echo "  https://scalardl.scalar-labs.com/docs/latest/scalar-licensing/trial/"
  exit 1
fi

# GHCR ログイン確認
if ! docker pull ghcr.io/scalar-labs/scalardl-ledger:${SDK_VERSION} > /dev/null 2>&1; then
  echo ""
  echo "WARNING: GHCR からイメージを取得できません。ログインしてください:"
  echo "  echo \$(gh auth token) | docker login ghcr.io -u <username> --password-stdin"
  echo ""
fi

# --- Step 1: PostgreSQL 起動 ---
echo ""
echo "[1/7] PostgreSQL を起動中..."
cd "$PROJECT_DIR"
docker compose up -d postgres
echo "  起動待機中..."
until docker exec scalar-ist-postgres pg_isready -U postgres 2>/dev/null; do
  sleep 2
  echo -n "."
done
echo " OK"

# --- Step 2: ScalarDL Ledger スキーマ作成 ---
echo ""
echo "[2/7] ScalarDL Ledger スキーマを作成中..."
docker compose up scalardl-ledger-schema-loader 2>&1 | tail -3
echo "  OK"

# --- Step 3: IST スキーマ作成 ---
echo ""
echo "[3/7] IST スキーマを作成中..."
docker compose up ist-schema-loader 2>&1 | tail -3
echo "  OK"

# --- Step 4: ScalarDL Ledger 起動 ---
echo ""
echo "[4/7] ScalarDL Ledger を起動中..."
docker compose up -d scalardl-ledger
echo "  起動待機中（30秒）..."
sleep 30

# Ledger 起動確認
if docker logs scalar-ist-ledger 2>&1 | grep -q "LedgerService.*started"; then
  echo "  OK — Ledger 起動成功"
else
  echo "  WARNING: Ledger 起動を確認できません。ログを確認してください:"
  echo "  docker logs scalar-ist-ledger"
fi

# --- Step 5: コントラクト/ファンクション ビルド ---
echo ""
echo "[5/7] Scalar IST コントラクト/ファンクションをビルド中..."
if [ ! -d "$SCALAR_IST_DIR/contracts_and_functions" ]; then
  echo "ERROR: scalar-ist リポジトリが見つかりません: $SCALAR_IST_DIR"
  echo "  SCALAR_IST_DIR 環境変数でパスを指定してください。"
  exit 1
fi
cd "$SCALAR_IST_DIR/contracts_and_functions"
./gradlew build -q 2>&1
echo "  OK"

# --- Step 6: ScalarDL Client SDK 準備 ---
echo ""
echo "[6/7] ScalarDL Client SDK を準備中..."
if [ -f "$SCALAR_IST_DIR/scalardl-java-client-sdk/bin/register-cert" ]; then
  echo "  SDK は既にダウンロード済みです。"
else
  cd "$SCALAR_IST_DIR"
  echo "  ダウンロード中..."
  if command -v curl &> /dev/null; then
    curl -sL -o scalardl-java-client-sdk.zip \
      "https://github.com/scalar-labs/scalardl-java-client-sdk/releases/download/v${SDK_VERSION}/scalardl-java-client-sdk-${SDK_VERSION}.zip"
  elif command -v wget &> /dev/null; then
    wget -q -O scalardl-java-client-sdk.zip \
      "https://github.com/scalar-labs/scalardl-java-client-sdk/releases/download/v${SDK_VERSION}/scalardl-java-client-sdk-${SDK_VERSION}.zip"
  else
    echo "ERROR: curl または wget が必要です。"; exit 1
  fi
  unzip -q -o scalardl-java-client-sdk.zip
  mv "scalardl-java-client-sdk-${SDK_VERSION}" scalardl-java-client-sdk 2>/dev/null || true
  rm -f scalardl-java-client-sdk.zip
  echo "  OK"
fi

# --- Step 7: ファンクション/コントラクト登録 + 初期化 ---
echo ""
echo "[7/7] ファンクション/コントラクト登録 + 初期化..."

# deploy script の設定修正（auditor無効化、サーバー指定）
DEPLOY_DIR="$SCALAR_IST_DIR/tools/deploy"
for f in "$DEPLOY_DIR/fixture/conf/"*.properties; do
  sed -i '' 's/auditor.enabled=true/auditor.enabled=false/' "$f" 2>/dev/null || true
  if ! grep -q "server.host" "$f" 2>/dev/null; then
    echo "scalar.dl.client.server.host=localhost" >> "$f"
    echo "scalar.dl.client.server.port=50051" >> "$f"
  fi
done

# common.sh の --ignore-registered 削除
sed -i '' 's/--ignore-registered//' "$DEPLOY_DIR/common.sh" 2>/dev/null || true

cd "$DEPLOY_DIR"

echo "  ファンクション登録..."
./functions 2>&1 | grep -E "SUCCESSFUL|FAILED|succeeded|failed" | tail -2

echo "  システム初期化..."
./initialize 2>&1 | grep -E "SUCCESSFUL|FAILED" | tail -3

echo "  会社登録..."
./register_company 2>&1 | grep -E "SUCCESSFUL|FAILED" | tail -3

echo "  Admin ユーザー登録..."
./upsert_user_profile_admin 2>&1 | grep -E "SUCCESSFUL|FAILED" | tail -3

echo "  Controller ユーザー登録..."
./upsert_user_profile_controller 2>&1 | grep -E "SUCCESSFUL|FAILED" | tail -3

echo ""
echo "=========================================="
echo " セットアップ完了！"
echo ""
echo " ポート一覧:"
echo "   PostgreSQL:  localhost:5432"
echo "   ScalarDL:    localhost:50051 (gRPC)"
echo "   Privileged:  localhost:50052"
echo "   Admin:       localhost:50053"
echo ""
echo " CLI アプリ実行例:"
echo "   cd $PROJECT_DIR"
echo "   app/gradlew -p app run --args=\"setup --properties $PROJECT_DIR/config/controller.properties --purpose テスト\""
echo ""
echo " 環境停止:"
echo "   $PROJECT_DIR/scripts/teardown.sh"
echo "=========================================="
