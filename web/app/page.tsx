"use client";

import { useState } from "react";

const API = "http://localhost:8081/api";

export default function Home() {
  const [links, setLinks] = useState<{ scenario: string; token: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const seed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/scenarios/seed`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLinks(data.invitations);
        setSeeded(true);
      }
    } catch (e) {
      alert("APIサーバーに接続できません。localhost:8081 が起動しているか確認してください。");
    }
    setLoading(false);
  };

  const scenarioInfo: Record<string, { icon: string; desc: string; color: string }> = {
    service_signup: { icon: "👤", desc: "ユーザーがサービス登録時に個人情報の利用目的・データ項目ごとに同意する", color: "blue" },
    contractor_nda: { icon: "🔒", desc: "業務委託の常駐者がNDA・セキュリティポリシー・個人情報取扱いに同意する", color: "purple" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Scalar IST Demo</h1>
          <p className="text-gray-500 text-lg">改ざん検知可能な台帳で同意を保全する</p>
          <p className="text-gray-400 text-sm mt-2">ScalarDL 3.12.2 + ScalarDB 3.17.1 + PostgreSQL</p>
        </div>

        {!seeded ? (
          <div className="text-center">
            <p className="text-gray-500 mb-6">4つの利用シーンのデモデータを生成します</p>
            <button onClick={seed} disabled={loading}
              className="bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {loading ? "生成中..." : "デモを開始する"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-8">
              {links.map((link) => {
                const info = scenarioInfo[link.scenario];
                return (
                  <a key={link.token} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow flex items-start gap-4">
                    <span className="text-3xl">{info?.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{scenarioInfo[link.scenario]?.desc || link.scenario}</h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{link.url}</p>
                    </div>
                    <span className="text-gray-400 text-xl">→</span>
                  </a>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <a href="/admin"
                className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-700">
                管理ダッシュボードを開く
              </a>
              <button onClick={seed} disabled={loading}
                className="border px-6 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                {loading ? "生成中..." : "再生成"}
              </button>
            </div>
          </>
        )}

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <p className="text-2xl mb-2">🔐</p>
            <h3 className="font-semibold text-sm mb-1">改ざん検知</h3>
            <p className="text-xs text-gray-400">ScalarDL台帳で同意記録を保全</p>
          </div>
          <div className="p-4">
            <p className="text-2xl mb-2">📋</p>
            <h3 className="font-semibold text-sm mb-1">GDPR/CCPA対応</h3>
            <p className="text-xs text-gray-400">法規準拠の同意管理テンプレート</p>
          </div>
          <div className="p-4">
            <p className="text-2xl mb-2">🔗</p>
            <h3 className="font-semibold text-sm mb-1">招待リンク</h3>
            <p className="text-xs text-gray-400">URLを共有するだけで同意を依頼</p>
          </div>
        </div>
      </div>
    </div>
  );
}
