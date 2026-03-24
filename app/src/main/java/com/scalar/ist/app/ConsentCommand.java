package com.scalar.ist.app;

import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command(
    name = "consent",
    description = "同意文書の管理",
    subcommands = {
        ConsentCommand.CreateCommand.class,
        ConsentCommand.PublishCommand.class,
        ConsentCommand.ListCommand.class
    })
public class ConsentCommand implements Runnable {

  @Override
  public void run() {
    System.out.println("サブコマンドを指定してください: create, publish, list");
  }

  @Command(name = "create", description = "同意文書を新規作成（draft状態）")
  static class CreateCommand implements Runnable {
    @Option(names = "--title", required = true, description = "同意文書のタイトル")
    private String title;

    @Option(names = "--purpose-id", description = "利用目的ID")
    private String purposeId;

    @Override
    public void run() {
      System.out.println("=== 同意文書作成 ===");
      System.out.println("タイトル: " + title);
      if (purposeId != null) {
        System.out.println("利用目的ID: " + purposeId);
      }
      // TODO: RegisterConsentStatementコントラクト実行
      System.out.println("→ 同意文書を作成しました（draft状態）");
      System.out.println("  ※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }

  @Command(name = "publish", description = "同意文書を公開（published状態に変更）")
  static class PublishCommand implements Runnable {
    @Option(names = "--id", required = true, description = "同意文書ID")
    private String consentStatementId;

    @Override
    public void run() {
      System.out.println("=== 同意文書公開 ===");
      System.out.println("同意文書ID: " + consentStatementId);
      // TODO: UpdateConsentStatementStatusコントラクト実行
      System.out.println("→ 同意文書を公開しました（published状態）");
      System.out.println("  ※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }

  @Command(name = "list", description = "同意文書の一覧を表示")
  static class ListCommand implements Runnable {
    @Override
    public void run() {
      System.out.println("=== 同意文書一覧 ===");
      // TODO: GetConsentStatementHistoryコントラクト実行
      System.out.println("※実装予定: ScalarDL Client経由でコントラクト実行");
    }
  }
}
