# ระบบลงทะเบียนเข้าชมศูนย์การงานอาชีพ

เว็บแอป Google Apps Script สำหรับลงทะเบียนผู้เข้าชมศูนย์การงานอาชีพ โรงเรียนศรีศักดิ์สุวรรณวิทยา พร้อมหน้า Dashboard สำหรับดูจำนวนผู้เข้าชมประจำวันแบบอัปเดตอัตโนมัติ

## ความสามารถหลัก

- ฟอร์มลงทะเบียนผู้เข้าชม พร้อมตรวจสอบข้อมูลที่จำเป็น
- บันทึกข้อมูลลง Google Sheets อัตโนมัติ
- ป้องกันการลงทะเบียนซ้ำในวันเดียวกันด้วยชื่อ - นามสกุล
- แสดงหมายเลขลำดับผู้เข้าชมหลังลงทะเบียนสำเร็จ
- Dashboard สรุปจำนวนผู้เข้าชมวันนี้
- แยกสถิติตามประเภทผู้เข้าร่วมและโซนที่สนใจ
- แสดงรายชื่อผู้เข้าชมล่าสุด 10 รายการ

## โครงสร้างไฟล์

```text
.
├── Code.js              # ฟังก์ชันฝั่ง Google Apps Script
├── Index.html           # หน้าแบบฟอร์มลงทะเบียน
├── Dashboard.html       # หน้า Dashboard ผู้เข้าชมวันนี้
├── Setup.html           # หน้าตั้งค่า SPREADSHEET_ID ครั้งแรก
├── appsscript.json      # manifest ของ Google Apps Script
├── .clasp.json.example  # ตัวอย่าง config สำหรับ clasp
└── .gitignore           # ignore ไฟล์ config ที่มี scriptId จริง
```

## ข้อมูลที่ระบบบันทึก

ระบบจะบันทึกข้อมูลลงชีตชื่อ `Visitors` โดยมีคอลัมน์ดังนี้

- Timestamp
- Visitor No.
- ชื่อ - นามสกุล
- หน่วยงาน / โรงเรียน
- เบอร์โทรศัพท์
- ประเภทผู้เข้าร่วม
- ประเภทอื่น ๆ
- โซนที่สนใจ
- หมายเหตุ
- Client Info

ถ้ายังไม่มีชีต `Visitors` ระบบจะสร้างชีตและหัวตารางให้อัตโนมัติเมื่อมีการลงทะเบียนครั้งแรก

## การตั้งค่า

### 1. ตั้งค่า Google Sheets

สร้าง Google Sheets สำหรับเก็บข้อมูลผู้เข้าชม แล้วตั้งค่า Spreadsheet ID ผ่านหน้า setup ของระบบ

```js
const SPREADSHEET_ID = PropertiesService
  .getScriptProperties()
  .getProperty("SPREADSHEET_ID");
const SHEET_NAME = "Visitors";
```

Spreadsheet ID คือส่วนที่อยู่ใน URL ของ Google Sheets:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

ถ้ายังไม่ได้ตั้งค่า `SPREADSHEET_ID` เมื่อเปิด Web App ระบบจะแสดงหน้า setup ให้อัตโนมัติ หรือเปิดโดยตรงได้ที่:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?page=setup
```

ในหน้า setup สามารถตั้งค่าได้ 2 วิธี:

- วาง `SPREADSHEET_ID` หรือ URL ของ Google Sheets แล้วกดบันทึก
- ถ้า Apps Script ผูกอยู่กับ Google Sheets อยู่แล้ว ให้กดใช้ Google Sheet ที่ผูกกับ Apps Script นี้ เพื่อดึง ID อัตโนมัติ

หลังตั้งค่าสำเร็จแล้ว หน้า setup จะไม่เปิดให้บันทึกทับผ่าน Web App เพื่อป้องกันคนที่มี URL เปลี่ยนค่า config หากต้องการเปลี่ยน `SPREADSHEET_ID` ให้แก้ผ่าน `Project Settings` > `Script Properties` ใน Apps Script Editor

### 2. ตั้งค่า clasp

คัดลอกไฟล์ตัวอย่างเป็น `.clasp.json`

```bash
cp .clasp.json.example .clasp.json
```

จากนั้นใส่ `scriptId` ของ Google Apps Script project

```json
{
  "scriptId": "ใส่_SCRIPT_ID_ของคุณ"
}
```

ไฟล์ `.clasp.json` ถูก ignore ไว้แล้ว เพราะมีค่า `scriptId` จริงของโปรเจกต์

### 3. ติดตั้งและเข้าสู่ระบบ clasp

ถ้ายังไม่มี clasp ให้ติดตั้งก่อน

```bash
npm install -g @google/clasp
clasp login
```

## การอัปโหลดโค้ดขึ้น Google Apps Script

หลังตั้งค่า `.clasp.json` แล้ว ให้ push ไฟล์ขึ้น Apps Script

```bash
clasp push
```

ถ้าต้องการเปิดโปรเจกต์ใน Apps Script Editor

```bash
clasp open
```

## การ Deploy เป็น Web App

ใน Google Apps Script Editor:

1. กด `Deploy` > `New deployment`
2. เลือกประเภทเป็น `Web app`
3. ตั้งค่า `Execute as` เป็น `Me`
4. ตั้งค่า `Who has access` เป็น `Anyone`
5. กด `Deploy`

ค่าใน `appsscript.json` ตั้งไว้สำหรับ Web App ดังนี้

```json
"webapp": {
  "executeAs": "USER_DEPLOYING",
  "access": "ANYONE_ANONYMOUS"
}
```

## URL สำหรับใช้งาน

หน้าแบบฟอร์มลงทะเบียน:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

หน้า Dashboard:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?page=dashboard
```

## การปรับแต่งเพิ่มเติม

ถ้ามีหน้าเว็บหลักของศูนย์ และต้องการให้ระบบพาผู้ใช้กลับไปหลังลงทะเบียนสำเร็จ ให้ใส่ URL ใน `Code.js`

```js
const HOME_URL = "https://example.com";
```

ถ้ายังไม่ต้องการ redirect ให้ปล่อยเป็นค่าว่าง

```js
const HOME_URL = "";
```

## หมายเหตุด้านสิทธิ์

ครั้งแรกที่เรียกใช้งาน Web App ระบบจะขอสิทธิ์ในการเข้าถึง Google Sheets ผ่านบัญชีผู้ deploy เพื่อใช้บันทึกและอ่านข้อมูลผู้เข้าชม
