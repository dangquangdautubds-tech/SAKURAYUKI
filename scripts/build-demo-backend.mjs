// Đóng gói apps-script/Code.gs thành module JS để chạy CHẾ ĐỘ XEM THỬ / kiểm thử (không dùng ở bản thật)
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const code = fs.readFileSync(root + 'apps-script/Code.gs', 'utf8');
const names = ['SpreadsheetApp', 'CacheService', 'LockService', 'PropertiesService', 'Utilities', 'UrlFetchApp', 'MailApp', 'DriveApp', 'ContentService', 'Session', 'ScriptApp', 'console'];
const out = `/* eslint-disable */\n// TỰ SINH từ apps-script/Code.gs bởi scripts/build-demo-backend.mjs — không sửa tay.\nexport function createBackend(svc) {\n  const { ${names.join(', ')} } = svc;\n${code}\n  return { doGet, doPost, setup, sendReminders, expireUnpaid, markPaid_, upsertImage_, writeRow_, readRows_, getSettings_, cacheClear_ };\n}\n`;
fs.writeFileSync(root + 'web/src/demo/backend.generated.js', out);
console.log('ok backend.generated.js', out.length);
