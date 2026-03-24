package com.scalar.ist.app;

import picocli.CommandLine;
import picocli.CommandLine.Command;

@Command(
    name = "ist-app",
    description = "Scalar IST 簡易同意管理アプリ",
    mixinStandardHelpOptions = true,
    version = "1.0.0",
    subcommands = {
        SetupCommand.class,
        ConsentCommand.class,
        StatusCommand.class
    })
public class App implements Runnable {

  @Override
  public void run() {
    System.out.println("Scalar IST 簡易同意管理アプリ");
    System.out.println("サブコマンドを指定してください: setup, consent, status");
    System.out.println("ヘルプ: ist-app --help");
  }

  public static void main(String[] args) {
    int exitCode = new CommandLine(new App()).execute(args);
    System.exit(exitCode);
  }
}
