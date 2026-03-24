package com.scalar.ist.app;

import com.scalar.dl.client.config.ClientConfig;
import com.scalar.dl.client.service.ClientService;
import com.scalar.dl.client.service.ClientServiceFactory;
import com.scalar.dl.ledger.model.ContractExecutionResult;
import com.scalar.dl.ledger.model.LedgerValidationResult;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;
import javax.json.JsonObject;

/**
 * ScalarDL Client SDK wrapper for executing IST contracts.
 */
public class ScalarDLClient implements AutoCloseable {

  private final ClientServiceFactory factory;
  private final ClientService service;

  public ScalarDLClient(String propertiesPath) throws IOException {
    Path propsPath = Paths.get(propertiesPath);
    if (!propsPath.isAbsolute()) {
      propsPath = Paths.get(System.getProperty("user.dir")).resolve(propsPath);
    }
    if (!Files.exists(propsPath)) {
      throw new FileNotFoundException(
          "設定ファイルが見つかりません: " + propsPath.toAbsolutePath()
          + "\n  絶対パスで指定してください: --properties /path/to/controller.properties");
    }

    Properties props = new Properties();
    try (FileInputStream fis = new FileInputStream(propsPath.toFile())) {
      props.load(fis);
    }
    ClientConfig config = new ClientConfig(props);
    this.factory = new ClientServiceFactory(config);
    this.service = factory.getClientService();
  }

  public ContractExecutionResult executeContract(String contractId, JsonObject argument) {
    return service.executeContract(contractId, argument);
  }

  public LedgerValidationResult validateLedger(String assetId) {
    return service.validateLedger(assetId);
  }

  public void registerCertificate() {
    try {
      service.registerCertificate();
    } catch (Exception e) {
      String msg = e.getMessage() != null ? e.getMessage() : "";
      if (msg.contains("already registered") || msg.contains("ALREADY_REGISTERED")) {
        // 証明書は既に登録済み — 正常
      } else {
        throw new RuntimeException("証明書登録失敗: " + msg, e);
      }
    }
  }

  @Override
  public void close() {
    factory.close();
  }
}
