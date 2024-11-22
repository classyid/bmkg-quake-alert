# BMKG Earthquake Alert System 🌍

## 💡 Fitur Utama
- Mengambil data gempa terkini dari BMKG secara otomatis
- Mengirim notifikasi WhatsApp dengan format yang informatif
- Menyimpan riwayat gempa dalam Google Spreadsheet
- Sistem logging untuk pemantauan kinerja
- Mendukung pengiriman ke multiple nomor WhatsApp
- Includes peta lokasi gempa (shakemap)

## 🛠️ Teknologi yang Digunakan
- Google Apps Script
- BMKG XML API
- WhatsApp Mpedia API
- Google Spreadsheet sebagai database

## 📖 Cara Penggunaan

### Prerequisite
1. Google Account
2. API Key WhatsApp Mpedia
3. Spreadsheet dengan 3 sheet:
   - gempa (data gempa)
   - phonebook (daftar nomor WhatsApp)
   - logs (log sistem)

### Konfigurasi
1. Buat project baru di Google Apps Script
2. Copy seluruh kode ke editor
3. Sesuaikan konfigurasi di bagian CONFIG:
   ```javascript
   const CONFIG = {
     SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
     WA_API_KEY: 'YOUR_WHATSAPP_API_KEY',
     WA_SENDER: 'YOUR_WHATSAPP_NUMBER'
   }
   ```
4. Jalankan fungsi `createTrigger()` untuk mengaktifkan sistem

## 📝 Dokumentasi Fungsi

### getBMKGData()
Mengambil data gempa terkini dari BMKG dan memproses untuk notifikasi

### sendMultipleWhatsAppNotifications()
Mengirim notifikasi ke semua nomor yang terdaftar di phonebook

### saveToSpreadsheet()
Menyimpan data gempa ke Google Spreadsheet

### checkExistingData()
Mencegah duplikasi data gempa

## 🤝 Kontribusi
Contributions, issues, dan feature requests sangat diterima. Silakan buat pull request atau issue untuk diskusi lebih lanjut.

## 📄 Lisensi
MIT License - silakan gunakan dan modifikasi sesuai kebutuhan
