package com.scalar.ist.app;

import com.scalar.dl.client.config.ClientConfig;
import com.scalar.dl.client.service.ClientService;
import com.scalar.dl.client.service.ClientServiceFactory;
import com.scalar.dl.ledger.model.ContractExecutionResult;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.Properties;
import javax.json.Json;
import javax.json.JsonObject;

/**
 * ScalarDL Client SDK wrapper for executing IST contracts.
 */
public class ScalarDLClient implements AutoCloseable {

  private final ClientServiceFactory factory;
  private final ClientService service;

  public ScalarDLClient(String propertiesPath) throws IOException {
    Properties props = new Properties();
    try (FileInputStream fis = new FileInputStream(propertiesPath)) {
      props.load(fis);
    }
    ClientConfig config = new ClientConfig(props);
    this.factory = new ClientServiceFactory(config);
    this.service = factory.getClientService();
  }

  /**
   * Execute a contract with the given ID and argument.
   */
  public ContractExecutionResult executeContract(String contractId, JsonObject argument) {
    return service.executeContract(contractId, argument);
  }

  /**
   * Execute a contract with function argument.
   */
  public ContractExecutionResult executeContract(
      String contractId, JsonObject argument, String functionId, JsonObject functionArgument) {
    return service.executeContract(contractId, argument, functionId, functionArgument);
  }

  /**
   * Register a certificate for the current client.
   */
  public void registerCertificate() {
    service.registerCertificate();
  }

  @Override
  public void close() {
    factory.close();
  }
}
