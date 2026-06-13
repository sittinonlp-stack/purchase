// ============================================================
// api/scan-receipt.js — Vercel Serverless Function (Node.js)
// อ่านรายการสินค้าจากรูปใบสั่งซื้อ/ใบเสร็จด้วย Claude vision
// เก็บ ANTHROPIC_API_KEY ใน Vercel env (ไม่ expose ใน frontend)
// CommonJS + fetch ในตัวของ Node 20 (ไม่ต้องลง dependency)
// ============================================================

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'ใช้ได้เฉพาะ POST' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' });
    return;
  }

  const { image, mediaType } = req.body || {};
  if (!image) {
    res.status(400).json({ error: 'ไม่พบรูปภาพ' });
    return;
  }

  // tool use — บังคับให้ผลลัพธ์เป็นโครงสร้างที่แน่นอน (กัน JSON เพี้ยน)
  const tool = {
    name: 'fill_items',
    description: 'กรอกรายการสินค้า/วัสดุ/เครื่องจักรที่อ่านได้จากเอกสาร',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'รายการสินค้าทั้งหมดในเอกสาร',
          items: {
            type: 'object',
            properties: {
              name:  { type: 'string', description: 'ชื่อรายการสินค้า/วัสดุ/เครื่องจักร' },
              qty:   { type: 'number', description: 'จำนวน (ตัวเลข) ถ้าไม่ระบุใส่ 1' },
              unit:  { type: 'string', description: 'หน่วยนับ เช่น ชิ้น เส้น ถุง กก. ถ้าไม่ระบุใส่ค่าว่าง' },
              price: { type: 'number', description: 'ราคาต่อหน่วย (ตัวเลข) ถ้าไม่ชัดเจนใส่ 0' },
            },
            required: ['name', 'qty', 'unit', 'price'],
          },
        },
      },
      required: ['items'],
    },
  };

  const prompt =
    'นี่คือรูปใบสั่งซื้อ/ใบเสร็จ/ใบเสนอราคางานก่อสร้าง (ภาษาไทย) ' +
    'ช่วยอ่านรายการสินค้าทั้งหมดในเอกสาร แล้วเรียกใช้เครื่องมือ fill_items ' +
    'โดยแยกเป็น ชื่อสินค้า / จำนวน / หน่วย / ราคาต่อหน่วย\n' +
    'สำคัญ: price ต้องเป็น "ราคาต่อหน่วย" ไม่ใช่ราคารวม ' +
    '(ถ้าเอกสารแสดงแต่ราคารวม ให้นำมาหารด้วยจำนวนเพื่อหาราคาต่อหน่วย)\n' +
    'ถ้าข้อมูลใดไม่ชัดเจน ให้ใช้ค่าเริ่มต้น (จำนวน=1, หน่วย=ค่าว่าง, ราคา=0) ' +
    'และอย่าเดารายการที่ไม่มีอยู่จริงในเอกสาร';

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'fill_items' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[scan-receipt] Claude API error:', r.status, errText);
      let msg = 'เรียก AI ไม่สำเร็จ';
      if (r.status === 401) msg = 'API key ไม่ถูกต้อง — ตรวจสอบ ANTHROPIC_API_KEY ใน Vercel';
      else if (r.status === 429) msg = 'ใช้งานเกินโควต้า ลองใหม่อีกครั้งภายหลัง';
      else if (r.status === 529) msg = 'ระบบ AI กำลังหนาแน่น ลองใหม่อีกครั้ง';
      res.status(502).json({ error: msg });
      return;
    }

    const data = await r.json();
    const toolBlock = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'fill_items');
    const items = (toolBlock && toolBlock.input && Array.isArray(toolBlock.input.items))
      ? toolBlock.input.items
      : [];
    res.status(200).json({ items });
  } catch (err) {
    console.error('[scan-receipt] error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอ่านรูป ลองใหม่อีกครั้ง' });
  }
};
