const itemsBody = document.getElementById('itemsBody');
const rowTemplate = document.getElementById('rowTemplate');
const addRowBtn = document.getElementById('addRowBtn');
const printBtn = document.getElementById('printBtn');
const issueDate = document.getElementById('issueDate');
const grandTotalDisplay = document.getElementById('grandTotalDisplay');
const tableTotalDisplay = document.getElementById('tableTotalDisplay');
const stampInput = document.getElementById('stampInput');
const stampPreview = document.getElementById('stampPreview');

const won = (n) => Math.round(n).toLocaleString('ko-KR');
const parseNumber = (str) => parseFloat(String(str).replace(/,/g, '')) || 0;

function formatPriceInput(input) {
  const digits = input.value.replace(/[^0-9]/g, '');
  input.value = digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
}

function addRow() {
  const fragment = rowTemplate.content.cloneNode(true);
  itemsBody.appendChild(fragment);
  recalcTotal();
}

function recalcTotal() {
  let total = 0;
  itemsBody.querySelectorAll('.item-row').forEach((row) => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseNumber(row.querySelector('.item-price').value);
    const amount = qty * price;
    row.querySelector('.item-amount').textContent = won(amount) + '원';
    total += amount;
  });
  grandTotalDisplay.textContent = won(total);
  tableTotalDisplay.textContent = won(total);
}

itemsBody.addEventListener('input', (e) => {
  if (e.target.classList.contains('item-price')) {
    formatPriceInput(e.target);
    recalcTotal();
  } else if (e.target.classList.contains('item-qty')) {
    recalcTotal();
  }
});

itemsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('removeRowBtn')) {
    e.target.closest('.item-row').remove();
    recalcTotal();
  }
});

stampInput.addEventListener('change', () => {
  const file = stampInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    stampPreview.src = reader.result;
    stampPreview.hidden = false;
  };
  reader.readAsDataURL(file);
});

const sheet = document.getElementById('sheet');

function fitSheetToPaper() {
  sheet.style.transform = 'none';

  // sheet is forced to its full design width (860px) in print CSS, regardless
  // of the tiny 48절 paper size, so scrollWidth/scrollHeight here reflect the
  // true, unsquashed layout before we shrink it to fit.
  const pxPerMm = 96 / 25.4;
  const pageWidthMm = 86; // 48절 실물 영수증 용지
  const pageHeightMm = 185;
  const pageMarginMm = 8; // matches @page margin: 4mm on each side

  const availableWidthPx = (pageWidthMm - pageMarginMm) * pxPerMm;
  const availableHeightPx = (pageHeightMm - pageMarginMm) * pxPerMm;

  const naturalWidth = sheet.scrollWidth;
  const naturalHeight = sheet.scrollHeight;

  const scale = Math.min(availableWidthPx / naturalWidth, availableHeightPx / naturalHeight, 1);
  if (scale < 1) {
    sheet.style.transformOrigin = 'top left';
    sheet.style.transform = `scale(${scale})`;
  }
}

function resetSheetScale() {
  sheet.style.transform = 'none';
}

window.addEventListener('beforeprint', fitSheetToPaper);
window.addEventListener('afterprint', resetSheetScale);

addRowBtn.addEventListener('click', addRow);
printBtn.addEventListener('click', () => {
  fitSheetToPaper();
  window.print();
});

issueDate.valueAsDate = new Date();

// start with 8 blank rows (matches a typical simple-receipt item table)
for (let i = 0; i < 8; i++) addRow();
