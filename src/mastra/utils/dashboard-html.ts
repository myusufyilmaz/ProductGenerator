export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Automation Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .stat-label {
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }
    th {
      background: #f8f9fa;
      color: #666;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .status-published { background: #d1fae5; color: #065f46; }
    .status-processing { background: #fef3c7; color: #92400e; }
    .status-review { background: #dbeafe; color: #1e40af; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #f3f4f6; color: #374151; }
    .status-running { background: #e0f2fe; color: #075985; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-duplicate { background: #fde68a; color: #78350f; }
    .refresh-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      float: right;
    }
    .refresh-btn:hover {
      background: #1d4ed8;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    .empty-state-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .cost-highlight {
      color: #2563eb;
      font-weight: 600;
    }
    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Product Automation Dashboard</h1>
      <p class="subtitle">Real-time monitoring for your Shopify product listing automation</p>
      <div style="display: flex; align-items: center; gap: 10px; float: right;">
        <span id="last-update" style="font-size: 12px; color: #666;">Last updated: Never</span>
        <button class="refresh-btn" onclick="loadData()">↻ Refresh</button>
      </div>
    </div>

    <div class="stats-grid" id="stats-grid">
      <div class="loading">Loading statistics...</div>
    </div>

    <div class="section">
      <h2 class="section-title">📦 Recent Products</h2>
      <div id="products-table">
        <div class="loading">Loading products...</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🔄 Processing Runs</h2>
      <div id="runs-table">
        <div class="loading">Loading runs...</div>
      </div>
    </div>
  </div>

  <script>
    async function loadData() {
      try {
        const response = await fetch('/api/dashboard/data');
        const data = await response.json();

        renderStats(data.stats);
        renderProducts(data.products);
        renderRuns(data.runs);

        const now = new Date();
        document.getElementById('last-update').textContent = 'Last updated: ' + now.toLocaleTimeString();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('last-update').textContent = 'Update failed';
      }
    }

    function renderStats(stats) {
      const statsGrid = document.getElementById('stats-grid');
      const html = '<div class="stat-card"><div class="stat-value">' + (stats.total_products || 0) + '</div><div class="stat-label">Total Products</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.published || 0) + '</div><div class="stat-label">Published</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.processing || 0) + '</div><div class="stat-label">Processing</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.review || 0) + '</div><div class="stat-label">In Review</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.failed || 0) + '</div><div class="stat-label">Failed</div></div>' +
        '<div class="stat-card"><div class="stat-value">$' + ((parseFloat(stats.total_cost) / 100 || 0).toFixed(2)) + '</div><div class="stat-label">Total Cost</div></div>';
      statsGrid.innerHTML = html;
    }

    function renderProducts(products) {
      const container = document.getElementById('products-table');

      if (!products || products.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No products processed yet. Add SKU folders to your Google Drive to get started!</p></div>';
        return;
      }

      let rows = '';
      for (const p of products) {
        rows += '<tr>' +
          '<td class="truncate" title="' + (p.product_title || p.file_name) + '">' + (p.product_title || p.file_name) + '</td>' +
          '<td><span class="status-badge status-' + p.status + '">' + p.status + '</span></td>' +
          '<td>' + (p.overall_confidence || '-') + '%</td>' +
          '<td class="truncate" title="' + p.folder_path + '">' + p.folder_path + '</td>' +
          '<td>' + (p.assigned_collection_name || '-') + '</td>' +
          '<td class="cost-highlight">$' + ((parseFloat(p.total_cost) / 100 || 0).toFixed(3)) + '</td>' +
          '<td>' + new Date(p.created_at).toLocaleString() + '</td>' +
          '</tr>';
      }

      container.innerHTML = '<table><thead><tr><th>Product</th><th>Status</th><th>Quality</th><th>Source</th><th>Collection</th><th>Cost</th><th>Created</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderRuns(runs) {
      const container = document.getElementById('runs-table');

      if (!runs || runs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No automation runs yet. The workflow will start processing every 2 hours once deployed!</p></div>';
        return;
      }

      let rows = '';
      for (const r of runs) {
        rows += '<tr>' +
          '<td>' + r.run_id + '</td>' +
          '<td><span class="status-badge status-' + r.status + '">' + r.status + '</span></td>' +
          '<td>' + (r.total_files_scanned || 0) + '</td>' +
          '<td>' + (r.new_products_found || 0) + '</td>' +
          '<td>' + (r.products_published || 0) + '</td>' +
          '<td>' + (r.products_failed || 0) + '</td>' +
          '<td class="cost-highlight">$' + ((parseFloat(r.total_run_cost) / 100 || 0).toFixed(2)) + '</td>' +
          '<td>' + new Date(r.started_at).toLocaleString() + '</td>' +
          '</tr>';
      }

      container.innerHTML = '<table><thead><tr><th>Run ID</th><th>Status</th><th>Scanned</th><th>Found</th><th>Published</th><th>Failed</th><th>Cost</th><th>Started</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>`;
}
