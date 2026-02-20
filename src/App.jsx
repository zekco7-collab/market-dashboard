import { useState, useEffect, useCallback } from "react";

const INDICATORS = [
  { id: "vix", label: "VIX 공포지수", sublabel: "미국 시장 공포 수준", unit: "pt", warn: 25, danger: 30, autoFetch: true, source: "Cboe", description: "30 이상 급등 시 패닉 매도 구간 진입" },
  { id: "usdkrw", label: "원달러 환율", sublabel: "외국인 자금 이탈 지표", unit: "원", warn: 1380, danger: 1420, autoFetch: true, source: "환율", description: "1,400원 돌파 후 지속 상승 시 외국인 이탈 신호" },
  { id: "hyspread", label: "미국 HY 스프레드", sublabel: "신용경색 전조 지표", unit: "%p", warn: 3.5, danger: 4.5, autoFetch: true, source: "FRED", description: "4%p 이상 시 글로벌 신용경색 위험" },
  { id: "credit", label: "코스피 신용잔고", sublabel: "빚투 과열 지표 (단위: 조원)", unit: "조", warn: 18, danger: 22, autoFetch: false, source: "금투협", sourceUrl: "https://freesis.kofia.or.kr/", description: "전고점 대비 +20% 이상 증가 시 경고" },
  { id: "foreign", label: "외국인 연속 순매도", sublabel: "스마트머니 이탈 기간", unit: "개월", warn: 2, danger: 3, autoFetch: false, source: "네이버 증권", sourceUrl: "https://finance.naver.com/sise/sise_index_day.naver?code=KOSPI", description: "3개월 연속 순매도 시 위험 신호" },
];

const RISK_LEVELS = [
  { label: "안전", color: "#00d084", action: "안전 구간" },
  { label: "주의", color: "#ffd166", action: "주의 필요" },
  { label: "위험", color: "#ff8c42", action: "매도 고려" },
  { label: "위기", color: "#ff4444", action: "즉시 대응" },
];
const SEG_COLORS = ["#00d084", "#ffd166", "#ff8c42", "#ff4444"];

function getStatus(ind, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return "unknown";
  if (v >= ind.danger) return "danger";
  if (v >= ind.warn) return "warn";
  return "safe";
}
const STATUS_COLORS = { safe: "#00d084", warn: "#ffd166", danger: "#ff6b6b", unknown: "#555" };
const STATUS_LABELS = { safe: "정상", warn: "주의", danger: "위험", unknown: "미입력" };

function calcScore(values) {
  let score = 0, max = 0;
  INDICATORS.forEach((ind) => {
    const v = parseFloat(values[ind.id]);
    if (isNaN(v)) return;
    max += 2;
    if (v >= ind.danger) score += 2;
    else if (v >= ind.warn) score += 1;
  });
  return max === 0 ? 0 : Math.round((score / max) * 100);
}

async function fetchIndicatorData(id) {
  const response = await fetch("/api/fetch-indicator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicatorId: id }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "API error");
  }
  return await response.json();
}

function GaugeBar({ value, warn, danger, max, color }) {
  const safeW = Math.min((warn / max) * 100, 100);
  const warnW = Math.min(((danger - warn) / max) * 100, 100);
  const dangerW = 100 - safeW - warnW;
  const markerPos = Math.min((value / max) * 100, 100);
  const markerColor = value >= danger ? "#ff6b6b" : value >= warn ? "#ffd166" : "#00d084";
  return (
    <div style={{ position: "relative", height: "6px", borderRadius: "3px", marginTop: "8px" }}>
      <div style={{ display: "flex", height: "100%", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: safeW + "%", background: "rgba(0,208,132,0.3)" }} />
        <div style={{ width: warnW + "%", background: "rgba(255,209,102,0.3)" }} />
        <div style={{ width: dangerW + "%", background: "rgba(255,107,107,0.3)" }} />
      </div>
      {!isNaN(value) && value > 0 && (
        <div style={{ position: "absolute", top: "-3px", left: markerPos + "%", transform: "translateX(-50%)", width: "12px", height: "12px", borderRadius: "50%", background: markerColor, border: "2px solid #0a0e17", boxShadow: "0 0 8px " + markerColor }} />
      )}
    </div>
  );
}

function RiskMeter({ score }) {
  const level = score >= 75 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0;
  const rl = RISK_LEVELS[level];
  const actions = ["정상 보유", "모니터링 강화", "30~50% 매도 권고", "즉시 대응 필요"];
  const guides = [
    "현재 시장은 안정적입니다. 기존 포지션을 유지하고 추가 매수 검토 가능.",
    "일부 경고 신호 감지. 신규 매수 자제, 포지션 30% 현금화 고려.",
    "복수의 위험 신호 중첩. 수익 구간 물량부터 단계적 매도 실행.",
    "다중 위기 신호 발생. 레버리지/신용 포지션 즉시 정리, 전체 포지션 축소.",
  ];
  return (
    <>
      <div style={{ background: "linear-gradient(135deg,#0d1117 0%,#111827 100%)", border: "1px solid " + rl.color + "33", borderRadius: "16px", padding: "24px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at 50% 0%, " + rl.color + "08 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "4px" }}>MARKET RISK SCORE</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "56px", fontWeight: "700", color: rl.color, lineHeight: 1, textShadow: "0 0 30px " + rl.color + "66" }}>{score}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", color: "#6b7280", fontSize: "12px", marginTop: "4px" }}> / 100</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: rl.color + "15", border: "1px solid " + rl.color + "44", fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: "700", color: rl.color, letterSpacing: "0.05em" }}>{rl.label}</div>
            <div style={{ color: "#4a5568", fontSize: "11px", marginTop: "8px", fontFamily: "'Space Mono',monospace" }}>{rl.action}</div>
          </div>
        </div>
        <div style={{ marginTop: "20px", position: "relative", height: "8px", borderRadius: "4px" }}>
          <div style={{ display: "flex", height: "100%", borderRadius: "4px", overflow: "hidden", gap: "2px" }}>
            {SEG_COLORS.map((c, i) => (<div key={i} style={{ flex: 1, background: score >= (i + 1) * 25 ? c : c + "22", transition: "background 0.5s" }} />))}
          </div>
          <div style={{ position: "absolute", top: "-4px", left: Math.min(score, 100) + "%", transform: "translateX(-50%)", width: "16px", height: "16px", borderRadius: "50%", background: rl.color, border: "3px solid #0d1117", boxShadow: "0 0 12px " + rl.color, transition: "left 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          {["0","25","50","75","100"].map((v) => (<span key={v} style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#4a5568" }}>{v}</span>))}
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#0d1117 0%,#0f1624 100%)", border: "1px solid " + rl.color + "33", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "10px", letterSpacing: "0.1em", marginBottom: "8px" }}>RECOMMENDED ACTION</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: rl.color, boxShadow: "0 0 8px " + rl.color, flexShrink: 0 }} />
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "16px", fontWeight: "700", color: rl.color }}>{actions[level]}</div>
        </div>
        <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6", paddingLeft: "20px" }}>{guides[level]}</div>
      </div>
    </>
  );
}

function IndicatorCard({ indicator, value, onChange, isLoading, meta }) {
  const status = getStatus(indicator, value);
  const color = STATUS_COLORS[status];
  const maxVal = indicator.danger * 1.5;
  const numVal = parseFloat(value) || 0;
  return (
    <div style={{ background: "linear-gradient(135deg,#0d1117 0%,#0f1624 100%)", border: "1px solid " + color + "22", borderRadius: "12px", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: "radial-gradient(circle at 80% 20%, " + color + "08 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", color: "#e2e8f0", fontSize: "13px", fontWeight: "700" }}>{indicator.label}</div>
          <div style={{ color: "#4a5568", fontSize: "11px", marginTop: "2px" }}>{indicator.sublabel}</div>
        </div>
        <div style={{ padding: "3px 10px", borderRadius: "12px", background: color + "15", border: "1px solid " + color + "33", fontFamily: "'Space Mono',monospace", fontSize: "10px", color: color, fontWeight: "700" }}>{STATUS_LABELS[status]}</div>
      </div>
      {indicator.autoFetch ? (
        <div style={{ marginBottom: "12px" }}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "16px", height: "16px", border: "2px solid #2d3748", borderTop: "2px solid " + color, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "12px" }}>데이터 조회 중...</span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "28px", fontWeight: "700", color, textShadow: "0 0 20px " + color + "44" }}>{value ? Number(value).toLocaleString() : "—"}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", color: "#6b7280", fontSize: "12px" }}>{indicator.unit}</span>
                {meta && meta.change && (<span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: meta.change.startsWith("+") ? "#ff6b6b" : "#00d084" }}>{meta.change}</span>)}
              </div>
              {meta && meta.asOf && <div style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "9px", marginTop: "2px" }}>기준: {meta.asOf}</div>}
            </>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="number" value={value} onChange={(e) => onChange(indicator.id, e.target.value)} placeholder="직접 입력" style={{ background: "#1a2035", border: "1px solid " + color + "33", borderRadius: "8px", padding: "8px 12px", color: "#e2e8f0", fontFamily: "'Space Mono',monospace", fontSize: "16px", width: "120px", outline: "none" }} />
            <span style={{ fontFamily: "'Space Mono',monospace", color: "#6b7280", fontSize: "12px" }}>{indicator.unit}</span>
            <a href={indicator.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 10px", background: "#1a2035", border: "1px solid #2d3748", borderRadius: "6px", color: "#6b7280", fontSize: "10px", fontFamily: "'Space Mono',monospace", textDecoration: "none", whiteSpace: "nowrap" }}>확인 →</a>
          </div>
        </div>
      )}
      <GaugeBar value={numVal} warn={indicator.warn} danger={indicator.danger} max={maxVal} color={color} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", color: "#ffd166", fontSize: "9px" }}>주의 {indicator.warn.toLocaleString()}{indicator.unit}</span>
        <span style={{ fontFamily: "'Space Mono',monospace", color: "#ff6b6b", fontSize: "9px" }}>위험 {indicator.danger.toLocaleString()}{indicator.unit}</span>
      </div>
      <div style={{ marginTop: "12px", padding: "8px 10px", background: "#060a10", borderRadius: "6px", borderLeft: "2px solid " + color + "44", color: "#4a5568", fontSize: "10px", lineHeight: "1.4" }}>{indicator.description}</div>
    </div>
  );
}

export default function App() {
  const [values, setValues] = useState({ vix: "", usdkrw: "", hyspread: "", credit: "", foreign: "" });
  const [loadingStates, setLoadingStates] = useState({ vix: false, usdkrw: false, hyspread: false });
  const [fetchedMeta, setFetchedMeta] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    const autoIds = INDICATORS.filter((i) => i.autoFetch).map((i) => i.id);
    for (let i = 0; i < autoIds.length; i++) {
      const id = autoIds[i];
      setLoadingStates((prev) => ({ ...prev, [id]: true }));
      try {
        const data = await fetchIndicatorData(id);
        setValues((prev) => ({ ...prev, [id]: String(data.value) }));
        setFetchedMeta((prev) => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error(id, e);
        setError(id + " 조회 실패 — API 연결 확인 필요");
      } finally {
        setLoadingStates((prev) => ({ ...prev, [id]: false }));
      }
      if (i < autoIds.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }
    setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const handleChange = (id, val) => setValues((prev) => ({ ...prev, [id]: val }));
  const score = calcScore(values);

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#e2e8f0", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        * { box-sizing: border-box; }
        input[type=number] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00d084", boxShadow: "0 0 8px #00d084", animation: "pulse 2s infinite" }} />
                <span style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "10px", letterSpacing: "0.15em" }}>MARKET CRASH SIGNAL MONITOR</span>
              </div>
              <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: "22px", fontWeight: "700", color: "#e2e8f0", margin: 0, letterSpacing: "-0.02em" }}>시장 붕괴 신호 모니터</h1>
              {lastUpdated && (<div style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "9px", marginTop: "4px" }}>마지막 조회: {lastUpdated.toLocaleTimeString("ko-KR")}</div>)}
            </div>
            <button onClick={fetchAll} disabled={Object.values(loadingStates).some(Boolean)} style={{ padding: "10px 18px", background: "transparent", border: "1px solid #2d3748", borderRadius: "8px", color: "#94a3b8", fontFamily: "'Space Mono',monospace", fontSize: "11px", cursor: "pointer" }}>
              {Object.values(loadingStates).some(Boolean) ? "조회 중..." : "↻ 새로고침"}
            </button>
          </div>
          {error && (<div style={{ marginTop: "8px", padding: "8px 12px", background: "#1a0000", border: "1px solid #ff6b6b33", borderRadius: "6px", color: "#ff6b6b", fontSize: "11px", fontFamily: "'Space Mono',monospace" }}>⚠ {error}</div>)}
        </div>
        <RiskMeter score={score} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {INDICATORS.map((ind) => (<IndicatorCard key={ind.id} indicator={ind} value={values[ind.id]} onChange={handleChange} isLoading={loadingStates[ind.id]} meta={fetchedMeta[ind.id]} />))}
        </div>
        <div style={{ background: "#0d1117", border: "1px solid #1a2035", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", color: "#4a5568", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "12px" }}>SIGNAL INTERPRETATION GUIDE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[{ score: "0–24", label: "안전", action: "보유 유지", color: "#00d084" },{ score: "25–49", label: "주의", action: "30% 현금화 검토", color: "#ffd166" },{ score: "50–74", label: "위험", action: "50% 매도 실행", color: "#ff8c42" },{ score: "75–100", label: "위기", action: "레버리지 즉시 청산", color: "#ff4444" }].map((item) => (
              <div key={item.score} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Space Mono',monospace", color: item.color, fontSize: "10px", minWidth: "45px" }}>{item.score}</span>
                <span style={{ color: "#4a5568", fontSize: "10px" }}>{item.label} — {item.action}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", color: "#2d3748", fontSize: "9px", textAlign: "center", lineHeight: "1.6" }}>
          ※ 이 도구는 투자 참고용이며 투자 권유가 아닙니다.<br />
          신용잔고·외국인 순매도는 금투협·네이버 증권에서 직접 확인 후 입력하세요.
        </div>
      </div>
    </div>
  );
    }
