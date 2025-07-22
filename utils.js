import { EMA, SMA, MACD } from 'technicalindicators';

export function calcEMA(values, period) {
  return EMA.calculate({ period, values });
}
export function calcSMA(values, period) {
  return SMA.calculate({ period, values });
}
export function calcMACD(values) {
  return MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, values });
}

export function exportCSV(data) {
  const csv = [
    ['Time', 'Type', 'Strike', 'IV', 'ΔOI', 'ΔVol', 'ΔDelta', 'Score']
  ];
  data.forEach(d => {
    csv.push([
      d.time, d.type, d.strike_price, d.iv, d.oiChg, d.vol, d.deltaAbs, d.score
    ]);
  });
  const blob = new Blob([csv.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `alerts_${Date.now()}.csv`;
  a.click();
}
