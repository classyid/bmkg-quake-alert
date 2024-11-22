// Configuration
const CONFIG = {
  // Spreadsheet Configuration
  SPREADSHEET_ID: '<id-spreadsheet>',
  SHEET_GEMPA: 'gempa',
  SHEET_CONTACTS: 'phonebook',
  SHEET_LOGS: 'logs', // New sheet for logging
  
  // BMKG Configuration
  BMKG_URL: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.xml',
  BMKG_IMAGE_BASE_URL: 'https://data.bmkg.go.id/DataMKG/TEWS/',
  
  // WhatsApp Configuration
  WA_API_URL: 'https://mpedia/send-media',
  WA_API_KEY: '<apikey>',
  WA_SENDER: '<sender>',
  
  // Trigger Configuration
  TRIGGER_INTERVAL_MINUTES: 5,
  
  // Message Template
  MESSAGE_TEMPLATE: `
🚨 *INFO GEMPA TERKINI - BMKG* 🚨

📅 Tanggal: {tanggal}
🕒 Waktu: {jam} WIB

📊 *Parameter Gempa:*
• Magnitudo: *{magnitude} SR*
• Kedalaman: {kedalaman}
• Lokasi: {koordinat}
• Wilayah: {lokasi}

💢 *Dampak:*
• Potensi: {potensi}
• Dirasakan: {dirasakan}

🔍 *Informasi Teknis:*
• Koordinat: {lintang} - {bujur}
• Waktu Update: {datetime}

📍 Sumber: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)
⚠️ Mohon sebarkan informasi ini dengan bijak.

#InfoGempa #BMKG #Indonesia
`
};

// Fungsi untuk logging
function addLog(action, status, description) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(CONFIG.SHEET_LOGS) || ss.insertSheet(CONFIG.SHEET_LOGS);
  
  // Add headers if sheet is empty
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(['Timestamp', 'Action', 'Status', 'Description']);
  }
  
  // Add log entry
  logSheet.appendRow([
    new Date(),
    action,
    status,
    description
  ]);
  
  // Keep only last 1000 rows
  if (logSheet.getLastRow() > 1000) {
    logSheet.deleteRows(2, logSheet.getLastRow() - 1000);
  }
  
  // Also log to Apps Script logger
  Logger.log(`${action} - ${status}: ${description}`);
}

// Modifikasi fungsi getBMKGData untuk pengecekan data yang lebih ketat
function getBMKGData() {
  try {
    addLog('FETCH_START', 'INFO', 'Starting to fetch BMKG data');
    
    // Fetch XML data
    const response = UrlFetchApp.fetch(CONFIG.BMKG_URL);
    const xmlContent = response.getContentText();
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    
    addLog('FETCH_SUCCESS', 'SUCCESS', 'Successfully fetched BMKG data');
    
    // Get gempa element
    const gempa = root.getChild('gempa');
    
    // Extract data
    const data = {
      tanggal: gempa.getChildText('Tanggal'),
      jam: gempa.getChildText('Jam'),
      datetime: gempa.getChildText('DateTime'),
      magnitude: gempa.getChildText('Magnitude'),
      kedalaman: gempa.getChildText('Kedalaman'),
      koordinat: gempa.getChild('point').getChildText('coordinates'),
      lintang: gempa.getChildText('Lintang'),
      bujur: gempa.getChildText('Bujur'),
      lokasi: gempa.getChildText('Wilayah'),
      potensi: gempa.getChildText('Potensi'),
      dirasakan: gempa.getChildText('Dirasakan'),
      shakemap: CONFIG.BMKG_IMAGE_BASE_URL + gempa.getChildText('Shakemap')
    };
    
 // Check if data exists and get comparison result
const existingDataCheck = checkExistingData(data);

if (existingDataCheck.exists) {
  addLog('SKIP_PROCESS', 'INFO', `Data already exists (Match found in row ${existingDataCheck.row}), skipping save and notification`);
  return;
}
    
    // Jika sampai di sini berarti data baru
    addLog('NEW_DATA', 'INFO', `New earthquake data found: M${data.magnitude} at ${data.lokasi}`);
    
    // Simpan data baru
    saveToSpreadsheet(data);
    
    // Kirim notifikasi untuk data baru
    sendMultipleWhatsAppNotifications(data);
    
  } catch(error) {
    addLog('FETCH_ERROR', 'ERROR', error.toString());
  }
}

function checkExistingData(newData) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_GEMPA);
  
  if (!sheet) {
    return { exists: false, row: null };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { exists: false, row: null };
  }
  
  // Ambil semua data shakemap untuk perbandingan
  const data = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
  
  // Cek setiap baris
  for (let i = 0; i < data.length; i++) {
    const shakemap = data[i][0];
    if (shakemap === newData.shakemap) {
      return { exists: true, row: i + 2 }; // +2 karena index mulai dari 0 dan header di baris 1
    }
  }
  
  return { exists: false, row: null };
}

function saveToSpreadsheet(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_GEMPA) || ss.insertSheet(CONFIG.SHEET_GEMPA);
    
    // If sheet is empty, add headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'tanggal', 'jam', 'datetime', 'magnitude', 'kedalaman', 
        'wilayah', 'coordinates', 'lintang', 'bujur', 
        'potensi', 'dirasakan', 'shakemap'
      ]);
    }
    
    // Append data
    sheet.appendRow([
      data.tanggal,
      data.jam,
      data.datetime,
      data.magnitude,
      data.kedalaman,
      data.lokasi,
      data.koordinat,
      data.lintang,
      data.bujur,
      data.potensi,
      data.dirasakan,
      data.shakemap
    ]);
    
    addLog('SAVE_DATA', 'SUCCESS', `Saved earthquake data: M${data.magnitude} at ${data.lokasi}`);
  } catch(error) {
    addLog('SAVE_ERROR', 'ERROR', error.toString());
  }
}

function formatMessage(template, data) {
  return template.replace(
    /{(\w+)}/g,
    (match, key) => data[key] || match
  );
}

function sendMultipleWhatsAppNotifications(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const phonebookSheet = ss.getSheetByName(CONFIG.SHEET_CONTACTS);
    
    if (!phonebookSheet) {
      addLog('SEND_ERROR', 'ERROR', 'Phonebook sheet not found');
      return;
    }
    
    // Get all numbers from phonebook (starting from row 2)
    const numbers = phonebookSheet.getRange(2, 1, phonebookSheet.getLastRow() - 1, 1).getValues();
    
    // Prepare message
    const message = formatMessage(CONFIG.MESSAGE_TEMPLATE, data);
    
    // Send to each number
    numbers.forEach(([number]) => {
      if (number) { // Skip empty rows
        sendSingleWhatsAppMessage(number, message, data.shakemap);
      }
    });
    
  } catch(error) {
    addLog('SEND_MULTIPLE_ERROR', 'ERROR', error.toString());
  }
}

// Modifikasi fungsi sendSingleWhatsAppMessage untuk memisahkan pengiriman teks dan gambar
function sendSingleWhatsAppMessage(number, message, imageUrl) {
  try {
    // Kirim pesan teks dulu
    const textPayload = {
      'api_key': CONFIG.WA_API_KEY,
      'sender': CONFIG.WA_SENDER,
      'number': number,
      'message': message
    };
    
    const textOptions = {
      'method': 'post',
      'payload': textPayload,
      'muteHttpExceptions': true
    };
    
    // Kirim pesan teks
    const textResponse = UrlFetchApp.fetch('https://v7.kirimwa.classy.id/send-message', textOptions);
    addLog('SEND_WA_TEXT', 'SUCCESS', `Sent WhatsApp text to ${number}. Response: ${textResponse.getContentText()}`);
    
    // Tunggu sebentar sebelum kirim gambar
    Utilities.sleep(2000);
    
    // Kirim gambar
    const imagePayload = {
      'api_key': CONFIG.WA_API_KEY,
      'sender': CONFIG.WA_SENDER,
      'number': number,
      'caption': 'Peta Lokasi Gempa BMKG',
      'url': imageUrl,
      'media_type': 'image'
    };
    
    const imageOptions = {
      'method': 'post',
      'payload': imagePayload,
      'muteHttpExceptions': true
    };
    
    // Kirim gambar
    const imageResponse = UrlFetchApp.fetch(CONFIG.WA_API_URL, imageOptions);
    addLog('SEND_WA_IMAGE', 'SUCCESS', `Sent WhatsApp image to ${number}. Response: ${imageResponse.getContentText()}`);
    
  } catch(error) {
    addLog('SEND_SINGLE_ERROR', 'ERROR', `Error sending to ${number}: ${error.toString()}`);
  }
}

function createTrigger() {
  try {
    // Delete existing triggers first to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
    
    // Create new trigger
    ScriptApp.newTrigger('getBMKGData')
      .timeBased()
      .everyMinutes(CONFIG.TRIGGER_INTERVAL_MINUTES)
      .create();
    
    addLog('CREATE_TRIGGER', 'SUCCESS', `Trigger created to run every ${CONFIG.TRIGGER_INTERVAL_MINUTES} minutes`);
  } catch(error) {
    addLog('CREATE_TRIGGER_ERROR', 'ERROR', error.toString());
  }
}
