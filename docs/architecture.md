# アーキテクチャ

## コンポーネント構成

```
┌─────────────────────────────────────────────────────────┐
│                    CLI App (Java)                        │
│  setup | consent | status                               │
│  ↓ gRPC (port 50051/50052)                              │
├─────────────────────────────────────────────────────────┤
│                ScalarDL Ledger 3.12.2                    │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Contracts   │  │  Functions  │  │  Ledger Core  │  │
│  │  (23個)      │  │  (14個)     │  │  (台帳管理)   │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
│  ↓ JDBC                                                 │
├─────────────────────────────────────────────────────────┤
│               PostgreSQL 15                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  scalar namespace (Ledger内部テーブル)             │   │
│  │  - asset, asset_metadata, contract, function     │   │
│  │  - certificate, secret, tx_state                 │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  ist namespace (IST業務テーブル)                   │   │
│  │  - consent_statement, purpose, data_set_schema   │   │
│  │  - company, organization, user_profile           │   │
│  │  - consent, benefit, third_party                 │   │
│  │  - data_retention_policy                         │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  coordinator namespace (トランザクション管理)      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## ポート一覧

| ポート | サービス | 用途 | 接続元 |
|--------|---------|------|--------|
| 5432 | PostgreSQL | JDBC | ScalarDL Ledger |
| 50051 | ScalarDL Ledger | gRPC | CLI App, execute-contract |
| 50052 | ScalarDL Ledger | Privileged gRPC | register-cert, register-functions, register-contracts |
| 50053 | ScalarDL Ledger | Admin | 管理操作 |

## 設定の優先順位

ScalarDL Ledgerの設定は以下の優先順位で適用される:

1. **環境変数**（最高優先）— `docker-compose.yml`の`environment`
2. **propertiesテンプレート** — コンテナ内の`ledger.properties.tmpl`が環境変数を参照

→ **docker-compose.ymlの`environment`で設定する方式を推奨**

## Dockerイメージ一覧

| イメージ | バージョン | 用途 |
|---------|-----------|------|
| `ghcr.io/scalar-labs/scalardl-ledger` | 3.12.2 | ScalarDL Ledger本体 |
| `ghcr.io/scalar-labs/scalardl-schema-loader` | 3.12.2 | ScalarDL用スキーマ作成 |
| `ghcr.io/scalar-labs/scalardb-schema-loader` | 3.17.1 | IST用スキーマ作成 |
| `postgres` | 15 | バックエンドDB |

## 機能フラグ

| フラグ | 値 | 理由 |
|--------|-----|------|
| `SCALAR_DL_LEDGER_PROOF_ENABLED` | false | IST単体では不要 |
| `SCALAR_DL_LEDGER_DIRECT_ASSET_ACCESS_ENABLED` | true | JDBC利用時に効率的 |
| `scalar.dl.client.auditor.enabled` | false | Auditor未使用 |
