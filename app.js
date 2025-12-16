const KEY = "roi_lite_v1";

const defaults = [
  { name: "A안", cost: 500000, gain: 150000 },
  { name: "B안", cost: 900000, gain: 220000 },
  { name: "C안", cost: 1500000, gain: 320000 },
];

let data = loadInitial();

const cards = document.getElementById("cards");
const noteEl = document.getElementById("note");
const conclusionEl = document.getElementById("conclusion");

document.getElementById("shareBtn").addEventListener("click", copyShareLink);
document.getElementById("resetBtn").addEventListener("click", resetAll);

function n(v) {
  const x = Number(String(v ?? "").replaceAll(",", "").trim());
  return Number.isFinite(x) ? x : 0;
}
function fmt(v) { return Math.round(v).toLocaleString("ko-KR"); }

function calc(item) {
  const cost = n(item.cost);
  const gain = n(item.gain);
  const net = gain;
  const months = (cost > 0 && net > 0) ? cost / net : Infinity;
  const net24 = net * 24 - cost;

  const score =
    (isFinite(months) ? Math.max(0, 36 - months) * 2 : 0) +
    Math.max(0, net) / 10000 +
    Math.max(0, net24) / 50000;

  return { ...item, cost, gain, net, months, net24, score };
}

function render() {
  cards.innerHTML = "";

  const computed = data.map(calc);
  const best = [...computed].sort((a, b) => b.score - a.score)[0];

  computed.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="head">
        <input class="name" value="${escapeHtml(item.name)}" data-i="${i}" data-k="name" />
        ${item === best ? `<span class="badge">추천</span>` : ``}
      </div>

      <label>초기 비용(원)
        <input type="number" value="${item.cost}" data-i="${i}" data-k="cost" />
      </label>

      <label>월 순이익(원)
        <input type="number" value="${item.gain}" data-i="${i}" data-k="gain" />
      </label>

      <div class="metrics">
        <div class="row"><span>월 순이익</span><b>${fmt(item.net)}원</b></div>
        <div class="row"><span>손익분기</span><b>${isFinite(item.months) ? item.months.toFixed(1) + "개월" : "불가"}</b></div>
        <div class="row"><span>24개월 누적</span><b>${fmt(item.net24)}원</b></div>
      </div>

      ${item.net <= 0 ? `<div class="warn">월 순이익이 0 이하라 회수 불가</div>` : ``}
    `;
    cards.appendChild(el);
  });

  attachHandlers();

  conclusionEl.innerHTML = `현재 입력 기준 추천은 <b>${escapeHtml(best.name)}</b> 입니다.`;

  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

function attachHandlers() {
  document.querySelectorAll("input[data-i][data-k]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const i = Number(e.target.dataset.i);
      const k = e.target.dataset.k;
      const v = e.target.value;

      if (!Number.isFinite(i) || !data[i]) return;

      if (k === "name") data[i].name = v;
      if (k === "cost") data[i].cost = n(v);
      if (k === "gain") data[i].gain = n(v);

      render();
    }, { once: true });
  });
}

function loadInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return defaults.map(x => ({ ...x }));
}

function copyShareLink() {
  // 가장 단순: 현재 URL 복사 (파일 서버에서도 동작)
  navigator.clipboard.writeText(location.href)
    .then(() => setNote("링크 복사됨"))
    .catch(() => setNote("복사 실패(권한 확인)"));
}

function resetAll() {
  data = defaults.map(x => ({ ...x }));
  try { localStorage.removeItem(KEY); } catch {}
  setNote("초기화됨");
  render();
}

function setNote(msg) {
  noteEl.textContent = msg;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

render();
