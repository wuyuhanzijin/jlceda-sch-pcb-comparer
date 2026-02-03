const els = {
  btnLoadSch: document.getElementById('btnLoadSch'),
  btnLoadPcb: document.getElementById('btnLoadPcb'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  sumSch: document.getElementById('sumSch'),
  sumPcb: document.getElementById('sumPcb'),
  schBody: document.getElementById('schBody'),
  pcbBody: document.getElementById('pcbBody'),
  missingPcbList: document.getElementById('missingPcbList'),
  missingSchList: document.getElementById('missingSchList'),
  conflictList: document.getElementById('conflictList'),
  statusText: document.getElementById('statusText'),
};

let cachedSchRows = [];
let cachedPcbRows = [];
let cachedErrors = [];

function setStatus(text) {
  els.statusText.textContent = text;
}

function normText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeNameValue(text) {
  const raw = normText(text);
  if (!raw) {
    return { raw: '', norm: '', value: undefined };
  }
  const cleaned = raw.replace(/\\s+/g, '').replace(/µ/g, 'u').toUpperCase();
  const rkmMatch = cleaned.match(/^(\\d+)?([RKM])(\\d+)?$/);
  if (rkmMatch) {
    const left = rkmMatch[1] || '0';
    const unit = rkmMatch[2];
    const right = rkmMatch[3] || '0';
    const num = parseFloat(`${left}.${right}`);
    return { raw, norm: cleaned, value: num * (unit === 'R' ? 1 : unit === 'K' ? 1e3 : 1e6) };
  }
  const match = cleaned.match(/([0-9]+(?:\\.[0-9]+)?)\\s*(P|N|U|M|K|MEG|G|R)?[A-Z]*$/);
  if (!match) {
    return { raw, norm: cleaned, value: undefined };
  }
  const num = parseFloat(match[1]);
  const unit = match[2] || '';
  const multMap = {
    P: 1e-12,
    N: 1e-9,
    U: 1e-6,
    M: 1e-3,
    K: 1e3,
    MEG: 1e6,
    G: 1e9,
    R: 1,
  };
  const mult = multMap[unit] ?? 1;
  if (Number.isNaN(num)) {
    return { raw, norm: cleaned, value: undefined };
  }
  return { raw, norm: cleaned, value: num * mult };
}

function isNameMatch(a, b) {
  const na = normalizeNameValue(a);
  const nb = normalizeNameValue(b);
  if (na.value !== undefined && nb.value !== undefined) {
    const diff = Math.abs(na.value - nb.value);
    const scale = Math.max(Math.abs(na.value), Math.abs(nb.value), 1);
    return diff / scale < 1e-6;
  }
  return na.norm === nb.norm;
}

function getDesignator(comp) {
  if (comp && typeof comp.getState_Designator === 'function') {
    return normText(comp.getState_Designator());
  }
  if (comp && typeof comp.getState_Parameters === 'function') {
    const params = comp.getState_Parameters() || {};
    return normText(params.Designator || params.designator);
  }
  return normText(comp && (comp.designator || comp.ref || comp.name));
}

function getPrimitiveId(comp) {
  if (comp && typeof comp.getState_PrimitiveId === 'function') {
    return normText(comp.getState_PrimitiveId());
  }
  return '';
}

function getOtherProperty(comp) {
  if (comp && typeof comp.getState_OtherProperty === 'function') {
    return comp.getState_OtherProperty() || {};
  }
  return {};
}

function normalizeOtherProperty(value) {
  if (!value || typeof value !== 'object') return '';
  const keys = Object.keys(value).sort();
  const parts = [];
  keys.forEach((key) => {
    const v = value[key];
    if (v === undefined) return;
    parts.push(`${key}=${String(v).trim()}`);
  });
  return parts.join('|');
}

function normalizeOtherPropertyMap(value) {
  const map = {};
  if (!value || typeof value !== 'object') return map;
  Object.keys(value).forEach((key) => {
    const v = value[key];
    if (v === undefined || v === null) return;
    const text = String(v).trim();
    if (!text) return;
    map[key] = text;
  });
  return map;
}

function compareOtherProperty(schProp, pcbProp) {
  const schMap = normalizeOtherPropertyMap(schProp);
  const pcbMap = normalizeOtherPropertyMap(pcbProp);
  const keys = Array.from(new Set([...Object.keys(schMap), ...Object.keys(pcbMap)])).sort();
  for (const key of keys) {
    const a = schMap[key];
    const b = pcbMap[key];
    if (!a && !b) continue;
    if (!a || !b) {
      return { match: false, key, schVal: a || '-', pcbVal: b || '-' };
    }
    if (!isNameMatch(a, b) && a.toUpperCase() !== b.toUpperCase()) {
      return { match: false, key, schVal: a, pcbVal: b };
    }
  }
  return { match: true };
}
function getName(comp) {
  if (comp && typeof comp.getState_Name === 'function') {
    return normText(comp.getState_Name());
  }
  if (comp && typeof comp.getState_Parameters === 'function') {
    const params = comp.getState_Parameters() || {};
    return normText(params.Name || params.name || params.Value || params.value);
  }
  return normText(comp && (comp.name || comp.value));
}

function getComponentLink(comp) {
  if (comp && typeof comp.getState_Component === 'function') {
    const link = comp.getState_Component();
    if (link && link.libraryUuid && link.uuid) {
      return `${String(link.libraryUuid)}:${String(link.uuid)}`;
    }
  }
  return '';
}

function canCompare(comp) {
  return true;
}

function sortByDesignator(a, b) {
  return a.designator.localeCompare(b.designator, 'en', { numeric: true, sensitivity: 'base' });
}

function renderTableRows(target, rows, emptyText) {
  if (!rows.length) {
    target.innerHTML = `<tr><td class="muted" colspan="3">${emptyText}</td></tr>`;
    return;
  }
  target.innerHTML = rows
    .map((row) => {
      return `\
<tr>
  <td><span class="status-dot ${row.statusClass || 'muted'}">${row.statusText || '未比对'}</span></td>
  <td>${row.designator}</td>
  <td>${row.name || '-'}</td>
</tr>`;
    })
    .join('');
}

function renderPills(target, items, emptyText, cls) {
  if (!items.length) {
    target.innerHTML = `<span class="muted">${emptyText}</span>`;
    return;
  }
  target.innerHTML = items
    .map((item) => `<span class="pill ${cls}">${item.designator}</span>`)
    .join('');
}

function renderConflictPills(items) {
  if (!items.length) {
    els.conflictList.innerHTML = `<span class="muted">无</span>`;
    return;
  }
  els.conflictList.innerHTML = items
    .map(
      (item) => {
        const parts = [];
        if (item.diffType === '名称') {
          parts.push(`名称: ${item.schName || '-'} → ${item.pcbName || '-'}`);
        }
        const detail = parts.join('；') || `名称: ${item.schName || '-'} → ${item.pcbName || '-'}`;
        return `<div class="conflict-item">
  <span class="pill conflict">${item.designator}</span>
  <div class="conflict-detail">${detail}</div>
</div>`;
      },
    )
    .join('');
}

async function loadSchematicComponents() {
  const edaApi = window.eda || (window.parent && window.parent.eda);
  if (!edaApi) {
    setStatus('未检测到 EDA API');
    return;
  }
  els.btnLoadSch.disabled = true;
  setStatus('加载原理图元件中...');

  try {
    const schProps = edaApi.sch_PrimitiveComponent.getAllPropertyNames
      ? await edaApi.sch_PrimitiveComponent.getAllPropertyNames()
      : [];

    const schList = (await edaApi.sch_PrimitiveComponent.getAll(undefined, true)) || [];
    if (!schList.length) {
      setStatus('未获取到原理图元件，请确认已打开原理图工程。');
      renderTableRows(els.schBody, [], '原理图元件为空');
      return;
    }

    const schRows = schList
      .filter((comp) => canCompare(comp))
      .map((comp) => ({
        designator: getDesignator(comp),
        name: getName(comp),
        primitiveId: getPrimitiveId(comp),
        statusText: '未比对',
        statusClass: 'muted',
      }))
      .filter((row) => row.designator)
      .sort(sortByDesignator);

    cachedSchRows = schRows;
    els.sumSch.textContent = String(schRows.length);
    renderTableRows(els.schBody, schRows, '原理图元件为空');

    const schematicInfo = edaApi.dmt_Schematic && edaApi.dmt_Schematic.getCurrentSchematicInfo
      ? await edaApi.dmt_Schematic.getCurrentSchematicInfo()
      : undefined;
    const schematicPages = edaApi.dmt_Schematic && edaApi.dmt_Schematic.getCurrentSchematicAllSchematicPagesInfo
      ? await edaApi.dmt_Schematic.getCurrentSchematicAllSchematicPagesInfo()
      : undefined;
    const schematicName = schematicInfo && schematicInfo.name ? schematicInfo.name : '未命名原理图';
    const pageCount = Array.isArray(schematicPages) ? schematicPages.length : 0;
    setStatus(`原理图已加载：${schematicName}，图页 ${pageCount}，属性数: ${Array.isArray(schProps) ? schProps.length : 0}`);
  } catch (err) {
    console.error(err);
    setStatus('原理图加载失败，请检查工程与 API 可用性。');
  } finally {
    els.btnLoadSch.disabled = false;
    updateCompareState();
  }
}

async function loadPcbComponents() {
  const edaApi = window.eda || (window.parent && window.parent.eda);
  if (!edaApi) {
    setStatus('未检测到 EDA API');
    return;
  }
  els.btnLoadPcb.disabled = true;
  setStatus('加载PCB元件中...');

  try {
    const pcbList = (await edaApi.pcb_PrimitiveComponent.getAll()) || [];
    if (!pcbList.length) {
      setStatus('未获取到PCB元件，请确认已打开PCB。');
      renderTableRows(els.pcbBody, [], 'PCB元件为空');
      return;
    }

    const pcbRows = pcbList
      .map((comp) => ({
        designator: getDesignator(comp),
        name: getName(comp),
        primitiveId: getPrimitiveId(comp),
        statusText: '未比对',
        statusClass: 'muted',
      }))
      .filter((row) => row.designator)
      .sort(sortByDesignator);

    cachedPcbRows = pcbRows;
    els.sumPcb.textContent = String(pcbRows.length);
    renderTableRows(els.pcbBody, pcbRows, 'PCB元件为空');
    setStatus(`PCB已加载：共 ${pcbRows.length} 个元件`);
  } catch (err) {
    console.error(err);
    setStatus('PCB加载失败，请检查工程与 API 可用性。');
  } finally {
    els.btnLoadPcb.disabled = false;
    updateCompareState();
  }
}

function updateCompareState() {
  const ready = cachedSchRows.length > 0 && cachedPcbRows.length > 0;
  if (ready) {
    compareByDesignator();
  }
}

function compareByDesignator() {
  if (!cachedSchRows.length || !cachedPcbRows.length) {
    setStatus('请先加载原理图和PCB元件列表');
    return;
  }
  const schMap = new Map(cachedSchRows.map((row) => [row.designator.toUpperCase(), { ...row }]));
  const pcbMap = new Map(cachedPcbRows.map((row) => [row.designator.toUpperCase(), { ...row }]));

  const missingPcb = [];
  const missingSch = [];
  const mismatch = [];
  const match = [];

  schMap.forEach((schItem, key) => {
    const pcbItem = pcbMap.get(key);
    if (!pcbItem) {
      missingPcb.push({ ...schItem });
      schItem.statusText = '缺失(PCB)';
      schItem.statusClass = 'row-missing';
      return;
    }
    const schName = normText(schItem.name);
    const pcbName = normText(pcbItem.name);
    const nameMatch = schName && pcbName ? isNameMatch(schName, pcbName) : schName === pcbName;
    if (!nameMatch) {
      mismatch.push({ ...schItem, schName, pcbName, diffType: '名称' });
      schItem.statusText = '冲突';
      schItem.statusClass = 'row-conflict';
      pcbItem.statusText = '冲突';
      pcbItem.statusClass = 'row-conflict';
    } else {
      match.push({ ...schItem });
      schItem.statusText = '匹配';
      schItem.statusClass = 'row-match';
      pcbItem.statusText = '匹配';
      pcbItem.statusClass = 'row-match';
    }
    pcbMap.set(key, pcbItem);
  });

  pcbMap.forEach((pcbItem, key) => {
    if (!schMap.has(key)) {
      missingSch.push({ ...pcbItem });
      pcbItem.statusText = '缺失(原理图)';
      pcbItem.statusClass = 'row-missing';
    }
  });

  const schRows = Array.from(schMap.values()).sort(sortByDesignator);
  const pcbRows = Array.from(pcbMap.values()).sort(sortByDesignator);
  renderTableRows(els.schBody, schRows, '原理图元件为空');
  renderTableRows(els.pcbBody, pcbRows, 'PCB元件为空');

  renderPills(els.missingPcbList, missingPcb, '无', 'missing');
  renderPills(els.missingSchList, missingSch, '无', 'missing');
  renderConflictPills(mismatch);

  cachedErrors = [
    ...missingPcb.map((item) => ({ type: '缺失(PCB)', designator: item.designator, name: item.name || '' })),
    ...missingSch.map((item) => ({ type: '缺失(原理图)', designator: item.designator, name: item.name || '' })),
    ...mismatch.map((item) => ({ type: '冲突', designator: item.designator, name: item.name || '' })),
  ];

  els.btnExportCsv.disabled = cachedErrors.length === 0;
  setStatus(
    `比对完成：缺失(PCB) ${missingPcb.length}，缺失(原理图) ${missingSch.length}，不匹配 ${mismatch.length}，一致 ${match.length}`,
  );
}

function toCsvValue(text) {
  const value = text == null ? '' : String(text);
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportCsv() {
  if (!cachedErrors.length) {
    setStatus('暂无错误可导出');
    return;
  }
  const headers = ['类型', '位号', '器件'];
  const lines = [headers.map(toCsvValue).join(',')];
  cachedErrors.forEach((item) => {
    lines.push([item.type, item.designator, item.name].map(toCsvValue).join(','));
  });
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compare_errors.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus('已导出CSV');
}

els.btnLoadSch.addEventListener('click', loadSchematicComponents);
els.btnLoadPcb.addEventListener('click', loadPcbComponents);
els.btnExportCsv.addEventListener('click', exportCsv);

setStatus('就绪');
