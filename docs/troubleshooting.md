# トラブルシューティング

## Docker関連

### E-01: GHCR認証エラー（403 Forbidden / unauthorized）

**症状**: `docker pull ghcr.io/scalar-labs/scalardl-ledger:3.12.2` が失敗
**原因**: GHCRにログインしていない
**対処**:
```bash
echo $(gh auth token) | docker login ghcr.io -u <username> --password-stdin
```

### E-02: Dockerイメージ名が見つからない

**症状**: `not found` エラー
**原因**: イメージ名の間違い
**正しいイメージ名**:
| 用途 | 正しいイメージ名 | 間違いやすい名前 |
|------|---------------|----------------|
| Ledger | `scalardl-ledger` | `scalar-ledger` |
| Schema Loader (DL) | `scalardl-schema-loader` | `scalardl-schema-loader-cassandra` |
| Schema Loader (DB) | `scalardb-schema-loader` | — |

### E-03: Ledger起動失敗（Cannot build a cluster without contact points）

**症状**: Ledgerコンテナが即座に終了
**原因**: DB接続設定が読み込まれていない
**対処**: `docker-compose.yml`で環境変数を設定（propertiesファイルのマウントでは効かない場合がある）
```yaml
environment:
  - SCALAR_DB_CONTACT_POINTS=jdbc:postgresql://postgres:5432/scalarist
  - SCALAR_DB_USERNAME=postgres
  - SCALAR_DB_PASSWORD=postgres
  - SCALAR_DB_STORAGE=jdbc
```

### E-04: ポート50052接続拒否

**症状**: `Connection refused: localhost:50052`
**原因**: docker-compose.ymlで50052ポートをマッピングしていない
**対処**: portsに50052を追加
```yaml
ports:
  - "50051:50051"
  - "50052:50052"  # ← これが必要
  - "50053:50053"
```

### E-05: スキーマローダーコマンドエラー

**症状**: `Need to specify either --config or --cassandra`
**原因**: ScalarDL 3.12.2ではconfig方式が必要
**対処**: `--config /scalardb.properties --coordinator` を指定

---

## デプロイスクリプト関連

### E-06: `--ignore-registered` オプションエラー

**症状**: `Unknown option: '--ignore-registered'`
**原因**: ScalarDL Client SDK 3.12.2でこのオプションは削除された
**対処**: `common.sh`から`--ignore-registered`を削除
```bash
sed -i '' 's/--ignore-registered//' common.sh
```

### E-07: Auditor接続エラー

**症状**: Auditor関連のタイムアウトや接続エラー
**原因**: `auditor.enabled=true`だがAuditorが起動していない
**対処**: 全propertiesファイルで`auditor.enabled=false`に変更
```bash
for f in fixture/conf/*.properties; do
  sed -i '' 's/auditor.enabled=true/auditor.enabled=false/' "$f"
done
```

### E-08: SDK未ダウンロード / wgetコマンドなし

**症状**: `command not found: wget` または `No such file or directory: register-cert`
**原因**: SDKが未ダウンロード、またはmacOSにwgetがない
**対処**: curlでダウンロード
```bash
curl -sL -o scalardl-java-client-sdk.zip \
  "https://github.com/scalar-labs/scalardl-java-client-sdk/releases/download/v3.12.2/scalardl-java-client-sdk-3.12.2.zip"
unzip -q -o scalardl-java-client-sdk.zip
mv scalardl-java-client-sdk-3.12.2 scalardl-java-client-sdk
```

### E-09: UNLOADABLE_CONTRACT（BaseContract）

**症状**: `Loading the contract failed. Details: com/scalar/ist/contract/BaseContract`
**原因**: コントラクトが`.class`ファイル単位で登録されるため、BaseContractの依存が解決できない
**対処**: scalar-istのmainブランチ（BaseContract継承前）のコントラクトを使用
```bash
cd /Users/kanekomasato/scalar-ist
git checkout main -- contracts_and_functions/src/main/java/com/scalar/ist/contract/
./gradlew build -q
```

---

## CLIアプリ関連

### E-10: 設定ファイルが見つからない

**症状**: `FileNotFoundException: config/controller.properties`
**原因**: 相対パスが実行ディレクトリから解決される
**対処**: 絶対パスを指定する
```bash
--properties /Users/kanekomasato/scalar-ist-app/config/controller.properties
```

### E-11: 証明書ファイルが見つからない

**症状**: `Reading the file failed. File: config/controller.pem`
**原因**: properties内の`cert_path`が相対パス
**対処**: `config/controller.properties`の`cert_path`と`private_key_path`を絶対パスに変更

### E-12: 証明書already registered

**症状**: `The specified certificate is already registered`
**原因**: 2回目以降の実行で証明書が既に登録済み
**対処**: 正常動作。ScalarDLClient.javaで自動的にスキップされる

### E-13: コントラクト引数バリデーションエラー

**症状**: `There is an error while validating the arguments`
**原因**: 引数のフィールドが不足、型が違う、空文字が許可されていない等
**よくある間違い**:
| フィールド | 間違い | 正しい |
|-----------|--------|--------|
| `guidance`, `note` | 空文字`""` | 1文字以上の文字列 |
| `version` | `consent_statement_version` | `version` |
| `optional_third_parties` | JSONArray `[]` | JSONObject `{"third_party_ids":[], "description":"..."}` |

---

## ライセンス関連

### E-14: ライセンスキー無効

**症状**: Ledger起動時にライセンスエラー
**確認**: `.env`のライセンスキーが正しいか確認
**取得先**: https://scalardl.scalar-labs.com/docs/latest/scalar-licensing/trial/
**注意**: Trial Licenseにはインターネット接続が必須

### E-15: everit json-schema バージョン不在

**症状**: `Could not resolve com.github.everit-org.json-schema:org.everit.json.schema:1.14.5`
**原因**: jitpackに1.14.5が存在しない
**対処**: `1.14.4`を使用する
