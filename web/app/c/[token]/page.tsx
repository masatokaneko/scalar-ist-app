"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:8081/api";

type Choice = { tag: string; label: string; required: boolean; document?: string };
type Invitation = {
  token: string; scenario: string; title: string;
  decisionType: string; decisionMode: string;
  consent_statement_id: string; status: string;
  choices: Choice[];
};

export default function ConsentPage() {
  const params = useParams();
  const token = params.token as string;
  const [inv, setInv] = useState<Invitation | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [step, setStep] = useState<"loading" | "review" | "confirm" | "done" | "error">("loading");
  const [decision, setDecision] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/invite/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(data => {
        setInv(data);
        if (data.status === "completed") {
          setStep("done");
          setDecision(data.decision || "approved");
        } else {
          const init: Record<number, boolean> = {};
          data.choices.forEach((c: Choice, i: number) => { init[i] = c.required; });
          setChecked(init);
          setStep("review");
        }
      })
      .catch(() => { setError("招待リンクが無効です"); setStep("error"); });
  }, [token]);

  const scenarioMeta: Record<string, { icon: string; color: string; org: string }> = {
    service_signup: { icon: "👤", color: "blue", org: "Scalar Labs, Inc." },
    contractor_nda: { icon: "🔒", color: "purple", org: "Scalar Labs, Inc." },
    employee_onboarding: { icon: "🏢", color: "green", org: "Scalar Labs, Inc." },
    cookie_preferences: { icon: "🍪", color: "orange", org: "Scalar Labs, Inc." },
  };

  const allRequiredChecked = () => {
    if (!inv) return false;
    return inv.choices.every((c, i) => !c.required || checked[i]);
  };

  const handleSubmit = async (action: "approved" | "rejected") => {
    try {
      const res = await fetch(`${API}/invite/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: action }),
      });
      const data = await res.json();
      if (data.success) {
        setDecision(action);
        setTimestamp(new Date(data.timestamp).toLocaleString("ja-JP"));
        setStep("done");
      } else {
        setError(data.error);
      }
    } catch { setError("送信に失敗しました"); }
  };

  if (step === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  );

  if (step === "error") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (!inv) return null;
  const meta = scenarioMeta[inv.scenario] || scenarioMeta.service_signup;
  const typeLabel: Record<string, string> = {
    consent: "同意の依頼", acknowledgement: "確認・承諾の依頼", preference: "設定の依頼"
  };

  // === DONE ===
  if (step === "done") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">{decision === "approved" ? "✅" : "❌"}</div>
        <h1 className="text-xl font-bold mb-2">
          {decision === "approved" ? "回答が記録されました" : "拒否が記録されました"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{inv.title}</p>
        <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400">受付番号</span>
            <span className="font-mono text-xs">{token}</span>
          </div>
          {timestamp && (
            <div className="flex justify-between">
              <span className="text-gray-400">記録日時</span>
              <span>{timestamp}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">記録先</span>
            <span>ScalarDL 改ざん検知台帳</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          この記録は改ざん検知可能な分散台帳に保全されています。<br/>
          受付番号は大切に保管してください。
        </p>
      </div>
    </div>
  );

  // === CONFIRM ===
  if (step === "confirm") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <h2 className="text-lg font-bold mb-4">内容の確認</h2>
        <p className="text-sm text-gray-500 mb-4">以下の内容で回答を送信します。</p>
        <div className="space-y-2 mb-6">
          {inv.choices.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${checked[i] ? "bg-green-50" : "bg-gray-50"}`}>
              <span>{checked[i] ? "✓" : "−"}</span>
              <span className={checked[i] ? "text-green-800" : "text-gray-400"}>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-6">
          この回答はScalarDLの改ざん検知可能な台帳に記録されます。記録後の改ざんは検知されます。
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep("review")}
            className="flex-1 py-3 rounded-xl border text-sm font-medium hover:bg-gray-50">
            戻る
          </button>
          <button onClick={() => handleSubmit("approved")}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500">
            同意して送信
          </button>
        </div>
      </div>
    </div>
  );

  // === REVIEW ===
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${
          meta.color === "blue" ? "from-blue-600 to-blue-500" :
          meta.color === "purple" ? "from-purple-600 to-purple-500" :
          meta.color === "green" ? "from-green-600 to-green-500" :
          "from-orange-500 to-orange-400"
        } text-white`}>
          <p className="text-3xl mb-2">{meta.icon}</p>
          <h1 className="text-xl font-bold">{inv.title}</h1>
          <p className="text-sm opacity-80 mt-1">{meta.org}</p>
          <span className="inline-block mt-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {typeLabel[inv.decisionType] || "同意の依頼"}
          </span>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            以下の項目を確認し、回答してください。
            {inv.decisionMode === "granular" && "任意項目は選択できます。"}
          </p>

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {inv.choices.map((c, i) => (
              <div key={i} className={`rounded-xl border-2 transition-all ${
                checked[i] ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}>
                <label className="flex items-start gap-3 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked[i] || false}
                    disabled={c.required}
                    onChange={() => setChecked({ ...checked, [i]: !checked[i] })}
                    className="mt-0.5 w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        c.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.tag}
                      </span>
                    </div>
                    {c.document && (
                      <button type="button"
                        onClick={(e) => { e.preventDefault(); setExpanded({ ...expanded, [i]: !expanded[i] }); }}
                        className="text-xs text-blue-600 mt-1 hover:underline">
                        {expanded[i] ? "▼ 文書を閉じる" : "▶ 文書の内容を確認する"}
                      </button>
                    )}
                  </div>
                </label>
                {c.document && expanded[i] && (
                  <div className="mx-4 mb-4 p-3 bg-white rounded-lg border text-xs text-gray-600 leading-relaxed">
                    {c.document}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => handleSubmit("rejected")}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              拒否する
            </button>
            <button onClick={() => setStep("confirm")}
              disabled={!allRequiredChecked()}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
              {inv.decisionType === "acknowledgement" ? "確認・承諾" :
               inv.decisionType === "preference" ? "設定を保存" : "同意する"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            🔗 記録は ScalarDL 改ざん検知台帳に保全されます
          </p>
        </div>
      </div>
    </div>
  );
}
