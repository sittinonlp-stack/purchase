// ============================================================
// Build step — แปลง JSX → JS ล่วงหน้าด้วย esbuild (เลิกใช้ Babel ตอนรันไทม์)
// รันโดย Vercel ตอน deploy: `npm run build`
//
// สำคัญ: ไฟล์ทั้งหมดโหลดเป็น classic <script> ตามลำดับ และใช้ scope ร่วมกัน
//   - store.js ประกาศ `const { useState, ... } = React;` ที่ระดับบนสุด
//   - ไฟล์อื่นเรียก useState/useMemo แบบ bare โดยอาศัย scope ร่วมนี้
// ดังนั้น "ห้าม" rename identifier (minifyIdentifiers ต้องปิด) และต้องคงไฟล์แยกตามลำดับ
// มิฉะนั้น useState ใน store.js จะถูกเปลี่ยนชื่อ แต่ไฟล์อื่นยังอ้างชื่อเดิม → พัง
// ============================================================

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// ลำดับสำคัญ — store ต้องมาก่อน (ประกาศ hooks ที่ไฟล์อื่นใช้ร่วม)
const FILES = ['store', 'auth-ui', 'ui', 'forms', 'labor', 'receipt', 'views', 'app'];

const OUT_DIR = path.join(__dirname, 'dist');
fs.mkdirSync(OUT_DIR, { recursive: true });

let totalIn = 0, totalOut = 0;

for (const name of FILES) {
  const srcPath = path.join(__dirname, name + '.jsx');
  const code = fs.readFileSync(srcPath, 'utf8');

  const result = esbuild.transformSync(code, {
    loader: 'jsx',
    jsx: 'transform',                 // classic runtime → React.createElement
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    minifyWhitespace: true,           // ตัด whitespace — ปลอดภัย ลดขนาดได้มาก
    minifySyntax: false,              // ปิดไว้ — กันความเสี่ยงกับ scope ร่วมข้ามไฟล์
    minifyIdentifiers: false,         // ⚠️ ห้ามเปลี่ยนชื่อตัวแปร (scope ร่วมข้ามไฟล์)
    charset: 'utf8',                  // คงตัวอักษรไทยไว้ ไม่ escape เป็น \uXXXX
    target: 'es2018',
    sourcefile: name + '.jsx',
  });

  for (const w of result.warnings) {
    console.warn(`[build] ${name}.jsx: ${w.text}`);
  }

  const outPath = path.join(OUT_DIR, name + '.js');
  fs.writeFileSync(outPath, result.code, 'utf8');

  totalIn += Buffer.byteLength(code, 'utf8');
  totalOut += Buffer.byteLength(result.code, 'utf8');
  console.log(`[build] ${name}.jsx → dist/${name}.js`);
}

console.log(`[build] เสร็จสิ้น ${FILES.length} ไฟล์ — ${(totalIn / 1024).toFixed(0)}KB → ${(totalOut / 1024).toFixed(0)}KB`);
