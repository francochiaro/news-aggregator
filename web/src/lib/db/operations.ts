import { getDb, Article, Topic, Aggregation, UserFeedback, TopicPreference } from './schema';

// Article operations
export function insertArticle(article: {
  title: string;
  summary: string;
  content?: string | null;
  source_url: string;
  final_url?: string | null;
  reading_time?: string | null;
  newsletter_date: string;
}): Article {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO articles (title, summary, content, source_url, final_url, reading_time, newsletter_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    article.title,
    article.summary,
    article.content || null,
    article.source_url,
    article.final_url || null,
    article.reading_time || null,
    article.newsletter_date
  );
  return getArticleById(result.lastInsertRowid as number)!;
}

export function updateArticleContent(articleId: number, content: string, finalUrl?: string): void {
  const db = getDb();
  if (finalUrl) {
    db.prepare('UPDATE articles SET content = ?, final_url = ? WHERE id = ?').run(content, finalUrl, articleId);
  } else {
    db.prepare('UPDATE articles SET content = ? WHERE id = ?').run(content, articleId);
  }
}

export function getArticlesWithoutContent(): Article[] {
  const db = getDb();
  return db.prepare('SELECT * FROM articles WHERE content IS NULL OR content = ""').all() as Article[];
}

export function getArticleById(id: number): Article | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined;
}

export function getArticlesByDateRange(startDate: string, endDate: string): Article[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM articles
    WHERE newsletter_date >= ? AND newsletter_date <= ?
    ORDER BY newsletter_date DESC
  `).all(startDate, endDate) as Article[];
}

export function getAllArticles(): Article[] {
  const db = getDb();
  return db.prepare('SELECT * FROM articles ORDER BY newsletter_date DESC').all() as Article[];
}

// Topic operations
export function insertTopic(name: string): Topic {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO topics (name) VALUES (?)');
  stmt.run(name);
  return db.prepare('SELECT * FROM topics WHERE name = ?').get(name) as Topic;
}

export function getTopicById(id: number): Topic | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic | undefined;
}

export function getAllTopics(): Topic[] {
  const db = getDb();
  return db.prepare('SELECT * FROM topics ORDER BY name').all() as Topic[];
}

// Article-Topic linking
export function linkArticleToTopic(articleId: number, topicId: number): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO article_topics (article_id, topic_id) VALUES (?, ?)
  `).run(articleId, topicId);
}

export function getTopicsForArticle(articleId: number): Topic[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM topics t
    JOIN article_topics at ON t.id = at.topic_id
    WHERE at.article_id = ?
  `).all(articleId) as Topic[];
}

export function getArticlesForTopic(topicId: number): Article[] {
  const db = getDb();
  return db.prepare(`
    SELECT a.* FROM articles a
    JOIN article_topics at ON a.id = at.article_id
    WHERE at.topic_id = ?
    ORDER BY a.newsletter_date DESC
  `).all(topicId) as Article[];
}

// Aggregation operations
export function insertAggregation(aggregation: Omit<Aggregation, 'id' | 'created_at'>, articleIds: number[]): Aggregation {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO aggregations (start_date, end_date, summary, insights)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    aggregation.start_date,
    aggregation.end_date,
    aggregation.summary,
    aggregation.insights
  );

  const aggregationId = result.lastInsertRowid as number;

  // Link articles to aggregation
  const linkStmt = db.prepare(`
    INSERT INTO aggregation_articles (aggregation_id, article_id) VALUES (?, ?)
  `);
  for (const articleId of articleIds) {
    linkStmt.run(aggregationId, articleId);
  }

  return getAggregationById(aggregationId)!;
}

export function getAggregationById(id: number): Aggregation | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM aggregations WHERE id = ?').get(id) as Aggregation | undefined;
}

export function getLatestAggregation(): Aggregation | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM aggregations ORDER BY created_at DESC LIMIT 1').get() as Aggregation | undefined;
}

export function getAllAggregations(): Aggregation[] {
  const db = getDb();
  return db.prepare('SELECT * FROM aggregations ORDER BY created_at DESC').all() as Aggregation[];
}

export function getArticlesForAggregation(aggregationId: number): Article[] {
  const db = getDb();
  return db.prepare(`
    SELECT a.* FROM articles a
    JOIN aggregation_articles aa ON a.id = aa.article_id
    WHERE aa.aggregation_id = ?
    ORDER BY a.newsletter_date DESC
  `).all(aggregationId) as Article[];
}

// User feedback operations
export function insertFeedback(articleId: number, isRelevant: boolean): UserFeedback {
  const db = getDb();

  // Update existing feedback or insert new
  const existing = db.prepare('SELECT * FROM user_feedback WHERE article_id = ?').get(articleId);

  if (existing) {
    db.prepare(`
      UPDATE user_feedback SET is_relevant = ?, created_at = datetime('now') WHERE article_id = ?
    `).run(isRelevant ? 1 : 0, articleId);
  } else {
    db.prepare(`
      INSERT INTO user_feedback (article_id, is_relevant) VALUES (?, ?)
    `).run(articleId, isRelevant ? 1 : 0);
  }

  return db.prepare('SELECT * FROM user_feedback WHERE article_id = ?').get(articleId) as UserFeedback;
}

export function getFeedbackForArticle(articleId: number): UserFeedback | undefined {
  const db = getDb();
  const result = db.prepare('SELECT * FROM user_feedback WHERE article_id = ?').get(articleId) as UserFeedback | undefined;
  if (result) {
    result.is_relevant = Boolean(result.is_relevant);
  }
  return result;
}

export function getAllFeedback(): UserFeedback[] {
  const db = getDb();
  const results = db.prepare('SELECT * FROM user_feedback ORDER BY created_at DESC').all() as UserFeedback[];
  return results.map(r => ({ ...r, is_relevant: Boolean(r.is_relevant) }));
}

// Topic preference operations
export function updateTopicPreference(topicId: number, weight: number): TopicPreference {
  const db = getDb();

  db.prepare(`
    INSERT INTO topic_preferences (topic_id, weight, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(topic_id) DO UPDATE SET weight = ?, updated_at = datetime('now')
  `).run(topicId, weight, weight);

  return db.prepare('SELECT * FROM topic_preferences WHERE topic_id = ?').get(topicId) as TopicPreference;
}

export function getTopicPreference(topicId: number): TopicPreference | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM topic_preferences WHERE topic_id = ?').get(topicId) as TopicPreference | undefined;
}

export function getAllTopicPreferences(): TopicPreference[] {
  const db = getDb();
  return db.prepare('SELECT * FROM topic_preferences ORDER BY weight DESC').all() as TopicPreference[];
}

// Utility: Check if article URL already exists (for de-duplication)
export function articleExistsByUrl(url: string): boolean {
  const db = getDb();
  const result = db.prepare('SELECT 1 FROM articles WHERE source_url = ?').get(url);
  return !!result;
}
