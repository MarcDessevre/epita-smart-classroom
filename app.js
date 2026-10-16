(function () {
  const {
    CATEGORY_DEFS,
    buildDefaultExpected,
    aggregateDetections,
    buildAudit,
    computeDashboard,
    unsupportedCategories
  } = window.AuditUtils;

  const startCameraBtn = document.getElementById('startCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const captureBtn = document.getElementById('captureBtn');
  const imageInput = document.getElementById('imageInput');
  const confidenceThreshold = document.getElementById('confidenceThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  const statusMessage = document.getElementById('statusMessage');
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlayCanvas');
  const ctx = canvas.getContext('2d');

  const resultList = document.getElementById('resultList');
  const counterList = document.getElementById('counterList');
  const resultsEmpty = document.getElementById('resultsEmpty');
  const expectedConfig = document.getElementById('expectedConfig');
  const dashboard = document.getElementById('dashboard');
  const auditTableWrap = document.getElementById('auditTableWrap');

  const generateReportBtn = document.getElementById('generateReportBtn');
  const printReportBtn = document.getElementById('printReportBtn');
  const downloadReportBtn = document.getElementById('downloadReportBtn');
  const reportOutput = document.getElementById('reportOutput');

  let model = null;
  let stream = null;
  let expected = buildDefaultExpected();
  let lastState = { counts: {}, auditRows: [], detections: [] };

  init();

  async function init() {
    renderExpectedConfig();
    updateUnsupportedNote();
    renderAudit([]);
    renderDashboard({ totalDetected: 0, recognizedCategories: 0, verifiableRules: 0, gaps: 0, globalStatus: 'En attente' });

    thresholdValue.textContent = Number(confidenceThreshold.value).toFixed(2);
    confidenceThreshold.addEventListener('input', () => {
      thresholdValue.textContent = Number(confidenceThreshold.value).toFixed(2);
    });

    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', () => analyzeCurrentFrame(true));
    imageInput.addEventListener('change', onImageUpload);

    generateReportBtn.addEventListener('click', generateReport);
    printReportBtn.addEventListener('click', () => window.print());
    downloadReportBtn.addEventListener('click', downloadReport);

    try {
      statusMessage.textContent = 'Chargement du modèle COCO-SSD…';
      model = await cocoSsd.load();
      statusMessage.textContent = 'Modèle prêt. Démarrez la caméra ou chargez une image.';
      statusMessage.className = 'status status-ok';
    } catch (err) {
      statusMessage.textContent = `Erreur chargement modèle: ${err.message}`;
      statusMessage.className = 'status status-ko';
    }
  }

  function renderExpectedConfig() {
    expectedConfig.innerHTML = '';
    CATEGORY_DEFS.forEach((def) => {
      const wrapper = document.createElement('label');
      wrapper.textContent = `${def.label}${def.supported ? '' : ' (non vérifiable)'}`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.value = String(expected[def.id] || 0);
      input.addEventListener('change', () => {
        expected[def.id] = Math.max(0, Number(input.value || 0));
      });
      wrapper.appendChild(input);
      expectedConfig.appendChild(wrapper);
    });
  }

  function updateUnsupportedNote() {
    const unsupported = unsupportedCategories().join(', ');
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = `Catégories non prises en charge par le modèle: ${unsupported}.`;
    expectedConfig.parentElement.appendChild(note);
  }

  async function startCamera() {
    if (!model) {
      statusMessage.textContent = 'Le modèle n\'est pas prêt.';
      statusMessage.className = 'status status-ko';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
      startCameraBtn.disabled = true;
      stopCameraBtn.disabled = false;
      captureBtn.disabled = false;
      statusMessage.textContent = 'Caméra active. Vous pouvez capturer une image.';
      statusMessage.className = 'status status-ok';
    } catch (err) {
      statusMessage.textContent = `Erreur caméra: ${err.message}`;
      statusMessage.className = 'status status-ko';
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    video.srcObject = null;
    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
    captureBtn.disabled = true;
    statusMessage.textContent = 'Caméra arrêtée.';
    statusMessage.className = 'status';
  }

  async function onImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const img = new Image();
    img.onload = async () => {
      await analyzeElement(img);
    };
    img.onerror = () => {
      statusMessage.textContent = 'Image invalide.';
      statusMessage.className = 'status status-ko';
    };
    img.src = URL.createObjectURL(file);
  }

  async function analyzeCurrentFrame(fromVideo) {
    if (!fromVideo) {
      return;
    }
    await analyzeElement(video);
  }

  async function analyzeElement(element) {
    if (!model) {
      statusMessage.textContent = 'Modèle non disponible.';
      statusMessage.className = 'status status-ko';
      return;
    }

    try {
      statusMessage.textContent = 'Analyse en cours…';
      const predictions = await model.detect(element);
      const threshold = Number(confidenceThreshold.value);
      const { counts, normalizedDetections } = aggregateDetections(predictions, threshold);
      const auditRows = buildAudit(expected, counts);
      const dashboardData = computeDashboard(auditRows, counts);

      drawResults(element, normalizedDetections);
      renderDetections(normalizedDetections);
      renderCounts(counts);
      renderAudit(auditRows);
      renderDashboard(dashboardData);

      lastState = { counts, auditRows, detections: normalizedDetections, threshold };
      statusMessage.textContent = `Analyse terminée (${normalizedDetections.length} détections retenues, personnes exclues).`;
      statusMessage.className = 'status status-ok';
      printReportBtn.disabled = false;
      downloadReportBtn.disabled = false;
    } catch (err) {
      statusMessage.textContent = `Erreur d'analyse: ${err.message}`;
      statusMessage.className = 'status status-ko';
    }
  }

  function drawResults(sourceElement, detections) {
    const width = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
    const height = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;
    if (!width || !height) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceElement, 0, 0, width, height);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#22c55e';

    detections.forEach((det) => {
      const [x, y, w, h] = det.bbox;
      ctx.strokeRect(x, y, w, h);
      const label = `${det.label} (${(det.score * 100).toFixed(1)}%)`;
      ctx.fillText(label, x + 4, Math.max(14, y - 6));
    });
  }

  function renderDetections(detections) {
    resultList.innerHTML = '';
    if (detections.length === 0) {
      resultsEmpty.style.display = 'block';
      resultsEmpty.textContent = 'Aucune détection exploitable au-dessus du seuil (ou uniquement personnes/autres classes non mappées).';
      return;
    }

    resultsEmpty.style.display = 'none';
    detections.forEach((det, idx) => {
      const item = document.createElement('li');
      item.textContent = `${idx + 1}. ${det.label} | classe IA: ${det.cocoClass} | confiance: ${(det.score * 100).toFixed(1)}%`;
      resultList.appendChild(item);
    });
  }

  function renderCounts(counts) {
    counterList.innerHTML = '';
    const entries = Object.entries(counts).filter(([, value]) => value > 0);
    if (entries.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucun compteur disponible.';
      counterList.appendChild(li);
      return;
    }

    entries.forEach(([categoryId, value]) => {
      const def = CATEGORY_DEFS.find((d) => d.id === categoryId);
      const li = document.createElement('li');
      li.textContent = `${def ? def.label : categoryId}: ${value}`;
      counterList.appendChild(li);
    });
  }

  function renderAudit(auditRows) {
    if (!auditRows.length) {
      auditTableWrap.innerHTML = '<p class="empty">L\'audit apparaîtra après une analyse.</p>';
      return;
    }

    const rows = auditRows
      .map((row) => `<tr><td>${row.label}</td><td>${row.expected}</td><td>${row.detected ?? '-'}</td><td>${row.delta ?? '-'}</td><td>${row.status}</td></tr>`)
      .join('');
    auditTableWrap.innerHTML = `<table><thead><tr><th>Catégorie</th><th>Attendu</th><th>Détecté</th><th>Écart</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderDashboard(data) {
    dashboard.innerHTML = [
      ['Total détecté', data.totalDetected],
      ['Catégories reconnues', data.recognizedCategories],
      ['Règles vérifiables', data.verifiableRules],
      ['Écarts', data.gaps],
      ['Statut global', data.globalStatus]
    ]
      .map(([label, value]) => `<div class="kpi"><div>${label}</div><div class="kpi-value">${value}</div></div>`)
      .join('');
  }

  function generateReport() {
    const timestamp = new Date().toLocaleString('fr-FR');
    const unsupported = unsupportedCategories().join(', ');
    const lines = [
      '=== Rapport EPITA Smart Classroom ===',
      `Date: ${timestamp}`,
      `Seuil de confiance: ${(lastState.threshold || Number(confidenceThreshold.value)).toFixed(2)}`,
      '',
      'Contexte:',
      '- Audit visuel basé sur COCO-SSD dans le navigateur.',
      '- Les personnes détectées sont ignorées volontairement.',
      '',
      'Objets détectés (catégories mappées):',
      ...Object.entries(lastState.counts).map(([id, n]) => {
        const def = CATEGORY_DEFS.find((d) => d.id === id);
        return `- ${def ? def.label : id}: ${n}`;
      }),
      '',
      'Attendus vs observés:',
      ...lastState.auditRows.map((row) => `- ${row.label}: attendu ${row.expected}, observé ${row.detected ?? 'N/A'}, écart ${row.delta ?? 'N/A'}, statut ${row.status}`),
      '',
      `Catégories non prises en charge: ${unsupported}.`,
      'Limites: un objet non détecté n\'est pas forcément absent (cadrage, masquage, qualité image, limites du modèle).',
      'Recommandations: refaire des captures sous différents angles et luminosités, compléter par contrôle humain.'
    ];

    reportOutput.textContent = lines.join('\n');
  }

  function downloadReport() {
    const text = reportOutput.textContent;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-audit-epita-smart-classroom.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
})();
