/**
 * Resume Screening & ATS Ranking Engine
 * Parses candidate profiles, classifies skills across taxonomies, scores against Job Descriptions (JDs), and builds radar analytics
 */
class ResumeScreening {
  static SKILL_TAXONOMY = {
    languages: [
      'python', 'javascript', 'typescript', 'sql', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'r', 'scala', 'bash', 'shell'
    ],
    frameworks: [
      'react', 'next.js', 'vue', 'angular', 'node.js', 'express', 'fastapi', 'flask', 'django', 'spring boot', 'pytorch', 'tensorflow', 'keras', 'langchain', 'llamaindex', 'huggingface', 'scikit-learn', 'pandas', 'numpy', 'tailwind', 'graphql'
    ],
    cloud_devops: [
      'aws', 'gcp', 'google cloud', 'azure', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'github actions', 'terraform', 'ansible', 'helm', 'linux', 'serverless', 'lambda', 'cloud run', 'microservices'
    ],
    databases: [
      'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'bigquery', 'snowflake', 'dynamodb', 'cassandra', 'elasticsearch', 'pinecone', 'chromadb', 'weaviate', 'sqlite'
    ],
    ai_ml: [
      'nlp', 'llms', 'natural language processing', 'large language models', 'machine learning', 'deep learning', 'rag', 'retrieval-augmented generation', 'computer vision', 'vector databases', 'prompt engineering', 'mlops', 'transformers', 'embeddings'
    ],
    soft_skills: [
      'leadership', 'mentorship', 'communication', 'agile', 'scrum', 'system architecture', 'problem solving', 'collaboration', 'project management', 'cross-functional'
    ]
  };

  /**
   * Screen and score a resume text
   * @param {string} resumeText
   * @param {string} [jobDescription] - Optional target job requisition
   * @returns {Object} Complete candidate evaluation and ATS scorecard
   */
  static screen(resumeText, jobDescription = '') {
    if (!resumeText || typeof resumeText !== 'string') {
      return { error: 'Invalid or empty resume text provided.' };
    }

    const textLower = resumeText.toLowerCase();

    // 1. Candidate Info Extraction
    const candidateInfo = ResumeScreening.extractCandidateInfo(resumeText);

    // 2. Skill Taxonomy Classification
    const categorizedSkills = ResumeScreening.extractCategorizedSkills(textLower);
    const allFoundSkills = Object.values(categorizedSkills).flat();

    // 3. Experience & Education Parsing
    const experienceData = ResumeScreening.extractExperienceTimeline(resumeText);
    const educationData = ResumeScreening.extractEducation(resumeText);

    // 4. Job Description Match & ATS Scoring
    const atsScorecard = ResumeScreening.calculateATSScore(textLower, allFoundSkills, jobDescription);

    // 5. Radar Competency Chart Blueprint
    const radarChart = ResumeScreening.buildRadarBlueprint(categorizedSkills);

    return {
      candidate: candidateInfo,
      categorizedSkills,
      totalSkillsCount: allFoundSkills.length,
      experience: experienceData,
      education: educationData,
      atsScorecard,
      radarChart,
      screeningSummary: {
        candidateName: candidateInfo.name,
        atsScore: atsScorecard.overallScore,
        matchGrade: atsScorecard.matchGrade,
        topStrengths: atsScorecard.strengths,
        skillGaps: atsScorecard.missingSkills
      }
    };
  }

  static extractCandidateInfo(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const name = lines[0] && lines[0].length < 40 && !lines[0].includes('@') ? lines[0] : 'Candidate';

    // Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : 'Not specified';

    // Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : 'Not specified';

    // LinkedIn & GitHub
    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);

    // Location
    const locMatch = text.match(/(?:San Francisco|Seattle|New York|Austin|Boston|Chicago|London|Toronto|Remote|[A-Z][a-zA-Z]+,\s?[A-Z]{2})/);

    return {
      name,
      email,
      phone,
      linkedin: linkedinMatch ? linkedinMatch[0] : null,
      github: githubMatch ? githubMatch[0] : null,
      location: locMatch ? locMatch[0] : 'Remote / Unspecified'
    };
  }

  static extractCategorizedSkills(textLower) {
    const result = {};

    for (const [category, skillList] of Object.entries(ResumeScreening.SKILL_TAXONOMY)) {
      result[category] = [];
      skillList.forEach(skill => {
        const regex = new RegExp(`\\b${ResumeScreening.escapeRegex(skill)}\\b`, 'i');
        if (regex.test(textLower)) {
          result[category].push(ResumeScreening.capitalize(skill));
        }
      });
    }

    return result;
  }

  static extractExperienceTimeline(text) {
    const yearsMatches = text.match(/\b(?:19|20)\d{2}\s*[-–—]\s*(?:present|current|(?:19|20)\d{2})\b/gi) || [];
    const expYearsKeyword = text.match(/([0-9]+)\+?\s*years(?:\s+of)?\s+experience/i);

    let estimatedYears = expYearsKeyword ? parseInt(expYearsKeyword[1], 10) : yearsMatches.length * 2 || 3;

    // Extract position titles
    const titleRegex = /\b(lead|senior|principal|staff|director|engineer|architect|manager|developer|scientist|specialist)\b[^\n,.]*/gi;
    const titles = [...new Set((text.match(titleRegex) || []).map(t => t.trim().slice(0, 40)))].slice(0, 4);

    return {
      estimatedYears,
      timelineRanges: yearsMatches,
      detectedRoles: titles
    };
  }

  static extractEducation(text) {
    const degrees = [];
    const degreePatterns = [
      /master(?:\s+of\s+science|\s+of\s+arts|'s)?\b[^\n,.]*/gi,
      /bachelor(?:\s+of\s+science|\s+of\s+technology|\s+of\s+arts|'s)?\b[^\n,.]*/gi,
      /ph\.?d\.?\b[^\n,.]*/gi,
      /b\.?tech\b[^\n,.]*/gi,
      /m\.?s\.?\b[^\n,.]*/gi
    ];

    degreePatterns.forEach(pat => {
      const matches = text.match(pat);
      if (matches) {
        matches.forEach(m => degrees.push(m.trim().slice(0, 60)));
      }
    });

    const universityMatch = text.match(/\b([A-Z][a-zA-Z\s]+(?:University|Institute|College))\b/g);

    return {
      degrees: [...new Set(degrees)],
      institutions: universityMatch ? [...new Set(universityMatch)] : []
    };
  }

  static calculateATSScore(resumeLower, candidateSkills, jobDescription) {
    const defaultJD = jobDescription && jobDescription.trim().length > 20
      ? jobDescription.toLowerCase()
      : 'we are seeking a senior full-stack and ai engineer with expertise in python, react, node.js, cloud infrastructure (aws/gcp), machine learning, nlp, rest apis, docker, and database architecture.';

    // Extract target skills from JD
    const targetSkills = [];
    for (const skillList of Object.values(ResumeScreening.SKILL_TAXONOMY)) {
      skillList.forEach(s => {
        const regex = new RegExp(`\\b${ResumeScreening.escapeRegex(s)}\\b`, 'i');
        if (regex.test(defaultJD)) {
          targetSkills.push(ResumeScreening.capitalize(s));
        }
      });
    }

    const uniqueTargetSkills = [...new Set(targetSkills)];
    const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()));

    const matchedSkills = uniqueTargetSkills.filter(s => candidateSet.has(s.toLowerCase()));
    const missingSkills = uniqueTargetSkills.filter(s => !candidateSet.has(s.toLowerCase()));

    // Sub-scores
    const skillRatio = uniqueTargetSkills.length > 0 ? (matchedSkills.length / uniqueTargetSkills.length) : 0.85;
    const techSkillScore = Math.min(100, Math.round(skillRatio * 100));

    // Experience bonus
    const expMatch = resumeLower.match(/senior|lead|architect|staff/i) ? 95 : 80;
    // Education bonus
    const eduMatch = resumeLower.match(/master|ph\.?d/i) ? 98 : resumeLower.match(/bachelor|b\.?tech/i) ? 90 : 75;
    // Diversity score
    const diversityScore = Math.min(100, Math.round((candidateSkills.length / 20) * 100));

    // Weighted Overall Score
    const overallScore = Math.round(
      techSkillScore * 0.45 +
      expMatch * 0.25 +
      eduMatch * 0.15 +
      diversityScore * 0.15
    );

    let matchGrade = 'A+ (Exceptional Fit)';
    if (overallScore < 70) matchGrade = 'C (Needs Development)';
    else if (overallScore < 80) matchGrade = 'B (Qualified)';
    else if (overallScore < 90) matchGrade = 'A (Strong Contender)';

    const strengths = [
      `High technical alignment (${matchedSkills.length}/${uniqueTargetSkills.length} requested skills detected)`,
      `Strong domain proficiency in ${matchedSkills.slice(0, 3).join(', ')}`,
      `Extensive hands-on production engineering & architecture background`
    ];

    return {
      overallScore,
      matchGrade,
      breakdown: {
        technicalSkillMatch: techSkillScore,
        experienceAlignment: expMatch,
        educationScore: eduMatch,
        skillDiversity: diversityScore
      },
      targetSkillsCount: uniqueTargetSkills.length,
      matchedSkills,
      missingSkills,
      strengths,
      recommendation: overallScore >= 80 ? 'Fast-Track to Technical Interview' : 'Review for Alternate / Junior Requirements'
    };
  }

  static buildRadarBlueprint(categorized) {
    const categories = [
      { label: 'AI & Machine Learning', count: categorized.ai_ml.length, max: 8 },
      { label: 'Backend & APIs', count: (categorized.frameworks.length + categorized.languages.length) / 2, max: 10 },
      { label: 'Cloud & DevOps', count: categorized.cloud_devops.length, max: 7 },
      { label: 'Database Systems', count: categorized.databases.length, max: 6 },
      { label: 'Leadership & Soft Skills', count: categorized.soft_skills.length, max: 5 }
    ];

    const candidateScores = categories.map(c => Math.min(100, Math.round((c.count / c.max) * 100)));
    const benchmarkScores = [80, 85, 75, 75, 70]; // Standard senior benchmark

    return {
      id: 'radar_competency',
      labels: categories.map(c => c.label),
      datasets: [
        {
          label: 'Candidate Competence',
          data: candidateScores,
          backgroundColor: 'rgba(99, 102, 241, 0.25)',
          borderColor: '#6366f1',
          pointBackgroundColor: '#6366f1'
        },
        {
          label: 'Industry Benchmark',
          data: benchmarkScores,
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          borderColor: '#06b6d4',
          pointBackgroundColor: '#06b6d4'
        }
      ]
    };
  }

  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static capitalize(str) {
    return str.split(/[\s.-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

module.exports = ResumeScreening;
