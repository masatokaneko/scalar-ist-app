package com.scalar.ist.app;

import com.scalar.dl.ledger.model.ContractExecutionResult;
import javax.json.Json;
import javax.json.JsonObject;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command(
    name = "consent",
    description = "同意文書の管理",
    subcommands = {
        ConsentCommand.CreateCommand.class,
        ConsentCommand.PublishCommand.class
    })
public class ConsentCommand implements Runnable {

  @Override
  public void run() {
    System.out.println("サブコマンドを指定してください: create, publish");
  }

  // consent_statement_id = asset_name + asset_version + "-" + org_id + "-" + created_at
  // asset_name = "cs", asset_version = "01" (コントラクトのpropertiesで定義)
  static String buildConsentStatementId(String organizationId, long createdAt) {
    return "cs01-" + organizationId + "-" + createdAt;
  }

  @Command(name = "create", description = "同意文書を新規作成（draft状態）")
  static class CreateCommand implements Runnable {
    @Option(names = "--properties", defaultValue = "config/controller.properties")
    private String propertiesPath;

    @Option(names = "--title", required = true, description = "同意文書のタイトル")
    private String title;

    @Option(names = "--company-id", defaultValue = "scalar-labs.com")
    private String companyId;

    @Option(names = "--org-id", defaultValue = "9ca84f95-2e84-4707-8206-b93c9e78d7b7")
    private String organizationId;

    @Option(names = "--version", defaultValue = "1")
    private String version;

    @Override
    public void run() {
      System.out.println("=== 同意文書作成 ===");
      long now = System.currentTimeMillis();
      String consentStatementId = buildConsentStatementId(organizationId, now);

      JsonObject argument = Json.createObjectBuilder()
          .add("company_id", companyId)
          .add("organization_id", organizationId)
          .add("version", version)
          .add("title", title)
          .add("abstract", title + " に関する同意文書です")
          .add("consent_statement", title + " の本文")
          .add("purpose_ids", Json.createArrayBuilder())
          .add("data_set_schema_ids", Json.createArrayBuilder())
          .add("benefit_ids", Json.createArrayBuilder())
          .add("third_party_ids", Json.createArrayBuilder())
          .add("optional_third_parties", Json.createObjectBuilder()
              .add("third_party_ids", Json.createArrayBuilder())
              .add("description", "任意の第三者提供先"))
          .add("optional_purposes", Json.createArrayBuilder())
          .add("created_at", now)
          .add("_functions_", Json.createArrayBuilder().add("RegisterConsentStatement"))
          .build();

      try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
        client.registerCertificate();
        client.executeContract("RegisterConsentStatement", argument);
        System.out.println("→ 同意文書を作成しました（draft状態）");
        System.out.println("");
        System.out.println("  consent_statement_id: " + consentStatementId);
        System.out.println("");
        System.out.println("  次のステップ:");
        System.out.println("    公開: consent publish --id " + consentStatementId);
      } catch (Exception e) {
        System.err.println("→ 作成失敗: " + e.getMessage());
      }
    }
  }

  @Command(name = "publish", description = "同意文書を公開（published状態に変更）")
  static class PublishCommand implements Runnable {
    @Option(names = "--properties", defaultValue = "config/controller.properties")
    private String propertiesPath;

    @Option(names = "--id", required = true, description = "同意文書ID (例: cs01-<org-id>-<timestamp>)")
    private String consentStatementId;

    @Option(names = "--company-id", defaultValue = "scalar-labs.com")
    private String companyId;

    @Option(names = "--org-id", defaultValue = "9ca84f95-2e84-4707-8206-b93c9e78d7b7")
    private String organizationId;

    @Override
    public void run() {
      System.out.println("=== 同意文書公開 ===");
      long now = System.currentTimeMillis();

      JsonObject argument = Json.createObjectBuilder()
          .add("company_id", companyId)
          .add("organization_id", organizationId)
          .add("consent_statement_id", consentStatementId)
          .add("status", "published")
          .add("updated_at", now)
          .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatementStatus"))
          .build();

      try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
        client.registerCertificate();
        client.executeContract("UpdateConsentStatementStatus", argument);
        System.out.println("→ 同意文書を公開しました（published状態）");
        System.out.println("");
        System.out.println("  次のステップ:");
        System.out.println("    同意: status approve --statement-id " + consentStatementId + " --subject <data-subject-id>");
      } catch (Exception e) {
        System.err.println("→ 公開失敗: " + e.getMessage());
      }
    }
  }
}
