const SPREADSHEET_ID = "ใส่_SPREADSHEET_ID_ของคุณ";
const SHEET_NAME = "Visitors";

// ถ้ามีหน้าเว็บหลักของศูนย์ ให้ใส่ URL ตรงนี้
// ถ้ายังไม่มี ให้ปล่อยเป็นค่าว่าง ""
const HOME_URL = "";

function doGet(e) {
  const page = e?.parameter?.page || "form";

  if (page === "dashboard") {
    return HtmlService
      .createTemplateFromFile("Dashboard")
      .evaluate()
      .setTitle("Dashboard ผู้เข้าชมวันนี้")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle("ลงทะเบียนเข้าชมศูนย์การงานอาชีพ")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function submitVisitorForm(formData) {
  validateFormData_(formData);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    ensureHeader_(sheet);

    const duplicate = findTodayDuplicate_(sheet, formData);

    if (duplicate.found) {
      return {
        ok: false,
        duplicate: true,
        message: "คุณเคยลงทะเบียนเข้าชมแล้วในวันนี้",
        visitorNo: duplicate.visitorNo,
        fullName: duplicate.fullName,
        homeUrl: HOME_URL,
      };
    }

    const timestamp = new Date();
    const visitorNo = Math.max(sheet.getLastRow(), 1);

    sheet.appendRow([
      timestamp,
      visitorNo,
      formData.fullName,
      formData.organization || "",
      formData.phone || "",
      formData.participantType,
      formData.otherParticipantType || "",
      formData.interestedZone,
      formData.note || "",
      getClientInfo_(formData),
    ]);

    return {
      ok: true,
      duplicate: false,
      visitorNo,
      fullName: formData.fullName,
      homeUrl: HOME_URL,
    };
  } finally {
    lock.releaseLock();
  }
}

function validateFormData_(formData) {
  if (!formData) {
    throw new Error("ไม่พบข้อมูลที่ส่งมา");
  }

  if (!formData.fullName || formData.fullName.trim().length < 2) {
    throw new Error("กรุณากรอกชื่อ - นามสกุล");
  }

  if (!formData.participantType) {
    throw new Error("กรุณาเลือกประเภทผู้เข้าร่วม");
  }

  if (!formData.interestedZone) {
    throw new Error("กรุณาเลือกโซนที่สนใจเข้าชม");
  }

  if (formData.phone && !/^[0-9+\-\s]{8,20}$/.test(formData.phone)) {
    throw new Error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง");
  }
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;

  sheet.appendRow([
    "Timestamp",
    "Visitor No.",
    "ชื่อ - นามสกุล",
    "หน่วยงาน / โรงเรียน",
    "เบอร์โทรศัพท์",
    "ประเภทผู้เข้าร่วม",
    "ประเภทอื่น ๆ",
    "โซนที่สนใจ",
    "หมายเหตุ",
    "Client Info",
  ]);

  sheet.setFrozenRows(1);
}

function getClientInfo_(formData) {
  return JSON.stringify({
    userAgent: formData.userAgent || "",
    language: formData.language || "",
    submittedAt: new Date().toISOString(),
  });
}

function findTodayDuplicate_(sheet, formData) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      found: false,
    };
  }

  const timezone = Session.getScriptTimeZone();
  const todayText = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");

  const inputName = normalizeText_(formData.fullName);

  const dataRange = sheet.getRange(2, 1, lastRow - 1, 10);
  const rows = dataRange.getValues();

  for (const row of rows) {
    const timestamp = row[0];
    const visitorNo = row[1];
    const fullName = row[2];

    if (!(timestamp instanceof Date)) {
      continue;
    }

    const rowDateText = Utilities.formatDate(timestamp, timezone, "yyyy-MM-dd");

    if (rowDateText !== todayText) {
      continue;
    }

    const rowName = normalizeText_(fullName);

    if (inputName && rowName && inputName === rowName) {
      return {
        found: true,
        visitorNo,
        fullName,
      };
    }
  }

  return {
    found: false,
  };
}

function normalizeText_(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getTodayVisitorStats() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "todayVisitorStats";
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const stats = buildTodayVisitorStats_();

  cache.put(cacheKey, JSON.stringify(stats), 10); // cache 10 วินาที

  return stats;
}

function buildTodayVisitorStats_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      total: 0,
      latestVisitors: [],
      participantTypes: {},
      zones: {},
      updatedAt: Utilities.formatDate(new Date(), "Asia/Bangkok", "HH:mm:ss"),
    };
  }

  const timezone = "Asia/Bangkok";
  const todayText = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");
  const lastRow = sheet.getLastRow();

  const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  const todayRows = [];
  const participantTypes = {};
  const zones = {};

  for (const row of rows) {
    const timestamp = row[0];

    if (!(timestamp instanceof Date)) continue;

    const rowDateText = Utilities.formatDate(timestamp, timezone, "yyyy-MM-dd");

    if (rowDateText !== todayText) continue;

    const visitorNo = row[1];
    const fullName = row[2];
    const organization = row[3];
    const participantType = row[5] || "ไม่ระบุ";
    const zone = row[7] || "ไม่ระบุ";

    participantTypes[participantType] = (participantTypes[participantType] || 0) + 1;
    zones[zone] = (zones[zone] || 0) + 1;

    todayRows.push({
      time: Utilities.formatDate(timestamp, timezone, "HH:mm:ss"),
      visitorNo,
      fullName,
      organization,
      participantType,
      zone,
    });
  }

  todayRows.reverse();

  return {
    total: todayRows.length,
    latestVisitors: todayRows.slice(0, 10),
    participantTypes,
    zones,
    updatedAt: Utilities.formatDate(new Date(), timezone, "HH:mm:ss"),
  };
}