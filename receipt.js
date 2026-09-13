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
    saveDraft();
  };
  reader.readAsDataURL(file);
});

// --- 임시저장 (localStorage) ---
const DRAFT_KEY = 'receiptDraft_v1';
const DRAFT_FIELD_IDS = [
  'receiptNo', 'clientName', 'bizNumber', 'supplierName', 'ownerName',
  'bizAddress', 'bizType', 'bizItem', 'issueDate', 'remark',
];

function collectDraft() {
  const fields = {};
  DRAFT_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) fields[id] = el.value;
  });

  const receiptTypeEl = document.querySelector('input[name="receiptType"]:checked');
  const receiptType = receiptTypeEl ? receiptTypeEl.value : null;

  const items = [...itemsBody.querySelectorAll('.item-row')].map((row) => ({
    date: row.querySelector('.item-date').value,
    name: row.querySelector('.item-name').value,
    qty: row.querySelector('.item-qty').value,
    price: row.querySelector('.item-price').value,
  }));

  const stamp = stampPreview.hidden ? null : stampPreview.src;

  return { fields, receiptType, items, stamp };
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

  if (draft.receiptType) {
    const radio = document.querySelector(`input[name="receiptType"][value="${draft.receiptType}"]`);
    if (radio) radio.checked = true;
  }

  if (Array.isArray(draft.items) && draft.items.length > 0) {
    itemsBody.innerHTML = '';
    draft.items.forEach((item) => {
      addRow();
      const row = itemsBody.lastElementChild;
      row.querySelector('.item-date').value = item.date || '';
      row.querySelector('.item-name').value = item.name || '';
      row.querySelector('.item-qty').value = item.qty || '1';
      row.querySelector('.item-price').value = item.price || '0';
    });
  }

  if (draft.stamp) {
    stampPreview.src = draft.stamp;
    stampPreview.hidden = false;
  }

  recalcTotal();
  return true;
}

function clearDraft() {
  if (!confirm('임시저장된 내용을 지우고 새로 작성하시겠습니까?')) return;
  localStorage.removeItem(DRAFT_KEY);
  location.reload();
}

document.addEventListener('input', scheduleSaveDraft);

const sheet = document.getElementById('sheet');

function fitSheetToPaper() {
  // Uses `zoom` rather than `transform: scale()` — print/PDF overflow and
  // page-break decisions in Chrome/Edge are based on the untransformed
  // layout size, so a transform-scaled box can still overflow the outline
  // even though it renders smaller. `zoom` actually resizes the layout box.
  sheet.style.zoom = '';

  // sheet is forced to its full design width (860px) in print CSS, regardless
  // of the tiny 48절 outline size, so scrollWidth/scrollHeight here reflect the
  // true, unsquashed layout before we shrink it to fit inside the cut outline
  // printed on the A4 page.
  const pxPerMm = 96 / 25.4;
  const outlineWidthMm = 86; // 48절 실물 영수증 규격
  const outlineHeightMm = 185;
  const outlinePaddingMm = 8; // matches .print-outline padding: 4mm on each side

  const availableWidthPx = (outlineWidthMm - outlinePaddingMm) * pxPerMm;
  const availableHeightPx = (outlineHeightMm - outlinePaddingMm) * pxPerMm;

  const naturalWidth = sheet.scrollWidth;
  const naturalHeight = sheet.scrollHeight;

  const scale = Math.min(availableWidthPx / naturalWidth, availableHeightPx / naturalHeight, 1);
  if (scale < 1) {
    sheet.style.zoom = scale;
  }
}

function resetSheetScale() {
  sheet.style.zoom = '';
}

window.addEventListener('beforeprint', fitSheetToPaper);
window.addEventListener('afterprint', resetSheetScale);

addRowBtn.addEventListener('click', addRow);
printBtn.addEventListener('click', () => {
  fitSheetToPaper();
  window.print();
});

const clearDraftBtn = document.getElementById('clearDraftBtn');
if (clearDraftBtn) clearDraftBtn.addEventListener('click', clearDraft);

const restored = loadDraft();
if (!restored) {
  issueDate.valueAsDate = new Date();
  // start with 8 blank rows (matches a typical simple-receipt item table)
  for (let i = 0; i < 8; i++) addRow();
}
