// ROI Calculator - GitHub Issue(프리필)로 제출
// Repo: flowlab09/markdown (private 가능)
// 주의: 이슈 실제 생성은 "GitHub 페이지에서 Submit"을 눌러야 됨.

const STORE_KEY = "roi_calc_v1";
const SECURITY_EMAIL = "roicalculator.official@gmail.com";

const ISSUE_NEW_URL = "https://github.com/flowlab09/markdown/issues/new";
const ISSUE_LABELS = ["feedback"]; // 레포에 라벨 없으면 그냥 무시될 수 있음

const defaults = [
  { name: "A안", cost: 500000, gain: 150000 },
  { name: "B안", cost: 900000, gain: 220000 },
  { name: "C안", cost: 1500000, gain: 320000 },
];

const $cards = document.getElementById("cards");
const $conclusion = document.getElementById("conclusion");
document.getElementById("year").textContent = String(new Date().getFullYear());

const shareBtn = document.getElementById("shareBtn");
const resetBtn = document.getElementById("resetBtn");
const csvBtn = document.getElementById("csvBtn");
const issueBtn = document.getElementById("issueBtn");

const openMailBtn = document.getElementById("openMail");
const copyMailBtn = document.getElementById("copyMail");
const mailAddr = document.getElementById("mailAddr");
mailAddr.textContent = SECURITY_EMAIL;

openMailBtn?.addEventListener("click", () => {
  location.href = `mailto:${SECURITY_EMAIL}?subject=[SECURITY] ROI Calculator`;
});
copyMailBtn?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(SECURITY_EMAIL);
  alert("이메일이 복사되었습니다.");
});

function n(v) {
  const x = Number(String(v ?? "").replaceAll(",", "").trim());
  return Number.isFinite(x) ? x : 0;
}
function fmtWon(v) {
  const x = Math.round(Number(v) || 0);
  return `${x.toLocaleString("ko-KR")}원`;
}
function fmtMonths(v) {
  if (!Number.isFinite(v)) return "회수 불가";
  return `${(Math.round(v * 10) / 10).toLocaleString("ko-KR")}개월`;
}
function safe(s, max = 40) {
  return String(s ?? "").trim().slice(0, max);
}

function calc(item) {
  const cost = Math.max(0, n(item.cost));
  const gain = n(item.gain);
  const breakeven = gain > 0 ? cost / gain : Infinity;
  const net24 = gain * 24 - cost;
  return { cost, gain, breakeven, net24, ok: gain > 0 };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(defaults);
    const p = JSON.parse(raw);
    if (!Array.isArray(p) || p.length !== 3) return structuredClone(defaults);
    return p.map((x, i) => ({
      name: safe(x?.name ?? defaults[i].name, 30),
      cost: n(x?.cost ?? defaults[i].cost),
      gain: n(x?.gain ?? defaults[i].gain),
    }));
  } catch {
    return structuredClone(defaults);
  }
}
function save(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

let data = load();

function kpiRow(label, value) {
  const row = document.createElement("div");
  row.className = "kpi";
  const l = document.createElement("span");
  l.textContent = label;
  const r = document.createElement("strong");
  r.textContent = value;
  row.appendChild(l);
  row.appendChild(r);
  return { row, r };
}

function buildField(labelText, initial, onChange) {
  const wrap = document.createElement("label");
  wrap.textContent = labelText;

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.value = String(Math.round(n(initial)));
  input.disabled = !window.__ts_ok;

  // 포커스 시 전체 선택 (덮어쓰기 편하게)
  input.addEventListener("focus", () => setTimeout(() => input.select(), 0));

  input.addEventListener("input", () => {
    onChange(n(input.value));
  });

  input.addEventListener("blur", () => {
    input.value = String(Math.round(n(input.value)));
  });

  wrap.appendChild(input);
  return { wrap, input };
}

function build() {
  $cards.innerHTML = "";

  data.forEach((it, idx) => {
    const card = document.createElement("section");
    card.className = "card";
    const inner = document.createElement("div");
    inner.className = "cardInner";

    const head = document.createElement("div");
    head.className = "headRow";

    const name = document.createElement("input");
    name.className = "name";
    name.type = "text";
    name.value = safe(it.name, 30) || `안${idx + 1}`;
    name.disabled = !window.__ts_ok;
    name.addEventListener("input", () => {
      data[idx].name = safe(name.value, 30);
      save(data);
      render();
    });

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = idx === 0 ? "A" : idx === 1 ? "B" : "C";

    head.appendChild(name);
    head.appendChild(pill);

    const f1 = buildField("초기 비용(원)", it.cost, (v) => {
      data[idx].cost = v;
      save(data);
      render();
    });
    const f2 = buildField("월 순이익(원)", it.gain, (v) => {
      data[idx].gain = v;
      save(data);
      render();
    });

    const kpis = document.createElement("div");
    kpis.className = "kpis";
    const k1 = kpiRow("월 순이익", "");
    const k2 = kpiRow("손익분기", "");
    const k3 = kpiRow("24개월 누적", "");
    kpis.appendChild(k1.row);
    kpis.appendChild(k2.row);
    kpis.appendChild(k3.row);

    const warn = document.createElement("div");
    warn.className = "warn";
    warn.style.display = "none";

    inner.appendChild(head);
    inner.appendChild(f1.wrap);
    inner.appendChild(f2.wrap);
    inner.appendChild(kpis);
    inner.appendChild(warn);

    card.appendChild(inner);
    $cards.appendChild(card);

    card.__refs = { k1, k2, k3, warn };
  });

  render();
}

function pickBest(results) {
  const scored = results.map((r, idx) => ({ ...r, idx }));
  scored.sort((a, b) => {
    if (b.net24 !== a.net24) return b.net24 - a.net24;
    return a.breakeven - b.breakeven;
  });
  return scored[0] ?? null;
}

function render() {
  const results = data.map(calc);
  const best = pickBest(results);

  Array.from($cards.children).forEach((card, idx) => {
    const r = results[idx];
    const refs = card.__refs;
    refs.k1.r.textContent = fmtWon(r.gain);
    refs.k2.r.textContent = r.ok ? fmtMonths(r.breakeven) : "회수 불가";
    refs.k3.r.textContent = fmtWon(r.net24);

    if (!r.ok) {
      refs.warn.style.display = "block";
      refs.warn.textContent = "월 순이익이 0 이하라 손익분기 계산이 불가능합니다.";
    } else {
      refs.warn.style.display = "none";
      refs.warn.textContent = "";
    }
  });

  if (!window.__ts_ok) {
    $conclusion.textContent = "보안 확인 후 입력하면 추천이 표시됩니다.";
    return;
  }

  const bItem = data[best.idx];
  const bName = safe(bItem?.name || `안${best.idx + 1}`, 30);

  $conclusion.textContent =
    `현재 입력 기준 추천 시나리오: ${bName} ` +
    `(24개월 누적 ${fmtWon(best.net24)}, 손익분기 ${best.ok ? fmtMonths(best.breakeven) : "회수 불가"}, 월 순이익 ${fmtWon(best.gain)})`;
}

function buildIssueUrl() {
  const results = data.map(calc);
  const best = pickBest(results);

  const title = `[ROI] ${new Date().toISOString().slice(0,10)} 개선/버그 리포트`;
  const lines = [];

  lines.push(`## 자동 첨부 (현재 입력값)`);
  data.forEach((it, i) => {
    const r = results[i];
    lines.push(`- ${safe(it.name || `안${i+1}`, 30)}: 초기비용 ${fmtWon(r.cost)}, 월순이익 ${fmtWon(r.gain)}, 손익분기 ${r.ok ? fmtMonths(r.breakeven) : "회수 불가"}, 24개월누적 ${fmtWon(r.net24)}`);
  });

  if (best) {
    const bItem = data[best.idx];
    const bName = safe(bItem?.name || `안${best.idx + 1}`, 30);
    lines.push("");
    lines.push(`> 추천: **${bName}** (24개월 누적 ${fmtWon(best.net24)}, 손익분기 ${best.ok ? fmtMonths(best.breakeven) : "회수 불가"})`);
  }

  lines.push("");
  lines.push("## 현재 상태 요약");
  lines.push("- 무엇이 문제인가:");
  lines.push("- 기대 동작:");
  lines.push("- 실제 동작:");
  lines.push("");
  lines.push("## 개선 아이디어");
  lines.push("-");

  lines.push("");
  lines.push("## 환경");
  lines.push(`- URL: ${location.href}`);
  lines.push(`- UA: ${navigator.userAgent}`);

  const body = lines.join("\n");

  const params = new URLSearchParams();
  params.set("title", title);
  params.set("body", body);
  if (ISSUE_LABELS.length) params.set("labels", ISSUE_LABELS.join(","));

  // /issues/new?title=...&body=...&labels=...
  return `${ISSUE_NEW_URL}?${params.toString()}`;
}

async function copyShareLink() {
  const qs = new URLSearchParams();
  data.forEach((it, i) => {
    qs.set(`n${i}`, safe(it.name, 30));
    qs.set(`c${i}`, String(n(it.cost)));
    qs.set(`g${i}`, String(n(it.gain)));
  });
  const url = `${location.origin}${location.pathname}?${qs.toString()}`;
  await navigator.clipboard.writeText(url);
  alert("공유 링크가 복사되었습니다.");
}

function applyQuery() {
  const qs = new URLSearchParams(location.search);
  if ([...qs.keys()].length === 0) return;

  data = structuredClone(defaults).map((d, i) => ({
    name: safe(qs.get(`n${i}`) ?? d.name, 30),
    cost: n(qs.get(`c${i}`) ?? d.cost),
    gain: n(qs.get(`g${i}`) ?? d.gain),
  }));
  save(data);
}

function downloadCSV() {
  const header = ["시나리오","초기비용(원)","월순이익(원)","손익분기(개월)","24개월누적(원)"];
  const rows = data.map((it) => {
    const r = calc(it);
    return [
      safe(it.name, 30).replaceAll('"','""'),
      String(r.cost),
      String(r.gain),
      r.ok ? String(Math.round(r.breakeven * 10) / 10) : "",
      String(Math.round(r.net24)),
    ];
  });
  const csv = [header, ...rows].map((arr) => arr.map((x) => `"${String(x)}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const t = new Date();
  const name = `roi_${t.getFullYear()}${String(t.getMonth()+1).padStart(2,"0")}${String(t.getDate()).padStart(2,"0")}.csv`;
  a.download = name;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetAll() {
  data = structuredClone(defaults);
  save(data);
  build();
}

shareBtn?.addEventListener("click", () => window.__ts_ok && copyShareLink());
csvBtn?.addEventListener("click", () => window.__ts_ok && downloadCSV());
resetBtn?.addEventListener("click", () => window.__ts_ok && resetAll());
issueBtn?.addEventListener("click", () => {
  if (!window.__ts_ok) return;
  const url = buildIssueUrl();
  window.open(url, "_blank", "noopener,noreferrer");
});

applyQuery();
build();
