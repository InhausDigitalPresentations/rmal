/**
 * RMAL Content Pool Tracker — Google Sheets backend
 * ---------------------------------------------------
 * Paste this whole file into the Apps Script editor bound to your
 * "RMAL Content Pool Data" Google Sheet (Extensions > Apps Script),
 * then deploy it as a Web App:
 *   Deploy > New deployment > type: Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the resulting /exec URL into the tracker's Settings panel.
 *
 * No per-user login or token is needed: the web app always runs
 * under YOUR Google account's permissions, no matter who calls it.
 * Optionally set a shared passphrase below (Project Settings > Script
 * Properties > APP_SECRET) if you want to stop randoms who get the
 * URL from writing to it.
 */

var ENTRIES_SHEET = 'Entries';
var HISTORY_SHEET = 'History';
var CONFIG_SHEET = 'Config';
var DEFAULT_POOL_TOTAL = 44600;

var ENTRIES_HEADERS = ['id','serviceId','name','qty','unitRate','date','note','active','deleted','createdBy','createdAt','updatedAt'];
var HISTORY_HEADERS = ['id','ts','actor','type','message','delta'];

function doGet(e) {
  try {
    checkSecret_(e);
    return respond_(getState_());
  } catch (err) {
    return respond_({ error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    checkSecret_(e);
    lock.waitLock(15000);
    var body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'addEntry': addEntry_(body); break;
      case 'toggleEntry': toggleEntry_(body); break;
      case 'deleteEntry': deleteEntry_(body); break;
      case 'setPoolTotal': setPoolTotal_(body); break;
      default: throw new Error('Unknown action: ' + body.action);
    }
    return respond_(getState_());
  } catch (err) {
    return respond_({ error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function checkSecret_(e) {
  var required = PropertiesService.getScriptProperties().getProperty('APP_SECRET');
  if (!required) return; // no secret configured -> open access
  var provided = (e.parameter && e.parameter.secret) || '';
  if (!provided && e.postData && e.postData.contents) {
    try { provided = JSON.parse(e.postData.contents).secret || ''; } catch (err) {}
  }
  if (provided !== required) throw new Error('Invalid or missing secret.');
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheets_() {
  var ss = ss_();
  var entries = ss.getSheetByName(ENTRIES_SHEET);
  if (!entries) {
    entries = ss.insertSheet(ENTRIES_SHEET);
    entries.appendRow(ENTRIES_HEADERS);
  }
  var history = ss.getSheetByName(HISTORY_SHEET);
  if (!history) {
    history = ss.insertSheet(HISTORY_SHEET);
    history.appendRow(HISTORY_HEADERS);
  }
  var config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
    config.appendRow(['key', 'value']);
    config.appendRow(['poolTotal', DEFAULT_POOL_TOTAL]);
  }
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }
}

function readTable_(sheetName, headers) {
  var sheet = ss_().getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1)
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = r[i]; });
      return obj;
    });
}

function getPoolTotal_() {
  var values = ss_().getSheetByName(CONFIG_SHEET).getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === 'poolTotal') return Number(values[i][1]);
  }
  return DEFAULT_POOL_TOTAL;
}

function setPoolTotalValue_(val) {
  var config = ss_().getSheetByName(CONFIG_SHEET);
  var values = config.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === 'poolTotal') { config.getRange(i + 1, 2).setValue(val); return; }
  }
  config.appendRow(['poolTotal', val]);
}

function getState_() {
  ensureSheets_();
  var entries = readTable_(ENTRIES_SHEET, ENTRIES_HEADERS).filter(function (e) { return e.deleted !== true && e.deleted !== 'TRUE'; });
  var history = readTable_(HISTORY_SHEET, HISTORY_HEADERS);
  entries.forEach(function (e) {
    e.active = (e.active === true || e.active === 'TRUE');
    e.qty = Number(e.qty);
    e.unitRate = Number(e.unitRate);
    delete e.deleted;
  });
  history.forEach(function (h) { h.delta = (h.delta === '' ? null : Number(h.delta)); });
  return { poolTotal: getPoolTotal_(), entries: entries, history: history };
}

function appendHistory_(actor, type, message, delta) {
  ss_().getSheetByName(HISTORY_SHEET).appendRow([
    Utilities.getUuid(), new Date().toISOString(), actor, type, message,
    (delta === undefined || delta === null ? '' : delta)
  ]);
}

function addEntry_(body) {
  ensureSheets_();
  var sheet = ss_().getSheetByName(ENTRIES_SHEET);
  var now = new Date().toISOString();
  var id = Utilities.getUuid();
  sheet.appendRow([id, body.serviceId, body.name, Number(body.qty), Number(body.unitRate), body.date, body.note || '', true, false, body.actor, now, now]);
  var subtotal = Number(body.qty) * Number(body.unitRate);
  appendHistory_(body.actor, 'add', body.actor + ' logged "' + body.name + '" × ' + body.qty + ' (' + body.date + ')', -subtotal);
}

function headerIndex_() {
  var idx = {};
  ENTRIES_HEADERS.forEach(function (h, i) { idx[h] = i + 1; });
  return idx;
}

function findEntryRow_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === id) return i + 1;
  }
  return -1;
}

function toggleEntry_(body) {
  var sheet = ss_().getSheetByName(ENTRIES_SHEET);
  var row = findEntryRow_(sheet, body.id);
  if (row === -1) throw new Error('Entry not found');
  var idx = headerIndex_();
  var current = sheet.getRange(row, idx.active).getValue();
  var isActive = (current === true || current === 'TRUE');
  var next = !isActive;
  sheet.getRange(row, idx.active).setValue(next);
  sheet.getRange(row, idx.updatedAt).setValue(new Date().toISOString());
  var name = sheet.getRange(row, idx.name).getValue();
  var qty = sheet.getRange(row, idx.qty).getValue();
  var rate = sheet.getRange(row, idx.unitRate).getValue();
  var date = sheet.getRange(row, idx.date).getValue();
  var subtotal = Number(qty) * Number(rate);
  appendHistory_(body.actor, next ? 'check' : 'uncheck',
    body.actor + ' ' + (next ? 'ticked' : 'unticked') + ' "' + name + '" × ' + qty + ' (' + date + ')',
    next ? -subtotal : subtotal);
}

function deleteEntry_(body) {
  var sheet = ss_().getSheetByName(ENTRIES_SHEET);
  var row = findEntryRow_(sheet, body.id);
  if (row === -1) throw new Error('Entry not found');
  var idx = headerIndex_();
  var name = sheet.getRange(row, idx.name).getValue();
  var qty = sheet.getRange(row, idx.qty).getValue();
  var rate = sheet.getRange(row, idx.unitRate).getValue();
  var date = sheet.getRange(row, idx.date).getValue();
  var wasActiveRaw = sheet.getRange(row, idx.active).getValue();
  var wasActive = (wasActiveRaw === true || wasActiveRaw === 'TRUE');
  sheet.getRange(row, idx.deleted).setValue(true);
  sheet.getRange(row, idx.updatedAt).setValue(new Date().toISOString());
  appendHistory_(body.actor, 'delete', body.actor + ' removed "' + name + '" × ' + qty + ' (' + date + ') from the log',
    wasActive ? Number(qty) * Number(rate) : 0);
}

function setPoolTotal_(body) {
  var cur = getPoolTotal_();
  var next = Number(body.poolTotal);
  if (next === cur) return;
  setPoolTotalValue_(next);
  appendHistory_(body.actor, 'pool', body.actor + ' updated total pool credit from ' + money_(cur) + ' to ' + money_(next));
}

function money_(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
