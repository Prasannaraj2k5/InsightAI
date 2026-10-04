/**
 * Sample Data Loader & Demo Data Manager
 */
window.SampleManager = (function () {
  const SAMPLES = {
    financial: {
      name: 'Q3 Enterprise Financial Metrics',
      type: 'spreadsheet',
      description: 'Departmental revenue, operating cost, headcount, and customer satisfaction metrics over 6 months.',
      targetTab: 'tab-data'
    },
    resume: {
      name: 'Prasanna Raj - Senior AI & Full-Stack Engineer Resume',
      type: 'resume',
      description: 'Senior candidate profile with Python, React, Cloud, and Machine Learning competencies.',
      targetTab: 'tab-resume'
    },
    strategy_memo: {
      name: 'Executive Enterprise AI Strategy Memo',
      type: 'document',
      description: 'C-suite strategic brief detailing AI platform deployment, ROI projections, and action timeline.',
      targetTab: 'tab-docs'
    }
  };

  async function fetchSample(sampleKey) {
    const res = await fetch(`/api/samples/${sampleKey}`);
    if (!res.ok) {
      throw new Error(`Failed to load sample: ${res.statusText}`);
    }
    return await res.json();
  }

  return {
    SAMPLES,
    fetchSample
  };
})();
