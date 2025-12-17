/* =========================================================
   ROI Calculator Lite
   - Turnstile gate
   - CSV export
   - Share link (state in URL)
   - Prefilled GitHub Issue -> flowlab09/markdown
   - Security report via mailto (Gmail fallback)
   + CTA button update (ctaLink) for affiliate/SaaS
   + Coupang affiliate box in conclusion card (affiliateBox)
========================================================= */

const ISSUE_REPO = "flowlab09/markdown";
const ISSUE_NEW_URL = `https://github.com/${ISSUE_REPO}/issues/new`;

const SECURITY_EMAIL = "roicalculator.official@gmail.com";
const SECURITY_SUBJECT = "[ROI Calculator] 보안 제보";
const SECURITY_BODY =
  "보안 제보 내용:\n\n" +
  "- 취약점 요약:\n" +
  "- 재현 방법:\n" +
  "- 영향 범위:\n" +
  "- 참고(스크린샷/링크):\n\n" +
  "※ 비밀번호/토큰/지갑시드 등 민감정보는 절대 적지 마세요.\n";

const DEFAULTS = [
  { key: "A", name: "A안", cost: 500000, profit: 150000 },
  { key: "B", name: "B안", cost: 900000, profit: 220000 },
  { key: "C", name: "C안", cost: 1500000, profit: 320000 },
];

const state = {
  scenarios: structuredClone(DEFAULTS),
};

const el = {
  cards: document.getElementById("cards"),
  conclusionText: document.getElementById("conclusionText"),
  ctaLink: document.getElementById("ctaLink"),
  affiliateBox: document.getElementById("affiliateBox"),
  shareBtn: document.getElementById("shareBtn"),
  resetBtn: document.getElementById("resetBtn"),
  csvBtn: document.getElementById("csvBtn"),
  issueBtn: document.getElementById("issueBtn"),
  securityMailBtn: document.getElementById("securityMailBtn"),
  copyMailBtn: document.getElementById("copyMailBtn"),
};

/* ==========================
   CTA (Affiliate / SaaS)
========================== */

// TODO: 너의 제휴 링크로 교체
const DEFAULT_CTA = {
  href: "https://example.com",
  text: "무료 체험으로 ROI 관리하기 →",
};

function getCtaForRecommendation(recIdx) {
  return DEFAULT_CTA;
}

function setCtaDisabled() {
  if (!el.ctaLink) return;
  el.ctaLink.href = "#";
  el.ctaLink.textContent = "보안 확인 후 이용 가능합니다";
  el.ctaLink.setAttribute("aria-disabled", "true");
  el.ctaLink.style.pointerEvents = "none";
  el.ctaLink.style.opacity = "0.6";
}

function setCtaEnabled(recIdx) {
  if (!el.ctaLink) return;
  const cta = getCtaForRecommendation(recIdx);
  el.ctaLink.href = cta.href;
  el.ctaLink.textContent = cta.text;
  el.ctaLink.removeAttribute("aria-disabled");
  el.ctaLink.style.pointerEvents = "auto";
  el.ctaLink.style.opacity = "1";
}

/* ==========================
   Affiliate box visibility
========================== */

function setAffiliateHidden() {
  if (!el.affiliateBox) return;
  el.affiliateBox.style.display = "none";
}
function setAffiliateVisible() {
  if (!el.affiliateBox) return;
  el.affiliateBox.style.display = "block";
}

/* ==========================
   Guards / Formatters
========================== */

function tsGuard() {
  if (!window.__ts_ok) {
    alert("보안 확인 후 이용 가능합니다.");
    return false;
  }
  return true;
}

function formatWon(n) {
  if (!Number.isFinite(n)) return "-";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}${abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

function formatMonths(n) {
  if (!Number.isFinite(n)) return "회수 불가";
  if (n === Infinity) return "회수 불가";
  return `${(Math.round(n * 10) / 10).toFixed(1)}개월`;
}

function calcScenario(cost, profit) {
  const c = Number(cost);
  const p = Number(profit);

  const validCost = Number.isFinite(c) && c >= 0;
  const validProfit = Number.isFinite(p);

  const payback = validCost && validProfit && p > 0 ? c / p : Infinity;
  const net24 = validProfit ? p * 24 - (validCost ? c : 0) : NaN;

  return {
    cost: validCost ? c : 0,
    profit: validProfit ? p : 0,
    paybackMonths: payback,
    net24: Number.isFinite(net24) ? net24 : NaN,
    canPayback: validCost && validProfit && p > 0,
  };
}

function pickRecommendation(rows) {
  const candidates = rows
    .map((r, idx) => ({ ...r, idx }))
    .filter((r) => Number.isFinite(r.net24));

  if (candidates.length === 0) return -1;

  candidates.sort((a, b) => {
    if (b.net24 !== a.net24) return b.net24 - a.net24;
    return a.paybackMonths - b.paybackMonths;
  });

  return candidates[0].idx;
}

/* ==========================
   UI Build / Render
========================== */

function buildCard(i) {
  const s = state.scenarios[i];
  const card = document.createElement("section");
  card.className = "scCard";
  card.dataset.idx = String(i);

  card.innerHTML = `
    <div class="scHead">
      <div class="scTitle">
        <div class="scName">${s.name}</div>
        <div class="badge" id="badge-${i}" style="display:none;">추천</div>
      </div>
    </div>

    <div class="field">
      <div class="labelRow">
        <label for="cost-${i}">초기 비용(원)</label>
      </div>
      <input id="cost-${i}" inputmode="numeric" autocomplete="off" spellcheck="false" />
    </div>

    <div class="field">
      <div class="labelRow">
        <label for="profit-${i}">월 순이익(원)</label>
      </div>
      <input id="profit-${i}" inputmode="numeric" autocomplete="off" spellcheck="false" />
    </div>

    <div class="kpis" id="kpis-${i}">
      <div class="k">월 순이익</div><div class="v" id="kpi-profit-${i}">-</div>
      <div class="k">손익분기</div><div class="v" id="kpi-payback-${i}">-</div>
      <div class="k">24개월 누적</div><div class="v" id="kpi-net24-${i}">-</div>
    </div>

    <div class="warn" id="warn-${i}" style="display:none;"></div>
  `;

  const costInput = card.querySelector(`#cost-${i}`);
  const profitInput = card.querySelector(`#profit-${i}`);

  costInput.value = String(s.cost);
  profitInput.value = String(s.profit);

  const normalizeNumber = (v) => {
    const x = String(v).replace(/[^\d.-]/g, "");
    if (x === "" || x === "-" || x === "." || x === "-.") return "";
    const n = Number(x);
    if (!Number.isFinite(n)) return "";
    return String(Math.trunc(n));
  };

  const onInput = (e) => {
    if (!tsGuard()) return;

    const idx = Number(card.dataset.idx);
    const key = e.target.id.startsWith("cost") ? "cost" : "profit";
    const raw = e.target.value;
    const normalized = normalizeNumber(raw);

    if (normalized === "") {
      state.scenarios[idx][key] = 0;
      e.target.value = "";
    } else {
      const n = Number(normalized);
      state.scenarios[idx][key] = n;
      e.target.value = normalized;
    }

    render();
    syncUrlState();
  };

  costInput.addEventListener("input", onInput);
  profitInput.addEventListener("input", onInput);

  return card;
}

function render() {
  const rows = state.scenarios.map((s) => calcScenario(s.cost, s.profit));
  const recIdx = pickRecommendation(rows);

  rows.forEach((r, i) => {
    const profitEl = document.getElementById(`kpi-profit-${i}`);
    const paybackEl = document.getElementById(`kpi-payback-${i}`);
    const net24El = document.getElementById(`kpi-net24-${i}`);
    const warnEl = document.getElementById(`warn-${i}`);
    const badgeEl = document.getElementById(`badge-${i}`);

    if (profitEl) profitEl.textContent = formatWon(r.profit);
    if (paybackEl) paybackEl.textContent = r.canPayback ? formatMonths(r.paybackMonths) : "회수 불가";
    if (net24El) net24El.textContent = Number.isFinite(r.net24) ? formatWon(r.net24) : "-";

    if (!r.canPayback) {
      warnEl.style.display = "block";
      warnEl.textContent = "월 순이익이 0 이하라 손익분기 계산이 불가합니다.";
    } else {
      warnEl.style.display = "none";
      warnEl.textContent = "";
    }

    if (badgeEl) badgeEl.style.display = i === recIdx && window.__ts_ok ? "inline-flex" : "none";
  });

  // 결론/CTA/광고 노출 제어
  if (!window.__ts_ok) {
    el.conclusionText.textContent = "보안 확인 후 입력하면 추천이 표시됩니다.";
    setCtaDisabled();
    setAffiliateHidden();
    return;
  }

  setCtaEnabled(recIdx);
  setAffiliateVisible();

  if (recIdx === -1) {
    el.conclusionText.textContent = "입력값을 조정하면 추천이 갱신됩니다.";
    return;
  }

  const best = rows[recIdx];
  const bestName = state.scenarios[recIdx].name;

  el.conclusionText.textContent =
    `현재 계산 기준 추천 시나리오: ${bestName} ` +
    `(24개월 누적 ${formatWon(best.net24)}, 손익분기 ${formatMonths(best.paybackMonths)}, 월 순이익 ${formatWon(best.profit)})`;
}

function mount() {
  el.cards.innerHTML = "";
  for (let i = 0; i < 3; i++) el.cards.appendChild(buildCard(i));
  render();
}

/* ==========================
   Share / URL state
========================== */

function encodeStateToQuery() {
  const q = new URLSearchParams();
  state.scenarios.forEach((s, i) => {
    q.set(`c${i}`, String(s.cost ?? 0));
    q.set(`p${i}`, String(s.profit ?? 0));
  });
  return q.toString();
}

function syncUrlState() {
  const qs = encodeStateToQuery();
  const url = new URL(window.location.href);
  url.search = qs;
  window.history.replaceState(null, "", url.toString());
}

function loadStateFromUrl() {
  const url = new URL(window.location.href);
  const sp = url.searchParams;
  let changed = false;

  state.scenarios.forEach((s, i) => {
    const c = sp.get(`c${i}`);
    const p = sp.get(`p${i}`);
    if (c !== null && c !== "" && Number.isFinite(Number(c))) {
      s.cost = Number(c);
      changed = true;
    }
    if (p !== null && p !== "" && Number.isFinite(Number(p))) {
      s.profit = Number(p);
      changed = true;
    }
  });

  return changed;
}

async function copyShareLink() {
  if (!tsGuard()) return;
  syncUrlState();
  await navigator.clipboard.writeText(window.location.href);
  alert("공유 링크를 복사했습니다.");
}

function resetAll() {
  if (!tsGuard()) return;
  state.scenarios = structuredClone(DEFAULTS);

  state.scenarios.forEach((s, i) => {
    const costInput = document.getElementById(`cost-${i}`);
    const profitInput = document.getElementById(`profit-${i}`);
    if (costInput) costInput.value = String(s.cost);
    if (profitInput) profitInput.value = String(s.profit);
  });

  render();
  syncUrlState();
}

/* ==========================
   CSV export
========================== */

function toCsv() {
  const rows = state.scenarios.map((s) => calcScenario(s.cost, s.profit));
  const recIdx = pickRecommendation(rows);

  const header = ["scenario", "initial_cost", "monthly_profit", "payback_months", "net_24_months", "recommended"];
  const lines = [header.join(",")];

  state.scenarios.forEach((s, i) => {
    const r = rows[i];
    const pay = r.canPayback ? (Math.round(r.paybackMonths * 10) / 10).toFixed(1) : "";
    const net = Number.isFinite(r.net24) ? Math.round(r.net24) : "";
    const rec = window.__ts_ok && i === recIdx ? "yes" : "no";

    lines.push([`"${s.name}"`, Math.round(r.cost), Math.round(r.profit), pay, net, rec].join(","));
  });

  return lines.join("\n");
}

function downloadCsv() {
  if (!tsGuard()) return;

  const csv = toCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `roi-calculator_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ==========================
   GitHub Issue (prefilled)
========================== */

function buildIssueBody() {
  const rows = state.scenarios.map((s) => calcScenario(s.cost, s.profit));
  const recIdx = pickRecommendation(rows);

  const bestLine =
    window.__ts_ok && recIdx !== -1
      ? `> 현재 계산 기준 추천 시나리오: ${state.scenarios[recIdx].name} (24개월 누적 ${formatWon(
          rows[recIdx].net24
        )}, 손익분기 ${formatMonths(rows[recIdx].paybackMonths)}, 월 순이익 ${formatWon(rows[recIdx].profit)})\n`
      : `> 보안 확인 후 입력하면 추천이 표시됩니다.\n`;

  const lines = [];
  lines.push(bestLine);
  lines.push("\n## 현재 입력값");
  state.scenarios.forEach((s) => {
    lines.push(`- ${s.name}: 초기비용 ${formatWon(Number(s.cost))}, 월순이익 ${formatWon(Number(s.profit))}`);
  });

  lines.push("\n## 현재 상태 요약");
  lines.push("- 무엇이 문제인가:");
  lines.push("- 기대 동작:");
  lines.push("- 실제 동작:");

  lines.push("\n## 개선 아이디어");
  lines.push("- ");

  lines.push("\n## 환경");
  lines.push(`- URL: ${window.location.href}`);
  lines.push("- 브라우저/OS:");

  return lines.join("\n");
}

function openPrefilledIssue() {
  if (!tsGuard()) return;

  const title = "[ROI] 개선/버그 제보";
  const body = buildIssueBody();

  const url = new URL(ISSUE_NEW_URL);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

/* ==========================
   Security mail (mailto -> Gmail fallback)
========================== */

function openSecurityMail() {
  const mailto =
    `mailto:${encodeURIComponent(SECURITY_EMAIL)}` +
    `?subject=${encodeURIComponent(SECURITY_SUBJECT)}` +
    `&body=${encodeURIComponent(SECURITY_BODY)}`;

  window.location.href = mailto;

  setTimeout(() => {
    const gmail =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(SECURITY_EMAIL)}` +
      `&su=${encodeURIComponent(SECURITY_SUBJECT)}` +
      `&body=${encodeURIComponent(SECURITY_BODY)}`;

    window.open(gmail, "_blank", "noopener,noreferrer");
  }, 350);
}

async function copySecurityMail() {
  await navigator.clipboard.writeText(SECURITY_EMAIL);
  alert("보안 제보 이메일을 복사했습니다.");
}

/* ==========================
   Bind
========================== */

document.addEventListener("DOMContentLoaded", () => {
  const loaded = loadStateFromUrl();

  mount();

  if (loaded) {
    state.scenarios.forEach((s, i) => {
      const costInput = document.getElementById(`cost-${i}`);
      const profitInput = document.getElementById(`profit-${i}`);
      if (costInput) costInput.value = String(s.cost);
      if (profitInput) profitInput.value = String(s.profit);
    });
    render();
  } else {
    syncUrlState();
  }

  el.shareBtn?.addEventListener("click", copyShareLink);
  el.resetBtn?.addEventListener("click", resetAll);
  el.csvBtn?.addEventListener("click", downloadCsv);
  el.issueBtn?.addEventListener("click", openPrefilledIssue);

  el.securityMailBtn?.addEventListener("click", (e) => { e.preventDefault(); openSecurityMail(); });
  el.copyMailBtn?.addEventListener("click", copySecurityMail);

  // 초기 상태(통과 전): CTA/광고 숨김
  if (!window.__ts_ok) {
    setCtaDisabled();
    setAffiliateHidden();
  }
});
