const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const EXISTING_THEMES = [
  'Onboarding',
  'Billing & Invoices',
  'Mobile Experience',
  'Performance',
  'SSO / Security',
  'Export & Reporting',
];

async function classifyFeedback(content) {
  const prompt = `You are classifying customer feedback for a product analytics tool.

Feedback text: "${content}"

Existing themes (reuse these if they fit, don't invent near-duplicates): ${EXISTING_THEMES.join(', ')}

Return ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": <number between -1 and 1>,
  "themes": [<array of 1-2 theme name strings, reuse existing themes when they fit>],
  "featureArea": "<short 2-4 word label>",
  "rationale": "<one short sentence explaining the classification>"
}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Failed to parse AI response as JSON: ' + text.slice(0, 200));
  }

  if (!['POS', 'NEU', 'NEG'].includes(parsed.sentiment)) {
    throw new Error('Invalid sentiment value returned by AI.');
  }

  return parsed;
}

async function classifyBatch(items) {
  // items = [{ id, content }, ...] - max ~10 per call to keep prompt size reasonable

  const itemsList = items.map((item, i) => `${i}. "${item.content}"`).join('\n');

  const prompt = `You are classifying customer feedback for a product analytics tool.

Existing themes (reuse these if they fit, don't invent near-duplicates): ${EXISTING_THEMES.join(', ')}

Classify each numbered feedback item below. Return ONLY a valid JSON array, no markdown fences, no explanation, with exactly one object per item in the same order, each shaped like:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": <number between -1 and 1>,
  "themes": [<array of 1-2 theme name strings>],
  "featureArea": "<short 2-4 word label>"
}

Feedback items:
${itemsList}

Return a JSON array with ${items.length} objects, in the same order as the items above.`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length !== items.length) {
    throw new Error(`Expected array of ${items.length}, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
  }

  return parsed;
}

const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function askGrounded(question, contextItems) {
  const contextText = contextItems
    .map((item, i) => `[${i + 1}] "${item.content}" (channel: ${item.channel}, sentiment: ${item.sentiment || 'unknown'})`)
    .join('\n');

  const prompt = `You are answering a question about customer feedback using ONLY the feedback excerpts provided below. Do not invent or assume any feedback that isn't listed here.

Feedback excerpts:
${contextText}

Question: "${question}"

Instructions:
- Answer using only the excerpts above.
- Reference specific excerpt numbers like [1], [2] when citing evidence.
- If the excerpts don't contain enough information to answer, say so clearly rather than guessing.
- Keep your answer concise, 2-4 sentences.

Return ONLY valid JSON, no markdown fences, in this shape:
{
  "answer": "<your answer text, with [n] citations inline>",
  "citedIndexes": [<array of excerpt numbers you actually cited, e.g. [1, 3]>]
}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(text);
}

module.exports = { classifyFeedback, classifyBatch, embedText, cosineSimilarity, askGrounded, EXISTING_THEMES };

