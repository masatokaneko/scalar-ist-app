# Scalar IST App

Scalar IST（個人情報同意管理テンプレート）を使った簡易同意管理CLIアプリケーション。

## 前提条件

- Docker / Docker Compose V2
- Java 17+
- ScalarDL Trial License Key（[取得はこちら](https://scalardl.scalar-labs.com/docs/latest/scalar-licensing/trial/)）
- GHCR アクセス権（`docker login ghcr.io`）

## セットアップ

```bash
# 1. .env にライセンスキーを設定
cp .env.example .env
# .env を編集してライセンスキーとCR_PATを設定

# 2. 環境起動
./scripts/setup.sh

# 3. コントラクト/ファンクション登録（scalar-istリポジトリのデプロイスクリプト使用）
cd /path/to/scalar-ist/tools/deploy
./functions
./initialize
./register_company
./upsert_user_profile_admin
./upsert_user_profile_controller
```

## CLIコマンド

```bash
cd app

# マスタデータ登録
./gradlew run --args="setup --purpose マーケティング利用"
./gradlew run --args="setup --dataset 氏名メールアドレス"

# 同意文書作成（draft状態）
./gradlew run --args="consent create --title データ利用同意書"

# 同意文書公開
./gradlew run --args="consent publish --id <consent-statement-id>"

# 同意文書一覧
./gradlew run --args="consent list"

# データ主体が同意
./gradlew run --args="status approve --statement-id <id> --subject user@example.com"

# データ主体が拒否
./gradlew run --args="status reject --statement-id <id> --subject user@example.com"

# 同意状態照会
./gradlew run --args="status list --statement-id <id>"
```

## 環境停止

```bash
./scripts/teardown.sh
```

## 技術スタック

- ScalarDL SDK 3.12.2
- ScalarDB 3.17.1
- Cassandra 3.11
- picocli 4.7.7
- Java 17（ビルド）/ JDK 8互換バイナリ

## 関連リポジトリ

- [scalar-ist](https://github.com/scalar-labs/scalar-ist) — コントラクト/ファンクション定義
