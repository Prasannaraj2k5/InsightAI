/**
 * Contextual Document Question-Answering (Q&A) Engine
 * Performs semantic chunk retrieval, relevance ranking, and extractive answer generation
 */
class QAEngine {
  /**
   * Query document content with a natural language question
   * @param {string} documentText
   * @param {string} question
   * @returns {Object} Grounded answer and cited passages
   */
  static query(documentText, question) {
    if (!documentText || !question) {
      return {
        answer: 'Please provide both document context and a valid question.',
        confidence: 0,
        citations: []
      };
    }

    const paragraphs = documentText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30);

    if (paragraphs.length === 0) {
      return {
        answer: 'No substantial paragraphs found in document to answer the query.',
        confidence: 0,
        citations: []
      };
    }

    const qWords = question
      .toLowerCase()
      .match(/\b[a-z0-9]{2,}\b/g) || [];

    const stopWords = new Set([
      'what', 'how', 'when', 'where', 'who', 'why', 'is', 'are', 'the', 'and', 'in', 'of', 'for', 'to', 'with', 'about', 'can', 'does', 'did'
    ]);
    const queryKeywords = qWords.filter(w => !stopWords.has(w));

    // Score paragraphs
    const scoredPassages = paragraphs.map((para, index) => {
      const pLower = para.toLowerCase();
      let matchCount = 0;
      let phraseBonus = 0;

      queryKeywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        const matches = pLower.match(regex);
        if (matches) matchCount += matches.length;
      });

      // Bonus if multi-word combinations appear together
      if (queryKeywords.length >= 2) {
        const bigram = queryKeywords.slice(0, 2).join(' ');
        if (pLower.includes(bigram)) phraseBonus += 3;
      }

      const score = (matchCount * 2 + phraseBonus) / (Math.log(para.length / 50 + 2) || 1);

      return {
        index,
        text: para,
        score,
        matchCount
      };
    });

    scoredPassages.sort((a, b) => b.score - a.score);
    const topPassages = scoredPassages.filter(p => p.score > 0).slice(0, 3);

    if (topPassages.length === 0) {
      return {
        question,
        answer: 'InsightAI could not locate specific references answering this query in the provided document.',
        confidence: 0.15,
        citations: []
      };
    }

    const bestPassage = topPassages[0].text;
    const sentences = bestPassage.split(/(?<=[.?!])\s+/).filter(Boolean);

    // Pick top 1-2 most relevant sentences from best passage as direct answer
    const scoredSentences = sentences.map(s => {
      let sScore = 0;
      const sLower = s.toLowerCase();
      queryKeywords.forEach(kw => {
        if (sLower.includes(kw)) sScore += 2;
      });
      return { sentence: s, score: sScore };
    });

    scoredSentences.sort((a, b) => b.score - a.score);
    const answer = scoredSentences[0] && scoredSentences[0].score > 0
      ? scoredSentences.slice(0, 2).map(s => s.sentence).join(' ')
      : bestPassage.slice(0, 250) + '...';

    const confidence = Math.min(0.96, Math.max(0.55, 0.45 + (topPassages[0].matchCount * 0.1)));

    return {
      question,
      answer,
      confidence: parseFloat(confidence.toFixed(2)),
      confidencePercent: Math.round(confidence * 100),
      citations: topPassages.map((p, idx) => ({
        citationId: idx + 1,
        excerpt: p.text.length > 200 ? p.text.slice(0, 200) + '...' : p.text,
        relevanceScore: parseFloat(p.score.toFixed(2))
      }))
    };
  }
}

module.exports = QAEngine;
