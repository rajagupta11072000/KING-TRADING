import { BreezeConnect } from "breezeconnect";

// ✅ Updated credentials
const API_KEY = "514768_09W5a542p971c5865S359n76&";
const SECRET_KEY = "9+6F15M3p835T6c27V85n3Z91534Y190";
let SESSION_TOKEN = "52308481";

// ✅ Breeze init
const breeze = new BreezeConnect({ appKey: API_KEY });

async function init() {
  try {
    await breeze.generateSession(SECRET_KEY, SESSION_TOKEN);
    console.log("✅ Session initialized");
    scheduleMarketCheck();
    scheduleScan();
  } catch (e) {
    console.error("❌ Session failed", e);
    showPopup("⚠️ Breeze session error");
  }
}

function scheduleMarketCheck() {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() === 15) alertAndLog("Market has opened");
  if (now.getHours() === 15 && now.getMinutes() === 30) alertAndLog("Market has closed");

  const msNext = (60 - now.getSeconds()) * 1000;
  setTimeout(scheduleMarketCheck, msNext);
}

function scheduleScan() {
  runScan();
  const now = new Date();
  const min = now.getMinutes();
  const next = Math.ceil(min / 15) * 15;
  const target = new Date(now);
  target.setMinutes(next, 5, 0);
  setTimeout(scheduleScan, target - now);
}

async function runScan() {
  try {
    const data = await breeze.get_option_chain_quotes({
      stock_code: "NIFTY",
      exchange_code: "NFO",
      product_type: "options"
    });
    analyzeOptions(data);
  } catch (err) {
    alertAndLog("⚠️ API Error: " + err.message);
  }
}

function analyzeOptions(chain) {
  chain.forEach(o => {
    o.iv = o.impliedVolatility;
    o.oiChg = o.changeInOI;
    o.score = o.iv * 0.6 + o.oiChg * 0.4;
  });

  const calls = chain.filter(o => o.right === "call");
  const puts = chain.filter(o => o.right === "put");

  const bestCall = maxBy(calls, "score");
  const bestPut = maxBy(puts, "score");
  const best = bestPut.score > bestCall.score ? { ...bestPut, type: "PUT" } : { ...bestCall, type: "CALL" };

  alertAndLog(`🔥 ${best.type} ${best.strike_price} | IV: ${best.iv.toFixed(2)} | ΔOI: ${best.oiChg}`);
}

function maxBy(arr, key) {
  return arr.reduce((max, o) => (!max || o[key] > max[key]) ? o : max, null);
}

function showPopup(text) {
  const el = document.getElementById("popup");
  el.innerText = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 10000);
}

function alertAndLog(msg) {
  showPopup(msg);
  const li = document.createElement("li");
  li.innerText = `${new Date().toLocaleTimeString()}: ${msg}`;
  document.getElementById("alert-log").prepend(li);
}

init();
