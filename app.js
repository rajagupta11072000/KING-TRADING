// Breeze API + Indicators + AI + CSV + Heatmap
import { BreezeConnect } from 'https://cdn.jsdelivr.net/npm/breezeconnect@latest/dist/browser.js';

// utils: indicators + CSV export
const tech = window.technicalindicators;
function calcEMA(values, period) {
  return tech.EMA.calculate({period, values}).pop() || 0;
}
function calcMACD(values) {
  const mac = tech.MACD.calculate({fastPeriod:12, slowPeriod:26, signalPeriod:9, values});
  return mac.pop()?.MACD || 0;
}
function exportCSV(data) {
  const rows = [['Time','Type','Strike','IV','ΔOI','Vol','ΔDelta','Trend','Score']];
  data.forEach(d => rows.push([d.time, d.type, d.strike, d.iv, d.oiChg, d.vol, d.deltaAbs, d.trend.toFixed(2), d.score.toFixed(2)]));
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `alerts_${Date.now()}.csv`;
  a.click();
}
async function aiScoreFake(features) {
  return features.reduce((a,b)=>a+b, 0) / features.length; // placeholder
}

// Heatmap chart instance
let chart = null;
function drawHeatmap(data) {
  const ctx = document.getElementById('heatmap').getContext('2d');
  const strikes = [...new Set(data.map(o=>o.strike))].sort((a,b)=>a-b);
  const scores = strikes.map(s=> {
    const arr = data.filter(o=>o.strike===s);
    return arr.reduce((sum,o)=>sum+o.score, 0) / arr.length;
  });
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels:strikes, datasets:[{label:'Strike Score', data:scores, backgroundColor:'#2962ff'}] },
    options: { scales: { x:{title:{display:true,text:'Strike Price'}}, y:{title:{display:true,text:'Score'}}}}
  });
}

// Main logic
const API_KEY = "514768_09W5a542p971c5865S359n76&";
const SECRET_KEY = "9+6F15M3p835T6c27V85n3Z91534Y190";
let SESSION_TOKEN = "52302053"; // paste your session token here

const breeze = new BreezeConnect({ appKey: API_KEY });
let history = [];

async function init(){
  if(!SESSION_TOKEN) return showPopup("⚠️ Add session token in app.js");
  await breeze.generateSession(SECRET_KEY, SESSION_TOKEN);
  scheduleMarket(); scheduleScan();
  document.getElementById('export-csv').onclick = ()=>exportCSV(history);
}

function scheduleMarket(){
  const now = new Date();
  if(now.getHours()==9 && now.getMinutes()==15) record("🟢 Market Opened");
  if(now.getHours()==15 && now.getMinutes()==30) record("🔴 Market Closed");
  setTimeout(scheduleMarket, (60-now.getSeconds())*1000);
}
function scheduleScan(){
  scan();
  const now = new Date();
  const next = Math.ceil(now.getMinutes()/15)*15;
  const t = new Date(now); t.setMinutes(next,5,0);
  setTimeout(scheduleScan, t-now);
}

async function scan(){
  try {
    const chain = await breeze.get_option_chain_quotes({stock_code:"NIFTY", exchange_code:"NFO", product_type:"options"});
    analyze(chain);
  } catch(e){
    record("⚠️ API Error");
  }
}

async function analyze(chain){
  const processed = await Promise.all(chain.map(async o=>{
    const iv = o.impliedVolatility||0;
    const oiChg = o.changeInOI||0;
    const vol = o.totalTradedVolume||0;
    const deltaAbs = Math.abs(o.delta||0);
    const trend = calcMACD(chain.map(x=>x.lastTradedPrice));
    const ai = await aiScoreFake([iv,oiChg,vol,deltaAbs,trend]);
    const score = iv*0.3 + oiChg*0.3 + vol*0.2 + deltaAbs*0.1 + trend*0.1 + ai*0.1;
    return {time:new Date().toLocaleTimeString(), type:o.right, strike:o.strikePrice, iv, oiChg, vol, deltaAbs, trend, score};
  }));

  const best = processed.sort((a,b)=>b.score-a.score)[0];
  record(`🔥 ${best.type} ${best.strike} — Score:${best.score.toFixed(2)}`);
  drawHeatmap(processed);
}

function record(msg){
  history.push({time:new Date().toLocaleTimeString(), msg});
  showPopup(msg);
}
function showPopup(msg){
  const el = document.getElementById('popup');
  el.innerText = msg;
  el.classList.remove('hidden');
  el.classList.add('show');
  setTimeout(()=>{el.classList.remove('show'); el.classList.add('hidden');},10000);
}

init();
