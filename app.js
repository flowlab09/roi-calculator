// ROI Calculator (lite) + Turnstile guard
// Files: index.html / app.css / app.js
// No framework, works on Cloudflare Pages static.

const KEY = "roi_public_v1";
const DEFAULTS = [
  { name: "A안", cost: 500000, gain: 150000 },
  { name: "B안", cost: 900000, gain: 220000 },
  { name: "C안", cost: 1500000, gain: 320000 },
];

function requireTurnstile() {
  // index.html에서 window.__ts_ok가 true가 되면 통과
  if (window.__ts_ok) return true;
  alert("보안 확인(턴스타일)을 먼저 완료해 주세요.");
  return false;
}

function n(v) {
  const x = Number(String(v ?? "").replaceAll(",", "").trim());
  return Number.isFinite(x) ? x : 0;
}

function fmtWon(v) {
  return Math.round(v).toLocaleString("ko-KR") + "원";
}

function clampInt(v, min, max) {
  const x = Math.round(n(v));
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

function calc(item) {
  const cost = Math.max(0, n(item.cost));
  const gain = n(item.gain); // 월 순이익(원) - 음수 가능
  const net = gain;

  const months = net > 0 ? cost / net : Infinity;
  const net24 = net * 24 - cost;

  return { cost, net, months, net24 };
}

function safeName(s) {
  const t = String(s ?? "").trim();
  return t.length ? t.slice(0, 24) : "시나리오";
}

function encodeShare(data) {
  // 짧고 단순한 쿼리 공유: v=1 & a=cost,gain,name ...
  const parts = data.map((it) => {
    const name = encodeURIComponent(safeName(it.name));
    const cost = clampInt(it.cost, 0, 10_000_000_000);
    const gain = clampInt(it.gain, -10_000_000_000, 10_000_000_000);
    return `${cost},${gain},${name}`;
  });
  return `v=1&d=${parts.join("|")}`;
}

function decodeShare() {
  const url = new URL(location.href);
  const v = url.searchParams.get("v");
  const d = url.searchParams.get("d");
  if (v !== "1" || !d) return null;

  const items = d.split("|").slice(0, 3).map((seg, idx) => {
    const [cost, gain, name] = seg.split(",");
    return {
      name: name ? decodeURIComponent(name) : DEFAULTS[idx]?.name ?? `안${idx + 1}`,
      cost: n(cost),
      gain: n(gain),
    };
  });

  // 3개 미만이면 defaults로 보정
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
  } catch {
    return null;
  }
}

function saveLocal(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

let data = decodeShare() || loadLocal() || structuredClone(DEFAULTS);

const cardsEl = document.getElementById("cards");
const conclusionEl = document.getElementById("conclusion");
const shareBtn = document.getElementById("shareBtn");
const resetBtn = document.getElementById("resetBtn");

function render() {
  if (!cardsEl) return;

  cardsEl.innerHTML = "";

  const computed = data.map((it) => ({ it, m: calc(it) }));

  // 추천 로직:
  // 1) 24개월 누적(net24)이 가장 큰 안
  // 2) 동률이면 손익분기 빠른 안(개월수 작은 안)
  // 3) 또 동률이면 월 순이익(net) 큰 안
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

  computed.forEach(({ it, m }, i) => {
    const isBest = i === best.idx;

    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <div class="nameRow" style="width:100%">
          <input class="name" type="text" value="${escapeHtml(safeName(it.name))}" data-i="${i}" data-k="name" />
          ${isBest ? `<span class="tag">추천</span>` : `<span class="tag" style="opacity:.25"> </span>`}
        </div>
      </div>

      <label>
        초기 비용(원)
        <input type="number" inputmode="numeric" value="${Math.round(n(it.cost))}" data-i="${i}" data-k="cost" />
      </label>

      <label>
        월 순이익(원)
        <input type="number" inputmode="numeric" value="${Math.round(n(it.gain))}" data-i="${i}" data-k="gain" />
      </label>

      <div class="sep"></div>

      <div class="metrics">
        <div class="row"><span>월 순이익</span><b>${fmtWon(m.net)}</b></div>
        <div class="row"><span>손익분기</span><b>${formatMonths(m.months)}</b></div>
        <div class="row"><span>24개월 누적</span><b>${fmtWon(m.net24)}</b></div>
      </div>

      ${m.net <= 0 ? `<div class="warn">월 순이익이 0 이하라 손익분기 계산이 불가합니다. (월 순이익 ↑ 필요)</div>` : ``}
    `;

    cardsEl.appendChild(card);
  });

  const bestName = safeName(data[best.idx]?.name ?? "추천안");
  const bestNet24 = fmtWon(calc(data[best.idx]).net24);
  const bestMonths = formatMonths(calc(data[best.idx]).months);

  if (conclusionEl) {
    conclusionEl.innerHTML =
      `현재 입력 기준 추천은 <b>${escapeHtml(bestName)}</b> 입니다. ` +
      `(24개월 누적: <b>${escapeHtml(bestNet24)}</b>, 손익분기: <b>${escapeHtml(bestMonths)}</b>)`;
  }

  saveLocal(data);
}

function attachHandlers() {
  // 입력 변경 → 즉시 반영
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    const i = Number(t.dataset.i);
    const k = t.dataset.k;
    if (!Number.isFinite(i) || i < 0 || i > 2) return;

    if (k === "name") {
      data[i].name = safeName(t.value);
      render();
      return;
    }

    // cost/gain 입력은 Turnstile 통과 전에도 변경은 되게 둠(UX),
    // 하지만 공유/리셋은 가드로 막음.
    if (k === "cost") data[i].cost = n(t.value);
    if (k === "gain") data[i].gain = n(t.value);

    render();
  });

  // 공유 링크
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      if (!requireTurnstile()) return;

      const qs = encodeShare(data);
      const url = new URL(location.href);
      url.search = qs;

      try {
        await navigator.clipboard.writeText(url.toString());
        flashButton(shareBtn, "복사됨!");
      } catch {
        // clipboard가 막히면 prompt
        window.prompt("아래 링크를 복사하세요:", url.toString());
      }
    });
  }

  // 리셋
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!requireTurnstile()) return;

      data = structuredClone(DEFAULTS);
      const url = new URL(location.href);
      url.search = "";
      history.replaceState(null, "", url.toString());
      saveLocal(data);
      render();
      flashButton(resetBtn, "리셋됨");
    });
  }
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// init
render();
attachHandlers();
