// ROI Calculator (static) + Markdown → Private GitHub Issue 저장 (no backend)
// Target repo: https://github.com/flowlab09/markdown (PRIVATE)

const GITHUB_OWNER = "flowlab09";
const GITHUB_REPO  = "markdown";
const GITHUB_LABELS = ["feedback"];

const KEY = "roi_public_v3";

const DEFAULTS = [
  { name: "A안", cost: 500000,  gain: 150000 },
  { name: "B안", cost: 900000,  gain: 220000 },
  { name: "C안", cost: 1500000, gain: 320000 },
];

const elInputs = document.getElementById("inputs");
const elResultsSection = document.getElementById("resultsSection");
const elResults = document.getElementById("results");
const elConclusion = document.getElementById("conclusion");

const btnShare = document.getElementById("shareBtn");
const btnReset = document.getElementById("resetBtn");
const btnCalc  = document.getElementById("calcBtn");
const barHint  = document.getElementById("barHint");

const btnCsv = document.getElementById("csvBtn");
const mdText = document.getElementById("mdText");
const btnMdCopy = document.getElementById("mdCopyBtn");
const btnMdDl   = document.getElementById("mdDlBtn");
const btnGhIssue = document.getElementById("ghIssueBtn");

function requireTurnstile() {
  if (window.__ts_ok) return true;
  alert("보안 확인(턴스타일)을 먼저 완료해 주세요.");
  return false;
}

function n(v) {
  const x = Number(String(v ?? "").replaceAll(",", "").trim());
  return Number.isFinite(x) ? x : 0;
}
function safeName(s) {
  const t = String(s ?? "").trim();
  return t.length ? t.slice(0, 24) : "시나리오";
}
function fmtWon(v) { return Math.round(v).toLocaleString("ko-KR") + "원"; }
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function formatNumberForInput(v) {
  const x = n(v);
  if (x === 0) return "0";
  return Math.round(x).toLocaleString("ko-KR");
}
function normalizeNumberText(text) {
  let s = String(text ?? "").trim();
  s = s.replace(/[^\d\-]/g, "");
  if (s.includes("-")) s = (s[0] === "-" ? "-" : "") + s.replaceAll("-", "");
  if (s === "" || s === "-") return "0";
  return s;
}
function calc(item) {
  const cost = Math.max(0, n(item.cost));
  const net  = n(item.gain);
  const months = net > 0 ? cost / net : Infinity;
  const net24  = net * 24 - cost;
  return { cost, net, months, net24 };
}
function encodeShare(data) {
  const parts = data.map((it) => {
    const name = encodeURIComponent(safeName(it.name));
    const cost = Math.round(Math.max(0, n(it.cost)));
    const gain = Math.round(n(it.gain));
    return `${cost},${gain},${name}`;
  });
  return `v=3&d=${parts.join("|")}`;
}
function decodeShare() {
  const url = new URL(location.href);
  const v = url.searchParams.get("v");
  const d = url.searchParams.get("d");
  if (v !== "3" || !d) return null;

  const items = d.split("|").slice(0, 3).map((seg, idx) => {
    const [cost, gain, name] = seg.split(",");
    return {
      name: name ? decodeURIComponent(name) : DEFAULTS[idx]?.name ?? `안${idx + 1}`,
      cost: n(cost),
      gain: n(gain),
    };
  });

  while (items.length < 3) items.push({ ...DEFAULTS[items.length] });
  return items;
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    return parsed.map((x, i) => ({
      name: safeName(x?.name ?? DEFAULTS[i].name),
      cost: n(x?.cost ?? DEFAULTS[i].cost),
      gain: n(x?.gain ?? DEFAULTS[i].gain),
    }));
  } catch { return null; }
}
function saveLocal(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

function defaultMdTemplate() {
  return [
    "## 현재 상태 요약",
    "- 무엇이 문제인가:",
    "- 기대 동작:",
    "- 실제 동작:",
    "",
    "## 재현 방법",
    "1.",
    "2.",
    "3.",
    "",
    "## 개선 아이디어",
    "- ",
    "",
    "## 환경",
    "- OS:",
    "- 브라우저:",
    "- 화면/기기:",
    "",
    "## 참고(링크/스크린샷)",
    "- ",
    "",
  ].join("\n");
}
function ensureMdInitialized() {
  if (!mdText) return;
  if (!mdText.value || mdText.value.trim().length === 0) mdText.value = defaultMdTemplate();
}
function prependMdSummary(summary) {
  if (!mdText || !summary) return;
  const line =
    `> 현재 계산 기준 추천 시나리오: ${summary.bestName} ` +
    `(24개월 누적 ${fmtWon(summary.bestNet24)}, 손익분기 ${summary.bestMonths}, 월 순이익 ${fmtWon(summary.bestMonthly)})`;

  const existing = mdText.value || "";
  const lines = existing.split("\n");
  if (lines[0]?.startsWith("> 현재 계산 기준 추천 시나리오:")) {
    lines[0] = line;
    mdText.value = lines.join("\n");
    return;
  }
  mdText.value = [line, "", existing].join("\n");
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function toCSV(result) {
  const rows = [["시나리오","초기비용","월순이익","손익분기(개월)","24개월누적"]];
  result.computed.forEach(({ it, m }) => {
    rows.push([
      safeName(it.name),
      Math.round(m.cost),
      Math.round(m.net),
      Number.isFinite(m.months) ? m.months.toFixed(1) : "",
      Math.round(m.net24),
    ]);
  });
  return rows.map((r) => r.join(",")).join("\n");
}
function gaEvent(name, params = {}) {
  try { if (typeof gtag === "function") gtag("event", name, params); } catch {}
}
function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function flashButton(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = old;
    btn.disabled = false;
  }, 850);
}
function formatMonths(months) {
  if (!Number.isFinite(months)) return "회수 불가";
  return `${months.toFixed(1)}개월`;
}
function buildGithubIssueUrl(title, bodyMd) {
  const base = `https://github.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/issues/new`;
  const maxBody = 6000;
  const trimmedBody = (bodyMd || "").slice(0, maxBody);

  const params = new URLSearchParams();
  params.set("title", title);
  params.set("body", trimmedBody);
  if (Array.isArray(GITHUB_LABELS) && GITHUB_LABELS.length) {
    GITHUB_LABELS.forEach((l) => params.append("labels", String(l)));
  }
  return `${base}?${params.toString()}`;
}

let draft = decodeShare() || loadLocal() || structuredClone(DEFAULTS);
let lastResult = null;

function renderInputs() {
  if (!elInputs) return;
  elInputs.innerHTML = "";

  draft.forEach((it, i) => {
    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <div class="nameRow">
          <input class="name" type="text" value="${escapeHtml(safeName(it.name))}"
                 data-i="${i}" data-k="name" />
          <span class="tag" style="opacity:.35">입력</span>
        </div>
      </div>

      <label>
        초기 비용(원)
        <div class="numWrap">
          <input type="text" inputmode="numeric" data-i="${i}" data-k="cost"
                 value="${escapeHtml(formatNumberForInput(it.cost))}" />
          <button class="smallBtn" type="button" data-i="${i}" data-k="cost" data-act="clear">지움</button>
        </div>
      </label>

      <label>
        월 순이익(원)
        <div class="numWrap">
          <input type="text" inputmode="numeric" data-i="${i}" data-k="gain"
                 value="${escapeHtml(formatNumberForInput(it.gain))}" />
          <button class="smallBtn" type="button" data-i="${i}" data-k="gain" data-act="clear">지움</button>
        </div>
      </label>

      <div class="sep"></div>

      <div class="metrics">
        <div class="row"><span>힌트</span><b>계산은 버튼으로 실행</b></div>
        <div class="row"><span>저장</span><b>입력은 브라우저에 저장</b></div>
      </div>
    `;
    elInputs.appendChild(card);
  });
}

function renderResults(data) {
  if (!elResults) return null;

  const computed = data.map((it) => ({ it, m: calc(it) }));
  const scored = computed.map((x, idx) => ({
    idx,
    name: safeName(x.it.name),
    net24: x.m.net24,
    months: x.m.months,
    net: x.m.net,
  }));

  scored.sort((a, b) => {
    if (b.net24 !== a.net24) return b.net24 - a.net24;
    const am = Number.isFinite(a.months) ? a.months : 1e18;
    const bm = Number.isFinite(b.months) ? b.months : 1e18;
    if (am !== bm) return am - bm;
    return b.net - a.net;
  });

  const best = scored[0];

  elResults.innerHTML = "";
  computed.forEach(({ it, m }, i) => {
    const isBest = i === best.idx;
    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <div class="nameRow">
          <div class="name" style="border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.10);">${escapeHtml(safeName(it.name))}</div>
          ${isBest ? `<span class="tag">추천</span>` : `<span class="tag" style="opacity:.25"> </span>`}
        </div>
      </div>

      <div class="metrics">
        <div class="row"><span>초기 비용</span><b>${fmtWon(m.cost)}</b></div>
        <div class="row"><span>월 순이익</span><b>${fmtWon(m.net)}</b></div>
        <div class="row"><span>손익분기</span><b>${escapeHtml(formatMonths(m.months))}</b></div>
        <div class="row"><span>24개월 누적</span><b>${fmtWon(m.net24)}</b></div>
      </div>

      ${m.net <= 0 ? `<div class="warn">월 순이익이 0 이하라 손익분기 계산이 불가합니다.</div>` : ``}
    `;
    elResults.appendChild(card);
  });

  const bestItem = data[best.idx];
  const bestM = calc(bestItem);

  const summary = {
    bestName: safeName(bestItem.name),
    bestNet24: bestM.net24,
    bestMonths: formatMonths(bestM.months),
    bestMonthly: bestM.net,
  };

  if (elConclusion) {
    elConclusion.innerHTML =
      `추천은 <b>${escapeHtml(summary.bestName)}</b> 입니다. ` +
      `(24개월 누적: <b>${escapeHtml(fmtWon(summary.bestNet24))}</b>, ` +
      `손익분기: <b>${escapeHtml(summary.bestMonths)}</b>)`;
  }

  return { data, computed, bestIdx: best.idx, summary };
}

function attachHandlers() {
  // 숫자 입력 UX: 포커스 시 전체 선택
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.type === "text" && (t.dataset.k === "cost" || t.dataset.k === "gain")) {
      setTimeout(() => t.select(), 0);
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    const i = Number(t.dataset.i);
    const k = t.dataset.k;
    if (!Number.isFinite(i) || i < 0 || i > 2) return;

    if (k === "name") {
      draft[i].name = safeName(t.value);
      saveLocal(draft);
      return;
    }

    if (k === "cost" || k === "gain") {
      const normalized = normalizeNumberText(t.value);
      t.value = normalized;
      draft[i][k] = n(normalized);
      saveLocal(draft);
    }
  });

  document.addEventListener("blur", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.dataset.k === "cost" || t.dataset.k === "gain") {
      t.value = formatNumberForInput(n(t.value));
    }
  }, true);

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.act === "clear") {
      const i = Number(t.dataset.i);
      const k = t.dataset.k;
      if (!Number.isFinite(i) || i < 0 || i > 2) return;
      if (k !== "cost" && k !== "gain") return;

      draft[i][k] = 0;
      const input = document.querySelector(`input[data-i="${i}"][data-k="${k}"]`);
      if (input instanceof HTMLInputElement) input.value = "0";
      saveLocal(draft);
      gaEvent("roi_clear_field", { field: k, idx: i });
    }
  });

  btnCalc?.addEventListener("click", () => {
    if (!requireTurnstile()) return;

    lastResult = renderResults(draft);
    if (elResultsSection) elResultsSection.hidden = false;

    ensureMdInitialized();
    if (lastResult?.summary) prependMdSummary(lastResult.summary);

    gaEvent("roi_calculate", { best: lastResult?.summary?.bestName || "(none)" });
    if (barHint) barHint.textContent = "계산 완료";
  });

  btnShare?.addEventListener("click", async () => {
    if (!requireTurnstile()) return;
    const qs = encodeShare(draft);
    const url = new URL(location.href);
    url.search = qs;

    try {
      await navigator.clipboard.writeText(url.toString());
      flashButton(btnShare, "복사됨!");
    } catch {
      window.prompt("아래 링크를 복사하세요:", url.toString());
    }
    gaEvent("roi_share_link");
  });

  btnReset?.addEventListener("click", () => {
    if (!requireTurnstile()) return;

    draft = structuredClone(DEFAULTS);
    saveLocal(draft);

    const url = new URL(location.href);
    url.search = "";
    history.replaceState(null, "", url.toString());

    lastResult = null;
    elResultsSection && (elResultsSection.hidden = true);
    if (elResults) elResults.innerHTML = "";
    if (elConclusion) elConclusion.textContent = "계산을 실행하면 추천이 표시됩니다.";

    renderInputs();
    ensureMdInitialized();
    flashButton(btnReset, "리셋됨");
    gaEvent("roi_reset");
  });

  btnCsv?.addEventListener("click", () => {
    if (!requireTurnstile()) return;
    if (!lastResult) return alert("먼저 계산을 실행해 주세요.");
    const csv = toCSV(lastResult);
    downloadText(`roi-result-${todayStamp()}.csv`, csv);
    gaEvent("roi_download_csv");
  });

  btnMdCopy?.addEventListener("click", async () => {
    if (!requireTurnstile()) return;
    ensureMdInitialized();
    try {
      await navigator.clipboard.writeText(mdText.value);
      flashButton(btnMdCopy, "복사됨!");
    } catch {
      window.prompt("아래 내용을 복사하세요:", mdText.value);
    }
    gaEvent("roi_copy_markdown");
  });

  btnMdDl?.addEventListener("click", () => {
    if (!requireTurnstile()) return;
    ensureMdInitialized();
    downloadText(`roi-review-${todayStamp()}.md`, mdText.value);
    gaEvent("roi_download_md");
  });

  btnGhIssue?.addEventListener("click", () => {
    if (!requireTurnstile()) return;
    ensureMdInitialized();

    const title = `[ROI] ${todayStamp()} 개선/버그 리포트`;
    const body =
      mdText.value +
      `\n\n---\n### 자동 첨부\n` +
      `- page: ${location.href}\n` +
      `- ua: ${navigator.userAgent}\n` +
      (lastResult?.summary
        ? `- best: ${lastResult.summary.bestName} / 24M ${fmtWon(lastResult.summary.bestNet24)}\n`
        : `- best: (계산 전)\n`);

    const url = buildGithubIssueUrl(title, body);
    window.open(url, "_blank", "noopener,noreferrer");
    gaEvent("roi_open_github_issue");
  });

  // Markdown 로컬 자동 저장(나만 보기 강화)
  if (mdText) {
    const saved = localStorage.getItem("roi_md_draft");
    if (saved && !mdText.value.trim()) mdText.value = saved;

    mdText.addEventListener("input", () => {
      try { localStorage.setItem("roi_md_draft", mdText.value); } catch {}
    });
  }
}

// init
renderInputs();
ensureMdInitialized();
attachHandlers();
if (barHint) barHint.textContent = window.__ts_ok ? "계산 가능" : "Turnstile 완료 후 계산 가능";
