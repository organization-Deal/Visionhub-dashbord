import type { AIReviewPayload, Bindings, ContentRow } from '../types';

const OPENAI_BASE = 'https://api.openai.com/v1';

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('OpenAI returned non-JSON output');
  }
}

async function responses(env: Bindings, input: any[]) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  const model = env.OPENAI_MODEL || 'gpt-6-astra';
  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`OpenAI error: ${data?.error?.message || res.statusText}`);
  return extractResponseText(data);
}

export async function generateBrief(env: Bindings, content: ContentRow, extraContext = '') {
  const prompt = `
คุณคือ Content Strategist ของ Visionhub / DEAL! Investment Matching
สร้าง Production Brief ภาษาไทยสำหรับคอนเทนต์นี้ โดยให้ตรงกับกลยุทธ์: ทุกชิ้นต้องทำหน้าที่ UNDERSTAND, DESIRE หรือ PROOF อย่างน้อยหนึ่งข้อ

ข้อมูล:
- Content ID: ${content.id}
- Title: ${content.title}
- Product: ${content.product}
- Project: ${content.project || '-'}
- Content Type: ${content.content_type || '-'}
- Purpose: ${content.purpose || '-'}
- Platform: ${content.platform || '-'}
- Format: ${content.format || '-'}
- Production Level: ${content.production_level || '-'}
- Camera Required: ${content.camera_required || '-'}
- CTA: ${content.cta || '-'}
- Context เพิ่มเติม: ${extraContext || '-'}

ตอบเป็น JSON object เท่านั้น ตาม schema:
{
  "objective":"...",
  "primary_purpose":["UNDERSTAND"],
  "hooks":["...","...","..."],
  "script_outline":["..."],
  "shot_list":[{"shot":"...","camera":"DSLR|iPhone|Graphic","note":"..."}],
  "key_messages":["..."],
  "proof_needed":["..."],
  "cta":"...",
  "thumbnail_text":"...",
  "production_notes":["..."]
}
`;

  const text = await responses(env, [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
  return extractJson(text);
}

export async function reviewContent(
  env: Bindings,
  content: ContentRow,
  input: { transcript?: string; notes?: string; frame_urls?: string[] },
): Promise<AIReviewPayload> {
  const prompt = `
คุณคือ Content QA Lead ของ Visionhub / DEAL!
ให้คะแนนคอนเทนต์ตามเกณฑ์ 0-10 และตรวจว่า Viewer เข้าใจ DEAL!, Product และ Next Action หรือไม่
ห้ามให้คะแนนตามความชอบส่วนตัว ให้ประเมินตาม Brief / Funnel: UNDERSTAND, DESIRE, PROOF

Content:
- ID: ${content.id}
- Title: ${content.title}
- Product: ${content.product}
- Type: ${content.content_type || '-'}
- Intended Purpose: ${content.purpose || '-'}
- CTA: ${content.cta || '-'}
- Camera Required: ${content.camera_required || '-'}
- Camera Used: ${content.camera_used || '-'}

Transcript:
${input.transcript || content.script || '(ไม่มี transcript)'}

Notes:
${input.notes || '-'}

ตอบ JSON เท่านั้น:
{
  "overall_score":0,
  "hook_score":0,
  "clarity_score":0,
  "proof_score":0,
  "cta_score":0,
  "brand_score":0,
  "visual_score":0,
  "summary":"...",
  "recommendations":["..."],
  "purpose_detected":["UNDERSTAND","DESIRE","PROOF"],
  "issues":["..."]
}
`;

  const contentParts: any[] = [{ type: 'input_text', text: prompt }];
  for (const url of (input.frame_urls || []).slice(0, 8)) {
    contentParts.push({ type: 'input_image', image_url: url });
  }
  const text = await responses(env, [{ role: 'user', content: contentParts }]);
  return extractJson(text) as AIReviewPayload;
}

export async function analyzePerformance(env: Bindings, payload: unknown) {
  const prompt = `
คุณคือ Performance Analyst ของ Visionhub
วิเคราะห์ข้อมูล Content Performance ด้านล่าง โดยให้ความสำคัญกับ Relevant Reach, Qualified Lead และ Revenue มากกว่า Vanity Metrics
สรุปเป็น JSON ภาษาไทยเท่านั้น:
{
  "wins":["..."],
  "problems":["..."],
  "hypotheses":["..."],
  "next_actions":["..."],
  "content_to_repeat":["..."],
  "content_to_reduce":["..."]
}

DATA:
${JSON.stringify(payload)}
`;
  const text = await responses(env, [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
  return extractJson(text);
}
