"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:8081/api";

type DataSet = {
  tag: string; label: string; required: boolean;
  purpose?: string; dataItems?: string[]; thirdParty?: string | null;
  retention?: string; benefit?: string; document?: string;
};
type Invitation = {
  token: string; scenario: string; title: string;
  decisionType: string; decisionMode: string;
  consent_statement_id: string; status: string;
  choices: DataSet[]; decision?: string;
};

export default function ConsentPage() {
  const params = useParams();
  const token = params.token as string;
  const [inv, setInv] = useState<Invitation | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [step, setStep] = useState<"loading" | "review" | "confirm" | "done" | "error">("loading");
  const [decision, setDecision] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/invite/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(data => {
        setInv(data);
        if (data.status === "completed") { setStep("done"); setDecision(data.decision || "approved"); }
        else {
          const init: Record<number, boolean> = {};
          data.choices.forEach((c: DataSet, i: number) => { init[i] = c.required; });
          setChecked(init);
          setStep("review");
        }
      })
      .catch(() => { setError("招待リンクが無効です"); setStep("error"); });
  }, [token]);

  const meta: Record<string, { icon: string; color: string; org: string; desc: string }> = {
    service_signup: { icon: "👤", color: "blue", org: "Scalar Labs, Inc.", desc: "以下の個人情報の利用について、項目ごとに同意・拒否を選択してください。" },
    contractor_nda: { icon: "🔒", color: "purple", org: "Scalar Labs, Inc.", desc: "業務委託にあたり、以下の全項目への同意が必要です。内容をご確認ください。" },
  };

  const allRequiredChecked = () => inv ? inv.choices.every((c, i) => !c.required || checked[i]) : false;

  const handleSubmit = async (action: "approved" | "rejected") => {
    const res = await fetch(`${API}/invite/${token}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: action }),
    });
    const data = await res.json();
    if (data.success) { setDecision(action); setTimestamp(new Date(data.timestamp).toLocaleString("ja-JP")); setStep("done"); }
    else setError(data.error);
  };

  if (step === "loading") return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>;
  if (step === "error") return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-5xl mb-4">😕</p><p className="text-gray-500">{error}</p></div></div>;
  if (!inv) return null;
  const m = meta[inv.scenario] || meta.service_signup;
  const typeLabel: Record<string, string> = { consent: "同意の依頼", acknowledgement: "確認・承諾の依頼" };

  // === DONE ===
  if (step === "done") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">{decision === "approved" ? "✅" : "❌"}</div>
        <h1 className="text-xl font-bold mb-2">{decision === "approved" ? "回答が記録されました" : "拒否が記録されました"}</h1>
        <p className="text-gray-500 text-sm mb-6">{inv.title}</p>
        <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between"><span className="text-gray-400">受付番号</span><span className="font-mono text-xs">{token}</span></div>
          {timestamp && <div className="flex justify-between"><span className="text-gray-400">記録日時</span><span>{timestamp}</span></div>}
          <div className="flex justify-between"><span className="text-gray-400">記録先</span><span>ScalarDL 改ざん検知台帳</span></div>
          <div className="flex justify-between"><span className="text-gray-400">同意項目</span><span>{inv.choices.filter((_, i) => checked[i]).length} / {inv.choices.length}</span></div>
        </div>
        <p className="text-xs text-gray-400">この記録は改ざん検知可能な分散台帳に保全されています。</p>
      </div>
    </div>
  );

  // === CONFIRM ===
  if (step === "confirm") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <h2 className="text-lg font-bold mb-4">内容の最終確認</h2>
        <div className="space-y-2 mb-6">
          {inv.choices.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${checked[i] ? "bg-green-50" : "bg-gray-50"}`}>
              <span className="text-lg">{checked[i] ? "✓" : "−"}</span>
              <div>
                <span className={checked[i] ? "text-green-800 font-medium" : "text-gray-400"}>{c.label}</span>
                {c.dataItems && checked[i] && <p className="text-xs text-gray-400 mt-0.5">データ: {c.dataItems.join(", ")}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-6">
          この回答はScalarDLの改ざん検知可能な台帳に記録されます。記録後の改ざんは検知されます。
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep("review")} className="flex-1 py-3 rounded-xl border text-sm font-medium hover:bg-gray-50">戻る</button>
          <button onClick={() => handleSubmit("approved")} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500">
            {inv.decisionType === "acknowledgement" ? "確認・承諾して送信" : "同意して送信"}
          </button>
        </div>
      </div>
    </div>
  );

  // === REVIEW ===
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className={`rounded-2xl p-6 mb-6 text-white bg-gradient-to-r ${
          m.color === "blue" ? "from-blue-600 to-blue-500" : "from-purple-600 to-purple-500"}`}>
          <p className="text-3xl mb-2">{m.icon}</p>
          <h1 className="text-xl font-bold">{inv.title}</h1>
          <p className="text-sm opacity-80 mt-1">{m.org}</p>
          <span className="inline-block mt-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{typeLabel[inv.decisionType]}</span>
        </div>

        <p className="text-sm text-gray-500 mb-4">{m.desc}</p>

        {/* Data Set Cards */}
        <div className="space-y-4 mb-6">
          {inv.choices.map((ds, i) => (
            <div key={i} className={`bg-white rounded-xl border-2 transition-all ${
              checked[i] ? "border-blue-500 shadow-sm" : "border-gray-200"}`}>
              {/* Header row */}
              <div className="flex items-start gap-3 p-4">
                <input type="checkbox" checked={checked[i] || false} disabled={ds.required}
                  onChange={() => setChecked({ ...checked, [i]: !checked[i] })}
                  className="mt-1 w-5 h-5 rounded" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{ds.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      ds.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>{ds.tag}</span>
                  </div>
                  {ds.purpose && <p className="text-xs text-gray-500">利用目的: {ds.purpose}</p>}
                </div>
                <button onClick={() => setExpanded({ ...expanded, [i]: !expanded[i] })}
                  className="text-gray-400 hover:text-gray-600 text-sm mt-1">
                  {expanded[i] ? "▼" : "▶"}
                </button>
              </div>

              {/* Expanded detail */}
              {expanded[i] && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-xs">
                    {ds.dataItems && ds.dataItems.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-medium mb-1">📋 取得するデータ項目</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ds.dataItems.map((item, j) => (
                            <span key={j} className="bg-white border rounded-md px-2 py-1">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {ds.purpose && (
                      <div>
                        <p className="text-gray-400 font-medium mb-1">🎯 利用目的</p>
                        <p className="text-gray-700">{ds.purpose}</p>
                      </div>
                    )}
                    {ds.thirdParty && (
                      <div>
                        <p className="text-gray-400 font-medium mb-1">🤝 第三者提供先</p>
                        <p className="text-gray-700">{ds.thirdParty}</p>
                      </div>
                    )}
                    {ds.retention && (
                      <div>
                        <p className="text-gray-400 font-medium mb-1">⏱ 利用期限</p>
                        <p className="text-gray-700">{ds.retention}</p>
                      </div>
                    )}
                    {ds.benefit && (
                      <div>
                        <p className="text-gray-400 font-medium mb-1">🎁 便益</p>
                        <p className="text-gray-700">{ds.benefit}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => handleSubmit("rejected")}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            すべて拒否する
          </button>
          <button onClick={() => setStep("confirm")} disabled={!allRequiredChecked()}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
            {inv.decisionType === "acknowledgement" ? "確認・承諾する" : "同意する"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          🔗 同意記録はScalarDL改ざん検知台帳に保全されます
        </p>
      </div>
    </div>
  );
}
