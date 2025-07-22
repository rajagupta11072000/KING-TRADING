import { BreezeConnect } from "breezeconnect";

const API_KEY = "L5BO67301s6611964252V97+8_&98Kp3";
const SECRET_KEY = "x01A3twC7Z^0m57963PJ91341236933!";
let SESSION_TOKEN = ""; // ➤ बाद में यहाँ डालें

const breeze = new BreezeConnect({ appKey: API_KEY });

async function init() {
  if (!SESSION_TOKEN) {
    showPopup("⚠️ Session Token missing. Add it and refresh.");
    return;
  }
  await breeze.generateSession(SECRET_KEY, SESSION_TOKEN);
  scheduleMarketCheck();
  scheduleScan();
}

function scheduleMarketCheck() {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() === 15) alertAndLog("Market has opened");
  if (now.getHours() === 15 && now.getMinutes() === 30) alertAndLog("Market has closed");

  const msNext = getMSUntilNextMinute();
  setTimeout(scheduleMarketCheck, msNext);
}

function scheduleScan() {
  runScan();
  const msNext15 = getMSUntilNext15min();
  setTimeout(scheduleScan, msNext15);
}

function getMSUntilNextMinute() {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000;
}

function getMSUntilNext15min() {
  const now = new Date();
  const min = now.getMinutes();
  const next = Math.ceil(min / 15) * 15;
  const target = new Date(now);
  target.setMinutes(next);
  target.setSeconds(5);
  return target - now;
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
    console.error(err);
    alertAndLog("⚠️ Scan failed: " + err.message);
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
  const best = (bestPut.score > bestCall.score) ? { ...bestPut, type: "PUT" } : { ...bestCall, type: "CALL" };

  const msg = `Best Option 🔥: ${best.type} @ ${best.strike_price} | IV: ${best.iv.toFixed(2)} | ΔOI: ${best.oiChg.toFixed(0)}`;
  alertAndLog(msg);
}

function maxBy(arr, key) {
  return arr.reduce((acc, cur) => (!acc || cur[key] > acc[key]) ? cur : acc, null);
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
