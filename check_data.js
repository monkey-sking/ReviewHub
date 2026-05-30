const { loadDashboardData } = require('./lib/dashboard');
process.env.OPERATIONS_ROOT = process.cwd() + '/mock_ops';
process.env.APPROVAL_REGISTRY_PATH = process.cwd() + '/mock_ops/Ops/state/approval_registry.json';
process.env.DAILY_CHANNEL_QUEUE_PATH = process.cwd() + '/mock_ops/Ops/state/daily_channel_queue.json';

try {
  const data = loadDashboardData();
  console.log('SUCCESS: Data loaded. Item count:', data.items.length);
  console.log('First item:', JSON.stringify(data.items[0], null, 2));
} catch (e) {
  console.error('FAILED to load data:', e.message);
  if (e.details) console.error('Details:', e.details);
}
