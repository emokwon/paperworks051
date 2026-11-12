const amountInput = document.getElementById('amountInput');
const inputLabel = document.getElementById('inputLabel');
const calcNote = document.getElementById('calcNote');
const modeRadios = document.querySelectorAll('input[name="mode"]');

const outSupply = document.getElementById('outSupply');
const outVat = document.getElementById('outVat');
const outTotal = document.getElementById('outTotal');

const won = (n) => n.toLocaleString('ko-KR') + '원';

// 공급가액 → 부가세(10%, 원 단위 미만 절사) · 합계
function calcFromSupply(supply) {
  const vat = Math.floor(supply / 10);
  return { supply, vat, total: supply + vat };
}

// 합계(부가세 포함) → 공급가액. 합계가 정확히 맞는 공급가액이 없으면 가장 가까운 값을 쓴다.
function supplyFromTotal(total) {
  let supply = Math.round(total / 1.1);
  let best = supply;
  for (let s = Math.max(0, supply - 3); s <= supply + 3; s++) {
    if (Math.abs(calcFromSupply(s).total - total) < Math.abs(calcFromSupply(best).total - total)) best = s;
  }
  return best;
}

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function formatInput() {
  const digits = amountInput.value.replace(/[^0-9]/g, '').slice(0, 12);
  amountInput.value = digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
  return digits === '' ? null : Number(digits);
}

function clearResult() {
  [outSupply, outVat, outTotal].forEach((el) => { el.textContent = '-'; });
  calcNote.textContent = '';
}

function render() {
  const value = formatInput();
  inputLabel.textContent = currentMode() === 'forward' ? '공급가액 (부가세 별도 금액, 원)' : '합계 금액 (부가세 포함, 원)';
  if (value === null) {
    clearResult();
    return;
  }

  const supply = currentMode() === 'forward' ? value : supplyFromTotal(value);
  const r = calcFromSupply(supply);

  outSupply.textContent = won(r.supply);
  outVat.textContent = won(r.vat);
  outTotal.textContent = won(r.total);

  if (currentMode() === 'reverse' && r.total !== value) {
    calcNote.textContent = '입력한 합계와 정확히 같은 금액이 나오는 공급가액은 없어, 가장 가까운 금액(합계 ' + won(r.total) + ')으로 계산했습니다.';
  } else {
    calcNote.textContent = '';
  }
}

amountInput.addEventListener('input', render);
modeRadios.forEach((radio) => radio.addEventListener('change', render));
render();
