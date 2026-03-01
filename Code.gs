
/* 
  CONFIGURATION
  Pastikan nama Sheet (Tab) di Google Spreadsheet sesuai dengan variabel di bawah ini.
*/
const SHEET_USERS = "Users"; // Khusus Siswa
const SHEET_ADMINS = "Admins"; // Khusus Admin (Pusat & Sekolah)
const SHEET_CONFIG = "Config";    
const SHEET_RESULTS = "Nilai";    
const SHEET_REKAP = "Rekap_Analisis"; 
const SHEET_JAWABAN = "Jawaban";      
const SHEET_RANKING = "Rangking";     
const SHEET_LOGS = "Logs";            
const SHEET_SCHEDULE = "Jadwal_Sekolah"; // Kolom: Nama_Sekolah, Gelombang, Tanggal_Mulai, Tanggal_Selesai
const SHEET_PROGRESS = "Progress_Ujian"; // Kolom: Username, Exam_ID, Progress_JSON, Last_Updated
// New Sheets for Survey
const SHEET_SURVEY_KARAKTER = "Survey_Karakter";
const SHEET_SURVEY_LINGKUNGAN = "Survey_Lingkungan";
const SHEET_REKAP_SURVEY = "Rekap_Survey";

const SYSTEM_SHEETS = [
    SHEET_USERS, SHEET_ADMINS, SHEET_CONFIG, SHEET_RESULTS, SHEET_REKAP, SHEET_JAWABAN, SHEET_RANKING, SHEET_LOGS, SHEET_SCHEDULE,
    SHEET_REKAP_SURVEY, SHEET_PROGRESS
];

// --- DYNAMIC SPREADSHEET ACCESS ---
// Masukkan ID Spreadsheet di tab 'Config' dengan Key: SS_SOAL_ID dan SS_HASIL_[GUGUSNAME]_ID
function getExternalSS(key) {
  if (!key) return SpreadsheetApp.getActiveSpreadsheet();
  const id = getConfigValue(key, "");
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      console.error("Failed to open SS: " + key, e);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getBankSoalSS() {
  return getExternalSS("SS_SOAL_ID");
}

function getResultSS(username) {
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  
  // Try global results SS first if configured
  const globalResId = getConfigValue("SS_HASIL_ID", "");
  let targetSS = mainSS;
  if (globalResId) {
    try { targetSS = SpreadsheetApp.openById(globalResId); } catch(e) {}
  }

  const userSS = getUserSS();
  const uSheet = userSS.getSheetByName(SHEET_USERS);
  if (uSheet) {
    const data = uSheet.getDataRange().getValues();
    const inputUser = String(username).toLowerCase().trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase().trim() === inputUser) {
        // 1. Cek ID_KECAMATAN (Kolom 15 / Index 14)
        const idKec = String(data[i][14] || "").toUpperCase().trim();
        if (idKec) {
          const ssIdKec = getConfigValue("SS_HASIL_" + idKec + "_ID", "");
          if (ssIdKec) {
            try { return SpreadsheetApp.openById(ssIdKec); } catch(e) {}
          }
        }
        
        // 2. Cek ID_GUGUS (Kolom 14 / Index 13)
        const idGugus = String(data[i][13] || "DEFAULT").toUpperCase().trim();
        const ssIdGugus = getConfigValue("SS_HASIL_" + idGugus + "_ID", "");
        if (ssIdGugus) {
          try {
            return SpreadsheetApp.openById(ssIdGugus);
          } catch(e) {
            console.error("Gagal membuka SS Gugus: " + idGugus, e);
          }
        }
      }
    }
  }
  return targetSS;
}

// --- INITIALIZATION & HEADERS ---
function initSheetHeaders(ss, sheetName, headers) {
  if (!ss) {
    console.warn("initSheetHeaders: Spreadsheet is null/undefined for sheet: " + sheetName);
    return null;
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function checkAndInitAllSheets() {
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  // Set Spreadsheet Name
  mainSS.rename("CBT System Database");
  
  const userSS = getUserSS(); // Use User SS

  // Init sheets in their respective Spreadsheets
  initSheetHeaders(userSS, SHEET_USERS, ["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status", "ID_SEKOLAH", "ID_GUGUS", "ID_KECAMATAN"]);
  initSheetHeaders(userSS, SHEET_ADMINS, ["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo", "ID_SEKOLAH", "ID_GUGUS", "ID_KECAMATAN"]);
  initSheetHeaders(mainSS, SHEET_CONFIG, ["Key", "Value"]);
  initSheetHeaders(mainSS, SHEET_LOGS, ["Date", "Username", "Fullname", "Logs_JSON"]);
  initSheetHeaders(mainSS, SHEET_SCHEDULE, ["Nama_Sekolah", "Gelombang", "Tanggal_Mulai", "Tanggal_Selesai", "Tampilkan_Token"]);
  initSheetHeaders(userSS, SHEET_PROGRESS, ["Username", "Exam_ID", "Progress_JSON", "Last_Updated"]);
  
  // --- Initialize External Spreadsheets ---

  // 1. Bank Soal Spreadsheet
  const soalSS = getBankSoalSS();
  const surveyHeader = ["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar", "ID Paket"];
  const sKarakterSheet = initSheetHeaders(soalSS, SHEET_SURVEY_KARAKTER, surveyHeader);
  const sLingkunganSheet = initSheetHeaders(soalSS, SHEET_SURVEY_LINGKUNGAN, surveyHeader);
  
  // Add standard subject sheets
  initSheetHeaders(soalSS, "Matematika", surveyHeader);
  initSheetHeaders(soalSS, "Bahasa_Indonesia", surveyHeader);
  
  if (sKarakterSheet && sKarakterSheet.getLastRow() === 1) {
    sKarakterSheet.appendRow(["S1", "Saya merasa senang membantu teman yang sedang kesulitan.", "LIKERT", "", "Sangat Kurang Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai", "4", "1", ""]);
    sKarakterSheet.appendRow(["S2", "Saya selalu datang tepat waktu saat ada janji.", "LIKERT", "", "Sangat Kurang Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai", "4", "1", ""]);
  }
  if (sLingkunganSheet && sLingkunganSheet.getLastRow() === 1) {
    sLingkunganSheet.appendRow(["L1", "Fasilitas di sekolah saya sangat mendukung proses belajar.", "LIKERT", "", "Sangat Kurang Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai", "4", "1", ""]);
    sLingkunganSheet.appendRow(["L2", "Guru-guru di sekolah saya sangat perhatian terhadap siswa.", "LIKERT", "", "Sangat Kurang Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai", "4", "1", ""]);
  }

  // 2. Result Spreadsheets
  const allConfigs = getAllConfigValues();
  const resultSSIds = new Set();
  for (const key in allConfigs) {
    if (key.startsWith("SS_HASIL_")) {
      resultSSIds.add(allConfigs[key]);
    }
  }
  
  // Only add Main SS if no external result SS is configured, or if explicitly set
  if (mainSS && !allConfigs["SS_HASIL_ID"]) {
      resultSSIds.add(mainSS.getId());
  }

  // If Main SS is NOT in the result set (meaning external SS is used), clean up result sheets from Main SS
  if (mainSS && !resultSSIds.has(mainSS.getId())) {
      const sheetsToDelete = [SHEET_RESULTS, SHEET_REKAP_SURVEY, SHEET_REKAP, SHEET_JAWABAN];
      sheetsToDelete.forEach(name => {
          const s = mainSS.getSheetByName(name);
          if (s) mainSS.deleteSheet(s);
      });
  }

  const resultHeaders = ["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Nilai", "Analisis_JSON", "Durasi", "ID Paket"];
  const surveyRecapHeaders = ["Timestamp", "Username", "Nama", "Sekolah", "Kecamatan", "Jenis Survey", "Durasi", "Total Skor", "Rata-rata", "S1", "S2", "S3", "S4", "S5", "ID Paket"];
  
  const rekapHeaders = ["Waktu Selesai", "Username", "Nama Peserta", "Asal Sekolah", "Mapel", "Durasi", "Benar", "Salah", "Nilai", "Detail Penilaian", "ID Paket"];
  for(let k=1; k<=100; k++) rekapHeaders.push(`Q${k}`);
  
  const jawabanHeaders = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Nilai"];
  for(let k=1; k<=100; k++) jawabanHeaders.push(`Q${k}`);

  resultSSIds.forEach(id => {
    if (!id) return;
    try {
      const ss = SpreadsheetApp.openById(id);
      initSheetHeaders(ss, SHEET_RESULTS, resultHeaders);
      initSheetHeaders(ss, SHEET_REKAP_SURVEY, surveyRecapHeaders);
      initSheetHeaders(ss, SHEET_REKAP, rekapHeaders);
      initSheetHeaders(ss, SHEET_JAWABAN, jawabanHeaders);
    } catch (e) {
      console.error("Could not initialize headers for spreadsheet ID: " + id, e);
    }
  });
  
  return { success: true, message: "Headers and external spreadsheets initialized" };
}

/* ENTRY POINT: doPost */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
        return responseJSON({ error: "Invalid Request: No postData" });
    }
    const params = JSON.parse(e.postData.contents);
    if (!params.action) return responseJSON({ error: "Missing action" });
    
    const readOnlyActions = [
      'login', 'checkUserStatus', 'getSubjectList', 'getTokenFromConfig', 
      'getQuestionsFromSheet', 'getRawQuestions', 'getDashboardData', 
      'getUsers', 'getSchoolSchedules', 'adminGetSurveyRecap', 
      'getRecapData', 'getAnalysisData', 'getAllConfig',
      'getStudentExamProgress', 'saveStudentExamProgress', 'clearAllCache'
    ];

    if (readOnlyActions.includes(params.action)) {
      const result = processAction(params.action, params.args);
      return responseJSON(result);
    } else {
      const lock = LockService.getScriptLock();
      const hasLock = lock.tryLock(30000);

      if (!hasLock) {
        return responseJSON({ error: "Server Busy (Lock Timeout). Please try again." });
      }

      try {
        const result = processAction(params.action, params.args);
        return responseJSON(result);
      } finally {
        lock.releaseLock();
      }
    }
  } catch (err) {
    return responseJSON({ error: "Server Error: " + err.toString() });
  }
}

/* ENTRY POINT: doGet */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
      try {
          const args = e.parameter.args ? JSON.parse(e.parameter.args) : [];
          return responseJSON(processAction(e.parameter.action, args));
      } catch (err) {
          return responseJSON({ error: err.toString() });
      }
  }
  return responseJSON({ status: "online", message: "CBT Backend Online", timestamp: new Date().toISOString() });
}

function processAction(action, args) {
    args = args || [];
    switch (action) {
      case 'login': return loginUser(args[0], args[1]);
      case 'initSystem': return checkAndInitAllSheets(); 
      case 'startExam': return startExam(args[0], args[1], args[2]);
      case 'checkUserStatus': return checkUserStatus(args[0]); 
      case 'getSubjectList': return getSubjectList(); 
      case 'getTokenFromConfig': return getConfigValue('TOKEN', 'TOKEN');
      case 'getQuestionsFromSheet': return getQuestionsFromSheet(args[0]);
      case 'getRawQuestions': return adminGetQuestions(args[0]);
      case 'saveQuestion': return adminSaveQuestion(args[0], args[1]);
      case 'importQuestions': return adminImportQuestions(args[0], args[1]); 
      case 'deleteQuestion': return adminDeleteQuestion(args[0], args[1]);
      case 'submitAnswers': return submitAnswers(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
      case 'getDashboardData': return getDashboardData();
      case 'getUsers': return getUsers(); 
      case 'importUsers': return adminImportUsers(args[0]); 
      case 'saveUser': return adminSaveUser(args[0]); 
      case 'deleteUser': return adminDeleteUser(args[0]); 
      case 'saveToken': return saveConfig('TOKEN', args[0]);
      case 'saveConfig': return saveConfig(args[0], args[1]); 
      case 'assignTestGroup': return assignTestGroup(args[0], args[1], args[2]);
      case 'updateUserSessions': return updateUserSessions(args[0]); 
      case 'resetLogin': return resetLogin(args[0]);
      case 'getSchoolSchedules': return getSchoolSchedules();
      case 'saveSchoolSchedules': return saveSchoolSchedules(args[0]);
      case 'submitSurvey': return submitSurvey(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      case 'adminGetSurveyRecap': return adminGetSurveyRecap(args[0]);
      case 'getRecapData': return getRecapData(); 
      case 'getAnalysisData': return getAnalysisData(args[0]); 
      case 'saveMaxQuestions': return saveConfig('MAX_QUESTIONS', args[0]);
      case 'saveDuration': return saveConfig('DURATION', args[0]);
      case 'saveSurveyDuration': return saveConfig('SURVEY_DURATION', args[0]);
      case 'getAllConfig': return getAllConfigValues();
      case 'saveStudentExamProgress': return saveStudentExamProgress(args[0], args[1], args[2]);
      case 'getStudentExamProgress': return getStudentExamProgress(args[0], args[1]);
      case 'clearAllCache': return clearAllCache();
      default: return { error: "Action not found: " + action };
    }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---

function toSheetValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.length > 1 && str.startsWith('0') && /^\d+$/.test(str)) {
    return "'" + str;
  }
  return val;
}

function saveImageToDrive(base64Data, filename) {
  try {
    if (!base64Data || !base64Data.includes(",")) return "";
    const folderName = "CBT_User_Photos";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) folder = folders.next();
    else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    const splitData = base64Data.split(",");
    const type = splitData[0].split(':')[1].split(';')[0];
    const base64Content = splitData[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), type, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?id=" + file.getId();
  } catch (e) {
    console.error("Image upload failed: " + e.toString());
    return "";
  }
}

function logUserActivity(username, fullname, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    let logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_LOGS);
      logSheet.appendRow(["Date", "Username", "Fullname", "Logs_JSON"]);
    }
    
    const logEntry = {
      time: Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm"),
      action: action,
      details: details
    };

    logSheet.appendRow([new Date(), username, fullname, JSON.stringify([logEntry])]);
  } catch (e) { console.error("Logging failed", e); }
}

function getUserSS() {
  return getExternalSS("SS_USER_ID");
}

// Helper to set status in User Sheet (Column 12 / Index 11)
function setUserStatus(username, status) {
  try {
    const students = getCachedStudents();
    const student = students[String(username).toLowerCase().trim()];
    if (student && student.rowIndex) {
      const ss = getUserSS(); // Use User SS
      const sheet = ss.getSheetByName(SHEET_USERS);
      if (sheet) {
        sheet.getRange(student.rowIndex, 12).setValue(status);
      }
    }
  } catch(e) { console.error("Set Status Failed", e); }
}

// --- AUTH & USER MANAGEMENT ---

function clearAllCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("STUDENTS_DATA");
    cache.remove("CONFIG_VALUES");
    for (let i = 1; i <= 20; i++) {
        cache.remove("SESSION_STATUS_" + i);
    }
    
    // Fast clear of all properties (since we only use CONFIG_ keys)
    const props = PropertiesService.getScriptProperties();
    props.deleteAllProperties();
    
    return { success: true, message: "Sinkronisasi Berhasil! Seluruh cache sistem telah dibersihkan dan diperbarui." };
  } catch (e) {
    return { success: false, message: "Gagal membersihkan cache: " + e.toString() };
  }
}

function getCachedStudents() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("STUDENTS_DATA");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch(e) {
      cache.remove("STUDENTS_DATA");
    }
  }

  const ss = getUserSS();
  const sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return {};

  // Use getDisplayValues for more accurate string matching (handles leading zeros, scientific notation, etc)
  const data = sheet.getDataRange().getDisplayValues();
  const students = {};
  
  // Start from row 1 (skip header)
  for (let i = 1; i < data.length; i++) {
    const username = String(data[i][1]).trim().toLowerCase();
    if (!username) continue;
    
    // Store data needed for login and session check
    students[username] = {
      rowIndex: i + 1,
      password: String(data[i][2]).trim(),
      fullname: data[i][4],
      gender: data[i][5] || '-',
      school: data[i][6] || '-',
      active_exam: data[i][7] || '-',
      session: String(data[i][8] || "-").trim(),
      kecamatan: data[i][9] || '-',
      photo_url: data[i][10] || '',
      id_sekolah: data[i][12] || '',
      id_gugus: data[i][13] || '',
      id_kecamatan: data[i][14] || ''
    };
  }

  try {
    const jsonStr = JSON.stringify(students);
    // Cache limit is 100KB. If too large, don't cache.
    if (jsonStr.length < 100000) {
      cache.put("STUDENTS_DATA", jsonStr, 600); // Cache for 10 minutes
    }
  } catch (e) {
    console.warn("Cache too large or failed", e);
  }
  
  return students;
}

// Helper to check if session is active
function isSessionActive(userSession) {
  const sessionStr = String(userSession || "").trim();
  
  if (!sessionStr || sessionStr === '-' || sessionStr === 'undefined') {
    return { 
      active: false, 
      status: 'NOT_ASSIGNED',
      message: "AKSES DITOLAK: Anda belum ditempatkan ke dalam Sesi Ujian.\n\nSilakan hubungi Proktor atau Admin untuk mengatur sesi anda di menu 'Atur Sesi'."
    };
  }
  
  const sessionNum = parseInt(sessionStr.replace(/[^0-9]/g, ""), 10);
  if (isNaN(sessionNum)) {
    return { 
      active: false, 
      status: 'INVALID_SESSION',
      message: "AKSES DITOLAK: Format Sesi Ujian tidak valid (" + sessionStr + ").\n\nSilakan hubungi Admin untuk perbaikan data."
    };
  }
  
  const cacheKey = "SESSION_STATUS_" + sessionNum;
  const cache = CacheService.getScriptCache();
  let status = cache.get(cacheKey);
  
  if (!status) {
    status = "OFF";
    const allConfigs = getAllConfigValues();
    const n = sessionNum.toString();
    
    // Standardized key: SESI_X_STATUS
    const possibleKeys = [
      `SESI_${n}_STATUS`,
      `SESSION_${n}_STATUS`,
      `STATUS_SESI_${n}`
    ];
    
    for (const key of possibleKeys) {
      if (allConfigs[key]) {
        status = String(allConfigs[key]).toUpperCase().trim();
        break;
      }
    }
    
    cache.put(cacheKey, status, 10); // Cache for 10 seconds
  }
  
  const isActive = (status === "ON" || status === "AKTIF" || status === "ACTIVE" || status === "TRUE" || status === "1");
  
  return {
    active: isActive,
    status: isActive ? 'ACTIVE' : 'INACTIVE',
    sessionNum: sessionNum,
    message: isActive ? "OK" : "AKSES DITOLAK: Sesi ujian anda (Sesi " + sessionNum + ") saat ini sedang NON-AKTIF.\n\nSilakan hubungi Proktor atau Admin untuk mengaktifkan sesi ini di menu 'Atur Sesi' dengan mengubah status Sesi " + sessionNum + " menjadi AKTIF."
  };
}

function checkSession(username) {
  const students = getCachedStudents();
  const student = students[String(username).toLowerCase().trim()];
  if (!student) return { success: false, message: "User not found" };
  
  const userSession = student.session;
  const check = isSessionActive(userSession);
  
  return {
    success: check.active,
    message: check.message
  };
}

function loginUser(username, password) {
  const inputUser = String(username || "").trim().toLowerCase();
  const inputPass = String(password || "").trim();

  if (!inputUser || !inputPass) {
    return { success: false, message: "Username dan Password wajib diisi" };
  }

  // 1. Check User Sheet (Using Cache)
  const students = getCachedStudents();
  const student = students[inputUser];

  if (student) {
    if (student.password === inputPass) {
      logUserActivity(inputUser, student.fullname, "LOGIN", "Success");
      setUserStatus(inputUser, "LOGGED_IN"); 
      return { 
        success: true, 
        user: { 
          username: inputUser, 
          role: 'siswa', 
          fullname: student.fullname, 
          gender: student.gender, 
          school: student.school, 
          kecamatan: student.kecamatan, 
          active_exam: student.active_exam, 
          session: student.session, 
          photo_url: student.photo_url,
          id_sekolah: student.id_sekolah,
          id_gugus: student.id_gugus,
          id_kecamatan: student.id_kecamatan
        } 
      };
    } else {
      return { success: false, message: "Password salah" };
    }
  }

  // 2. Check Admin Sheet if not found in students
  const ss = getUserSS();
  const adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (adminSheet) {
    const data = adminSheet.getDataRange().getDisplayValues(); // Use getDisplayValues for accuracy
    for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        const dbUser = String(data[i][1]).trim().toLowerCase();
        const dbPass = String(data[i][2]).trim();
        if (dbUser === inputUser) {
          if (dbPass === inputPass) {
             const role = data[i][3];
             const schoolName = data[i][6] || '-';
             return { 
               success: true, 
               user: { 
                 username: data[i][1], 
                 role: role, 
                 fullname: data[i][4], 
                 gender: data[i][5] || '-', 
                 school: schoolName, 
                 kecamatan: data[i][7] || '-', 
                 photo_url: data[i][8] || '', 
                 id_sekolah: data[i][9] || '', 
                 id_gugus: data[i][10] || '',
                 id_kecamatan: data[i][11] || ''
               } 
             };
          } else {
            return { success: false, message: "Password Admin salah" };
          }
        }
    }
  }

  return { success: false, message: "Username tidak terdaftar" };
}

function getUsers() {
  const ss = getUserSS(); // Use User SS
  const users = [];
  const uSheet = ss.getSheetByName(SHEET_USERS);
  if (uSheet) {
      const data = uSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({ 
            id: data[i][0] || `U${i}`, 
            username: data[i][1], 
            password: data[i][2], 
            role: 'siswa', 
            fullname: data[i][4], 
            gender: data[i][5], 
            school: data[i][6], 
            active_exam: data[i][7] || '-', 
            session: data[i][8] || '-', 
            kecamatan: data[i][9] || '-', 
            photo_url: data[i][10] || '',
            id_paket: data[i][15] || '-'
        });
      }
  }
  const aSheet = ss.getSheetByName(SHEET_ADMINS);
  if (aSheet) {
      const data = aSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({ id: data[i][0] || `A${i}`, username: data[i][1], password: data[i][2], role: data[i][3], fullname: data[i][4], gender: data[i][5], school: data[i][6], kecamatan: data[i][7] || '-', active_exam: '-', session: '-', photo_url: data[i][8] || '' });
      }
  }
  return users;
}

function removeUserFromSheet(sheetName, userId) {
    const sheet = getUserSS().getSheetByName(sheetName); // Use User SS
    if (!sheet) return false;
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) { if(String(data[i][0]) === String(userId)) { sheet.deleteRow(i+1); return true; } }
    return false;
}

function adminSaveUser(userData) {
    const isStudent = (userData.role === 'siswa');
    const targetSheetName = isStudent ? SHEET_USERS : SHEET_ADMINS;
    const otherSheetName = isStudent ? SHEET_ADMINS : SHEET_USERS;
    let sheet = getUserSS().getSheetByName(targetSheetName); // Use User SS
    if (!sheet) {
        sheet = getUserSS().insertSheet(targetSheetName);
        if (isStudent) sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status"]);
        else sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo"]);
    }
    if (userData.id) removeUserFromSheet(otherSheetName, userData.id);
    const data = sheet.getDataRange().getDisplayValues();
    let rowIndex = -1;
    if (userData.id) { for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(userData.id)) { rowIndex = i + 1; break; } } }
    const id = userData.id || (isStudent ? 'U' : 'A') + new Date().getTime();
    let photoUrl = "";
    if (userData.photo && userData.photo.startsWith("data:image")) {
        const fileName = `${id}_${userData.username}.jpg`;
        photoUrl = saveImageToDrive(userData.photo, fileName);
    } else if (userData.photo_url) { photoUrl = userData.photo_url; } 
    else if (rowIndex > 0) { 
        const colIndex = isStudent ? 10 : 8; 
        if (data[rowIndex - 1][colIndex]) photoUrl = data[rowIndex - 1][colIndex]; 
    }
    
    // Preserve existing status if updating
    let currentStatus = "";
    if (isStudent && rowIndex > 0 && data[rowIndex-1].length > 11) {
        currentStatus = data[rowIndex-1][11];
    }

    let rowValues = [];
    if (isStudent) { rowValues = [ toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), 'siswa', userData.fullname, userData.gender || '-', userData.school || '-', userData.active_exam || '-', userData.session || '-', userData.kecamatan || '-', photoUrl, currentStatus, userData.id_sekolah || '', userData.id_gugus || '', userData.id_kecamatan || '' ]; } 
    else { rowValues = [ toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), userData.role, userData.fullname, userData.gender || '-', userData.school || '-', userData.kecamatan || '-', photoUrl, userData.id_sekolah || '', userData.id_gugus || '', userData.id_kecamatan || '' ]; }
    
    if (rowIndex > 0) {
        if (isStudent) { if (!userData.active_exam && data[rowIndex-1][7]) rowValues[7] = data[rowIndex-1][7]; if (!userData.session && data[rowIndex-1][8]) rowValues[8] = data[rowIndex-1][8]; }
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else { sheet.appendRow(rowValues); }
    
    SpreadsheetApp.flush();
    
    // Invalidate Cache
    CacheService.getScriptCache().remove("STUDENTS_DATA");
    
    return { success: true, message: "User saved successfully" };
}

function adminDeleteUser(userId) {
    if (removeUserFromSheet(SHEET_USERS, userId)) {
        SpreadsheetApp.flush();
        CacheService.getScriptCache().remove("STUDENTS_DATA");
        return { success: true, message: "Student deleted" };
    }
    if (removeUserFromSheet(SHEET_ADMINS, userId)) {
        SpreadsheetApp.flush();
        return { success: true, message: "Admin deleted" };
    }
    return { success: false, message: "User not found" };
}

function adminImportUsers(usersList) {
    if (!Array.isArray(usersList) || usersList.length === 0) return { success: false, message: "Data kosong" };
    const students = []; const admins = [];
    usersList.forEach((u, index) => {
        const isStudent = (u.role === 'siswa');
        const id = u.id || (isStudent ? 'U' : 'A') + new Date().getTime() + '-' + index;
        if (isStudent) { students.push([ toSheetValue(id), toSheetValue(u.username), toSheetValue(u.password), 'siswa', u.fullname, u.gender || '-', u.school || '-', '-', '-', u.kecamatan || '-', u.photo_url || '', '', u.id_sekolah || '', u.id_gugus || '', u.id_kecamatan || '' ]); } // Empty status
        else { admins.push([ toSheetValue(id), toSheetValue(u.username), toSheetValue(u.password), u.role, u.fullname, u.gender || '-', u.school || '-', u.kecamatan || '-', '', u.id_sekolah || '', u.id_gugus || '', u.id_kecamatan || '' ]); }
    });
    if (students.length > 0) {
        let sSheet = getUserSS().getSheetByName(SHEET_USERS); // Use User SS
        if (!sSheet) { sSheet = getUserSS().insertSheet(SHEET_USERS); sSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status", "ID_SEKOLAH", "ID_GUGUS", "ID_KECAMATAN"]); }
        sSheet.getRange(sSheet.getLastRow() + 1, 1, students.length, 15).setValues(students);
    }
    if (admins.length > 0) {
        let aSheet = getUserSS().getSheetByName(SHEET_ADMINS); // Use User SS
        if (!aSheet) { aSheet = getUserSS().insertSheet(SHEET_ADMINS); aSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo", "ID_SEKOLAH", "ID_GUGUS", "ID_KECAMATAN"]); }
        aSheet.getRange(aSheet.getLastRow() + 1, 1, admins.length, 12).setValues(admins);
    }
    
    SpreadsheetApp.flush();
    
    // Invalidate Cache
    CacheService.getScriptCache().remove("STUDENTS_DATA");
    
    return { success: true, message: `Berhasil mengimpor ${students.length} siswa dan ${admins.length} admin.` };
}

// --- EXAM & QUESTION MANAGEMENT ---

function getSubjectList() {
  const ss = getBankSoalSS();
  if (!ss) return { subjects: [], duration: 60, maxQuestions: 0, surveyDuration: 30, showSurvey: false };
  const sheets = ss.getSheets();
  const subjects = sheets.map(s => s.getName()).filter(n => !SYSTEM_SHEETS.includes(n) && n !== SHEET_SURVEY_KARAKTER && n !== SHEET_SURVEY_LINGKUNGAN);
  
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  const duration = getConfigValue('DURATION', 60);
  const maxQuestions = getConfigValue('MAX_QUESTIONS', 0);
  const surveyDuration = getConfigValue('SURVEY_DURATION', 30);
  const showSurvey = getConfigValue('SHOW_SURVEY', 'TRUE');
  
  return { 
      subjects: subjects, 
      duration: Number(duration), 
      maxQuestions: Number(maxQuestions),
      surveyDuration: Number(surveyDuration),
      showSurvey: showSurvey === 'TRUE'
  };
}

function getConfigValue(key, defaultValue) {
  if (!key) return defaultValue;
  const keyStr = String(key).toUpperCase();
  
  // Use PropertiesService for faster access (Caching)
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty("CONFIG_" + keyStr);
  if (cached !== null) return cached;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // Fallback defaults if no active spreadsheet
    if (keyStr === "SS_SOAL_ID") return "1zIrIjprq-BSEq_Fh0K_wcJTe6YV7G6A0ZTy3VlPlMCo";
    if (keyStr === "SS_HASIL_ID") return "1S2Yc-_Md_nVVl5EzIiAxa3xeHTOmYEYMHg27IhE4O5k";
    return defaultValue;
  }

  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) {
    // Fallback defaults for specific keys if sheet doesn't exist yet
    if (keyStr === "SS_SOAL_ID") return "1zIrIjprq-BSEq_Fh0K_wcJTe6YV7G6A0ZTy3VlPlMCo";
    if (keyStr === "SS_HASIL_ID") return "1S2Yc-_Md_nVVl5EzIiAxa3xeHTOmYEYMHg27IhE4O5k";
    return defaultValue;
  }
  const data = sheet.getDataRange().getValues(); // Use getValues()
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === keyStr) {
      let val = data[i][1];
      if (val instanceof Date) {
          // Fix for time-only values from Sheets (Epoch 1899)
          if (val.getFullYear() === 1899) {
              val = Utilities.formatDate(val, "Asia/Jakarta", "HH:mm");
          } else {
              val = String(val);
          }
      } else {
          val = String(val).trim();
          // Special handling for Session Times: Pad with leading zero if needed
          if (keyStr.includes('SESSION') && (keyStr.endsWith('_START') || keyStr.endsWith('_END'))) {
              if (/^\d:\d\d$/.test(val)) {
                  val = "0" + val;
              }
          }
      }
      props.setProperty("CONFIG_" + keyStr, val);
      return val;
    }
  }
  
  // Fallback defaults if key not found in sheet
  if (keyStr === "SS_SOAL_ID") return "1zIrIjprq-BSEq_Fh0K_wcJTe6YV7G6A0ZTy3VlPlMCo";
  if (keyStr === "SS_HASIL_ID") return "1S2Yc-_Md_nVVl5EzIiAxa3xeHTOmYEYMHg27IhE4O5k";
  
  return defaultValue;
}

function saveStudentExamProgress(username, examId, progress) {
  if (!username || !examId || !progress) return { success: false, message: "Missing parameters" };
  
  const userStr = String(username).toLowerCase().trim();
  const examStr = String(examId).trim();
  const cacheKey = "PROGRESS_" + userStr + "_" + examStr;
  const progressJson = JSON.stringify(progress);
  
  try {
    const cache = CacheService.getScriptCache();
    cache.put(cacheKey, progressJson, 21600); // 6 hours
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getStudentExamProgress(username, examId) {
  if (!username || !examId) return null;
  
  const userStr = String(username).toLowerCase().trim();
  const examStr = String(examId).trim();
  const cacheKey = "PROGRESS_" + userStr + "_" + examStr;
  
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    return null;
  }
  
  return null;
}

function saveConfig(key, value) {
  if (!key) return { success: false, message: "Key is required" };
  const keyStr = String(key).toUpperCase();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, message: "No active spreadsheet" };
  
  let sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONFIG);
    sheet.appendRow(["Key", "Value"]);
  }
  const data = sheet.getDataRange().getValues();
  let found = false;
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === keyStr) {
      sheet.getRange(i+1, 2).setValue(value);
      found = true; 
      break;
    }
  }
  if (!found) sheet.appendRow([keyStr, value]);
  
  // Flush to ensure sheet is updated before next read
  SpreadsheetApp.flush();
  
  // Update Properties Cache
  PropertiesService.getScriptProperties().setProperty("CONFIG_" + keyStr, String(value));
  
  return { success: true, value: value };
}

function getAllConfigValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return {};
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const config = {};
  for(let i=0; i<data.length; i++) {
    if(data[i][0]) {
      const key = String(data[i][0]).toUpperCase();
      let val = data[i][1];
      
      // Special handling for Session Times: Always extract HH:mm from Date objects
      if (key.includes('SESSION') && (key.endsWith('_START') || key.endsWith('_END'))) {
          if (val instanceof Date) {
              val = Utilities.formatDate(val, "Asia/Jakarta", "HH:mm");
          } else {
              val = String(val).trim();
              // Pad with leading zero if needed (e.g. "7:30" -> "07:30")
              if (/^\d:\d\d$/.test(val)) {
                  val = "0" + val;
              }
          }
      } else {
          // General handling
          if (val instanceof Date) {
              if (val.getFullYear() === 1899) {
                  val = Utilities.formatDate(val, "Asia/Jakarta", "HH:mm");
              } else {
                  val = String(val);
              }
          } else {
              val = String(val);
          }
      }
      config[key] = val;
    }
  }
  return config;
}

function getQuestionsFromSheet(subject) {
  const ss = getBankSoalSS();
  if (!ss) return [];
  const sheet = ss.getSheetByName(subject);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getDisplayValues(); // Use getDisplayValues for strings
  const questions = [];
  
  // Start from row 1 (index 1) assuming row 0 is header
  for (let i = 1; i < data.length; i++) {
    // Check if ID (col 0) is present
    if (!data[i][0]) continue;
    
    const qId = String(data[i][0]);
    const options = [];
    const letters = ['A', 'B', 'C', 'D'];
    const type = data[i][2] || 'PG';
    
    // Map options based on type
    if (type === 'PG' || type === 'PGK') {
      for(let j=0; j<4; j++) { 
          // Check columns 4,5,6,7 (E,F,G,H) for options
          if(data[i][4+j]) {
              options.push({ 
                  id: `${qId}-${letters[j]}`, 
                  text_jawaban: data[i][4+j] 
              }); 
          }
      }
    } else if (type === 'BS') {
       // For BS, usually options are fixed or provided in columns
       // If provided in columns:
       for(let j=0; j<4; j++) { 
           if(data[i][4+j]) {
               options.push({ 
                   id: `${qId}-S${j+1}`, 
                   text_jawaban: data[i][4+j] 
               }); 
           }
       }
       // Fallback if no options provided for BS? 
       // Usually BS has "Benar" and "Salah" but here we stick to data
    } else if (type === 'LIKERT') {
       const pLabels = ['P1', 'P2', 'P3', 'P4'];
       for(let j=0; j<4; j++) { 
           if(data[i][4+j]) {
               options.push({ 
                   id: `${qId}-${pLabels[j]}`, 
                   text_jawaban: data[i][4+j] 
               }); 
           }
       }
    }
    
    // index 10 is 'keterangan_gambar' (new field)
    // index 11 is 'id_paket' (new field)
    questions.push({ 
        id: qId, 
        text: data[i][1], 
        type: type, 
        image: data[i][3], 
        options: options, 
        bobot_nilai: data[i][9] ? Number(data[i][9]) : 10,
        keterangan_gambar: data[i][10] || "", // Added caption
        id_paket: data[i][11] || "" // Added id_paket
    });
  }
  return questions;
}

function adminGetQuestions(sheetName) {
  const ss = getBankSoalSS();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    res.push({ 
        id: data[i][0], 
        text_soal: data[i][1], 
        tipe_soal: data[i][2] || "PG", 
        gambar: data[i][3], 
        opsi_a: data[i][4], 
        opsi_b: data[i][5], 
        opsi_c: data[i][6], 
        opsi_d: data[i][7], 
        kunci_jawaban: data[i][8], 
        bobot: data[i][9] ? Number(data[i][9]) : 0,
        keterangan_gambar: data[i][10] || "", // Added caption
        id_paket: data[i][11] || "" // Added id_paket
    });
  }
  return res;
}

function adminSaveQuestion(sheetName, qData) {
  const ss = getBankSoalSS();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { 
      sheet = ss.insertSheet(sheetName); 
      sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar"]); 
  }
  const data = sheet.getDataRange().getDisplayValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(qData.id)) { rowIndex = i + 1; break; } }
  
  const rowVals = [
      toSheetValue(qData.id), 
      qData.text_soal, 
      qData.tipe_soal, 
      qData.gambar||"", 
      qData.opsi_a||"", 
      qData.opsi_b||"", 
      qData.opsi_c||"", 
      qData.opsi_d||"", 
      qData.kunci_jawaban, 
      qData.bobot,
      qData.keterangan_gambar || "", // Added caption
      qData.id_paket || "" // Added id_paket
  ];
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  else sheet.appendRow(rowVals);
  
  SpreadsheetApp.flush();
  
  return { success: true, message: "Saved" };
}

function adminImportQuestions(sheetName, questionsList) {
  if (!Array.isArray(questionsList) || questionsList.length === 0) return { success: false, message: "Data kosong" };
  const ss = getBankSoalSS();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { 
      sheet = ss.insertSheet(sheetName); 
      sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar", "ID Paket"]); 
  }
  
  const newRows = questionsList.map(q => [ 
      toSheetValue(q.id), 
      q.text_soal, 
      q.tipe_soal || 'PG', 
      q.gambar || '', 
      q.opsi_a || '', 
      q.opsi_b || '', 
      q.opsi_c || '', 
      q.opsi_d || '', 
      q.kunci_jawaban || '', 
      q.bobot || 10,
      q.keterangan_gambar || '', // Added caption
      q.id_paket || '' // Added id_paket
  ]);
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, newRows.length, 12).setValues(newRows);
  return { success: true, message: `Berhasil mengimpor ${newRows.length} soal.` };
}

function adminDeleteQuestion(sheetName, id) {
  const ss = getBankSoalSS();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false };
  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; } }
  return { success: false };
}

function startExam(username, fullname, subject) {
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  const userSS = getUserSS();
  if (!userSS) return { success: false, message: "User Spreadsheet not found" };
  
  // --- Session Check Logic ---
  const userSheet = userSS.getSheetByName(SHEET_USERS);
  if (userSheet) {
      const data = userSheet.getDataRange().getValues();
      const inputUser = String(username).toLowerCase().trim();
      
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).toLowerCase().trim() === inputUser) {
              const userSession = String(data[i][8] || "-").trim();
              const check = isSessionActive(userSession);
              
              if (!check.active) {
                   return { 
                       success: false, 
                       message: check.message
                   };
              }
              break;
          }
      }
  }
  // --------------------------------

  let logSheet = mainSS.getSheetByName(SHEET_LOGS);
  let startTime = new Date().getTime(); 
  let isResuming = false;

  if (logSheet) {
    const data = logSheet.getDataRange().getValues();
    const today = new Date().toLocaleDateString();

    // Search backwards for the user's log for today
    for (let i = data.length - 1; i >= 1; i--) {
      const rowDate = new Date(data[i][0]).toLocaleDateString();
      const rowUser = String(data[i][1]).toLowerCase();

      if (rowDate === today && rowUser === String(username).toLowerCase()) {
        let logs = [];
        try {
          logs = JSON.parse(data[i][3]);
        } catch (e) { continue; }

        // Search backwards through the JSON logs for today
        for (let j = logs.length - 1; j >= 0; j--) {
          const log = logs[j];
          const logAction = String(log.action).toUpperCase();
          const logDetail = String(log.details);

          if (logAction === 'FINISH' && logDetail.includes(subject)) {
            // Found a finish log for this subject, so don't resume
            isResuming = false;
            startTime = new Date().getTime(); // Reset start time
            break; // Exit inner loop
          }
          if (logAction === 'START' && logDetail === subject) {
            // Found a start log, this is a resume
            const logTime = new Date(`${today} ${log.time}`).getTime();
            startTime = logTime;
            isResuming = true;
            break; // Exit inner loop
          }
        }
        break; // Exit outer loop once we've processed today's log for the user
      }
    }
  }
  logUserActivity(username, fullname, isResuming ? "RESUME" : "START", subject);
  setUserStatus(username, "WORKING"); // Update Status
  return { success: true, startTime: startTime, isResuming: isResuming };
}

function checkUserStatus(username) {
    const ss = getUserSS(); // Use User SS
    const sheet = ss.getSheetByName(SHEET_USERS);
    if (!sheet) return { status: 'OK' };
    
    const data = sheet.getDataRange().getValues(); // Use getValues() for speed
    const inputUser = String(username).toLowerCase().trim();
    
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase().trim() === inputUser) {
            const status = String(data[i][11] || "").toUpperCase();
            if (status === 'OFFLINE') return { status: 'RESET' };
            if (status === 'FINISHED') return { status: 'FINISHED' };
            
            // Check if session is still active
            const userSession = String(data[i][8] || "1").trim();
            const sessionCheck = isSessionActive(userSession);
            if (!sessionCheck.active) {
                return { status: 'SESSION_INACTIVE', message: sessionCheck.message };
            }

            return { status: 'OK' };
        }
    }
    return { status: 'OK' };
}

function submitAnswers(username, fullname, school, subject, answers, scoreInfo, startTimeEpoch, displayedCount, questionIds) {
  const userSS = getUserSS();
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date(); 
  answers = answers || {};

  // --- Get User's ID Paket ---
  let idPaket = "";
  const userSheet = userSS.getSheetByName(SHEET_USERS);
  if (userSheet) {
      const userData = userSheet.getDataRange().getValues();
      const inputUser = String(username).toLowerCase().trim();
      for (let i = 1; i < userData.length; i++) {
          if (String(userData[i][1]).toLowerCase().trim() === inputUser) {
              idPaket = String(userData[i][15] || "").trim();
              break;
          }
      }
  }

  const qSS = getBankSoalSS();
  const qSheet = qSS.getSheetByName(subject);
  if (!qSheet) return { success: false, message: "Mapel tidak ditemukan" };
  
  const startDt = new Date(Number(startTimeEpoch));
  const diff = Math.max(0, now.getTime() - startDt.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  
  const timestamp = now;
  const qData = qSheet.getDataRange().getDisplayValues();
  
  const questionWeights = {};
  for (let i = 1; i < qData.length; i++) {
      const row = qData[i];
      if (String(row[0]) === "") continue;
      const qId = String(row[0]);
      const weight = row[9] ? Number(row[9]) : 10;
      questionWeights[qId] = weight;
  }

  let maxWeight = 0;
  let targetIds = questionIds && Array.isArray(questionIds) && questionIds.length > 0 ? questionIds : Object.keys(questionWeights);
  const validQuestionSet = new Set(targetIds);

  targetIds.forEach(id => {
      if (questionWeights[id] !== undefined) maxWeight += questionWeights[id];
  });

  let obtainedWeight = 0;
  let correctCount = 0;
  const itemAnalysis = {};      
  const itemAnalysisRow = [];   
  const rawAnswersRow = [];     

  for (let i = 1; i < qData.length; i++) {
    const row = qData[i];
    if (String(row[0]) === "") continue;
    const qId = String(row[0]);
    const qType = row[2];
    const keyRaw = String(row[8] || "").toUpperCase().trim();
    const weight = row[9] ? Number(row[9]) : 10;
    
    let isCorrect = false;
    const userAns = answers[qId];
    let ansStr = ""; 

    if (userAns !== undefined && userAns !== null) {
        if (qType === 'PG') {
            const val = String(userAns).split('-').pop(); 
            ansStr = val;
            if (val === keyRaw) isCorrect = true;
        } 
        else if (qType === 'PGK') {
            const keys = keyRaw.split(',').map(k=>k.trim());
            const uVals = Array.isArray(userAns) ? userAns.map(u => u.split('-').pop()) : [];
            ansStr = uVals.join(',');
            if (uVals.length === keys.length && keys.every(k => uVals.includes(k))) isCorrect = true;
        } 
        else if (qType === 'BS') {
            const keys = keyRaw.split(',').map(k=>k.trim());
            const uVals = []; 
            let allMatch = true;
            if (keys.length > 0) {
                for(let k=0; k<keys.length; k++) {
                   const subId = `${qId}-S${k+1}`;
                   const uBool = userAns[subId]; 
                   const keyBool = (keys[k] === 'B' || keys[k] === 'TRUE');
                   uVals.push(uBool ? 'B' : 'S');
                   if (uBool !== keyBool) allMatch = false;
                }
                ansStr = uVals.join(',');
                if (allMatch) isCorrect = true;
            }
        }
    } else {
        ansStr = "-";
    }

    if (validQuestionSet.has(qId)) {
        if (isCorrect) {
            obtainedWeight += weight; 
            correctCount++;
        }
    }

    const scoreVal = isCorrect ? 1 : 0;
    itemAnalysis[qId] = scoreVal;
    if (itemAnalysisRow.length < 100) itemAnalysisRow.push(scoreVal); 
    if (rawAnswersRow.length < 100) rawAnswersRow.push(ansStr);
  }

  let wrongCount = 0;
  if (displayedCount && Number(displayedCount) > 0) wrongCount = Number(displayedCount) - correctCount;
  else wrongCount = (qData.length - 1) - correctCount; 
  if (wrongCount < 0) wrongCount = 0;

  while(itemAnalysisRow.length < 100) itemAnalysisRow.push("");
  while(rawAnswersRow.length < 100) rawAnswersRow.push("");

  let finalScore = 0;
  if (maxWeight > 0) {
      finalScore = (obtainedWeight / maxWeight) * 100;
      finalScore = parseFloat(finalScore.toFixed(2));
  }

  const safeUsername = toSheetValue(username);
  const ss = getResultSS(username);

  let shNilai = ss.getSheetByName(SHEET_RESULTS);
  if (!shNilai) {
      shNilai = ss.insertSheet(SHEET_RESULTS);
      shNilai.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Nilai", "Analisis_JSON", "Durasi", "ID Paket"]);
  }
  shNilai.appendRow([timestamp, safeUsername, fullname, school, subject, finalScore, JSON.stringify(itemAnalysis), durationStr, idPaket]);
  
  let shRekap = ss.getSheetByName(SHEET_REKAP);
  if (shRekap) {
    const rekapRow = [timestamp, safeUsername, fullname, school, subject, durationStr, correctCount, wrongCount, finalScore, JSON.stringify(itemAnalysis), idPaket];
    shRekap.appendRow(rekapRow.concat(itemAnalysisRow));
  }

  let shJawab = ss.getSheetByName(SHEET_JAWABAN);
  if (shJawab) {
    const jawabRow = [timestamp, fullname, school, subject, finalScore];
    shJawab.appendRow(jawabRow.concat(rawAnswersRow));
  }
  
  let shRank = ss.getSheetByName(SHEET_RANKING);
  if (!shRank) {
      shRank = ss.insertSheet(SHEET_RANKING);
      shRank.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Durasi", "Nilai", "ID Paket"]);
  }
  shRank.appendRow([timestamp, safeUsername, fullname, school, subject, durationStr, finalScore, idPaket]);

  logUserActivity(username, fullname, "FINISH", `${subject}: ${finalScore}`);
  setUserStatus(username, "FINISHED"); // Update Status
  
  return { success: true, score: finalScore };
}

// --- SESSION & SCHEDULE MANAGEMENT ---

function assignTestGroup(usernames, examId, session, idPaket) {
  const userSS = getUserSS();
  if (!userSS) return { success: false, message: "User Spreadsheet not found" };
  const sheet = userSS.getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Sheet Users not found" };
  const data = sheet.getDataRange().getDisplayValues();
  if (data[0].length < 16) { 
      sheet.getRange(1, 8).setValue("Active_Exam"); 
      sheet.getRange(1, 9).setValue("Session"); 
      sheet.getRange(1, 16).setValue("ID_PAKET"); 
  }
  const userMap = new Map();
  usernames.forEach(u => userMap.set(String(u).toLowerCase(), true));
  for (let i = 1; i < data.length; i++) {
    const dbUser = String(data[i][1]).toLowerCase();
    if (userMap.has(dbUser)) { 
        sheet.getRange(i + 1, 8).setValue(examId); 
        if(session) sheet.getRange(i + 1, 9).setValue(session); 
        if(idPaket !== undefined) sheet.getRange(i + 1, 16).setValue(idPaket);
    }
  }
  
  SpreadsheetApp.flush();
  
  // Invalidate Cache
  CacheService.getScriptCache().remove("STUDENTS_DATA");
  
  return { success: true };
}

function updateUserSessions(updates) {
  try {
    const ss = getUserSS();
    const sheet = ss.getSheetByName(SHEET_USERS);
    if (!sheet) return { success: false, message: "Sheet Users not found" };
    
    const students = getCachedStudents();
    
    updates.forEach(u => {
      const uname = String(u.username).toLowerCase().trim();
      const student = students[uname];
      if (student && student.rowIndex) {
        sheet.getRange(student.rowIndex, 9).setValue(u.session);
      }
    });
    
    SpreadsheetApp.flush();
    // Invalidate Cache
    CacheService.getScriptCache().remove("STUDENTS_DATA");
    
    return { success: true };
  } catch (e) {
    console.error("Update Sessions Failed", e);
    return { success: false, message: String(e) };
  }
}

function resetLogin(username) {
  const userSS = getUserSS();
  const userSheet = userSS.getSheetByName(SHEET_USERS);
  let fullname = "Admin Reset";
  
  if (userSheet) {
      const data = userSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).toLowerCase().trim() === String(username).toLowerCase().trim()) {
              fullname = data[i][4]; // Get real name
              break; 
          }
      }
  }
  // Ensure "RESET" action is logged
  logUserActivity(username, fullname, "RESET", "Manual Reset by Admin");
  
  // Directly update Status to OFFLINE
  setUserStatus(username, "OFFLINE");
  SpreadsheetApp.flush();
  
  return { success: true };
}

function getSchoolSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName(SHEET_SCHEDULE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const schedules = [];
  for(let i=1; i<data.length; i++) {
    if(data[i] && data[i][0]) { 
      schedules.push({ 
        school: data[i][0], 
        gelombang: data[i][1], 
        tanggal: data[i][2], 
        tanggal_selesai: data[i][3] || data[i][2],
        show_token: String(data[i][4]).toUpperCase().trim() === 'TRUE'
      }); 
    }
  }
  return schedules;
}

function saveSchoolSchedules(schedules) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { success: false, message: "No active spreadsheet" };
    let sheet = ss.getSheetByName(SHEET_SCHEDULE);
    
    if (!sheet) { 
      sheet = ss.insertSheet(SHEET_SCHEDULE); 
      sheet.appendRow(["Nama_Sekolah", "Gelombang", "Tanggal_Mulai", "Tanggal_Selesai", "Tampilkan_Token"]); 
    }
    
    // Ensure headers exist if sheet was empty
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Nama_Sekolah", "Gelombang", "Tanggal_Mulai", "Tanggal_Selesai", "Tampilkan_Token"]); 
    }

    // Clear existing data (keep header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const lastCol = Math.max(sheet.getLastColumn(), 5);
        sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    }
    
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
        const rows = schedules.filter(s => s).map(s => [
            String(s.school || ''),
            String(s.gelombang || ''),
            String(s.tanggal || ''),
            String(s.tanggal_selesai || s.tanggal || ''),
            (s.show_token === true || String(s.show_token).toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE'
        ]);
        
        if (rows.length > 0) {
            sheet.getRange(2, 1, rows.length, 5).setValues(rows);
        }
    }
    
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) {
    console.error("Save Schedules Failed", e);
    return { success: false, message: String(e) };
  }
}

// --- SURVEY LOGIC ---

function submitSurvey(username, fullname, school, kecamatan, surveyType, answers, startTimeEpoch) {
  if (!surveyType) return { success: false, message: "Survey type is required" };
  const ss = getResultSS(username);
  const now = new Date();
  const startDt = new Date(Number(startTimeEpoch));
  const diff = Math.max(0, now.getTime() - startDt.getTime());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const durationStr = `${m}m ${s}s`;

  const header = ["Timestamp", "Username", "Nama", "Sekolah", "Kecamatan", "Jenis Survey", "Durasi", "Total Skor", "Rata-rata"];
  for(let k=1; k<=50; k++) header.push(`S${k}`);
  const sheet = initSheetHeaders(ss, SHEET_REKAP_SURVEY, header);
  
  const qSS = getBankSoalSS();
  const qSheet = qSS.getSheetByName(surveyType);
  let orderedIDs = [];
  if (qSheet) {
      const qData = qSheet.getDataRange().getValues();
      for(let i=1; i<qData.length; i++) {
          if (qData[i][0]) orderedIDs.push(String(qData[i][0]));
      }
  } else {
      for(let i=1; i<=50; i++) orderedIDs.push(`S${i}`);
  }

  let totalScore = 0;
  let count = 0;
  const answerValues = [];
  
  for (let i = 0; i < orderedIDs.length; i++) {
      const key = orderedIDs[i];
      if (answers && answers[key]) {
          let val = Number(answers[key]);
          if (val < 1) val = 1;
          if (val > 4) val = 4;
          totalScore += val;
          count++;
          answerValues.push(val);
      } else {
          answerValues.push("");
      }
  }
  
  const avg = count > 0 ? (totalScore / count).toFixed(2) : 0;
  while(answerValues.length < 50) answerValues.push("");

  sheet.appendRow([now, toSheetValue(username), fullname, school, kecamatan, String(surveyType).replace('Survey_', ''), durationStr, totalScore, avg].concat(answerValues));
  logUserActivity(username, fullname, "SURVEY", `${surveyType} (Score: ${totalScore})`);
  return { success: true };
}

function getAllResultSS(allConfigs) {
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  if (!allConfigs) allConfigs = getAllConfigValues();
  const resultSSIds = new Set();
  for (const key in allConfigs) {
    if (key.startsWith("SS_HASIL_")) {
      resultSSIds.add(allConfigs[key]);
    }
  }
  if (mainSS) resultSSIds.add(mainSS.getId());
  
  const spreadsheets = [];
  resultSSIds.forEach(id => {
    if (id) {
      try {
        spreadsheets.push(SpreadsheetApp.openById(id));
      } catch(e) {
        console.error("Failed to open SS: " + id, e);
      }
    }
  });
  return spreadsheets;
}

function adminGetSurveyRecap(surveyType) {
    if (!surveyType) return [];
    
    const resultSSList = getAllResultSS();
    const results = [];
    
    resultSSList.forEach(ss => {
        const sheet = ss.getSheetByName(SHEET_REKAP_SURVEY);
        if (!sheet) return;
        
        const data = sheet.getDataRange().getDisplayValues();
        if(data.length < 2) return; 
        
        const header = data[0]; 
        const typeFilter = String(surveyType).replace('Survey_', '').toLowerCase().trim(); 
        
        const h = {};
        header.forEach((val, idx) => { h[String(val).toLowerCase().trim()] = idx; });
        
        let idxJenis = h["jenis survey"];
        if (idxJenis === undefined) idxJenis = h["jenissurvey"];
        if (idxJenis === undefined) idxJenis = h["jenis_survey"];
        if (idxJenis === undefined && header.length > 5) idxJenis = 5; 
    
        for(let i=1; i<data.length; i++) {
            // Robust value extraction for filtering
            const cellValue = idxJenis !== undefined && data[i].length > idxJenis 
                              ? (data[i][idxJenis] === null ? "" : String(data[i][idxJenis])) 
                              : "";
            const rowType = cellValue.toLowerCase().trim();
            const isMatch = rowType === typeFilter || rowType.includes(typeFilter) || typeFilter.includes(rowType);
            
            if(isMatch) {
                const items = {};
                header.forEach((colName, colIdx) => {
                    if(colName && (/^S\d+$/.test(colName) || /^S\d+\s+/.test(colName))) {
                        items[colName] = (data[i].length > colIdx) ? data[i][colIdx] : "";
                    }
                });
    
                const getVal = (keys, fallbackIdx) => {
                    for(const k of keys) if (h[k] !== undefined && data[i].length > h[k]) return data[i][h[k]];
                    if (fallbackIdx !== undefined && data[i].length > fallbackIdx) return data[i][fallbackIdx];
                    return "";
                };
    
                results.push({
                    timestamp: getVal(["timestamp", "waktu"], 0),
                    username: getVal(["username", "user"], 1),
                    nama: getVal(["nama", "nama peserta"], 2),
                    sekolah: getVal(["sekolah", "asal sekolah"], 3),
                    kecamatan: getVal(["kecamatan", "wilayah"], 4),
                    durasi: getVal(["durasi", "waktu pengerjaan"], 6),
                    total: getVal(["total skor", "total", "nilai"], 7),
                    rata: getVal(["rata-rata", "rata", "mean"], 8),
                    items: items 
                });
            }
        }
    });
    return results;
}

// --- DATA FEED & ANALYTICS ---

function getDashboardData() {
  const userSS = getUserSS(); // Use User SS
  if (!userSS) return { users: {}, totalUsers: 0, activeUsers: 0, finishedUsers: 0, sessions: {}, subjects: [], schedules: [] };
  const users = {};
  let totalUsers = 0;
  const allConfigs = getAllConfigValues(); // Get configs once at start

  const uSheet = userSS.getSheetByName(SHEET_USERS);
  if (uSheet) {
    const d = uSheet.getDataRange().getValues(); // Use getValues() for speed
    for(let i=1; i<d.length; i++) {
        let role = String(d[i][3]).trim().toLowerCase();
        if (!role) role = 'siswa';
        const uname = String(d[i][1]).trim().toLowerCase();
        if (uname) {
            const rawStatus = d[i][11] || 'OFFLINE';
            users[uname] = { 
                username: d[i][1], 
                fullname: d[i][4], 
                school: d[i][6], 
                kecamatan: d[i][9] || '-', 
                status: rawStatus, 
                active_exam: d[i][7] || '-', 
                session: d[i][8] || '-', 
                role: role,
                photo_url: d[i][10] || '',
                id_sekolah: d[i][12] || '',
                id_gugus: d[i][13] || '',
                id_kecamatan: d[i][14] || ''
            };
            if (role === 'siswa') totalUsers++;
        }
    }
  }

  const aSheet = userSS.getSheetByName(SHEET_ADMINS);
  if (aSheet) {
      const ad = aSheet.getDataRange().getValues(); // Use getValues()
      for(let i=1; i<ad.length; i++) {
          const uname = String(ad[i][1]).trim().toLowerCase();
          if (uname && !users[uname]) {
              users[uname] = { 
                  username: ad[i][1], 
                  fullname: ad[i][4], 
                  school: ad[i][6] || '-', 
                  kecamatan: ad[i][7] || '-', 
                  status: 'OFFLINE', 
                  active_exam: '-', 
                  session: '-', 
                  role: String(ad[i][3]).trim().toLowerCase(),
                  photo_url: ad[i][8] || '',
                  id_sekolah: ad[i][9] || '',
                  id_gugus: ad[i][10] || '',
                  id_kecamatan: ad[i][11] || ''
              };
          }
      }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lSheet = ss ? ss.getSheetByName(SHEET_LOGS) : null;
  const feed = [];
  if (lSheet) {
      const lastRow = lSheet.getLastRow();
      if (lastRow > 1) {
          const numRows = Math.min(100, lastRow - 1); // Read last 100 rows of logs
          const startRow = lastRow - numRows + 1;
          const d = lSheet.getRange(startRow, 1, numRows, lSheet.getLastColumn()).getValues();
          // Iterate backwards through rows to get the latest logs
          for(let i = d.length - 1; i >= 0 && feed.length < 20; i--) {
              const rowDate = new Date(d[i][0]);
              const uname = String(d[i][1]).trim().toLowerCase();
              const fullname = d[i][2];
              let logs = [];
              try {
                logs = JSON.parse(d[i][3]);
              } catch(e) { continue; }

              // Iterate backwards through logs in the JSON for that day
              for (let j = logs.length - 1; j >= 0 && feed.length < 20; j--) {
                  const log = logs[j];
                  const act = String(log.action).toUpperCase();
                  const school = users[uname] ? users[uname].school : '-';
                  const kecamatan = users[uname] ? users[uname].kecamatan : '-';
                  let subject = '-';
                  if (act === 'START' || act === 'RESUME') subject = log.details;
                  else if (act === 'FINISH') { const det = String(log.details); subject = det.includes(':') ? det.split(':')[0] : det; } 
                  else if (act === 'SURVEY') subject = "Survey: " + log.details;
                  
                  const logTimestamp = new Date(`${rowDate.toLocaleDateString()} ${log.time}`);

                  feed.push({ 
                      timestamp: logTimestamp, 
                      timeString: log.time,
                      username: d[i][1], // original username casing
                      fullname: fullname, 
                      action: act, 
                      details: log.details, 
                      school: school, 
                      kecamatan: kecamatan, 
                      subject: subject 
                  });
              }
          }
      }
  }

  const counts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
  Object.values(users).forEach(u => { 
      if (u.role === 'siswa') {
          // Fallback if status in sheet is unexpected
          const st = u.status || 'OFFLINE';
          if (counts[st] !== undefined) counts[st]++;
          else counts['OFFLINE']++;
      }
  });
  
  const token = allConfigs['TOKEN'] || 'TOKEN';
  const duration = allConfigs['DURATION'] || 60;
  const maxQuestions = allConfigs['MAX_QUESTIONS'] || 0;
  const surveyDuration = allConfigs['SURVEY_DURATION'] || 30; 
  const schedules = getSchoolSchedules();
  
  // Determine active sessions
  const activeSessions = new Set();
  const now = new Date();
  const currentTimeStr = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm");
  
  // 1. Check by manual status (Primary)
  for (const key in allConfigs) {
    const k = key.toUpperCase();
    if ((k.startsWith("SESSION_") || k.startsWith("SESI_")) && k.endsWith("_STATUS")) {
      const status = String(allConfigs[key]).toUpperCase().trim();
      if (status === "ON" || status === "AKTIF" || status === "ACTIVE" || status === "TRUE" || status === "1") {
        const num = k.replace(/[^0-9]/g, "");
        if (num) activeSessions.add(num);
      }
    }
  }

  // 2. Check by time schedule (Secondary)
  for (let i = 1; i <= 10; i++) {
    const start = allConfigs[`SESI_${i}_START`] || allConfigs[`SESSION_${i}_START`];
    const end = allConfigs[`SESI_${i}_END`] || allConfigs[`SESSION_${i}_END`];
    if (start && end && currentTimeStr >= start && currentTimeStr <= end) {
      activeSessions.add(i.toString());
    }
  }

  return { 
    students: [], 
    questionsMap: {}, 
    totalUsers, 
    token: token, 
    duration: Number(duration), 
    maxQuestions: Number(maxQuestions), 
    surveyDuration: Number(surveyDuration), 
    statusCounts: counts, 
    activityFeed: feed, 
    allUsers: Object.values(users),
    schedules: schedules,
    configs: allConfigs,
    activeSessions: Array.from(activeSessions)
  };
}

function getRecapData() {
  const allResultSS = getAllResultSS();
  const userSS = getUserSS(); // Use User SS
  const usersSheet = userSS ? userSS.getSheetByName(SHEET_USERS) : null;
  const usersData = usersSheet ? usersSheet.getDataRange().getDisplayValues() : [];
  const userMap = new Map();
  for(let i=1; i<usersData.length; i++) {
      if(usersData[i][1]) userMap.set(String(usersData[i][1]).toLowerCase().trim(), { school: usersData[i][6], kecamatan: usersData[i][9] });
  }

  const recaps = [];
  allResultSS.forEach(ss => {
      const sheet = ss.getSheetByName(SHEET_REKAP);
      if (!sheet) return;
      const data = sheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
          const username = String(data[i][1]).toLowerCase().trim();
          const userDetail = userMap.get(username) || { school: data[i][3], kecamatan: '-' };
          recaps.push({ 
              timestamp: data[i][0], 
              username: username,
              fullname: data[i][2], 
              school: userDetail.school, 
              subject: data[i][4], 
              duration: data[i][5], 
              correct: data[i][6], 
              wrong: data[i][7], 
              score: data[i][8],
              analisis: data[i][9],
              id_paket: data[i][10],
              kecamatan: userDetail.kecamatan
          });
      }
  });
  return recaps;
}

function getAnalysisData(subject) {
  const resultSSList = getAllResultSS();
  const scores = [];
  resultSSList.forEach(ss => {
    const sheet = ss.getSheetByName(SHEET_RESULTS);
    if (sheet) {
      const data = sheet.getDataRange().getDisplayValues();
      for(let i=1; i<data.length; i++) {
        if(!data[i][0]) continue;
        if(String(data[i][4]).toLowerCase() === String(subject).toLowerCase()) {
           const s = parseFloat(data[i][5]);
           if(!isNaN(s)) scores.push(s);
        }
      }
    }
  });
  if (scores.length === 0) return { averageScore: 0, highestScore: 0, lowestScore: 0 };
  const sum = scores.reduce((a,b) => a+b, 0);
  const avg = (sum / scores.length).toFixed(2);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return { averageScore: avg, highestScore: max, lowestScore: min };
}
