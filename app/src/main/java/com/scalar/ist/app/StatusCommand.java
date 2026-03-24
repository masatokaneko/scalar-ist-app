package com.scalar.ist.app;

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
    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Option(names = "--subject", required = true, description = "データ主体ID（メールアドレス等）")
    private String subjectId;

    @Override
    public void run() {
      System.out.println("=== 同意承認 ===");
      System.out.println("同意文書ID: " + statementId);
      System.out.println("データ主体: " + subjectId);
      // TODO: UpsertConsentStatusコントラクト実行（status=approved）
      System.out.println("→ 同意を記録しました（approved）");
      System.out.println("  ※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }

  @Command(name = "reject", description = "同意文書を拒否する")
  static class RejectCommand implements Runnable {
    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Option(names = "--subject", required = true, description = "データ主体ID")
    private String subjectId;

    @Override
    public void run() {
      System.out.println("=== 同意拒否 ===");
      System.out.println("同意文書ID: " + statementId);
      System.out.println("データ主体: " + subjectId);
      // TODO: UpsertConsentStatusコントラクト実行（status=rejected）
      System.out.println("→ 拒否を記録しました（rejected）");
      System.out.println("  ※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }

  @Command(name = "list", description = "同意状態を照会する")
  static class ListCommand implements Runnable {
    @Option(names = "--statement-id", required = true, description = "同意文書ID")
    private String statementId;

    @Override
    public void run() {
      System.out.println("=== 同意状態一覧 ===");
      System.out.println("同意文書ID: " + statementId);
      // TODO: GetConsentStatusコントラクト実行
      System.out.println("※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }
}
