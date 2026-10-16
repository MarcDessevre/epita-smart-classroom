(function (global) {
  const CATEGORY_DEFS = [
    { id: 'table', label: 'Tables/Bureaux', modelClass: ['dining table', 'a classroom table or desk'], supported: true, expected: 10 },
    { id: 'chair', label: 'Chaises', modelClass: ['chair', 'a classroom chair'], supported: true, expected: 20 },
    { id: 'blackboard', label: 'Tableaux', modelClass: ['blackboard', 'whiteboard', 'a blackboard', 'a whiteboard'], supported: true, expected: 1 },
    { id: 'laptop', label: 'Ordinateurs portables', modelClass: ['laptop', 'a laptop computer'], supported: true, expected: 5 },
    { id: 'screen', label: 'Écrans', modelClass: ['tv', 'a television screen'], supported: true, expected: 0 },
    { id: 'window', label: 'Fenêtres', modelClass: ['window', 'a window'], supported: true, expected: 0 }
  ];

  function buildDefaultExpected() {
    return CATEGORY_DEFS.reduce((acc, def) => {
      acc[def.id] = def.expected;
      return acc;
    }, {});
  }

  function normalizeClass(predictedClass) {
    const found = CATEGORY_DEFS.find((d) => Array.isArray(d.modelClass)
      ? d.modelClass.includes(predictedClass)
      : d.modelClass === predictedClass);
    return found ? found.id : null;
  }

  function aggregateDetections(predictions, threshold) {
    const filtered = predictions.filter((p) => p.class !== 'person' && p.score >= threshold);
    const counts = {};
    const normalizedDetections = [];

    for (const prediction of filtered) {
      const categoryId = normalizeClass(prediction.class);
      if (!categoryId) {
        continue;
      }
      counts[categoryId] = (counts[categoryId] || 0) + 1;
      normalizedDetections.push({
        id: categoryId,
        label: CATEGORY_DEFS.find((d) => d.id === categoryId).label,
        modelClass: prediction.class,
        score: prediction.score,
        bbox: prediction.bbox
      });
    }

    return { filtered, counts, normalizedDetections };
  }

  function buildAudit(expectedConfig, counts, analysisState = 'complete') {
    return CATEGORY_DEFS.map((def) => {
      const expected = Number(expectedConfig[def.id] || 0);
      if (!def.supported) {
        return {
          id: def.id,
          label: def.label,
          expected,
          detected: null,
          delta: null,
          status: 'non vérifiable',
          verifiable: false
        };
      }

      if (analysisState === 'unavailable') {
        return {
          id: def.id,
          label: def.label,
          expected,
          detected: null,
          delta: null,
          status: 'analyse indisponible',
          verifiable: false
        };
      }

      if (analysisState === 'empty' && !counts[def.id]) {
        return {
          id: def.id,
          label: def.label,
          expected,
          detected: 0,
          delta: null,
          status: 'aucune détection produite',
          verifiable: false
        };
      }

      const detected = Number(counts[def.id] || 0);
      const delta = detected - expected;
      const status = delta === 0 ? 'conforme' : delta > 0 ? 'surplus' : 'manquant';

      return {
        id: def.id,
        label: def.label,
        expected,
        detected,
        delta,
        status,
        verifiable: true
      };
    });
  }

  function computeDashboard(auditRows, counts, analysisState = 'complete') {
    const verifiable = auditRows.filter((r) => r.verifiable);
    const gaps = verifiable.filter((r) => r.delta !== 0).length;
    const totalDetected = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const recognizedCategories = Object.keys(counts).filter((k) => counts[k] > 0).length;

    return {
      totalDetected,
      recognizedCategories,
      verifiableRules: verifiable.length,
      gaps,
      globalStatus: analysisState === 'unavailable'
        ? 'Analyse indisponible'
        : gaps > 0
          ? 'Écarts détectés'
          : auditRows.some((r) => r.status === 'non vérifiable' || r.status === 'aucune détection produite')
            ? 'Vérification partielle'
            : 'Conforme pour les règles vérifiées'
    };
  }

  function unsupportedCategories() {
    return CATEGORY_DEFS.filter((d) => !d.supported).map((d) => d.label);
  }

  const api = {
    CATEGORY_DEFS,
    buildDefaultExpected,
    normalizeClass,
    aggregateDetections,
    buildAudit,
    computeDashboard,
    unsupportedCategories
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.AuditUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
