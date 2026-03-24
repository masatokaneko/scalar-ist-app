# CLAUDE.md — Scalar IST App

## プロジェクト概要

Scalar IST（個人情報同意管理テンプレート）を使った簡易同意管理アプリケーション。
ScalarDL 3.12.2 + ScalarDB 3.17.1 + Cassandra のローカル環境で動作する。

## 依存プロジェクト

- `scalar-ist`（/Users/kanekomasato/scalar-ist）: コントラクト/ファンクションの依存元

## コマンド

```bash
# 環境起動
./scripts/setup.sh

# 環境停止
./scripts/teardown.sh

# アプリビルド
cd app && ./gradlew build

# アプリ実行
java -jar app/build/libs/app.jar <command>
```

## 技術スタック

- ScalarDL SDK: 3.12.2
- ScalarDB: 3.17.1
- Java: 17（ビルド）、8互換バイナリ（コントラクト）
- Docker Compose: Cassandra 3.11 + ScalarDL Ledger
- CLI: picocli 4.7.7

## ライセンス

- ScalarDL Trial License: https://scalardl.scalar-labs.com/docs/latest/scalar-licensing/trial/
- ScalarDB Trial License: https://scalardb.scalar-labs.com/docs/latest/scalar-licensing/trial/
- ライセンスキーは `.env` に保存（.gitignore対象）

## 開発ルール

1. 実装前に `docs/plans/ISSUE-<id>.md` に計画書を作成
2. 1 Issue = 1 PR
3. 変更後は動作確認
4. `docs/progress/` に進捗を記録
