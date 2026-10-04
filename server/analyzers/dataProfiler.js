/**
 * Tabular Data Profiler & Visualization Engine
 * Extracts summary statistics, detects column types, identifies anomalies, and generates chart blueprints
 */
class DataProfiler {
  /**
   * Profile a tabular dataset (array of row objects)
   * @param {Array<Object>} rows
   * @returns {Object} Comprehensive profile and visual chart payload
   */
  static profile(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        rowCount: 0,
        columnCount: 0,
        columns: [],
        statistics: {},
        dataQualityScore: 0,
        charts: []
      };
    }

    const rowCount = rows.length;
    const columns = Object.keys(rows[0] || {});
    const columnProfiles = {};
    let totalCells = rowCount * columns.length;
    let missingCells = 0;

    // First pass: inspect values and infer types
    columns.forEach(col => {
      const values = rows.map(r => r[col]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const nullCount = rowCount - nonNullValues.length;
      missingCells += nullCount;

      const typeInfo = DataProfiler.inferType(nonNullValues);
      columnProfiles[col] = {
        name: col,
        type: typeInfo.type,
        subType: typeInfo.subType,
        totalCount: rowCount,
        nullCount,
        missingPercentage: parseFloat(((nullCount / rowCount) * 100).toFixed(1)),
        uniqueCount: new Set(nonNullValues).size,
        distinctPercentage: parseFloat(((new Set(nonNullValues).size / (nonNullValues.length || 1)) * 100).toFixed(1))
      };

      if (typeInfo.type === 'number') {
        const numValues = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
        columnProfiles[col].stats = DataProfiler.calculateNumericStats(numValues);
      } else if (typeInfo.type === 'category' || typeInfo.type === 'string') {
        columnProfiles[col].stats = DataProfiler.calculateCategoricalStats(nonNullValues);
      } else if (typeInfo.type === 'date') {
        columnProfiles[col].stats = DataProfiler.calculateDateStats(nonNullValues);
      }
    });

    // Compute Overall Data Quality Score (0-100)
    const completeness = Math.max(0, 100 - (missingCells / totalCells) * 100);
    const qualityScore = Math.min(100, Math.round(completeness));

    // Automated Visualizations Blueprint
    const charts = DataProfiler.generateVisualizations(rows, columnProfiles);

    return {
      rowCount,
      columnCount: columns.length,
      columns,
      columnProfiles,
      dataQualityScore: qualityScore,
      completenessPercent: parseFloat(completeness.toFixed(1)),
      charts,
      summary: {
        totalRows: rowCount,
        totalColumns: columns.length,
        numericalColumns: columns.filter(c => columnProfiles[c].type === 'number'),
        categoricalColumns: columns.filter(c => columnProfiles[c].type === 'category' || columnProfiles[c].type === 'string'),
        dateColumns: columns.filter(c => columnProfiles[c].type === 'date')
      }
    };
  }

  /**
   * Infer column data type
   */
  static inferType(sampleValues) {
    if (sampleValues.length === 0) return { type: 'string', subType: 'empty' };

    let numericCount = 0;
    let dateCount = 0;

    for (const v of sampleValues.slice(0, 100)) {
      if (typeof v === 'number' || (!isNaN(v) && !isNaN(parseFloat(v)) && String(v).trim() !== '')) {
        numericCount++;
      } else if (typeof v === 'string' && !isNaN(Date.parse(v)) && v.match(/\d{4}[-/.]\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i)) {
        dateCount++;
      }
    }

    const threshold = sampleValues.length * 0.75;
    if (numericCount >= threshold) return { type: 'number', subType: 'float' };
    if (dateCount >= threshold) return { type: 'date', subType: 'isoDate' };

    const uniqueRatio = new Set(sampleValues).size / sampleValues.length;
    if (uniqueRatio < 0.4 || sampleValues.length < 50) {
      return { type: 'category', subType: 'nominal' };
    }

    return { type: 'string', subType: 'text' };
  }

  /**
   * Calculate detailed numeric metrics
   */
  static calculateNumericStats(numbers) {
    if (numbers.length === 0) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    // Median & Quartiles
    const median = DataProfiler.getPercentile(sorted, 50);
    const q1 = DataProfiler.getPercentile(sorted, 25);
    const q3 = DataProfiler.getPercentile(sorted, 75);
    const iqr = q3 - q1;

    // Variance & StdDev
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Outlier detection using IQR
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = sorted.filter(v => v < lowerBound || v > upperBound);

    // Histogram bins (5-10 bins)
    const min = sorted[0];
    const max = sorted[count - 1];
    const binCount = Math.min(8, Math.max(4, Math.floor(Math.sqrt(count))));
    const binWidth = (max - min) / (binCount || 1);
    const histogram = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * binWidth;
      const end = i === binCount - 1 ? max : start + binWidth;
      return {
        bin: `${DataProfiler.formatNumber(start)} - ${DataProfiler.formatNumber(end)}`,
        count: 0
      };
    });

    sorted.forEach(val => {
      let idx = binWidth === 0 ? 0 : Math.floor((val - min) / binWidth);
      if (idx >= binCount) idx = binCount - 1;
      if (histogram[idx]) histogram[idx].count++;
    });

    return {
      min,
      max,
      sum: parseFloat(sum.toFixed(2)),
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      q1: parseFloat(q1.toFixed(2)),
      q3: parseFloat(q3.toFixed(2)),
      iqr: parseFloat(iqr.toFixed(2)),
      outliersCount: outliers.length,
      outliersSample: outliers.slice(0, 5),
      histogram
    };
  }

  /**
   * Calculate categorical distributions
   */
  static calculateCategoricalStats(values) {
    const freqMap = {};
    values.forEach(v => {
      const key = String(v);
      freqMap[key] = (freqMap[key] || 0) + 1;
    });

    const sortedEntries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
    const topValues = sortedEntries.slice(0, 8).map(([val, count]) => ({
      value: val,
      count,
      percentage: parseFloat(((count / values.length) * 100).toFixed(1))
    }));

    return {
      topValues,
      mostFrequent: sortedEntries[0] ? sortedEntries[0][0] : null,
      cardinality: Object.keys(freqMap).length
    };
  }

  /**
   * Calculate date range
   */
  static calculateDateStats(values) {
    const timestamps = values.map(v => new Date(v).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
    if (timestamps.length === 0) return null;
    return {
      earliest: new Date(timestamps[0]).toISOString().split('T')[0],
      latest: new Date(timestamps[timestamps.length - 1]).toISOString().split('T')[0]
    };
  }

  static getPercentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sortedArray[lower];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  static formatNumber(num) {
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return Number(num.toFixed(1)).toString();
  }

  /**
   * Synthesize recommended chart specs for Chart.js
   */
  static generateVisualizations(rows, profiles) {
    const charts = [];
    const cols = Object.keys(profiles);

    const numCols = cols.filter(c => profiles[c].type === 'number');
    const catCols = cols.filter(c => profiles[c].type === 'category' || profiles[c].type === 'string');
    const dateCols = cols.filter(c => profiles[c].type === 'date');

    // Chart 1: Time Series / Trend Line Chart (if date column exists and numeric column exists)
    if (dateCols.length > 0 && numCols.length > 0) {
      const dateCol = dateCols[0];
      const primaryNum = numCols[0];

      // Aggregate sum/average by date
      const dateAgg = {};
      rows.forEach(r => {
        const d = String(r[dateCol] || '').split('T')[0];
        const val = Number(r[primaryNum]) || 0;
        dateAgg[d] = (dateAgg[d] || 0) + val;
      });

      const sortedDates = Object.keys(dateAgg).sort();
      charts.push({
        id: 'trend_chart',
        title: `${primaryNum} Trend over ${dateCol}`,
        type: 'line',
        labels: sortedDates,
        datasets: [
          {
            label: primaryNum,
            data: sortedDates.map(d => dateAgg[d]),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            tension: 0.35
          }
        ]
      });
    }

    // Chart 2: Categorical Bar Chart (e.g. Department or Region vs Revenue)
    if (catCols.length > 0 && numCols.length > 0) {
      const catCol = catCols[0];
      const metricCol = numCols[0];
      const catAgg = {};

      rows.forEach(r => {
        const c = String(r[catCol] || 'Other');
        const v = Number(r[metricCol]) || 0;
        catAgg[c] = (catAgg[c] || 0) + v;
      });

      const labels = Object.keys(catAgg).slice(0, 10);
      charts.push({
        id: 'category_breakdown',
        title: `${metricCol} by ${catCol}`,
        type: 'bar',
        labels,
        datasets: [
          {
            label: metricCol,
            data: labels.map(l => catAgg[l]),
            backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e']
          }
        ]
      });
    }

    // Chart 3: Distribution Histogram for primary numeric column
    if (numCols.length > 0 && profiles[numCols[0]].stats && profiles[numCols[0]].stats.histogram) {
      const metric = numCols[0];
      const hist = profiles[metric].stats.histogram;
      charts.push({
        id: 'distribution_histogram',
        title: `${metric} Distribution Frequency`,
        type: 'bar',
        labels: hist.map(h => h.bin),
        datasets: [
          {
            label: 'Frequency Count',
            data: hist.map(h => h.count),
            backgroundColor: '#06b6d4'
          }
        ]
      });
    }

    // Chart 4: Metric Comparison (Multi-bar if >=2 numeric metrics)
    if (catCols.length > 0 && numCols.length >= 2) {
      const catCol = catCols[0];
      const m1 = numCols[0];
      const m2 = numCols[1];
      const labels = [...new Set(rows.map(r => String(r[catCol] || 'Other')))].slice(0, 6);

      const d1 = labels.map(l => {
        const matches = rows.filter(r => String(r[catCol]) === l);
        return matches.reduce((sum, r) => sum + (Number(r[m1]) || 0), 0) / (matches.length || 1);
      });

      const d2 = labels.map(l => {
        const matches = rows.filter(r => String(r[catCol]) === l);
        return matches.reduce((sum, r) => sum + (Number(r[m2]) || 0), 0) / (matches.length || 1);
      });

      charts.push({
        id: 'metric_comparison',
        title: `Average ${m1} vs ${m2} by ${catCol}`,
        type: 'bar',
        labels,
        datasets: [
          { label: `Avg ${m1}`, data: d1.map(v => Math.round(v)), backgroundColor: '#6366f1' },
          { label: `Avg ${m2}`, data: d2.map(v => Math.round(v)), backgroundColor: '#10b981' }
        ]
      });
    }

    return charts;
  }
}

module.exports = DataProfiler;
