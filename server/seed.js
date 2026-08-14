const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Workspace = require('./models/Workspace');
const User = require('./models/User');
const Theme = require('./models/Theme');
const Feedback = require('./models/Feedback');

const CHANNELS = ['support_ticket', 'app_store', 'nps_survey', 'sales_call', 'community_post'];
const SENTIMENTS = ['POS', 'NEU', 'NEG'];

const THEME_NAMES = [
  { name: 'Onboarding', color: '#8b5cf6' },
  { name: 'Billing & Invoices', color: '#ef4444' },
  { name: 'Mobile Experience', color: '#3b82f6' },
  { name: 'Performance', color: '#f59e0b' },
  { name: 'SSO / Security', color: '#10b981' },
  { name: 'Export & Reporting', color: '#ec4899' },
];

const SAMPLE_CONTENT = [
  "Onboarding took forever — I couldn't figure out how to invite my team.",
  "The new dashboard is gorgeous and finally fast. Huge improvement.",
  "It does the job, but the mobile experience needs work.",
  "Prospect wants SSO before they'll sign — third time this month.",
  "Love the new export feature, saved me an hour today.",
  "Billing page keeps timing out when I try to download an invoice.",
  "Support response time has been amazing lately, big thanks.",
  "Can we get dark mode? Half my team is asking for it.",
  "The app crashed twice today while uploading feedback in bulk.",
  "Really appreciate how easy the CSV import was to use.",
  "Still waiting on a fix for the search bug from last week.",
  "Great product overall, just wish reporting was more customizable.",
  "Invoice totals don't match what we agreed on the call.",
  "Mobile app logs me out every single day, very annoying.",
  "The Q&A feature answered our question perfectly, impressive.",
];

console.log(SAMPLE_CONTENT);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  // Clear existing data
  await Promise.all([
    Workspace.deleteMany({}),
    User.deleteMany({}),
    Theme.deleteMany({}),
    Feedback.deleteMany({}),
  ]);

  // 1. Create workspace
  const workspace = await Workspace.create({ name: 'Acme SaaS Co.' });

  // 2. Create three users, one per role
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await User.create({
    name: 'Alex Admin',
    email: 'admin@acme.test',
    passwordHash,
    role: 'ADMIN',
    workspaceId: workspace._id,
  });

  const analyst = await User.create({
    name: 'Ana Analyst',
    email: 'analyst@acme.test',
    passwordHash,
    role: 'ANALYST',
    workspaceId: workspace._id,
  });

  const viewer = await User.create({
    name: 'Vic Viewer',
    email: 'viewer@acme.test',
    passwordHash,
    role: 'VIEWER',
    workspaceId: workspace._id,
  });

  // 3. Create themes
  const themes = await Theme.insertMany(
    THEME_NAMES.map((t) => ({ ...t, workspaceId: workspace._id }))
  );

  // 4. Create ~120 feedback items with randomized but realistic data
  const feedbackItems = [];
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 120; i++) {
    const content = SAMPLE_CONTENT[i % SAMPLE_CONTENT.length];
    const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
    const sentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];
    const sentimentScore =
      sentiment === 'POS' ? Math.random() * 0.5 + 0.5 :
      sentiment === 'NEG' ? -(Math.random() * 0.5 + 0.5) :
      (Math.random() * 0.4 - 0.2);
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const createdAt = new Date(now - Math.random() * THIRTY_DAYS_MS);

    feedbackItems.push({
      content,
      channel,
      customerLabel: `Customer ${i + 1}`,
      sentiment,
      sentimentScore: Number(sentimentScore.toFixed(2)),
      status: ['NEW', 'REVIEWED', 'ACTIONED'][Math.floor(Math.random() * 3)],
      workspaceId: workspace._id,
      themes: [{ themeId: randomTheme._id, confidence: Number((Math.random() * 0.4 + 0.6).toFixed(2)) }],
      createdAt,
    });
  }

  await Feedback.insertMany(feedbackItems);

  console.log('Seed complete:');
  console.log(`  Workspace: ${workspace.name} (${workspace._id})`);
  console.log(`  Users: admin@acme.test / analyst@acme.test / viewer@acme.test (password: Password123!)`);
  console.log(`  Themes: ${themes.length}`);
  console.log(`  Feedback items: ${feedbackItems.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});