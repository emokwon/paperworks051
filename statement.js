const itemsBody = document.getElementById('itemsBody');
const rowTemplate = document.getElementById('rowTemplate');
const addRowBtn = document.getElementById('addRowBtn');
const printBtn = document.getElementById('printBtn');
const issueDate = document.getElementById('issueDate');

const subtotalDisplay = document.getElementById('subtotalDisplay');
const vatDisplay = document.getElementById('vatDisplay');
const totalDisplay = document.getElementById('totalDisplay');
const grandTotalDisplay = document.getElementById('grandTotalDisplay');
const stampInput = document.getElementById('stampInput');
const stampPreview = document.getElementById('stampPreview');

const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const parseNumber = (str) => parseFloat(String(str).replace(/,/g, '')) || 0;

function formatPriceInput(input) {
  const digits = input.value.replace(/[^0-9]/g, '');
  input.value = digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
}

function addRow() {
  const fragment = rowTemplate.content.cloneNode(true);
  itemsBody.appendChild(fragment);
  recalcTotals();
}

function recalcTotals() {
  let subtotal = 0;
  itemsBody.querySelectorAll('.item-row').forEach((row) => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseNumber(row.querySelector('.item-price').value);
    const amount = qty * price;
    row.querySelector('.item-amount').textContent = won(amount);
    subtotal += amount;
  });
  const vat = subtotal * 0.1;
  const total = subtotal + vat;

  subtotalDisplay.textContent = won(subtotal);
  vatDisplay.textContent = won(vat);
  totalDisplay.textContent = won(total);
  grandTotalDisplay.textContent = won(total);
}

itemsBody.addEventListener('input', (e) => {
  if (e.target.classList.contains('item-price')) {
    formatPriceInput(e.target);
    recalcTotals();
  } else if (e.target.classList.contains('item-qty')) {
    recalcTotals();
  }
});

itemsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('removeRowBtn')) {
    e.target.closest('.item-row').remove();
    recalcTotals();
  }
});

stampInput.addEventListener('change', () => {
  const file = stampInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    stampPreview.src = reader.result;
    stampPreview.hidden = false;
    saveDraft();
  };
  reader.readAsDataURL(file);
});

// --- 임시저장 (localStorage) ---
const DRAFT_KEY = 'statementDraft_v1';
const DRAFT_FIELD_IDS = [
  'supplierBizNumber', 'supplierCompany', 'supplierOwnerName', 'supplierAddress', 'supplierBizType', 'supplierBizItem',
  'clientBizNumber', 'clientCompany', 'clientOwnerName', 'clientAddress', 'clientBizType', 'clientBizItem',
  'issueDate', 'notes',
];

function collectDraft() {
  const fields = {};
  DRAFT_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) fields[id] = el.value;
  });

  const items = [...itemsBody.querySelectorAll('.item-row')].map((row) => ({
    date: row.querySelector('.item-date').value,
    name: row.querySelector('.item-name').value,
    desc: row.querySelector('.item-desc').value,
    qty: row.querySelector('.item-qty').value,
    price: row.querySelector('.item-price').value,
  }));

  const stamp = stampPreview.hidden ? null : stampPreview.src;

  return { fields, items, stamp };
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
  } catch (err) {
    // localStorage unavailable (private mode, quota, etc.) — silently skip
  }
}

let saveTimer = null;
function scheduleSaveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 400);
}

function loadDraft() {
  let draft;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    draft = JSON.parse(raw);
  } catch (err) {
    return false;
  }
  if (!draft) return false;

  DRAFT_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && draft.fields && draft.fields[id] !== undefined) {
      el.value = draft.fields[id];
    }
  });

  if (Array.isArray(draft.items) && draft.items.length > 0) {
    itemsBody.innerHTML = '';
    draft.items.forEach((item) => {
      addRow();
      const row = itemsBody.lastElementChild;
      row.querySelector('.item-date').value = item.date || '';
      row.querySelector('.item-name').value = item.name || '';
      row.querySelector('.item-desc').value = item.desc || '';
      row.querySelector('.item-qty').value = item.qty || '1';
      row.querySelector('.item-price').value = item.price || '0';
    });
  }

  if (draft.stamp) {
    stampPreview.src = draft.stamp;
    stampPreview.hidden = false;
  }

  recalcTotals();
  return true;
}

function clearDraft() {
  if (!confirm('임시저장된 내용을 지우고 새로 작성하시겠습니까?')) return;
  localStorage.removeItem(DRAFT_KEY);
  location.reload();
}

document.addEventListener('input', scheduleSaveDraft);

const sheet = document.getElementById('sheet');
let autoFilledRowCount = 0;

function removeAutoFilledRows() {
  while (autoFilledRowCount > 0) {
    const rows = itemsBody.querySelectorAll('.item-row');
    const last = rows[rows.length - 1];
    if (!last) break;
    last.remove();
    autoFilledRowCount--;
  }
  recalcTotals();
}

function fitSheetToOnePage() {
  // Uses `zoom` rather than `transform: scale()` — print page-break
  // calculations in Chrome/Edge are based on the untransformed layout size,
  // so a transform-scaled box still overflows onto a second page even
  // though it renders smaller. `zoom` actually resizes the layout box,
  // so pagination sees the shrunk size too.
  sheet.style.zoom = '';
  removeAutoFilledRows();

  const pxPerMm = 96 / 25.4;
  const pageHeightMm = 297; // A4 portrait
  const pageMarginMm = 24; // matches @page margin (12mm top + 12mm bottom)
  const availablePx = (pageHeightMm - pageMarginMm) * pxPerMm;

  // If there's blank space left on the page, fill it by adding more blank
  // item rows (same row height as the rest) instead of stretching anything.
  let currentHeight = sheet.scrollHeight;
  while (currentHeight < availablePx && autoFilledRowCount < 200) {
    addRow();
    autoFilledRowCount++;
    currentHeight = sheet.scrollHeight;
  }

  if (currentHeight > availablePx) {
    const scale = availablePx / currentHeight;
    sheet.style.zoom = scale;
  }
}

function resetSheetScale() {
  sheet.style.zoom = '';
  removeAutoFilledRows();
}

window.addEventListener('beforeprint', fitSheetToOnePage);
window.addEventListener('afterprint', resetSheetScale);

const clearDraftBtn = document.getElementById('clearDraftBtn');
if (clearDraftBtn) clearDraftBtn.addEventListener('click', clearDraft);

addRowBtn.addEventListener('click', addRow);
printBtn.addEventListener('click', () => {
  fitSheetToOnePage();
  window.print();
});

const restored = loadDraft();
if (!restored) {
  issueDate.valueAsDate = new Date();
  // start with enough blank rows to fill a printed A4 page by default
  for (let i = 0; i < 10; i++) addRow();
}
