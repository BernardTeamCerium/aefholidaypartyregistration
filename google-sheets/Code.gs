/**
 * AEF Holiday Party: Netlify form -> Google Sheet
 *
 * Paste this into Extensions > Apps Script on the Google Sheet, set SECRET below,
 * deploy as a Web app, and point a Netlify outgoing webhook at the web app URL
 * with ?token=<SECRET> on the end. Full steps: google-sheets/README.md
 */

// Any long random string. The webhook URL must end with ?token=<this value>.
var SECRET = "CHANGE-ME-to-a-long-random-string";

var SHEET_NAME = "Registrations";

// [column header, Netlify form field name]
var COLUMNS = [
  ["Submitted At", "_created_at"],
  ["First Name", "first-name"],
  ["Last Name", "last-name"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Attending As", "affiliation"],
  ["Agency / Company", "company"],
  ["Dietary", "dietary"],
  ["Bringing Guest", "bringing-guest"],
  ["Guest First Name", "guest-first-name"],
  ["Guest Last Name", "guest-last-name"],
  ["Guest Email", "guest-email"],
  ["Guest Relationship", "guest-relationship"],
  ["Guest Dietary", "guest-dietary"],
  ["Party Size", "party-size"],
  ["Pickleball", "pickleball"],
  ["Notes", "notes"],
  ["Policy Acknowledged", "policy-acknowledged"],
  ["Netlify Submission ID", "_id"]
];

function doPost(e) {
  if (!e || !e.parameter || e.parameter.token !== SECRET) {
    return json_({ ok: false, error: "unauthorized" });
  }

  var payload = JSON.parse(e.postData.contents);
  if (payload.form_name && payload.form_name !== "holiday-party-registration") {
    return json_({ ok: true, skipped: "other form" });
  }

  var data = payload.data || {};
  data._created_at = payload.created_at ? new Date(payload.created_at) : new Date();
  data._id = payload.id || "";

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();

    // Skip duplicates if Netlify retries the same submission.
    var idCol = COLUMNS.length;
    var last = sheet.getLastRow();
    if (data._id && last > 1) {
      var ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === data._id) return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow(COLUMNS.map(function (c) {
      var v = data[c[1]];
      if (c[1] === "party-size") return Number(v) || 1;
      return v == null ? "" : v;
    }));
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// Lets you open the web app URL in a browser to check it's deployed.
function doGet() {
  return json_({ ok: true, message: "AEF registration webhook is running." });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[0]; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#dcfaf4");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
