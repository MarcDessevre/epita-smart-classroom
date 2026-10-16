const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateDetections, buildAudit, computeDashboard, buildDefaultExpected } = require('../utils.js');

test('aggregateDetections ignores person and applies threshold', () => {
  const predictions = [
    { class: 'person', score: 0.99, bbox: [0, 0, 1, 1] },
    { class: 'chair', score: 0.9, bbox: [1, 1, 1, 1] },
    { class: 'chair', score: 0.2, bbox: [1, 1, 1, 1] },
    { class: 'dining table', score: 0.8, bbox: [1, 1, 1, 1] }
  ];

  const result = aggregateDetections(predictions, 0.5);
  assert.equal(result.counts.chair, 1);
  assert.equal(result.counts.table, 1);
  assert.equal(result.normalizedDetections.length, 2);
});

test('normalizeClass maps OWL-ViT board and window labels', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, { chair: 20, table: 10, laptop: 5, blackboard: 1, window: 2 });

  const blackboard = rows.find((r) => r.id === 'blackboard');
  const window = rows.find((r) => r.id === 'window');
  assert.equal(blackboard.verifiable, true);
  assert.equal(blackboard.status, 'conforme');
  assert.equal(window.status, 'surplus');
});

test('computeDashboard returns gaps and global status', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, { chair: 19, table: 10, laptop: 5, screen: 0 });
  const data = computeDashboard(rows, { chair: 19, table: 10, laptop: 5, screen: 0 });

  assert.equal(data.totalDetected, 34);
  assert.equal(data.verifiableRules, 6);
  assert.equal(data.gaps, 2);
  assert.equal(data.globalStatus, 'Écarts détectés');
});

test('buildAudit distinguishes an empty analysis from an unsupported category', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, {}, 'empty');
  const chair = rows.find((row) => row.id === 'chair');
  const blackboard = rows.find((row) => row.id === 'blackboard');

  assert.equal(chair.status, 'aucune détection produite');
  assert.equal(chair.verifiable, false);
  assert.equal(blackboard.status, 'aucune détection produite');
});

test('unavailable analysis produces an unavailable global status', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, {}, 'unavailable');
  const data = computeDashboard(rows, {}, 'unavailable');

  assert.equal(data.verifiableRules, 0);
  assert.equal(data.globalStatus, 'Analyse indisponible');
});
