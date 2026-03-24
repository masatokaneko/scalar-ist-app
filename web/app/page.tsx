"use client";

import { useState } from "react";

const API = "http://localhost:8081/api";

type ConsentDoc = {
  id: string;
  title: string;
  status: string;
  consentStatus?: string;
};

export default function Home() {
  const [docs, setDocs] = useState<ConsentDoc[]>([]);
  const [title, setTitle] = useState("");
  const [purposeName, setPurposeName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const registerPurpose = async () => {
    if (!purposeName) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/purpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose_name: purposeName }),
      });
      const data = await res.json();
      showMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      if (data.success) setPurposeName("");
    } catch (e: any) {
      showMessage(`✗ 接続エラー: ${e.message}`);
    }
    setLoading(false);
  };

  const createConsent = async () => {
    if (!title) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/consent/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        setDocs([...docs, { id: data.consent_statement_id, title, status: "draft" }]);
        showMessage(`✓ 同意文書を作成しました（ID: ${data.consent_statement_id}）`);
        setTitle("");
      } else {
        showMessage(`✗ ${data.error}`);
      }
    } catch (e: any) {
      showMessage(`✗ 接続エラー: ${e.message}`);
    }
    setLoading(false);
  };

  const publishConsent = async (doc: ConsentDoc) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/consent/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_statement_id: doc.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDocs(docs.map(d => d.id === doc.id ? { ...d, status: "published" } : d));
        showMessage("✓ 同意文書を公開しました");
      } else {
        showMessage(`✗ ${data.error}`);
      }
    } catch (e: any) {
      showMessage(`✗ ${e.message}`);
    }
    setLoading(false);
  };

  const consentAction = async (doc: ConsentDoc, action: "approve" | "reject") => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/consent/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_statement_id: doc.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDocs(docs.map(d => d.id === doc.id
          ? { ...d, consentStatus: action === "approve" ? "approved" : "rejected" } : d));
        showMessage(`✓ ${data.message}`);
      } else {
        showMessage(`✗ ${data.error}`);
      }
    } catch (e: any) {
      showMessage(`✗ ${e.message}`);
    }
    setLoading(false);
  };

  const checkStatus = async (doc: ConsentDoc) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/consent/status?consent_statement_id=${doc.id}`);
      const data = await res.json();
      if (data.consent_status) {
        setDocs(docs.map(d => d.id === doc.id ? { ...d, consentStatus: data.consent_status } : d));
        showMessage(`✓ 同意状態: ${data.consent_status}`);
      } else {
        showMessage("同意記録がありません");
      }
    } catch (e: any) {
      showMessage(`✗ ${e.message}`);
    }
    setLoading(false);
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      published: "bg-green-100 text-green-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[s] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">Scalar IST</h1>
      <p className="text-gray-500 mb-8">個人情報同意管理アプリケーション</p>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${message.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* 利用目的登録 */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">利用目的の登録</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={purposeName}
            onChange={(e) => setPurposeName(e.target.value)}
            placeholder="例: マーケティングメール配信"
            className="flex-1 border rounded-lg px-4 py-2 text-sm"
          />
          <button
            onClick={registerPurpose}
            disabled={loading || !purposeName}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            登録
          </button>
        </div>
      </section>

      {/* 同意文書作成 */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">同意文書の作成</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: データ利用同意書"
            className="flex-1 border rounded-lg px-4 py-2 text-sm"
          />
          <button
            onClick={createConsent}
            disabled={loading || !title}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            作成
          </button>
        </div>
      </section>

      {/* 同意文書一覧 */}
      {docs.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">同意文書一覧</h2>
          <div className="space-y-4">
            {docs.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{doc.title}</h3>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                    {doc.consentStatus && (
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(doc.consentStatus)}`}>
                        {doc.consentStatus}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3 font-mono">{doc.id}</p>
                <div className="flex gap-2 flex-wrap">
                  {doc.status === "draft" && (
                    <button onClick={() => publishConsent(doc)}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500">
                      公開する
                    </button>
                  )}
                  {doc.status === "published" && !doc.consentStatus && (
                    <>
                      <button onClick={() => consentAction(doc, "approve")}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500">
                        同意する
                      </button>
                      <button onClick={() => consentAction(doc, "reject")}
                        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500">
                        拒否する
                      </button>
                    </>
                  )}
                  <button onClick={() => checkStatus(doc)}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300">
                    状態確認
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Powered by Scalar IST + ScalarDL 3.12.2 + PostgreSQL
      </footer>
    </div>
  );
}
