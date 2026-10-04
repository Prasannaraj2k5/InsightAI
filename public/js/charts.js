/**
 * Chart Manager for InsightAI
 * Handles responsive Chart.js rendering, color schemes, and tooltips
 */
window.ChartManager = (function () {
  const instances = {};

  const defaultFont = {
    family: "'Outfit', -apple-system, sans-serif",
    size: 12
  };

  const defaultPlugins = {
    legend: {
      labels: {
        color: '#94a3b8',
        font: defaultFont,
        boxWidth: 12,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 20, 32, 0.95)',
      titleColor: '#ffffff',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(99, 102, 241, 0.4)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { family: "'Outfit', sans-serif", weight: 'bold', size: 13 },
      bodyFont: { family: "'Outfit', sans-serif", size: 12 }
    }
  };

  function destroyChart(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function renderChart(canvasId, spec) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const isRadar = spec.type === 'radar';

    const scalesConfig = isRadar
      ? {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: { color: '#94a3b8', font: defaultFont },
            ticks: { display: false, maxTicksLimit: 5 }
          }
        }
      : {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: defaultFont }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: defaultFont }
          }
        };

    const chartInstance = new Chart(ctx, {
      type: spec.type || 'bar',
      data: {
        labels: spec.labels || [],
        datasets: spec.datasets || []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: defaultPlugins,
        scales: scalesConfig,
        animation: { duration: 600, easing: 'easeOutQuart' }
      }
    });

    instances[canvasId] = chartInstance;
    return chartInstance;
  }

  return {
    render: renderChart,
    destroy: destroyChart,
    destroyAll: () => {
      Object.keys(instances).forEach(destroyChart);
    }
  };
})();
