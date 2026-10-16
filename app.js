const $ = (id) => document.getElementById(id);
const elements = {
  video: $('video'), image: $('testImage'), canvas: $('overlayCanvas'),
  startCamera: $('startCameraBtn'), stopCamera: $('stopCameraBtn'),
  analyzeFrame: $('analyzeFrameBtn'), analyzeImage: $('analyzeImageBtn'),
  imageInput: $('imageInput'), threshold: $('thresholdRange'), thresholdValue: $('thresholdValue'),
  status: $('status'), detections: $('detectionsList'), unsupported: $('unsupportedList'),
  auditTable: $('auditTableBody'), dashboard: $('dashboard'), report: $('report'),
  generateReport: $('generateReportBtn'), printReport: $('printReportBtn')
};

let model = null;
let stream = null;
let sourceMode = null;
let sourceObjectUrl = null;
let rawDetections = [];
let currentDetections = [];
let analysisState = 'unavailable';
let analysisLabel = 'Aucune source analysée';
let analysisInProgress = false;
let RawImage;
const MODEL_NAME = 'Xenova/owlvit-base-patch32';
const MODEL_LABELS = ['dining table', 'chair', 'laptop', 'tv', 'blackboard', 'whiteboard', 'window', 'person'];

function setStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.type = type;
}

function getThreshold() {
  return Number(elements.threshold.value);
}

function updateThresholdLabel() {
  elements.thresholdValue.textContent = `${Math.round(getThreshold() * 100)} %`;
}

function getExpectedConfig() {
  return Object.fromEntries(AuditUtils.CATEGORY_DEFS.map((definition) => [
    definition.id,
    Math.max(0, Number($(`expected-${definition.id}`).value) || 0)
  ]));
}

function filterDetections() {
  return rawDetections.filter((prediction) => prediction.class !== 'person' && prediction.score >= getThreshold());
}

function getSourceDimensions(source) {
  return { width: source.videoWidth || source.naturalWidth || 0, height: source.videoHeight || source.naturalHeight || 0 };
}

function resizeCanvas(source) {
  const rect = source.getBoundingClientRect();
  elements.canvas.width = Math.max(1, rect.width);
  elements.canvas.height = Math.max(1, rect.height);
}

function drawDetections(detections, source) {
  resizeCanvas(source);
  const context = elements.canvas.getContext('2d');
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  const { width, height } = getSourceDimensions(source);
  if (!width || !height) return;
  const scale = Math.min(elements.canvas.width / width, elements.canvas.height / height);
  const offsetX = (elements.canvas.width - width * scale) / 2;
  const offsetY = (elements.canvas.height - height * scale) / 2;
  context.font = '600 12px sans-serif';
  context.lineWidth = 2;
  detections.forEach((prediction) => {
    const [x, y, boxWidth, boxHeight] = prediction.bbox;
    const displayX = offsetX + x * scale;
    const displayY = offsetY + y * scale;
    const displayWidth = boxWidth * scale;
    const displayHeight = boxHeight * scale;
    const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
    context.strokeStyle = '#a6e22e';
    context.strokeRect(displayX, displayY, displayWidth, displayHeight);
    context.fillStyle = '#101820';
    context.fillRect(displayX, Math.max(0, displayY - 20), context.measureText(label).width + 10, 20);
    context.fillStyle = '#f7f5ef';
    context.fillText(label, displayX + 5, Math.max(14, displayY - 6));
  });
}

function renderDetections() {
  currentDetections = filterDetections();
  const counts = AuditUtils.aggregateDetections(currentDetections, 0).counts;
  const displayState = analysisState === 'unavailable'
    ? 'unavailable'
    : currentDetections.length ? 'complete' : 'empty';
  const auditRows = AuditUtils.buildAudit(getExpectedConfig(), counts, displayState);
  const dashboard = AuditUtils.computeDashboard(auditRows, counts, displayState);

  elements.detections.replaceChildren();
  const message = document.createElement('li');
  if (!currentDetections.length) {
    message.textContent = displayState === 'empty' && analysisState !== 'unavailable'
      ? 'Aucune détection au-dessus du seuil. Cela ne prouve pas une absence.'
      : 'Aucun résultat disponible.';
    elements.detections.appendChild(message);
  } else {
    currentDetections.forEach((prediction) => {
      const item = document.createElement('li');
      item.textContent = `${prediction.class} - confiance ${Math.round(prediction.score * 100)} %`;
      elements.detections.appendChild(item);
    });
  }

  elements.auditTable.replaceChildren();
  auditRows.forEach((row) => {
    const tableRow = document.createElement('tr');
    [row.label, row.expected, row.detected ?? 'N/D', row.delta == null ? 'N/D' : row.delta > 0 ? `+${row.delta}` : row.delta, row.status]
      .forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        tableRow.appendChild(cell);
      });
    elements.auditTable.appendChild(tableRow);
  });

  elements.dashboard.replaceChildren();
  [['Objets détectés', dashboard.totalDetected], ['Catégories avec détection', dashboard.recognizedCategories],
    ['Catégories vérifiables', dashboard.verifiableRules], ['Écarts observés', dashboard.gaps],
    ['Statut global', dashboard.globalStatus]].forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'kpi';
    const caption = document.createElement('span');
    caption.textContent = label;
    const result = document.createElement('strong');
    result.textContent = value;
    item.append(caption, result);
    elements.dashboard.appendChild(item);
  });
  elements.dashboard.dataset.status = dashboard.globalStatus;
  updateReport(auditRows, dashboard);
}

function renderUnsupported() {
  elements.unsupported.replaceChildren();
  AuditUtils.unsupportedCategories().forEach((label) => {
    const item = document.createElement('li');
    item.textContent = `${label}: non prise en charge par OWL-ViT avec les libellés configurés.`;
    elements.unsupported.appendChild(item);
  });
}

function updateReport(auditRows, dashboard) {
  const counts = AuditUtils.aggregateDetections(currentDetections, 0).counts;
  const lines = [
    'RAPPORT D’AUDIT - EPITA SMART CLASSROOM',
    `Date et heure : ${new Date().toLocaleString('fr-FR')}`,
    `Source : ${analysisLabel}`,
    `Modèle : OWL-ViT (${MODEL_NAME}) via Transformers.js`,
    `Seuil de confiance : ${Math.round(getThreshold() * 100)} %`, '',
    `Statut global : ${dashboard.globalStatus}`,
    'Justification : un résultat nul peut provenir d’un objet masqué, hors champ, mal éclairé ou non reconnu.', '',
    'Objets effectivement détectés :',
    Object.keys(counts).length ? Object.entries(counts).map(([name, count]) => `- ${name} : ${count}`) : '- Aucun objet au-dessus du seuil.', '',
    'Configuration attendue / observée:',
    auditRows.map((row) => row.detected == null
      ? `- ${row.label} : attendu ${row.expected}, observation indisponible (${row.status}).`
      : `- ${row.label} : attendu ${row.expected}, détecté ${row.detected}, écart ${row.delta == null ? 'non calculable' : row.delta}. ${row.status}.`), '',
    `Catégories non prises en charge : ${AuditUtils.unsupportedCategories().length ? AuditUtils.unsupportedCategories().join(', ') : 'aucune parmi les catégories configurées.'}`,
    'Limites : OWL-ViT peut produire des faux positifs ou faux négatifs; les personnes sont ignorées et aucune image n’est enregistrée ni envoyée.',
    'Recommandations : multiplier les angles de vue et confirmer chaque écart par un contrôle humain.'
  ].flat();
  elements.report.textContent = lines.join('\n');
}

async function analyzeSource(source, label) {
  if (!model || analysisInProgress) return;
  analysisInProgress = true;
  elements.analyzeFrame.disabled = true;
  elements.analyzeImage.disabled = true;
  setStatus('Analyse en cours…', 'loading');
  rawDetections = [];
  currentDetections = [];
  try {
    if (source === elements.video && (!source.videoWidth || !source.videoHeight)) {
      throw new Error('la caméra n’a pas encore fourni d’image');
    }
    const { width, height } = getSourceDimensions(source);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCanvas.getContext('2d').drawImage(source, 0, 0, width, height);
    const predictions = await model(await RawImage.fromCanvas(sourceCanvas), MODEL_LABELS, { threshold: 0.01 });
    rawDetections = predictions.map((prediction) => ({
      class: prediction.label,
      score: prediction.score,
      bbox: [prediction.box.xmin, prediction.box.ymin, prediction.box.xmax - prediction.box.xmin, prediction.box.ymax - prediction.box.ymin]
    }));
    analysisState = rawDetections.some((prediction) => prediction.class !== 'person') ? 'complete' : 'empty';
    analysisLabel = label;
    drawDetections(filterDetections(), source);
    renderDetections();
    setStatus(`${currentDetections.length} objet(s) retenu(s) après filtrage. Les personnes sont ignorées.`, 'success');
  } catch (error) {
    analysisState = 'unavailable';
    analysisLabel = label;
    setStatus(`Analyse impossible : ${error.message}. Réessayez avec une autre source.`, 'error');
    renderDetections();
  } finally {
    analysisInProgress = false;
    elements.analyzeFrame.disabled = !stream;
    elements.analyzeImage.disabled = !elements.image.src || !model;
  }
}

async function loadModel() {
  try {
    setStatus('Chargement du modèle de vision…', 'loading');
    const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
    transformers.env.allowLocalModels = false;
    transformers.env.remoteHost = `${window.location.origin}/hf`;
    transformers.env.remotePathTemplate = '{model}/resolve/{revision}/';
    RawImage = transformers.RawImage;
    model = await transformers.pipeline('zero-shot-object-detection', MODEL_NAME);
    elements.analyzeImage.disabled = !elements.image.src;
    elements.analyzeFrame.disabled = !stream;
    setStatus('Modèle disponible. Choisissez une image ou démarrez la caméra.', 'success');
  } catch (error) {
    analysisState = 'unavailable';
    elements.analyzeFrame.disabled = true;
    elements.analyzeImage.disabled = true;
    setStatus(`Modèle indisponible : ${error.message}. Vérifiez le réseau puis rechargez la page.`, 'error');
    renderDetections();
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Ce navigateur ne prend pas en charge l’accès à la caméra. Utilisez un import local.', 'error');
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    elements.video.srcObject = stream;
    elements.video.style.display = 'block';
    elements.image.style.display = 'none';
    sourceMode = 'camera';
    elements.startCamera.disabled = true;
    elements.stopCamera.disabled = false;
    elements.analyzeFrame.disabled = !model;
    setStatus('Caméra active. Cadrez uniquement le mobilier et les équipements.', 'success');
  } catch (error) {
    const message = error.name === 'NotAllowedError' ? 'Autorisation caméra refusée.' : error.name === 'NotFoundError' ? 'Aucune caméra disponible.' : `Accès caméra impossible : ${error.message}`;
    setStatus(`${message} Vous pouvez importer une image locale.`, 'error');
  }
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  elements.video.srcObject = null;
  elements.video.style.display = 'none';
  elements.startCamera.disabled = false;
  elements.stopCamera.disabled = true;
  elements.analyzeFrame.disabled = true;
  if (sourceMode === 'camera') {
    sourceMode = null;
    elements.canvas.getContext('2d').clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  }
  setStatus('Caméra arrêtée. Les ressources ont été libérées.', 'info');
}

function importImage(event) {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Sélectionnez un fichier image valide.', 'error');
    return;
  }
  stopCamera();
  if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
  sourceObjectUrl = URL.createObjectURL(file);
  elements.image.onload = () => {
    elements.image.style.display = 'block';
    sourceMode = 'image';
    elements.analyzeImage.disabled = !model;
    setStatus('Image locale chargée. Elle reste dans votre navigateur.', 'success');
  };
  elements.image.onerror = () => setStatus('Cette image ne peut pas être lue.', 'error');
  elements.image.src = sourceObjectUrl;
}

function refreshAudit() {
  if (analysisState !== 'unavailable') renderDetections();
}

elements.startCamera.addEventListener('click', startCamera);
elements.stopCamera.addEventListener('click', stopCamera);
elements.analyzeFrame.addEventListener('click', () => analyzeSource(elements.video, 'Image capturée depuis la caméra'));
elements.analyzeImage.addEventListener('click', () => analyzeSource(elements.image, 'Image locale importée'));
elements.imageInput.addEventListener('change', importImage);
elements.threshold.addEventListener('input', () => {
  updateThresholdLabel();
  if (sourceMode === 'camera') drawDetections(filterDetections(), elements.video);
  if (sourceMode === 'image') drawDetections(filterDetections(), elements.image);
  refreshAudit();
});
document.querySelectorAll('[id^="expected-"]').forEach((input) => input.addEventListener('input', refreshAudit));
elements.generateReport.addEventListener('click', renderDetections);
elements.printReport.addEventListener('click', () => window.print());
window.addEventListener('pagehide', stopCamera);

updateThresholdLabel();
renderUnsupported();
renderDetections();
loadModel();
