# Scalar IST App セットアップガイド

## 1. 前提条件

| 項目 | 要件 | 確認コマンド |
|------|------|------------|
| Docker | 20.10+ / Compose V2 | `docker --version` |
| Java | 17+ (OpenJDK推奨) | `java -version` |
| curl | 必須 | `curl --version` |
| GHCR認証 | scalar-labs Dockerイメージ取得用 | `docker pull ghcr.io/scalar-labs/scalardl-ledger:3.12.2` |
| scalar-ist | コントラクト/ファンクションリポジトリ | `/Users/kanekomasato/scalar-ist` に配置 |

## 2. ライセンスキー取得

ScalarDL Trial License Key を取得してください:
- **取得先**: https://scalardl.scalar-labs.com/docs/latest/scalar-licensing/trial/
- **形式**: JSON（`organization_name`, `expiration_date_time`, `signature`等を含む）

## 3. GHCRログイン

```bash
# GitHub CLIのトークンを使う場合
echo $(gh auth token) | docker login ghcr.io -u <GitHubユーザー名> --password-stdin

# PAT(Personal Access Token)を使う場合（read:packagesスコープ必須）
echo <PAT> | docker login ghcr.io -u <GitHubユーザー名> --password-stdin
```

## 4. 環境設定

```bash
cd /Users/kanekomasato/scalar-ist-app

# .envファイル作成
cp .env.example .env

# .envを編集してライセンスキーを設定
# SCALAR_DL_LEDGER_LICENSING_LICENSE_KEY={"organization_name":"Trial",...}
# SCALAR_DL_LEDGER_LICENSING_LICENSE_CHECK_CERT_PEM=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
```

**重要**: `.env`はgitignore対象です。コミットしないでください。

## 5. 自動セットアップ（推奨）

```bash
./scripts/setup.sh
```

全ステップ（PostgreSQL起動→スキーマ作成→Ledger起動→ビルド→登録）を自動実行します。

## 6. 手動セットアップ

自動スクリプトが失敗した場合、以下の手順で個別に実行できます。

### Step 1: PostgreSQL起動

```bash
docker compose up -d postgres

# 起動確認
docker exec scalar-ist-postgres pg_isready -U postgres
```

### Step 2: ScalarDL Ledgerスキーマ作成

```bash
docker compose up scalardl-ledger-schema-loader
# 「Creating the coordinator tables succeeded」が表示されればOK
```

### Step 3: ISTスキーマ作成

```bash
docker compose up ist-schema-loader
# 10テーブル作成（consent_statement, purpose, company等）
```

### Step 4: ScalarDL Ledger起動

```bash
docker compose up -d scalardl-ledger

# 30秒待機後、起動確認
sleep 30
docker logs scalar-ist-ledger 2>&1 | tail -5
# 「LedgerService ... started ... listening on 50051」が表示されればOK
```

### Step 5: コントラクト/ファンクションビルド

```bash
cd /Users/kanekomasato/scalar-ist/contracts_and_functions
./gradlew build
```

### Step 6: ScalarDL Client SDK取得

```bash
cd /Users/kanekomasato/scalar-ist
curl -sL -o scalardl-java-client-sdk.zip \
  "https://github.com/scalar-labs/scalardl-java-client-sdk/releases/download/v3.12.2/scalardl-java-client-sdk-3.12.2.zip"
unzip -q -o scalardl-java-client-sdk.zip
mv scalardl-java-client-sdk-3.12.2 scalardl-java-client-sdk
rm -f scalardl-java-client-sdk.zip
```

### Step 7: デプロイスクリプト設定修正

```bash
cd /Users/kanekomasato/scalar-ist/tools/deploy

# auditor無効化 + サーバー指定 + --ignore-registered削除
for f in fixture/conf/*.properties; do
  sed -i '' 's/auditor.enabled=true/auditor.enabled=false/' "$f"
  grep -q "server.host" "$f" || echo -e "scalar.dl.client.server.host=localhost\nscalar.dl.client.server.port=50051" >> "$f"
done
sed -i '' 's/--ignore-registered//' common.sh
```

### Step 8: ファンクション/コントラクト登録

```bash
./functions           # ファンクション14個登録
./initialize          # システム初期化
./register_company    # 会社登録
./upsert_user_profile_admin      # Admin登録
./upsert_user_profile_controller # Controller登録
```

## 7. CLIアプリ実行

```bash
cd /Users/kanekomasato/scalar-ist-app

# 利用目的登録
app/gradlew -p app run --args="setup \
  --properties /Users/kanekomasato/scalar-ist-app/config/controller.properties \
  --purpose マーケティング利用"

# 同意文書作成
app/gradlew -p app run --args="consent create \
  --properties /Users/kanekomasato/scalar-ist-app/config/controller.properties \
  --title データ利用同意書"
```

**注意**: `--properties`には**絶対パス**を指定してください。

## 8. ポートマッピング

| ポート | サービス | 用途 |
|--------|---------|------|
| 5432 | PostgreSQL | データベース |
| 50051 | ScalarDL Ledger | gRPC（コントラクト実行） |
| 50052 | ScalarDL Ledger | Privileged（証明書登録・ファンクション登録） |
| 50053 | ScalarDL Ledger | Admin |

## 9. 環境停止・クリーンアップ

```bash
# 停止のみ（データ保持）
docker compose stop

# 完全クリーンアップ（データ削除）
./scripts/teardown.sh
# または
docker compose down -v
```

## 10. よくある問題

[docs/troubleshooting.md](docs/troubleshooting.md) を参照してください。
