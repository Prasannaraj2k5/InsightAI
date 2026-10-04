/**
 * NLP Intelligence & Document Summarization Engine
 * Extracts summaries, key takeaways, action items, metrics, entities, and sentiment
 */
class NLPEngine {
  /**
   * Analyze document text
   * @param {string} text - Raw document text
   * @returns {Object} Comprehensive NLP breakdown
   */
  static analyze(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        summary: 'No text content available for analysis.',
        keyTakeaways: [],
        actionItems: [],
        metrics: [],
        entities: { organizations: [], dates: [], people: [], locations: [], technologies: [] },
        sentiment: { score: 0, label: 'Neutral', tone: 'Neutral' },
        readability: { score: 0, level: 'N/A', wordCount: 0, readingTimeMinutes: 0 }
      };
    }

    const cleanedText = text.replace(/\r\n/g, '\n');
    const sentences = NLPEngine.splitSentences(cleanedText);
    const words = cleanedText.match(/\b[A-Za-z0-9_-]+\b/g) || [];
    const wordCount = words.length;

    // 1. Text Summarization & Key Sentences
    const summaryData = NLPEngine.generateSummary(sentences, cleanedText);

    // 2. Action Items & Next Steps Extraction
    const actionItems = NLPEngine.extractActionItems(sentences);

    // 3. Quantitative Financial / Operational Metrics Extraction
    const metrics = NLPEngine.extractMetrics(cleanedText);

    // 4. Named Entity Recognition (NER-lite)
    const entities = NLPEngine.extractEntities(cleanedText);

    // 5. Sentiment & Tone Analysis
    const sentiment = NLPEngine.calculateSentiment(words, cleanedText);

    // 6. Readability & Statistics
    const readability = NLPEngine.calculateReadability(sentences, words, cleanedText);

    return {
      wordCount,
      sentenceCount: sentences.length,
      characterCount: cleanedText.length,
      summary: summaryData.synopsis,
      keyTakeaways: summaryData.takeaways,
      actionItems,
      metrics,
      entities,
      sentiment,
      readability
    };
  }

  static splitSentences(text) {
    return text
      .split(/(?<=[.?!])\s+(?=[A-Z0-9])/g)
      .map(s => s.trim())
      .filter(s => s.length > 20 && !s.startsWith('http'));
  }

  static generateSummary(sentences, fullText) {
    if (sentences.length <= 3) {
      return {
        synopsis: fullText.trim(),
        takeaways: sentences
      };
    }

    // Stop words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with', 'as', 'from',
      'this', 'that', 'it', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'our', 'we', 'their', 'they',
      'its', 'will', 'can', 'should', 'would', 'could', 'about', 'into', 'than', 'more', 'all', 'any', 'both', 'each'
    ]);

    // Word frequencies
    const freq = {};
    const words = fullText.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    words.forEach(w => {
      if (!stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    // Score sentences
    const scored = sentences.map((sentence, index) => {
      let score = 0;
      const sWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      sWords.forEach(w => {
        if (freq[w]) score += freq[w];
      });

      // Bonus for position (early sentences or first sentence of paragraphs)
      if (index === 0) score *= 1.4;
      if (index === 1) score *= 1.2;

      // Bonus for quantitative terms or executive indicators
      if (sentence.match(/\$|\%|\b(growth|revenue|project|increase|key|objective|reduce|launch|strategic)\b/i)) {
        score *= 1.25;
      }

      return {
        sentence,
        score: score / (Math.log(sWords.length + 2) || 1),
        originalIndex: index
      };
    });

    const topSentences = [...scored].sort((a, b) => b.score - a.score).slice(0, 5);
    // Sort back in narrative order
    topSentences.sort((a, b) => a.originalIndex - b.originalIndex);

    const synopsis = topSentences.slice(0, 2).map(s => s.sentence).join(' ');
    const takeaways = topSentences.map(s => s.sentence);

    return { synopsis, takeaways };
  }

  static extractActionItems(sentences) {
    const actionVerbs = /\b(implement|deploy|complete|review|expand|allocate|ensure|integrate|execute|deliver|schedule|finalize|migrate|build)\b/i;
    const actionItems = [];

    sentences.forEach(s => {
      if (
        (s.match(actionVerbs) && s.match(/\b(will|must|should|by|q[1-4]|202[0-9]|timeline|target|action)\b/i)) ||
        s.match(/^[0-9]\.\s+/i) ||
        s.toLowerCase().includes('action item') ||
        s.toLowerCase().includes('immediate')
      ) {
        actionItems.push(s.replace(/^[0-9]\.\s+/, '').trim());
      }
    });

    return actionItems.slice(0, 6);
  }

  static extractMetrics(text) {
    const metrics = [];
    // Currency patterns: $14.6M, $2.4M, $500,000
    const currencyMatches = text.match(/\$[0-9]+(?:\.[0-9]+)?(?:\s?[KkMmBb]|\s?million|\s?billion)?/g) || [];
    currencyMatches.slice(0, 5).forEach(m => {
      metrics.push({ type: 'financial', value: m, context: NLPEngine.findContext(text, m) });
    });

    // Percentage patterns: 82%, 65%, 98.4%
    const percentMatches = text.match(/[0-9]+(?:\.[0-9]+)?%/g) || [];
    percentMatches.slice(0, 5).forEach(m => {
      metrics.push({ type: 'percentage', value: m, context: NLPEngine.findContext(text, m) });
    });

    // Big volume numbers: 10,000+, 15M+
    const volumeMatches = text.match(/[0-9]+(?:,[0-9]{3})+\+?|[0-9]+(?:\.[0-9]+)?(?:[KMGT]B|[KM]B\b|\s?users|\s?requests|\s?files)/gi) || [];
    volumeMatches.slice(0, 4).forEach(m => {
      metrics.push({ type: 'volume', value: m, context: NLPEngine.findContext(text, m) });
    });

    return metrics;
  }

  static findContext(text, term) {
    const idx = text.indexOf(term);
    if (idx === -1) return '';
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + term.length + 40);
    return '...' + text.slice(start, end).replace(/\s+/g, ' ').trim() + '...';
  }

  static extractEntities(text) {
    // Organizations / Companies
    const orgPatterns = /\b(Google|AWS|Microsoft|Nexus|Stanford|Amazon|Apple|Meta|OpenAI|Anthropic|Snowflake|Databricks|Docker|GitHub)\b/gi;
    const orgs = [...new Set((text.match(orgPatterns) || []).map(o => o.trim()))];

    // Technologies & Tools
    const techPatterns = /\b(Python|JavaScript|TypeScript|React|Node\.js|Express|FastAPI|PyTorch|TensorFlow|Kubernetes|Docker|PostgreSQL|MongoDB|BigQuery|GraphQL|Redis|SQL|Linux|Git|CI\/CD)\b/gi;
    const techs = [...new Set((text.match(techPatterns) || []).map(t => t.trim()))];

    // Dates & Quarters
    const datePatterns = /\b(Q[1-4]\s?202[0-9]|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s?(?:[0-9]{4})?|FY202[0-9]|202[0-9]-[0-9]{2}-[0-9]{2})\b/gi;
    const dates = [...new Set((text.match(datePatterns) || []).map(d => d.trim()))];

    // Locations
    const locPatterns = /\b(San Francisco|Seattle|Austin|New York|London|California|North America|Europe|Asia-Pacific)\b/gi;
    const locations = [...new Set((text.match(locPatterns) || []).map(l => l.trim()))];

    return {
      organizations: orgs.slice(0, 8),
      technologies: techs.slice(0, 15),
      dates: dates.slice(0, 8),
      locations: locations.slice(0, 6)
    };
  }

  static calculateSentiment(words, text) {
    const positiveWords = new Set([
      'growth', 'accelerate', 'improve', 'achievement', 'lead', 'successful', 'excellence', 'optimized', 'high', 'boost',
      'efficient', 'precision', 'opportunity', 'empowering', 'advantage', 'innovative', 'proven', 'winner', 'breakthrough'
    ]);
    const negativeWords = new Set([
      'risk', 'loss', 'friction', 'latency', 'legacy', 'cost', 'drift', 'failure', 'drop', 'delay', 'issue', 'vulnerability', 'concern'
    ]);

    let pos = 0;
    let neg = 0;

    words.forEach(w => {
      const lower = w.toLowerCase();
      if (positiveWords.has(lower)) pos++;
      if (negativeWords.has(lower)) neg++;
    });

    const net = pos - neg;
    let label = 'Neutral';
    let tone = 'Analytical & Objective';

    if (net > 3) {
      label = 'Positive';
      tone = 'Confident & Forward-Looking';
    } else if (net < -2) {
      label = 'Cautionary';
      tone = 'Risk-Aware & Critical';
    }

    const polarity = words.length > 0 ? parseFloat(((pos - neg) / (pos + neg + 10)).toFixed(2)) : 0;

    return {
      score: polarity,
      label,
      tone,
      positiveSignals: pos,
      negativeSignals: neg
    };
  }

  static calculateReadability(sentences, words, text) {
    const wordCount = words.length;
    const sentenceCount = sentences.length || 1;
    const syllables = words.reduce((acc, w) => acc + NLPEngine.countSyllables(w), 0);

    // Flesch Reading Ease Formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
    const asu = wordCount / sentenceCount;
    const asw = syllables / (wordCount || 1);
    let flesch = 206.835 - 1.015 * asu - 84.6 * asw;
    flesch = Math.max(0, Math.min(100, Math.round(flesch)));

    let level = 'Standard';
    if (flesch >= 80) level = 'Easy / Accessible';
    else if (flesch >= 60) level = 'Standard Business';
    else if (flesch >= 30) level = 'Technical / Advanced';
    else level = 'Specialized / Academic';

    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    return {
      score: flesch,
      level,
      wordCount,
      readingTimeMinutes,
      avgWordsPerSentence: Math.round(asu)
    };
  }

  static countSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    const matches = w.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}

module.exports = NLPEngine;
