import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'newsletter.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  // US-001: Articles schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT,
      source_url TEXT NOT NULL,
      final_url TEXT,
      reading_time TEXT,
      newsletter_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS article_topics (
      article_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      PRIMARY KEY (article_id, topic_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- US-002: Aggregations and preferences schema
    CREATE TABLE IF NOT EXISTS aggregations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      insights TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aggregation_articles (
      aggregation_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      PRIMARY KEY (aggregation_id, article_id),
      FOREIGN KEY (aggregation_id) REFERENCES aggregations(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      is_relevant INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL UNIQUE,
      weight REAL DEFAULT 1.0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_articles_newsletter_date ON articles(newsletter_date);
    CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
    CREATE INDEX IF NOT EXISTS idx_aggregations_dates ON aggregations(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_article ON user_feedback(article_id);
  `);

  // Run migrations for existing databases
  runMigrations(db);
}

function runMigrations(db: Database.Database) {
  // Check if content column exists, if not add it
  const columns = db.pragma('table_info(articles)') as Array<{ name: string }>;
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('content')) {
    db.exec('ALTER TABLE articles ADD COLUMN content TEXT');
  }
  if (!columnNames.includes('final_url')) {
    db.exec('ALTER TABLE articles ADD COLUMN final_url TEXT');
  }
  if (!columnNames.includes('reading_time')) {
    db.exec('ALTER TABLE articles ADD COLUMN reading_time TEXT');
  }
}

// Type definitions for our database entities
export interface Article {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  source_url: string;
  final_url: string | null;
  reading_time: string | null;
  newsletter_date: string;
  created_at: string;
}

export interface Topic {
  id: number;
  name: string;
  created_at: string;
}

export interface Aggregation {
  id: number;
  start_date: string;
  end_date: string;
  summary: string;
  insights: string | null;
  created_at: string;
}

export interface UserFeedback {
  id: number;
  article_id: number;
  is_relevant: boolean;
  created_at: string;
}

export interface TopicPreference {
  id: number;
  topic_id: number;
  weight: number;
  updated_at: string;
}
