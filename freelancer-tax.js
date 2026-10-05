const amountInput = document.getElementById('amountInput');
const inputLabel = document.getElementById('inputLabel');
const calcNote = document.getElementById('calcNote');
const modeRadios = document.querySelectorAll('input[name="mode"]');

const outGross = document.getElementById('outGross');
const outIncomeTax = document.getElementById('outIncomeTax');
const outLocalTax = document.getElementById('outLocalTax');
const outTotalTax = document.getElementById('outTotalTax');
const outNet = document.getElementById('outNet');

const won = (n) => n.toLocaleString('ko-KR') + '원';

function calcFromGross(gross) {
  const incomeTax = Math.floor((gross * 3) / 100);
  const localTax = Math.floor(incomeTax / 10);
  return { gross, incomeTax, localTax, totalTax: incomeTax + localTax, net: gross - incomeTax - localTax };
}

const trailingZeros = (n) => {
  let count = 0;
  while (n > 0 && n % 10 === 0) { n /= 10; count++; }
  return count;
};

function grossFromNet(net) {
  let gross = Math.ceil(net / 0.967);
  while (calcFromGross(gross).net < net) gross++;
  while (gross > 0 && calcFromGross(gross - 1).net >= net) gross--;

  // Several gross amounts can yield the same net; prefer the roundest one (e.g. 1,000,000 over 999,998).
  let best = gross;
  for (let g = gross + 1; g < gross + 60; g++) {
    if (calcFromGross(g).net === net && trailingZeros(g) > trailingZeros(best)) best = g;
  }
  return best;
}

const minus = (n) => (n > 0 ? '-' : '') + won(n);

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function formatInput() {
  const digits = amountInput.value.replace(/[^0-9]/g, '').slice(0, 12);
  amountInput.value = digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
  return digits === '' ? null : Number(digits);
}

function clearResult() {
  [outGross, outIncomeTax, outLocalTax, outTotalTax, outNet].forEach((el) => { el.textContent = '-'; });
  calcNote.textContent = '';
}

function render() {
  const value = formatInput();
  inputLabel.textContent = currentMode() === 'forward' ? '세전 금액 (원)' : '받고 싶은 실수령액 (원)';
  if (value === null) {
    clearResult();
    return;
  }

  const gross = currentMode() === 'forward' ? value : grossFromNet(value);
  const r = calcFromGross(gross);

  outGross.textContent = won(r.gross);
  outIncomeTax.textContent = minus(r.incomeTax);
  outLocalTax.textContent = minus(r.localTax);
  outTotalTax.textContent = minus(r.totalTax);
  outNet.textContent = won(r.net);

  if (currentMode() === 'reverse' && r.net !== value) {
    calcNote.textContent = '입력한 실수령액과 정확히 같은 금액이 나오는 세전 금액은 없어, 가장 가까운 금액(' + won(r.net) + ')으로 계산했습니다.';
  } else {
    calcNote.textContent = '';
  }
}

amountInput.addEventListener('input', render);
modeRadios.forEach((radio) => radio.addEventListener('change', render));
render();
