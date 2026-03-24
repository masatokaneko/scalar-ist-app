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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.json.Json;
import javax.json.JsonObject;

public class ApiServer {

  private final String propertiesPath;
  // In-memory store for invitation tokens (demo purpose)
  private final ConcurrentHashMap<String, Map<String, Object>> invitations = new ConcurrentHashMap<String, Map<String, Object>>();

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

    // Invitation / Decision Request APIs
    app.post("/api/invite/create", this::createInvitation);
    app.get("/api/invite/{token}", this::getInvitation);
    app.post("/api/invite/{token}/respond", this::respondToInvitation);
    app.get("/api/scenarios", this::getScenarios);
    app.post("/api/scenarios/seed", this::seedScenarios);

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

  // === Invitation / Decision Request APIs ===

  private void getScenarios(Context ctx) {
    List<Map<String, Object>> scenarios = new ArrayList<Map<String, Object>>();
    scenarios.add(scenario("service_signup", "サービス登録時の個人情報取得同意",
        "consent", "granular",
        new String[]{"アカウント作成・不正検知のための利用", "マーケティングメールの配信", "アクセス解析によるサービス改善"},
        new boolean[]{true, false, false}));
    scenarios.add(scenario("contractor_nda", "業務委託先NDA（秘密保持契約）",
        "acknowledgement", "all_required",
        new String[]{"秘密保持契約書への同意", "情報セキュリティポリシーの遵守"},
        new boolean[]{true, true}));
    scenarios.add(scenario("employee_onboarding", "入社時の規則同意",
        "acknowledgement", "all_required",
        new String[]{"就業規則への同意", "情報セキュリティポリシーへの同意", "個人情報取扱いへの同意", "ハラスメント防止規定への同意"},
        new boolean[]{true, true, true, true}));
    scenarios.add(scenario("cookie_preferences", "Cookie利用設定",
        "preference", "granular",
        new String[]{"必須Cookie（サイト機能）", "分析Cookie（アクセス解析）", "広告Cookie（ターゲティング広告）"},
        new boolean[]{true, false, false}));
    ctx.json(scenarios);
  }

  private Map<String, Object> scenario(String id, String title, String type, String mode,
      String[] items, boolean[] required) {
    Map<String, Object> s = new LinkedHashMap<String, Object>();
    s.put("id", id);
    s.put("title", title);
    s.put("decisionType", type);
    s.put("decisionMode", mode);
    List<Map<String, Object>> choices = new ArrayList<Map<String, Object>>();
    for (int i = 0; i < items.length; i++) {
      Map<String, Object> c = new LinkedHashMap<String, Object>();
      c.put("id", "item_" + i);
      c.put("label", items[i]);
      c.put("required", required[i]);
      c.put("defaultValue", required[i]);
      choices.add(c);
    }
    s.put("choices", choices);
    return s;
  }

  private void seedScenarios(Context ctx) {
    // Create consent statements + invitations for all 4 scenarios
    List<Map<String, Object>> created = new ArrayList<Map<String, Object>>();
    String[][] scenarios = {
        {"service_signup", "サービス登録時の個人情報取得同意", "consent", "granular"},
        {"contractor_nda", "業務委託先NDA（秘密保持契約）", "acknowledgement", "all_required"},
        {"employee_onboarding", "入社時の規則同意", "acknowledgement", "all_required"},
        {"cookie_preferences", "Cookie利用設定", "preference", "granular"},
    };
    String companyId = "scalar-labs.com";
    String orgId = "9ca84f95-2e84-4707-8206-b93c9e78d7b7";

    try (ScalarDLClient client = new ScalarDLClient(propertiesPath)) {
      client.registerCertificate();
      for (String[] sc : scenarios) {
        long now = System.currentTimeMillis();
        String csId = "cs01-" + orgId + "-" + now;
        JsonObject argument = Json.createObjectBuilder()
            .add("company_id", companyId)
            .add("organization_id", orgId)
            .add("version", "1")
            .add("title", sc[1])
            .add("abstract", sc[1] + "に関する文書です")
            .add("consent_statement", sc[1] + "の本文")
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
        client.executeContract("RegisterConsentStatement", argument);

        // Publish
        JsonObject pubArg = Json.createObjectBuilder()
            .add("company_id", companyId)
            .add("organization_id", orgId)
            .add("consent_statement_id", csId)
            .add("status", "published")
            .add("updated_at", System.currentTimeMillis())
            .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatementStatus"))
            .build();
        client.executeContract("UpdateConsentStatementStatus", pubArg);

        // Create invitation
        String token = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> inv = new LinkedHashMap<String, Object>();
        inv.put("token", token);
        inv.put("scenario", sc[0]);
        inv.put("title", sc[1]);
        inv.put("decisionType", sc[2]);
        inv.put("decisionMode", sc[3]);
        inv.put("consent_statement_id", csId);
        inv.put("status", "pending");
        inv.put("created_at", now);
        invitations.put(token, inv);

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("scenario", sc[0]);
        result.put("token", token);
        result.put("url", "http://localhost:3001/c/" + token);
        result.put("consent_statement_id", csId);
        created.add(result);

        Thread.sleep(50); // avoid timestamp collision
      }
    } catch (Exception e) {
      ctx.status(500).json(jsonMap("success", false, "error", e.getMessage()));
      return;
    }
    ctx.json(jsonMap("success", true, "invitations", created));
  }

  private void createInvitation(Context ctx) {
    Map body = ctx.bodyAsClass(Map.class);
    String csId = (String) body.get("consent_statement_id");
    String scenario = (String) body.getOrDefault("scenario", "service_signup");
    String titleStr = (String) body.getOrDefault("title", "同意依頼");
    String type = (String) body.getOrDefault("decisionType", "consent");
    String mode = (String) body.getOrDefault("decisionMode", "binary");
    String recipientName = (String) body.getOrDefault("recipient_name", "");

    String token = UUID.randomUUID().toString().substring(0, 8);
    Map<String, Object> inv = new LinkedHashMap<String, Object>();
    inv.put("token", token);
    inv.put("scenario", scenario);
    inv.put("title", titleStr);
    inv.put("decisionType", type);
    inv.put("decisionMode", mode);
    inv.put("consent_statement_id", csId);
    inv.put("recipient_name", recipientName);
    inv.put("status", "pending");
    inv.put("created_at", System.currentTimeMillis());
    invitations.put(token, inv);

    ctx.json(jsonMap("success", true, "token", token,
        "url", "http://localhost:3001/c/" + token));
  }

  private void getInvitation(Context ctx) {
    String token = ctx.pathParam("token");
    Map<String, Object> inv = invitations.get(token);
    if (inv == null) {
      ctx.status(404).json(jsonMap("error", "招待が見つかりません"));
      return;
    }

    // Get scenario choices
    List<Map<String, Object>> choices = new ArrayList<Map<String, Object>>();
    String scenario = (String) inv.get("scenario");
    if ("service_signup".equals(scenario)) {
      choices.add(choice("必須", "アカウント作成・不正検知のための利用", true));
      choices.add(choice("任意", "マーケティングメールの配信", false));
      choices.add(choice("任意", "アクセス解析によるサービス改善", false));
    } else if ("contractor_nda".equals(scenario)) {
      choices.add(choice("必須", "秘密保持契約書への同意", true));
      choices.add(choice("必須", "情報セキュリティポリシーの遵守", true));
    } else if ("employee_onboarding".equals(scenario)) {
      choices.add(choice("必須", "就業規則への同意", true));
      choices.add(choice("必須", "情報セキュリティポリシーへの同意", true));
      choices.add(choice("必須", "個人情報取扱いへの同意", true));
      choices.add(choice("必須", "ハラスメント防止規定への同意", true));
    } else if ("cookie_preferences".equals(scenario)) {
      choices.add(choice("必須", "必須Cookie（サイト機能）", true));
      choices.add(choice("任意", "分析Cookie（アクセス解析）", false));
      choices.add(choice("任意", "広告Cookie（ターゲティング広告）", false));
    }

    Map<String, Object> response = new LinkedHashMap<String, Object>(inv);
    response.put("choices", choices);
    ctx.json(response);
  }

  private Map<String, Object> choice(String tag, String label, boolean required) {
    Map<String, Object> c = new LinkedHashMap<String, Object>();
    c.put("tag", tag);
    c.put("label", label);
    c.put("required", required);
    return c;
  }

  private void respondToInvitation(Context ctx) {
    String token = ctx.pathParam("token");
    Map<String, Object> inv = invitations.get(token);
    if (inv == null) {
      ctx.status(404).json(jsonMap("error", "招待が見つかりません"));
      return;
    }
    if ("completed".equals(inv.get("status"))) {
      ctx.status(400).json(jsonMap("error", "この依頼は既に回答済みです"));
      return;
    }

    Map body = ctx.bodyAsClass(Map.class);
    String decision = (String) body.getOrDefault("decision", "approved");
    String csId = (String) inv.get("consent_statement_id");
    long now = System.currentTimeMillis();

    JsonObject argument = Json.createObjectBuilder()
        .add("consent_statement_id", csId)
        .add("consent_status", decision)
        .add("consented_detail", Json.createObjectBuilder())
        .add("rejected_detail", Json.createObjectBuilder())
        .add("updated_at", now)
        .add("_functions_", Json.createArrayBuilder().add("UpsertConsentStatus"))
        .build();

    String dsProps = propertiesPath.replace("controller", "data_subject");
    try (ScalarDLClient client = new ScalarDLClient(dsProps)) {
      client.registerCertificate();
      client.executeContract("UpsertConsentStatus", argument);
      inv.put("status", "completed");
      inv.put("decision", decision);
      inv.put("responded_at", now);
      ctx.json(jsonMap("success", true, "decision", decision,
          "message", "approved".equals(decision) ? "同意が記録されました" : "拒否が記録されました",
          "timestamp", now));
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
