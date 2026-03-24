"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:8081/api";

type ConsentDoc = { id: string; title: string; status: string; created_at: number; company_id: string };
type ConsentRecord = { consent_statement_id: string; consent_status: string; data_subject_id: string; created_at: number };
type Stats = { total_statements: number; published: number; draft: number; approved: number; rejected: number };
type ValidationResult = { asset_id: string; status: string; message: string };
type ValidationResponse = { results: ValidationResult[]; total: number; valid: number; invalid: number };

export default function Home() {
  const [docs, setDocs] = useState<ConsentDoc[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [title, setTitle] = useState("");
  const [purposeName, setPurposeName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "create" | "validate">("dashboard");

  // Invite link state
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Validation state
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 4000); };

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API}/dashboard`);
      const data = await res.json();
      setDocs(data.statements || []);
      setConsents(data.consents || []);
      setStats(data.stats || null);
    } catch {
      showMsg("✗ APIサーバーに接続できません (localhost:8081)");
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const getConsentForDoc = (docId: string) =>
    consents.find(c => c.consent_statement_id === docId);

  const registerPurpose = async () => {
    if (!purposeName) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/purpose`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose_name: purposeName }),
      });
      const data = await res.json();
      showMsg(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      if (data.success) setPurposeName("");
    } catch (e: any) { showMsg(`✗ ${e.message}`); }
    setLoading(false);
  };

  const createConsent = async () => {
    if (!title) return;
    setLoading(true);
    setInviteLink("");
    setCopied(false);
    try {
      const res = await fetch(`${API}/consent/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✓ 同意文書を作成しました`);
        const csId = data.consent_statement_id || data.id;
        if (csId) {
          try {
            const inviteRes = await fetch(`${API}/invite/create`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ consent_statement_id: csId }),
            });
            const inviteData = await inviteRes.json();
            if (inviteData.token) {
              setInviteLink(`http://localhost:3001/c/${inviteData.token}`);
              showMsg("✓ 同意文書を作成し、招待リンクを生成しました");
            }
          } catch {
            showMsg("✓ 同意文書を作成しましたが、招待リンクの生成に失敗しました");
          }
        }
        setTitle("");
        await loadDashboard();
      } else { showMsg(`✗ ${data.error}`); }
    } catch (e: any) { showMsg(`✗ ${e.message}`); }
    setLoading(false);
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showMsg("✗ クリップボードへのコピーに失敗しました");
    }
  };

  const runValidation = async () => {
    setValidating(true);
    setValidation(null);
    try {
      const res = await fetch(`${API}/validate`);
      const data: ValidationResponse = await res.json();
      setValidation(data);
    } catch {
      showMsg("✗ 検証APIに接続できません");
    }
    setValidating(false);
  };

  const action = async (endpoint: string, csId: string, successMsg: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_statement_id: csId }),
      });
      const data = await res.json();
      showMsg(data.success ? `✓ ${successMsg}` : `✗ ${data.error}`);
      if (data.success) await loadDashboard();
    } catch (e: any) { showMsg(`✗ ${e.message}`); }
    setLoading(false);
  };

  const badge = (s: string) => {
    const c: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
      published: "bg-green-100 text-green-800 border-green-200",
      approved: "bg-blue-100 text-blue-800 border-blue-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      inactive: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return c[s] || "bg-gray-100 text-gray-600 border-gray-200";
  };

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Scalar IST</h1>
          <p className="text-gray-400 text-sm">個人情報同意管理ダッシュボード</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "dashboard" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            ダッシュボード
          </button>
          <button onClick={() => setTab("create")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "create" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            新規作成
          </button>
          <button onClick={() => setTab("validate")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "validate" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            台帳検証
          </button>
          <button onClick={loadDashboard}
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">
            更新
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${message.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      {tab === "dashboard" && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <p className="text-3xl font-bold">{stats.total_statements}</p>
                <p className="text-gray-400 text-xs mt-1">同意文書 合計</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <p className="text-3xl font-bold text-yellow-600">{stats.draft}</p>
                <p className="text-gray-400 text-xs mt-1">下書き</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
                <p className="text-gray-400 text-xs mt-1">公開中</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
                <p className="text-gray-400 text-xs mt-1">同意済み</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-gray-400 text-xs mt-1">拒否</p>
              </div>
            </div>
          )}

          {/* Consent Statements Table */}
          <section className="bg-white rounded-xl shadow-sm border mb-8">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold">同意文書一覧</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">タイトル</th>
                    <th className="px-6 py-3 text-left">文書ステータス</th>
                    <th className="px-6 py-3 text-left">同意状態</th>
                    <th className="px-6 py-3 text-left">作成日時</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {docs.map((doc) => {
                    const consent = getConsentForDoc(doc.id);
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{doc.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${badge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {consent ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${badge(consent.consent_status)}`}>
                              {consent.consent_status}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(doc.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            {doc.status === "draft" && (
                              <button onClick={() => action("consent/publish", doc.id, "公開しました")}
                                disabled={loading}
                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500 disabled:opacity-40">
                                公開
                              </button>
                            )}
                            {doc.status === "published" && !consent && (
                              <>
                                <button onClick={() => action("consent/approve", doc.id, "同意しました")}
                                  disabled={loading}
                                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 disabled:opacity-40">
                                  同意
                                </button>
                                <button onClick={() => action("consent/reject", doc.id, "拒否しました")}
                                  disabled={loading}
                                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-400 disabled:opacity-40">
                                  拒否
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {docs.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">同意文書がありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Consent Records */}
          {consents.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="font-semibold">同意記録</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">同意文書ID</th>
                      <th className="px-6 py-3 text-left">データ主体</th>
                      <th className="px-6 py-3 text-left">状態</th>
                      <th className="px-6 py-3 text-left">記録日時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {consents.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-xs font-mono text-gray-500">{c.consent_statement_id}</td>
                        <td className="px-6 py-3">{c.data_subject_id}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${badge(c.consent_status)}`}>
                            {c.consent_status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "create" && (
        <>
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
            <h2 className="text-lg font-semibold mb-4">利用目的の登録</h2>
            <div className="flex gap-3">
              <input type="text" value={purposeName} onChange={(e) => setPurposeName(e.target.value)}
                placeholder="例: マーケティングメール配信"
                className="flex-1 border rounded-lg px-4 py-2.5 text-sm" />
              <button onClick={registerPurpose} disabled={loading || !purposeName}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
                登録
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 border">
            <h2 className="text-lg font-semibold mb-4">同意文書の作成</h2>
            <div className="flex gap-3">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="例: データ利用同意書"
                className="flex-1 border rounded-lg px-4 py-2.5 text-sm" />
              <button onClick={createConsent} disabled={loading || !title}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
                作成
              </button>
            </div>

            {inviteLink && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">招待リンクが生成されました</p>
                <div className="flex gap-2 items-center">
                  <input type="text" readOnly value={inviteLink}
                    className="flex-1 bg-white border border-blue-200 rounded-md px-3 py-2 text-sm font-mono text-blue-700" />
                  <button onClick={copyInviteLink}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${copied ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-500"}`}>
                    {copied ? "コピー済み" : "リンクをコピー"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "validate" && (
        <>
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">台帳検証</h2>
                <p className="text-gray-400 text-sm mt-1">同意記録の改竄検知を実行します</p>
              </div>
              <button onClick={runValidation} disabled={validating}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
                {validating ? "検証中..." : "全件検証する"}
              </button>
            </div>

            {validation && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-2xl font-bold">{validation.total}</p>
                    <p className="text-gray-400 text-xs mt-1">検証対象</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{validation.valid}</p>
                    <p className="text-gray-400 text-xs mt-1">OK</p>
                  </div>
                  <div className={`rounded-lg p-4 border ${validation.invalid > 0 ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${validation.invalid > 0 ? "text-red-600" : "text-gray-400"}`}>{validation.invalid}</p>
                    <p className="text-gray-400 text-xs mt-1">NG</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3 text-left">結果</th>
                        <th className="px-6 py-3 text-left">アセットID</th>
                        <th className="px-6 py-3 text-left">メッセージ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {validation.results.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <span className={`text-sm ${r.status === "valid" ? "text-green-600" : "text-red-600"}`}>
                              {r.status === "valid" ? "OK" : "NG"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs font-mono text-gray-500">{r.asset_id}</td>
                          <td className="px-6 py-3 text-gray-600">{r.message}</td>
                        </tr>
                      ))}
                      {validation.results.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">検証対象の記録がありません</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {!validation && !validating && (
              <div className="text-center py-10 text-gray-400 text-sm">
                「全件検証する」ボタンを押して検証を実行してください
              </div>
            )}
          </section>
        </>
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Powered by ScalarDL 3.12.2 + ScalarDB 3.17.1 + PostgreSQL 15
      </footer>
    </div>
  );
}
