/* =========================================================
   ROI SCENARIO MASTER - Core Logic Engine
========================================================= */

// 1. 다국어 및 산업 통계 데이터베이스
const benchmarkData = {
    ko: {
        countryName: { ko: "대한민국", en: "KOREA" },
        source: { ko: "출처: 통계청(KOSIS), 중소벤처기업부 (2023-2024)", en: "Source: Statistics Korea (KOSIS), MSS (2023-2024)" },
        strategyNote: { ko: "한국 시장은 5년 생존율이 평균 20%대로 낮습니다. 장기적인 현금 흐름 관리가 최우선입니다.", en: "KR market survival is around 20% in 5yrs. Prioritize long-term cash flow management." },
        industries: [
            { id: "cafe", bep: 22, margin: "18.5%", s1: "62.4%", s5: "21.0%", cost: "1.2억", costEn: "120M" },
            { id: "saas", bep: 34, margin: "42.0%", s1: "48.2%", s5: "15.5%", cost: "3.5억", costEn: "350M" },
            { id: "ecommerce", bep: 9, margin: "12.3%", s1: "55.1%", s5: "18.2%", cost: "0.4억", costEn: "40M" },
            { id: "food", bep: 18, margin: "24.1%", s1: "71.0%", s5: "20.5%", cost: "1.8억", costEn: "180M" },
            { id: "edu", bep: 14, margin: "31.5%", s1: "78.2%", s5: "38.4%", cost: "0.9억", costEn: "90M" }
        ]
    },
    us: {
        countryName: { ko: "미국", en: "USA" },
        source: { ko: "출처: 미국 중소기업청(SBA), 노동통계국(BLS) (2023-2024)", en: "Source: U.S. SBA, Bureau of Labor Statistics (2023-2024)" },
        strategyNote: { ko: "미국 시장은 서비스 부문의 5년 생존율이 높습니다. 효율적인 규모 확장이 성공의 핵심입니다.", en: "US markets show higher survival in Service sectors. Efficient scaling is key to success." },
        industries: [
            { id: "cafe", bep: 18, margin: "15.2%", s1: "78.5%", s5: "45.0%", cost: "1.8억", costEn: "$150k" },
            { id: "saas", bep: 42, margin: "65.0%", s1: "75.0%", s5: "25.0%", cost: "10억", costEn: "$850k" },
            { id: "ecommerce", bep: 12, margin: "14.5%", s1: "65.0%", s5: "20.0%", cost: "0.4억", costEn: "$35k" },
            { id: "food", bep: 24, margin: "18.0%", s1: "80.0%", s5: "30.0%", cost: "3.1억", costEn: "$250k" },
            { id: "edu", bep: 16, margin: "28.5%", s1: "85.0%", s5: "55.0%", cost: "1.5억", costEn: "$120k" }
        ]
    }
};

const i18n = {
    ko: {
        title: "ROI 시나리오 마스터", subtitle: "국가별 실데이터 기반 정밀 비즈니스 도구", inputTitle: "변수 설정",
        labelInitial: "초기 투자금 (CapEx)", labelRevenue: "목표 월 매출", resultRoi: "연 예상 ROI", resultProfit: "월 순수익",
        chartTitle: "현금 흐름 정밀 분석", benchmarkTitle: "국가별 산업 표준 통계", colIndustry: "산업군", colBep: "평균 BEP",
        colMargin: "이익률", colSurvival: "생존율 (1년/5년)", colCost: "평균 투자금", currency: "원", unit: "만",
        targetMsg: "목표 수익을 드래그하여 조정하세요", goalLabel: "목표", monthSuffix: "개월", strategyTitle: "전략 노트",
        tabScenario: "시나리오", industries: { cafe: "커피 전문점", saas: "IT/SaaS", ecommerce: "이커머스", food: "일반 음식점", edu: "교육 서비스" }
    },
    en: {
        title: "ROI Scenario Master", subtitle: "Global Business Simulation Tool", inputTitle: "Variables",
        labelInitial: "Initial CapEx", labelRevenue: "Target Revenue", resultRoi: "Annual ROI", resultProfit: "Monthly Net",
        chartTitle: "Cash Flow Precision", benchmarkTitle: "Industry Standards by Country", colIndustry: "Industry", colBep: "Avg BEP",
        colMargin: "Margin", colSurvival: "Survival (1y/5y)", colCost: "Avg Cost", currency: "$", unit: "k",
        targetMsg: "Drag the line to adjust profit target", goalLabel: "GOAL", monthSuffix: "mo", strategyTitle: "Strategy Note",
        tabScenario: "Scenario", industries: { cafe: "Coffee/Cafe", saas: "Tech SaaS", ecommerce: "E-commerce", food: "Restaurant", edu: "Education" }
    }
};

// 2. 앱 상태 관리
let state = {
    lang: 'ko', country: 'ko', activeTab: 0, simMonths: 36, targetProfit: 50000000,
    scenarios: [{ id: 1, initialCost: 100000000, monthlyRevenue: 25000000, monthlyFixedCost: 8000000, variableCostRate: 35 }]
};

// 3. 보안 로직 (Turnstile 콜백)
window.onTurnstileSuccess = function() {
    const statusEl = document.getElementById('tsStatus');
    if (statusEl) {
        statusEl.textContent = 'Verification Complete';
        statusEl.classList.replace('text-slate-500', 'text-emerald-500');
    }
    setTimeout(() => {
        const overlay = document.getElementById('securityOverlay');
        if (overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.remove('locked');
    }, 500);
};

// 4. 비즈니스 로직
function setLang(l) { state.lang = l; updateUI(); }
function setCountry(c) {
    state.country = c;
    state.targetProfit = (c === 'ko' ? 50000000 : 100000);
    state.scenarios.forEach((s, idx) => {
        s.initialCost = (c === 'ko' ? 100000000 : 150000);
        s.monthlyRevenue = (c === 'ko' ? 25000000 : 35000);
        s.monthlyFixedCost = (c === 'ko' ? 8000000 : 12000);
    });
    updateUI();
}

function calculateMetrics(s) {
    const monthlyProfit = s.monthlyRevenue - s.monthlyFixedCost - (s.monthlyRevenue * (s.variableCostRate / 100));
    const annualRoi = s.initialCost > 0 ? ((monthlyProfit * 12) / s.initialCost) * 100 : 0;
    const timeline = Array.from({ length: state.simMonths + 1 }, (_, i) => (monthlyProfit * i) - s.initialCost);
    return { monthlyProfit, annualRoi, timeline };
}

// 5. UI 렌더링 엔진
function updateUI() {
    const t = i18n[state.lang];
    const b = benchmarkData[state.country];
    const activeScenario = state.scenarios[state.activeTab];
    const metrics = calculateMetrics(activeScenario);

    // 텍스트 매핑
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-subtitle').innerText = t.subtitle;
    document.getElementById('ui-input-title').innerText = t.inputTitle;
    document.getElementById('ui-label-initial').innerText = t.labelInitial;
    document.getElementById('ui-label-revenue').innerText = t.labelRevenue;
    document.getElementById('ui-result-roi').innerText = t.resultRoi;
    document.getElementById('ui-result-profit').innerText = t.resultProfit;
    document.getElementById('ui-strategy-title').innerText = t.strategyTitle;
    document.getElementById('ui-chart-title').innerText = t.chartTitle;
    document.getElementById('display-benchmark-title').innerText = `${t.benchmarkTitle} (${b.countryName[state.lang]})`;
    document.getElementById('display-source').innerText = b.source[state.lang];
    document.getElementById('display-strategy').innerText = b.strategyNote[state.lang];

    // 버튼 액티브 상태
    ['ko','us'].forEach(c => document.getElementById(`btn-country-${c}`).className = `px-6 py-3 rounded-xl text-xs font-black transition-all ${state.country === c ? 'bg-white/20 text-white shadow-xl border border-white/20' : 'text-slate-500'}`);
    ['ko','en'].forEach(l => document.getElementById(`btn-lang-${l}`).className = `px-6 py-3 rounded-xl text-xs font-black transition-all ${state.lang === l ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500'}`);

    // 시나리오 탭
    const tabContainer = document.getElementById('scenario-tabs');
    tabContainer.innerHTML = '';
    state.scenarios.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = `px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${state.activeTab === i ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-white/5 text-slate-500'}`;
        btn.innerText = `${t.tabScenario.toUpperCase()} ${i+1}`;
        btn.onclick = () => { state.activeTab = i; updateUI(); };
        tabContainer.appendChild(btn);
    });

    // 지표 출력
    const denom = (state.country === 'ko' ? 10000 : 1000);
    document.getElementById('display-initial').innerText = (activeScenario.initialCost / denom).toLocaleString() + t.unit;
    document.getElementById('display-revenue').innerText = (activeScenario.monthlyRevenue / denom).toLocaleString() + t.unit;
    document.getElementById('display-roi').innerText = metrics.annualRoi.toFixed(1) + "%";
    document.getElementById('display-profit').innerText = (metrics.monthlyProfit / denom).toLocaleString() + t.unit;

    // 기간 선택기
    const mCont = document.getElementById('month-selectors');
    mCont.innerHTML = '';
    [12, 24, 36, 48].forEach(m => {
        const btn = document.createElement('button');
        btn.className = `px-5 py-3 rounded-xl text-[10px] font-black transition ${state.simMonths === m ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`;
        btn.innerText = `${m}M`;
        btn.onclick = () => { state.simMonths = m; updateUI(); };
        mCont.appendChild(btn);
    });

    // 통계 테이블
    const tbody = document.getElementById('benchmark-body');
    tbody.innerHTML = '';
    b.industries.forEach(ind => {
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-white/5 transition-colors";
        tr.innerHTML = `<td class="py-6 font-bold text-white group-hover:text-blue-400">${t.industries[ind.id]}</td><td class="py-6 text-center text-[10px] font-black">${ind.bep}${t.monthSuffix}</td><td class="py-6 text-blue-400 font-black text-center">${ind.margin}</td><td class="py-6 text-center"><div class="flex items-center justify-center gap-2"><span class="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg">${ind.s1}</span><span class="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-lg">${ind.s5}</span></div></td><td class="py-6 text-right font-black text-slate-300">${state.lang === 'ko' ? ind.cost : ind.costEn}</td>`;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
    renderChart();
    syncUrlState();
}

// 6. SVG 차트 인터랙션 엔진
function renderChart() {
    const svg = document.getElementById('main-svg');
    if (!svg) return;
    svg.innerHTML = '';
    const width = 1000, height = 350, padding = 50;
    const t = i18n[state.lang];
    const allScenarios = state.scenarios.map(s => calculateMetrics(s));
    const maxVal = Math.max(...allScenarios.flatMap(m => m.timeline), state.targetProfit, 100000);
    const minVal = Math.min(...allScenarios.flatMap(m => m.timeline), -100000);
    const range = maxVal - minVal;

    const getX = (m) => (m / state.simMonths) * (width - padding * 2) + padding;
    const getY = (v) => height - ((v - minVal) / range) * (height - padding * 2) - padding;

    // 제로 라인
    const zeroLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    zeroLine.setAttribute("x1", padding); zeroLine.setAttribute("y1", getY(0)); zeroLine.setAttribute("x2", width - padding); zeroLine.setAttribute("y2", getY(0));
    zeroLine.setAttribute("stroke", "rgba(255,255,255,0.1)"); zeroLine.setAttribute("stroke-width", "2"); zeroLine.setAttribute("stroke-dasharray", "10 5");
    svg.appendChild(zeroLine);

    // 목표 수익 라인
    const tLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tLine.setAttribute("x1", padding); tLine.setAttribute("y1", getY(state.targetProfit)); tLine.setAttribute("x2", width - padding); tLine.setAttribute("y2", getY(state.targetProfit));
    tLine.setAttribute("stroke", "#f43f5e"); tLine.setAttribute("stroke-width", "3"); tLine.setAttribute("stroke-dasharray", "5 3");
    svg.appendChild(tLine);

    const tText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tText.setAttribute("x", width - padding - 60); tText.setAttribute("y", getY(state.targetProfit) + 6);
    tText.setAttribute("fill", "#f43f5e"); tText.setAttribute("font-size", "12"); tText.setAttribute("text-anchor", "middle"); tText.setAttribute("font-weight", "900");
    tText.textContent = `${t.goalLabel}: ${(state.targetProfit / (state.country === 'ko' ? 10000 : 1000)).toLocaleString()}${t.unit}`;
    svg.appendChild(tText);

    // 곡선 렌더링
    const colors = ["#3b82f6", "#10b981", "#f59e0b"];
    allScenarios.forEach((m, idx) => {
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        poly.setAttribute("fill", "none"); poly.setAttribute("stroke", colors[idx]); poly.setAttribute("stroke-width", "6");
        poly.setAttribute("points", m.timeline.map((v, i) => `${getX(i)},${getY(v)}`).join(' '));
        poly.setAttribute("stroke-linejoin", "round"); poly.setAttribute("stroke-linecap", "round");
        svg.appendChild(poly);
    });

    // 드래그 및 호버 처리
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    overlay.setAttribute("width", width); overlay.setAttribute("height", height); overlay.setAttribute("fill", "transparent");
    svg.appendChild(overlay);

    overlay.onmousemove = (e) => {
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * width;
        const y = (e.clientY - rect.top) / rect.height * height;
        if (e.buttons === 1) {
            state.targetProfit = Math.round((maxVal - ((y - padding) / (height - padding * 2)) * range) / 5000) * 5000;
            renderChart();
        }
        const m = Math.round(((x - padding) / (width - padding * 2)) * state.simMonths);
        if (m >= 0 && m <= state.simMonths) showTooltip(m, getX(m));
    };
    overlay.onmouseleave = hideTooltip;
}

function showTooltip(month, svgX) {
    const tooltip = document.getElementById('chart-tooltip');
    const t = i18n[state.lang];
    tooltip.classList.remove('hidden');
    tooltip.style.left = `${(svgX / 1000) * 100}%`;
    tooltip.style.transform = 'translateX(-50%)';
    let content = `<p class="text-[11px] font-black mb-4 opacity-40 uppercase tracking-[0.2em] text-white">${month}${t.monthSuffix}</p>`;
    state.scenarios.forEach((s, idx) => {
        const metrics = calculateMetrics(s);
        content += `<div class="flex justify-between items-center gap-8 mb-2.5 text-white"><span class="text-[10px] font-black opacity-70 uppercase">${t.tabScenario} ${idx+1}</span><span class="text-base font-black ${["text-blue-500", "text-emerald-500", "text-amber-500"][idx]} tracking-tighter text-nowrap">${(metrics.timeline[month] / (state.country === 'ko' ? 10000 : 1000)).toLocaleString()}${t.unit}</span></div>`;
    });
    tooltip.innerHTML = content;
}

function hideTooltip() { document.getElementById('chart-tooltip').classList.add('hidden'); }

// 7. 보안 관리 (URL State)
function syncUrlState() {
    try {
        if (window.location.protocol === 'blob:' || window.location.protocol === 'about:') return;
        const q = new URLSearchParams();
        state.scenarios.forEach((s, i) => { q.set(`c${i}`, s.initialCost); q.set(`r${i}`, s.monthlyRevenue); });
        window.history.replaceState(null, '', window.location.pathname + '?' + q.toString());
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    updateUI();
    document.getElementById('input-initial').oninput = (e) => { state.scenarios[state.activeTab].initialCost = Number(e.target.value); updateUI(); };
    document.getElementById('input-revenue').oninput = (e) => { state.scenarios[state.activeTab].monthlyRevenue = Number(e.target.value); updateUI(); };
    document.getElementById('resetBtn').onclick = () => { if(confirm('Reset?')) location.reload(); };
});