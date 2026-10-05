const itemsBody = document.getElementById('itemsBody');
const rowTemplate = document.getElementById('rowTemplate');
const addRowBtn = document.getElementById('addRowBtn');
const printBtn = document.getElementById('printBtn');
const issueDate = document.getElementById('issueDate');
const stampInput = document.getElementById('stampInput');
const stampPreview = document.getElementById('stampPreview');

function renumberRows() {
  [...itemsBody.querySelectorAll('.item-row')].forEach((row, i) => {
    row.querySelector('.row-index').textContent = i + 1;
  });
}

function addRow() {
  const fragment = rowTemplate.content.cloneNode(true);
  itemsBody.appendChild(fragment);
  renumberRows();
}

itemsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('removeRowBtn')) {
    e.target.closest('.item-row').remove();
    renumberRows();
    scheduleSaveDraft();
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
const DRAFT_KEY = 'rfqDraft_v1';
const DRAFT_FIELD_IDS = [
  'recipientCompany', 'recipientContact', 'recipientPhone',
  'requesterCompany', 'requesterContact', 'requesterPhone', 'requesterEmail',
  'replyDate', 'deliveryDate', 'deliveryPlace', 'paymentTerms',
  'issueDate', 'notes',
];

function collectDraft() {
  const fields = {};
  DRAFT_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) fields[id] = el.value;
  });

  const items = [...itemsBody.querySelectorAll('.item-row')].map((row) => ({
    name: row.querySelector('.item-name').value,
    desc: row.querySelector('.item-desc').value,
    qty: row.querySelector('.item-qty').value,
    note: row.querySelector('.item-note').value,
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
      row.querySelector('.item-name').value = item.name || '';
      row.querySelector('.item-desc').value = item.desc || '';
      row.querySelector('.item-qty').value = item.qty || '';
      row.querySelector('.item-note').value = item.note || '';
    });
  }

  if (draft.stamp) {
    stampPreview.src = draft.stamp;
    stampPreview.hidden = false;
  }

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
  renumberRows();
}

function fitSheetToOnePage() {
  // `zoom` (not `transform`) so print pagination sees the shrunk layout size.
  sheet.style.zoom = '';
  removeAutoFilledRows();

  const pxPerMm = 96 / 25.4;
  const pageHeightMm = 297; // A4 portrait
  const pageMarginMm = 24; // matches @page margin (12mm top + 12mm bottom)
  const availablePx = (pageHeightMm - pageMarginMm) * pxPerMm;

  let currentHeight = sheet.scrollHeight;
  while (currentHeight < availablePx && autoFilledRowCount < 200) {
    addRow();
    autoFilledRowCount++;
    currentHeight = sheet.scrollHeight;
  }

  if (currentHeight > availablePx) {
    sheet.style.zoom = availablePx / currentHeight;
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
  for (let i = 0; i < 4; i++) addRow();
}
