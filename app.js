const elements = {
  video: document.getElementById("video"),
  canvas: document.getElementById("overlayCanvas"),
  ctx: document.getElementById("overlayCanvas").getContext("2d"),
  testImage: document.getElementById("testImage"),
  testImageInput: document.getElementById("testImageInput"),
  startCameraBtn: document.getElementById("startCameraBtn"),
  stopCameraBtn: document.getElementById("stopCameraBtn"),
  analyzeFrameBtn: document.getElementById("analyzeFrameBtn"),
  analyzeImageBtn: document.getElementById("analyzeImageBtn"),
  thresholdRange: document.getElementById("thresholdRange"),
  thresholdValue: document.getElementById("thresholdValue"),
  status: document.getElementById("status"),
  detectionsList: document.getElementById("detectionsList"),
  unsupportedList: document.getElementById("unsupportedList"),
  dashboard: document.getElementById("dashboard"),
  generateReportBtn: document.getElementById("generateReportBtn"),
  report: document.getElementById("report")
};

const expectedConfigFields = {
  tables: document.getElementById("expectedTables"),
  chairs: document.getElementById("expectedChairs"),
  boards: document.getElementById("expectedBoards"),
  laptops: document.getElementById("expectedLaptops"),
  windows: document.getElementById("expectedWindows"),
  screens: document.getElementById("expectedScreens")
};

const requirementToModelClass = {
  tables: "dining table",
  chairs: "chair",
  laptops: "laptop",
  screens: "tv"
};

const unsupportedRequiredCategories = ["boards", "windows"];
const requiredLabels = {
  tables: "Tables/Bureaux",
  chairs: "Chaises",
  boards: "Tableaux",
  laptops: "Ordinateurs portables",
  windows: "Fenêtres",
  screens: "Écrans"
};

let model;
let currentDetections = [];
let stream;
let testImageFileUrl;

async function loadModel() {
  try {
    model = await cocoSsd.load();
    setStatus("Modèle chargé. Prêt pour l'analyse.");
  } catch (error) {
    setStatus(`Échec du chargement du modèle: ${error.message}`);
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}

function getThreshold() {
  return Number(elements.thresholdRange.value);
}

function updateThresholdLabel() {
  elements.thresholdValue.textContent = getThreshold().toFixed(2);
}

function clearCanvas() {
  elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}

function resizeCanvasFor(target) {
  const rect = target.getBoundingClientRect();
  elements.canvas.width = rect.width;
  elements.canvas.height = rect.height;
}

function drawDetections(detections, sourceElement) {
  resizeCanvasFor(sourceElement);
  clearCanvas();

  const srcWidth = sourceElement.videoWidth || sourceElement.naturalWidth;
  const srcHeight = sourceElement.videoHeight || sourceElement.naturalHeight;
  if (!srcWidth || !srcHeight) {
    return;
  }

  const scale = Math.min(elements.canvas.width / srcWidth, elements.canvas.height / srcHeight);
  const displayWidth = srcWidth * scale;
  const displayHeight = srcHeight * scale;
  const offsetX = (elements.canvas.width - displayWidth) / 2;
  const offsetY = (elements.canvas.height - displayHeight) / 2;

  elements.ctx.strokeStyle = "#00e676";
  elements.ctx.fillStyle = "#00e676";
  elements.ctx.lineWidth = 2;
  elements.ctx.font = "13px Arial";

  detections.forEach((det) => {
    const [x, y, w, h] = det.bbox;
    const sx = offsetX + x * scale;
    const sy = offsetY + y * scale;
    const sw = w * scale;
    const sh = h * scale;

    elements.ctx.strokeRect(sx, sy, sw, sh);
    const label = `${det.class} (${(det.score * 100).toFixed(1)}%)`;
    elements.ctx.fillText(label, sx, Math.max(12, sy - 4));
  });
}

function getExpectedConfig() {
  return Object.fromEntries(
    Object.entries(expectedConfigFields).map(([key, input]) => [key, Number(input.value) || 0])
  );
}

function countByClass(detections) {
  return detections.reduce((acc, det) => {
    acc[det.class] = (acc[det.class] || 0) + 1;
    return acc;
  }, {});
}

function getAuditRows(counts, expectedConfig) {
  const rows = [];

  Object.entries(requirementToModelClass).forEach(([reqKey, modelClass]) => {
    const expected = expectedConfig[reqKey] || 0;
    const detected = counts[modelClass] || 0;
    const gap = detected - expected;
    rows.push({
      categoryKey: reqKey,
      expected,
      detected,
      gap,
      verifiable: true,
      status: gap === 0 ? "OK" : "Écart"
    });
  });

  unsupportedRequiredCategories.forEach((reqKey) => {
    rows.push({
      categoryKey: reqKey,
      expected: expectedConfig[reqKey] || 0,
      detected: null,
      gap: null,
      verifiable: false,
      status: "Non prise en charge"
    });
  });

  return rows;
}

function updateDetectionList(detections) {
  elements.detectionsList.innerHTML = "";
  if (detections.length === 0) {
    elements.detectionsList.innerHTML = "<li>Aucune détection au-dessus du seuil.</li>";
    return;
  }

  detections.forEach((det) => {
    const item = document.createElement("li");
    item.textContent = `${det.class} — confiance ${(det.score * 100).toFixed(1)}%`;
    elements.detectionsList.appendChild(item);
  });
}

function updateUnsupportedList() {
  elements.unsupportedList.innerHTML = "";
  unsupportedRequiredCategories.forEach((key) => {
    const item = document.createElement("li");
    item.textContent = `${requiredLabels[key]} (non reconnue par COCO-SSD)`;
    elements.unsupportedList.appendChild(item);
  });
}

function updateDashboard(detections) {
  const counts = countByClass(detections);
  const expected = getExpectedConfig();
  const rows = getAuditRows(counts, expected);
  const total = detections.length;
  const recognizedCategories = Object.keys(counts).length;
  const verifiableRules = rows.filter((r) => r.verifiable).length;
  const gaps = rows.filter((r) => r.verifiable && r.gap !== 0).length;
  const globalStatus = gaps === 0 ? "Conforme (sur catégories vérifiables)" : "Écarts à vérifier";

  const kpis = [
    ["Objets détectés", String(total)],
    ["Catégories reconnues", String(recognizedCategories)],
    ["Règles vérifiables", String(verifiableRules)],
    ["Écarts observés", String(gaps)],
    ["Statut global", globalStatus]
  ];

  elements.dashboard.innerHTML = "";
  kpis.forEach(([title, value]) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<strong>${title}</strong><br>${value}`;
    elements.dashboard.appendChild(div);
  });
}

function buildReport(detections) {
  const expected = getExpectedConfig();
  const counts = countByClass(detections);
  const rows = getAuditRows(counts, expected);
  const lines = [];

  lines.push("RAPPORT D'AUDIT — EPITA Smart Classroom");
  lines.push(`Date: ${new Date().toLocaleString("fr-FR")}`);
  lines.push("");
  lines.push("Contexte");
  lines.push("- Audit visuel automatisé d'une salle de cours via modèle COCO-SSD dans le navigateur.");
  lines.push("- Exclusion active des personnes: toute détection de classe 'person' est ignorée.");
  lines.push("");

  lines.push("Objets détectés");
  if (detections.length === 0) {
    lines.push("- Aucun objet détecté au-dessus du seuil courant.");
  } else {
    Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([cls, count]) => lines.push(`- ${cls}: ${count}`));
  }
  lines.push("");

  lines.push("Comparaison attendu / observé");
  rows.forEach((row) => {
    const name = requiredLabels[row.categoryKey];
    if (!row.verifiable) {
      lines.push(`- ${name}: attendu ${row.expected}, non vérifiable automatiquement (${row.status}).`);
      return;
    }
    lines.push(
      `- ${name}: attendu ${row.expected}, détecté ${row.detected}, écart ${row.gap >= 0 ? "+" : ""}${row.gap} (${row.status}).`
    );
  });
  lines.push("");

  lines.push("Catégories non prises en charge");
  unsupportedRequiredCategories.forEach((key) => {
    lines.push(`- ${requiredLabels[key]}`);
  });
  lines.push("");

  lines.push("Limites de l'analyse");
  lines.push("- Les objets masqués, hors champ ou flous peuvent être sous-détectés.");
  lines.push("- Le modèle COCO-SSD ne couvre pas toutes les catégories métier demandées.");
  lines.push("- Le résultat dépend du seuil de confiance configuré.");
  lines.push("");

  lines.push("Recommandations");
  lines.push("- Réaliser plusieurs captures sous différents angles.");
  lines.push("- Compléter par un contrôle humain pour les catégories non prises en charge.");
  lines.push("- Refaire l'audit en cas de changement d'aménagement de la salle.");

  elements.report.textContent = lines.join("\n");
}

async function detectFrom(sourceElement) {
  if (!model) {
    setStatus("Le modèle n'est pas chargé.");
    return;
  }

  const threshold = getThreshold();
  const rawDetections = await model.detect(sourceElement);
  const detections = rawDetections.filter(
    (det) => det.score >= threshold && det.class !== "person"
  );
  const peopleInFrame = rawDetections.filter((det) => det.class === "person").length;

  currentDetections = detections;
  drawDetections(detections, sourceElement);
  updateDetectionList(detections);
  updateUnsupportedList();
  updateDashboard(detections);
  buildReport(detections);

  setStatus(
    `${detections.length} objet(s) détecté(s) (personnes ignorées: ${peopleInFrame}). Seuil: ${threshold.toFixed(2)}.`
  );
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    elements.video.srcObject = stream;
    elements.video.style.display = "block";
    elements.testImage.style.display = "none";
    elements.startCameraBtn.disabled = true;
    elements.stopCameraBtn.disabled = false;
    elements.analyzeFrameBtn.disabled = false;
    setStatus("Caméra active.");
  } catch (error) {
    setStatus(`Impossible d'accéder à la caméra: ${error.message}`);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  elements.video.srcObject = null;
  elements.startCameraBtn.disabled = false;
  elements.stopCameraBtn.disabled = true;
  elements.analyzeFrameBtn.disabled = true;
  clearCanvas();
  setStatus("Caméra arrêtée.");
}

function handleTestImageSelection(event) {
  const file = event.target.files?.[0];
  elements.analyzeImageBtn.disabled = !file;

  if (!file) {
    return;
  }

  if (testImageFileUrl) {
    URL.revokeObjectURL(testImageFileUrl);
  }

  testImageFileUrl = URL.createObjectURL(file);
  elements.testImage.src = testImageFileUrl;
  elements.testImage.style.display = "block";
  elements.video.style.display = "none";
}

function bindEvents() {
  elements.startCameraBtn.addEventListener("click", startCamera);
  elements.stopCameraBtn.addEventListener("click", stopCamera);
  elements.analyzeFrameBtn.addEventListener("click", () => detectFrom(elements.video));
  elements.analyzeImageBtn.addEventListener("click", () => detectFrom(elements.testImage));
  elements.testImageInput.addEventListener("change", handleTestImageSelection);
  elements.generateReportBtn.addEventListener("click", () => buildReport(currentDetections));
  elements.thresholdRange.addEventListener("input", updateThresholdLabel);
}

updateThresholdLabel();
bindEvents();
updateUnsupportedList();
updateDashboard([]);
buildReport([]);
loadModel();
