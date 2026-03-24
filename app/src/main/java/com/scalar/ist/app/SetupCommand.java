package com.scalar.ist.app;

import com.scalar.dl.client.config.ClientConfig;
import com.scalar.dl.client.service.ClientService;
import com.scalar.dl.client.service.ClientServiceFactory;
import java.io.File;
import java.io.FileInputStream;
import java.util.Properties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command(name = "setup", description = "マスタデータの登録（利用目的、データセット等）")
public class SetupCommand implements Runnable {

  @Option(names = "--properties", description = "client.propertiesのパス", defaultValue = "config/client.properties")
  private String propertiesPath;

  @Option(names = "--purpose", description = "利用目的の名前")
  private String purposeName;

  @Option(names = "--dataset", description = "データセット（カンマ区切り）")
  private String dataset;

  @Override
  public void run() {
    System.out.println("=== マスタデータセットアップ ===");

    if (purposeName != null) {
      System.out.println("利用目的を登録: " + purposeName);
      // TODO: ScalarDL Client SDKを使ってUpsertMasterコントラクトを実行
      System.out.println("  → 登録完了（※実装予定: ScalarDL Client経由でコントラクト実行）");
    }

    if (dataset != null) {
      System.out.println("データセットスキーマを登録: " + dataset);
      // TODO: ScalarDL Client SDKを使ってUpsertMasterコントラクトを実行
      System.out.println("  → 登録完了（※実装予定: ScalarDL Client経由でコントラクト実行）");
    }

    if (purposeName == null && dataset == null) {
      System.out.println("オプションを指定してください: --purpose, --dataset");
    }
  }
}
