package com.scalar.ist.app;

import com.scalar.dl.ledger.model.ContractExecutionResult;
import io.javalin.Javalin;
import io.javalin.http.Context;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.json.Json;
import javax.json.JsonObject;

public class ApiServer {

  private final String propertiesPath;

  public ApiServer(String propertiesPath) {
    this.propertiesPath = propertiesPath;
  }

  private static Map<String, Object> jsonMap(Object... kv) {
    Map<String, Object> m = new HashMap<String, Object>();
    for (int i = 0; i < kv.length; i += 2) {
      m.put((String) kv[i], kv[i + 1]);
    }
    return m;
  }

  public void start(int port) {
    Javalin app = Javalin.create(config -> {
      config.plugins.enableCors(cors -> cors.add(it -> it.anyHost()));
    });

    app.get("/api/health", ctx -> ctx.json(jsonMap("status", "ok")));
    app.get("/api/dashboard", this::getDashboard);
    app.post("/api/purpose", this::registerPurpose);
    app.post("/api/consent/create", this::createConsent);
    app.post("/api/consent/publish", this::publishConsent);
    app.post("/api/consent/approve", this::approveConsent);
    app.post("/api/consent/reject", this::rejectConsent);
    app.get("/api/consent/status", this::getConsentStatus);

    app.start(port);
    System.out.println("API Server started on http://localhost:" + port);
  }

  private void getDashboard(Context ctx) {
    String dbUrl = "jdbc:postgresql://localhost:5433/scalarist";
    try (Connection conn = DriverManager.getConnection(dbUrl, "postgres", "postgres")) {
      Map<String, Object> dashboard = new HashMap<String, Object>();

      // 同意文書一覧
      List<Map<String, Object>> statements = new ArrayList<Map<String, Object>>();
      String sql = "SELECT consent_statement_id, title, status, created_at, company_id "
          + "FROM ist.consent_statement ORDER BY created_at DESC";
      try (PreparedStatement ps = conn.prepareStatement(sql);
           ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          Map<String, Object> row = new HashMap<String, Object>();
          row.put("id", rs.getString("consent_statement_id"));
          row.put("title", rs.getString("title"));
          row.put("status", rs.getString("status"));
          row.put("created_at", rs.getLong("created_at"));
          row.put("company_id", rs.getString("company_id"));
          statements.add(row);
        }
      }

      // 同意状態一覧
      List<Map<String, Object>> consents = new ArrayList<Map<String, Object>>();
      String cSql = "SELECT consent_statement_id, consent_status, data_subject_id, created_at "
          + "FROM ist.consent ORDER BY created_at DESC";
      try (PreparedStatement ps = conn.prepareStatement(cSql);
           ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          Map<String, Object> row = new HashMap<String, Object>();
          row.put("consent_statement_id", rs.getString("consent_statement_id"));
          row.put("consent_status", rs.getString("consent_status"));
          row.put("data_subject_id", rs.getString("data_subject_id"));
          row.put("created_at", rs.getLong("created_at"));
          consents.add(row);
        }
      }

      // 統計
      int total = statements.size();
      int published = 0;
      int draft = 0;
      int approved = 0;
      int rejected = 0;
      for (Map<String, Object> s : statements) {
        if ("published".equals(s.get("status"))) published++;
        if ("draft".equals(s.get("status"))) draft++;
      }
      for (Map<String, Object> c : consents) {
        if ("approved".equals(c.get("consent_status"))) approved++;
        if ("rejected".equals(c.get("consent_status"))) rejected++;
      }

      Map<String, Object> stats = new HashMap<String, Object>();
      stats.put("total_statements", total);
      stats.put("published", published);
      stats.put("draft", draft);
      stats.put("approved", approved);
      stats.put("rejected", rejected);

      dashboard.put("stats", stats);
      dashboard.put("statements", statements);
      dashboard.put("consents", consents);
      ctx.json(dashboard);
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("error", e.getMessage()));
    }
  }

  private void registerPurpose(Context ctx) {
    Map body = ctx.bodyAsClass(Map.class);
    String purposeName = (String) body.getOrDefault("purpose_name", "未設定");
    String companyId = (String) body.getOrDefault("company_id", "scalar-labs.com");
    String orgId = (String) body.getOrDefault("organization_id", "9ca84f95-2e84-4707-8206-b93c9e78d7b7");
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("action", "insert")
        .add("company_id", companyId)
        .add("organization_id", orgId)
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

    try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
      client.registerCertificate();
      client.executeContract("RegisterPurpose", argument);
      ctx.json(jsonMap("success", true, "message", "利用目的を登録しました"));
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
    }
  }

  private void createConsent(Context ctx) {
    Map body = ctx.bodyAsClass(Map.class);
    String title = (String) body.getOrDefault("title", "同意文書");
    String companyId = (String) body.getOrDefault("company_id", "scalar-labs.com");
    String orgId = (String) body.getOrDefault("organization_id", "9ca84f95-2e84-4707-8206-b93c9e78d7b7");
    String version = (String) body.getOrDefault("version", "1");
    long now = System.currentTimeMillis();
    String csId = "cs01-" + orgId + "-" + now;

    JsonObject argument = Json.createObjectBuilder()
        .add("company_id", companyId)
        .add("organization_id", orgId)
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
      ctx.json(jsonMap("success", true, "consent_statement_id", csId, "status", "draft", "title", title));
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
    }
  }

  private void publishConsent(Context ctx) {
    Map body = ctx.bodyAsClass(Map.class);
    String csId = (String) body.get("consent_statement_id");
    String companyId = (String) body.getOrDefault("company_id", "scalar-labs.com");
    String orgId = (String) body.getOrDefault("organization_id", "9ca84f95-2e84-4707-8206-b93c9e78d7b7");
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("company_id", companyId)
        .add("organization_id", orgId)
        .add("consent_statement_id", csId)
        .add("status", "published")
        .add("updated_at", now)
        .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatementStatus"))
        .build();

    try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
      client.registerCertificate();
      client.executeContract("UpdateConsentStatementStatus", argument);
      ctx.json(jsonMap("success", true, "message", "同意文書を公開しました"));
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
    }
  }

  private void approveConsent(Context ctx) { consentAction(ctx, "approved"); }
  private void rejectConsent(Context ctx) { consentAction(ctx, "rejected"); }

  private void consentAction(Context ctx, String status) {
    Map body = ctx.bodyAsClass(Map.class);
    String statementId = (String) body.get("consent_statement_id");
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("consent_statement_id", statementId)
        .add("consent_status", status)
        .add("consented_detail", Json.createObjectBuilder())
        .add("rejected_detail", Json.createObjectBuilder())
        .add("updated_at", now)
        .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatus"))
        .build();

    String dsProps = propertiesPath.replace("controller", "data_subject");
    try (ScalarDLClient client = new ScalarDLClient(dsProps)) {
      client.registerCertificate();
      client.executeContract("UpsertConsentStatus", argument);
      ctx.json(jsonMap("success", true, "message",
          "approved".equals(status) ? "同意しました" : "拒否しました"));
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
    }
  }

  private void getConsentStatus(Context ctx) {
    String statementId = ctx.queryParam("consent_statement_id");
    String consentId = "ct01-" + statementId + "-data_subject";

    JsonObject argument = Json.createObjectBuilder()
        .add("consent_id", consentId)
        .add("is_hashed_consent_id", false)
        .build();

    String dsProps = propertiesPath.replace("controller", "data_subject");
    try (ScalarDLClient client = new ScalarDLClient(dsProps)) {
      client.registerCertificate();
      ContractExecutionResult result = client.executeContract("GetConsentStatus", argument);
      if (result.getResult().isPresent()) {
        ctx.result(result.getResult().get().toString());
        ctx.contentType("application/json");
      } else {
        ctx.json(jsonMap("consent_status", "unknown"));
      }
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
    }
  }

  public static void main(String[] args) {
    String props = args.length > 0 ? args[0]
        : "/Users/kanekomasato/scalar-ist-app/config/controller.properties";
    new ApiServer(props).start(8081);
  }
}
