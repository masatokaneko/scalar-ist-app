package com.scalar.ist.app;

import javax.json.Json;
import javax.json.JsonObject;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command(name = "setup", description = "マスタデータの登録（利用目的、データセット等）")
public class SetupCommand implements Runnable {

  @Option(names = "--properties", description = "client.propertiesのパス",
      defaultValue = "config/controller.properties")
  private String propertiesPath;

  @Option(names = "--purpose", description = "利用目的の名前")
  private String purposeName;

  @Option(names = "--dataset", description = "データセット名")
  private String datasetName;

  @Option(names = "--company-id", description = "会社ID", defaultValue = "scalar-labs.com")
  private String companyId;

  @Option(names = "--org-id", description = "組織ID",
      defaultValue = "9ca84f95-2e84-4707-8206-b93c9e78d7b7")
  private String organizationId;

  @Override
  public void run() {
    System.out.println("=== マスタデータセットアップ ===");

    if (purposeName == null && datasetName == null) {
      System.out.println("オプションを指定してください: --purpose, --dataset");
      return;
    }

    try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
      client.registerCertificate();

      if (purposeName != null) {
        registerPurpose(client);
      }
      if (datasetName != null) {
        registerDataSetSchema(client);
      }
    } catch (Exception e) {
      System.err.println("エラー: " + e.getMessage());
      e.printStackTrace();
    }
  }

  private void registerPurpose(ScalarDLClient client) {
    System.out.println("利用目的を登録: " + purposeName);
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("action", "insert")
        .add("company_id", companyId)
        .add("organization_id", organizationId)
        .add("category_of_purpose", "general")
        .add("purpose_name", purposeName)
        .add("description", purposeName + " の説明")
        .add("legal_text", purposeName + " に関する法的文書")
        .add("user_friendly_text", purposeName + " に関するわかりやすい説明")
        .add("guidance", "ガイダンス")
        .add("note", "備考")
        .add("created_at", now)
        .add("is_active", true)
        .add("_functions_", Json.createArrayBuilder().add("UpsertMaster"))
        .build();

    try {
      client.executeContract("RegisterPurpose", argument);
      System.out.println("  → 利用目的の登録完了");
    } catch (Exception e) {
      System.err.println("  → 登録失敗: " + e.getMessage());
    }
  }

  private void registerDataSetSchema(ScalarDLClient client) {
    System.out.println("データセットスキーマを登録: " + datasetName);
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("action", "insert")
        .add("company_id", companyId)
        .add("organization_id", organizationId)
        .add("category_of_data", "personal_data")
        .add("data_set_schema_name", datasetName)
        .add("description", datasetName + " のデータ定義")
        .add("created_at", now)
        .add("is_active", true)
        .add("_functions_", Json.createArrayBuilder().add("UpsertMaster"))
        .build();

    try {
      client.executeContract("RegisterDataSetSchema", argument);
      System.out.println("  → データセットスキーマの登録完了");
    } catch (Exception e) {
      System.err.println("  → 登録失敗: " + e.getMessage());
    }
  }
}
