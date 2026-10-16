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

test('buildAudit marks unsupported categories as non verifiable', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, { chair: 20, table: 10, laptop: 5 });

  const blackboard = rows.find((r) => r.id === 'blackboard');
  assert.equal(blackboard.verifiable, false);
  assert.equal(blackboard.status, 'non vérifiable');
});

test('computeDashboard returns gaps and global status', () => {
  const expected = buildDefaultExpected();
  const rows = buildAudit(expected, { chair: 19, table: 10, laptop: 5, screen: 0 });
  const data = computeDashboard(rows, { chair: 19, table: 10, laptop: 5, screen: 0 });

  assert.equal(data.totalDetected, 34);
  assert.equal(data.verifiableRules, 4);
  assert.equal(data.gaps, 1);
  assert.equal(data.globalStatus, 'Écarts détectés');
});
