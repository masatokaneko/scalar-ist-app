package com.scalar.ist.app;

import com.scalar.dl.ledger.model.ContractExecutionResult;
import javax.json.Json;
import javax.json.JsonObject;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command(
    name = "status",
    description = "同意状態の管理",
    subcommands = {
        StatusCommand.ApproveCommand.class,
        StatusCommand.RejectCommand.class,
        StatusCommand.ListCommand.class
    })
public class StatusCommand implements Runnable {

  @Override
  public void run() {
    System.out.println("サブコマンドを指定してください: approve, reject, list");
  }

  @Command(name = "approve", description = "同意文書に同意する")
  static class ApproveCommand implements Runnable {
    @Option(names = "--properties", defaultValue = "config/data_subject.properties")
    private String propertiesPath;

    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Option(names = "--subject", required = true, description = "データ主体ID")
    private String subjectId;

    @Override
    public void run() {
      System.out.println("=== 同意承認 ===");
      long now = System.currentTimeMillis();

      JsonObject argument = Json.createObjectBuilder()
          .add("consent_statement_id", statementId)
          .add("consent_status", "approved")
          .add("consented_detail", Json.createObjectBuilder())
          .add("rejected_detail", Json.createObjectBuilder())
          .add("updated_at", now)
          .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatus"))
          .build();

      try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
        client.registerCertificate();
        ContractExecutionResult result =
            client.executeContract("UpsertConsentStatus", argument);
        System.out.println("→ 同意を記録しました（approved）");
        System.out.println("  同意文書ID: " + statementId);
        System.out.println("  データ主体: " + subjectId);
        if (result.getResult().isPresent()) {
          System.out.println("  結果: " + result.getResult().get());
        }
      } catch (Exception e) {
        System.err.println("→ 記録失敗: " + e.getMessage());
        e.printStackTrace();
      }
    }
  }

  @Command(name = "reject", description = "同意文書を拒否する")
  static class RejectCommand implements Runnable {
    @Option(names = "--properties", defaultValue = "config/data_subject.properties")
    private String propertiesPath;

    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Option(names = "--subject", required = true, description = "データ主体ID")
    private String subjectId;

    @Override
    public void run() {
      System.out.println("=== 同意拒否 ===");
      long now = System.currentTimeMillis();

      JsonObject argument = Json.createObjectBuilder()
          .add("consent_statement_id", statementId)
          .add("consent_status", "rejected")
          .add("consented_detail", Json.createObjectBuilder())
          .add("rejected_detail", Json.createObjectBuilder())
          .add("updated_at", now)
          .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatus"))
          .build();

      try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
        client.registerCertificate();
        ContractExecutionResult result =
            client.executeContract("UpsertConsentStatus", argument);
        System.out.println("→ 拒否を記録しました（rejected）");
        System.out.println("  同意文書ID: " + statementId);
        System.out.println("  データ主体: " + subjectId);
        if (result.getResult().isPresent()) {
          System.out.println("  結果: " + result.getResult().get());
        }
      } catch (Exception e) {
        System.err.println("→ 記録失敗: " + e.getMessage());
        e.printStackTrace();
      }
    }
  }

  @Command(name = "list", description = "同意状態を照会する")
  static class ListCommand implements Runnable {
    @Option(names = "--properties", defaultValue = "config/controller.properties")
    private String propertiesPath;

    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Override
    public void run() {
      System.out.println("=== 同意状態一覧 ===");

      JsonObject argument = Json.createObjectBuilder()
          .add("consent_statement_id", statementId)
          .build();

      try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
        client.registerCertificate();
        ContractExecutionResult result =
            client.executeContract("GetConsentStatus", argument);
        if (result.getResult().isPresent()) {
          System.out.println(result.getResult().get());
        } else {
          System.out.println("同意状態が見つかりませんでした");
        }
      } catch (Exception e) {
        System.err.println("→ 取得失敗: " + e.getMessage());
        e.printStackTrace();
      }
    }
  }
}
