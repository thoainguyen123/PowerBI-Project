import json, os

pas_dir = r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS'
json_path = os.path.join(pas_dir, 'clean_data.json')
html_path = os.path.join(pas_dir, 'index.html')
html_path2 = os.path.join(pas_dir, 'Bao_Cao_TQT.html')

with open(json_path, 'r', encoding='utf-8') as f:
    clean_data = json.load(f)

json_str = json.dumps(clean_data, ensure_ascii=False)

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Tracking Quyết Toán Hợp Đồng (TQT)</title>
  
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <style>
    :root {{
      --bg-canvas: #f3f2f1;
      --card-bg: #ffffff;
      --text-main: #252423;
      --text-muted: #605e5c;
      --pbi-blue: #118dff;
      --pbi-teal: #12239e;
      --pbi-orange: #e66c37;
      --pbi-purple: #6b007b;
      --pbi-green: #00b050;
      --pbi-red: #d11141;
      --card-border: #e1dfdd;
      --shadow: 0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 0.3px 0.9px rgba(0, 0, 0, 0.1);
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif;
    }}

    body {{
      background-color: var(--bg-canvas);
      color: var(--text-main);
      padding: 16px;
      font-size: 14px;
    }}

    .app-container {{
      max-width: 1600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}

    /* Header (Title) */
    .dashboard-header {{
      background: var(--card-bg);
      padding: 12px 24px;
      box-shadow: var(--shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .header-text h1 {{
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main);
    }}

    .header-text p {{
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }}

    .btn {{
      padding: 6px 16px;
      font-size: 13px;
      border: 1px solid var(--card-border);
      background: #ffffff;
      cursor: pointer;
      color: var(--text-main);
    }}

    .btn:hover {{
      background: #f3f2f1;
    }}

    /* Tabs (Pages) */
    .nav-tabs {{
      display: flex;
      gap: 4px;
      background: transparent;
    }}

    .tab-btn {{
      padding: 8px 16px;
      background: #edebe9;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }}

    .tab-btn:hover {{
      background: #e1dfdd;
      color: var(--text-main);
    }}

    .tab-btn.active {{
      background: var(--card-bg);
      border-bottom: 2px solid var(--pbi-blue);
      color: var(--pbi-blue);
      font-weight: 600;
      box-shadow: var(--shadow);
    }}

    /* Tab Panes */
    .tab-pane {{
      display: none;
    }}

    .tab-pane.active {{
      display: block;
    }}

    /* Stat Cards */
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }}

    .stat-card {{
      background: var(--card-bg);
      padding: 16px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      border: 1px solid transparent;
    }}

    .stat-card:hover {{
      border: 1px solid #c8c6c4;
    }}

    .stat-title {{
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 8px;
      font-weight: 600;
    }}

    .stat-value {{
      font-size: 28px;
      font-weight: 300;
      color: var(--text-main);
      margin-bottom: 4px;
    }}

    .stat-sub {{
      font-size: 12px;
      color: var(--text-muted);
    }}

    /* Charts Grid */
    .charts-grid {{
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }}

    .chart-card {{
      background: var(--card-bg);
      box-shadow: var(--shadow);
      padding: 16px;
    }}

    .chart-card.col-4 {{ grid-column: span 4; }}
    .chart-card.col-6 {{ grid-column: span 6; }}
    .chart-card.col-8 {{ grid-column: span 8; }}
    .chart-card.col-12 {{ grid-column: span 12; }}

    @media (max-width: 1024px) {{
      .chart-card.col-4, .chart-card.col-6, .chart-card.col-8 {{ grid-column: span 12; }}
    }}

    .chart-header {{
      margin-bottom: 12px;
    }}

    .chart-title {{
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }}

    .chart-container {{
      position: relative;
      height: 300px;
      width: 100%;
    }}

    /* Filters */
    .filter-panel {{
      background: var(--card-bg);
      padding: 16px;
      box-shadow: var(--shadow);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }}

    .filter-group {{
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 150px;
    }}

    .filter-group label {{
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }}

    .filter-control {{
      padding: 6px 8px;
      border: 1px solid var(--card-border);
      font-size: 13px;
      border-radius: 2px;
      outline: none;
      color: var(--text-main);
    }}

    .filter-control:focus {{
      border-color: var(--pbi-blue);
    }}

    /* Table */
    .table-wrapper {{
      background: var(--card-bg);
      box-shadow: var(--shadow);
      overflow-x: auto;
      max-height: 600px;
      margin-bottom: 16px;
    }}

    table.master-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}

    table.master-table th {{
      background: #f3f2f1;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e1dfdd;
      position: sticky;
      top: 0;
      z-index: 10;
      color: var(--text-muted);
    }}

    table.master-table td {{
      padding: 8px 10px;
      border-bottom: 1px solid #edebe9;
      color: var(--text-main);
      vertical-align: middle;
    }}

    table.master-table tbody tr:hover {{
      background: #f3f2f1;
      cursor: pointer;
    }}
    
    .table-footer {{
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      background: var(--card-bg);
      border-top: 1px solid var(--card-border);
    }}

    .pagination {{
      display: flex;
      gap: 8px;
    }}

    .page-btn {{
      padding: 4px 10px;
      border: 1px solid var(--card-border);
      background: #fff;
      cursor: pointer;
    }}
    
    .page-btn.disabled {{
      opacity: 0.5;
      cursor: not-allowed;
    }}

    /* Modal */
    .modal-overlay {{
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
    }}

    .modal-overlay.active {{
      display: flex;
    }}

    .modal-card {{
      background: var(--card-bg);
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow);
      padding: 24px;
      position: relative;
    }}

    .modal-close {{
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: var(--text-muted);
    }}

    .detail-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 16px;
    }}

    .detail-item {{
      padding: 8px 0;
      border-bottom: 1px solid var(--card-border);
    }}

    .detail-label {{
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 600;
    }}

    .detail-val {{
      font-size: 13px;
      font-weight: 400;
      color: var(--text-main);
    }}
  </style>
</head>
<body>

<div class="app-container">
  
  <!-- Header -->
  <header class="dashboard-header">
    <div class="header-text">
      <h1>Báo cáo Tracking Quyết toán Hợp đồng (TQT)</h1>
      <p>Phòng Kiểm soát Chi phí & Quyết toán (PAS) | Dữ liệu 2026</p>
    </div>
    <div class="header-actions">
      <button class="btn" onclick="exportToCSV()">Xuất dữ liệu</button>
    </div>
  </header>

  <!-- Nav Tabs -->
  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">Tổng quan Executive</button>
    <button class="tab-btn" onclick="switchTab('regional')">Tracking theo Dự án & Khu vực</button>
    <button class="tab-btn" onclick="switchTab('master-table')">Chi tiết Hợp đồng ({clean_data['total_contracts']})</button>
    <button class="tab-btn" onclick="switchTab('pic-analysis')">Theo dõi PIC & Vướng mắc</button>
  </nav>

  <!-- TAB 1: OVERVIEW DASHBOARD -->
  <div id="tab-overview" class="tab-pane active">
    <!-- Stat Cards -->
    <div class="stats-grid">
      
      <div class="stat-card">
        <div class="stat-title">Tổng giá trị hợp đồng</div>
        <div class="stat-value" id="stat-total-gthd">0 Tỷ</div>
        <div class="stat-sub"><span id="stat-total-count">0</span> hợp đồng (gồm VAT)</div>
      </div>

      <div class="stat-card">
        <div class="stat-title">Giá trị Workdone</div>
        <div class="stat-value" id="stat-total-workdone">0 Tỷ</div>
        <div class="stat-sub">Đạt <strong id="stat-workdone-pct">0%</strong> so với GT HĐ</div>
      </div>

      <div class="stat-card">
        <div class="stat-title">Đã thanh toán</div>
        <div class="stat-value" id="stat-total-paid">0 Tỷ</div>
        <div class="stat-sub">Đạt <strong id="stat-paid-pct">0%</strong> so với Workdone</div>
      </div>

      <div class="stat-card">
        <div class="stat-title">Công nợ chưa TT</div>
        <div class="stat-value" id="stat-total-unpaid">0 Tỷ</div>
        <div class="stat-sub">Đã có CPC gồm ứng + WD</div>
      </div>

      <div class="stat-card">
        <div class="stat-title">HĐ Đã quyết toán</div>
        <div class="stat-value" id="stat-qt-count">0</div>
        <div class="stat-sub">Đạt <strong id="stat-qt-pct">0%</strong> tổng số HĐ</div>
      </div>

    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      
      <div class="chart-card col-4">
        <div class="chart-header">
          <div class="chart-title">Tình trạng Quyết toán</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-status-donut"></canvas>
        </div>
      </div>

      <div class="chart-card col-8">
        <div class="chart-header">
          <div class="chart-title">Cơ cấu Giá trị HĐ, Workdone & Đã Thanh toán theo Dự án</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-project-financials"></canvas>
        </div>
      </div>

      <div class="chart-card col-6">
        <div class="chart-header">
          <div class="chart-title">Số lượng Hợp đồng theo Khu vực</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-region-bar"></canvas>
        </div>
      </div>

      <div class="chart-card col-6">
        <div class="chart-header">
          <div class="chart-title">Phân loại Ưu tiên Quyết toán</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-priority-bar"></canvas>
        </div>
      </div>

    </div>
  </div>

  <!-- TAB 2: REGIONAL & PROJECT TRACKING -->
  <div id="tab-regional" class="tab-pane">
    <div id="regional-container" style="display: flex; flex-direction: column; gap: 16px;"></div>
  </div>

  <!-- TAB 3: MASTER DATATABLE -->
  <div id="tab-master-table" class="tab-pane">
    
    <!-- Filter Panel -->
    <div class="filter-panel">
      <div class="filter-group">
        <label>Tìm kiếm</label>
        <input type="text" id="filter-search" class="filter-control" placeholder="Mã HĐ, Nhà thầu, Nội dung..." oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>Dự án</label>
        <select id="filter-project" class="filter-control" onchange="applyFilters()">
          <option value="">Tất cả</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Khu vực</label>
        <select id="filter-region" class="filter-control" onchange="applyFilters()">
          <option value="">Tất cả</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Tình trạng</label>
        <select id="filter-status" class="filter-control" onchange="applyFilters()">
          <option value="">Tất cả</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Ưu tiên</label>
        <select id="filter-priority" class="filter-control" onchange="applyFilters()">
          <option value="">Tất cả</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-wrapper">
      <table class="master-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã HĐ</th>
            <th>Dự Án</th>
            <th>Nhà Thầu / NCC</th>
            <th>Nội Dung Hợp Đồng</th>
            <th>Giá Trị HĐ (VAT)</th>
            <th>Workdone (VAT)</th>
            <th>Đã Thanh Toán</th>
            <th>Tình Trạng QT</th>
          </tr>
        </thead>
        <tbody id="master-table-body">
          <!-- Dynamic rows -->
        </tbody>
      </table>
      <div class="table-footer">
        <div>Hiển thị <strong id="lbl-shown">0</strong> / <strong id="lbl-total">0</strong></div>
        <div class="pagination" id="pagination-controls"></div>
      </div>
    </div>

  </div>

  <!-- TAB 4: PIC & BLOCKERS ANALYSIS -->
  <div id="tab-pic-analysis" class="tab-pane">
    <div class="charts-grid">
      
      <div class="chart-card col-6">
        <div class="chart-header">
          <div class="chart-title">Phân bổ HĐ theo PIC Xây dựng</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-pic-xd"></canvas>
        </div>
      </div>

      <div class="chart-card col-6">
        <div class="chart-header">
          <div class="chart-title">Phân bổ HĐ theo PIC MEP</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-pic-mep"></canvas>
        </div>
      </div>

      <div class="chart-card col-12">
        <div class="chart-header">
          <div class="chart-title">Danh sách HĐ chưa Quyết toán & Vướng mắc</div>
        </div>
        <div style="overflow-x: auto; max-height: 400px;">
          <table class="master-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã HĐ</th>
                <th>Dự Án</th>
                <th>Nhà Thầu</th>
                <th>Tình Trạng QT</th>
                <th>Lý Do Không Đạt / Vướng Mắc</th>
                <th>PIC Phụ Trách</th>
              </tr>
            </thead>
            <tbody id="blockers-table-body">
              <!-- Dynamic content -->
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>

</div>

<!-- Modal Contract Detail -->
<div class="modal-overlay" id="contract-modal">
  <div class="modal-card">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div style="margin-bottom:8px;">
      <span style="font-size: 12px; color: var(--text-muted);" id="modal-project">Dự án</span> | 
      <span style="font-size: 12px; font-weight: 600;" id="modal-code">Mã HĐ</span>
    </div>
    <h2 id="modal-title" style="font-size:18px; font-weight:600; margin-bottom:16px;">Chi tiết hợp đồng</h2>
    
    <div class="detail-grid" id="modal-details-grid">
      <!-- Dynamic details -->
    </div>
  </div>
</div>

<script>
  // Embedded Clean Data
  const RAW_DATA = {json_str};

  let filteredContracts = [...RAW_DATA.contracts];
  let currentPage = 1;
  const pageSize = 20;

  // Formatting helpers
  function fmtVND(val) {{
    if (!val || isNaN(val)) return '0 VNĐ';
    if (Math.abs(val) >= 1e9) return (val / 1e9).toLocaleString('vi-VN', {{minimumFractionDigits: 2, maximumFractionDigits: 2}}) + ' Tỷ';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toLocaleString('vi-VN', {{minimumFractionDigits: 0, maximumFractionDigits: 1}}) + ' Tr';
    return val.toLocaleString('vi-VN') + ' đ';
  }}

  function fmtFullVND(val) {{
    if (!val || isNaN(val)) return '0 VNĐ';
    return val.toLocaleString('vi-VN') + ' VNĐ';
  }}

  // Tab switching
  function switchTab(tabId) {{
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    const pane = document.getElementById('tab-' + tabId);
    if (pane) pane.classList.add('active');
    
    if (tabId === 'regional') renderRegionalView();
    if (tabId === 'pic-analysis') renderPicCharts();
  }}

  // Init App
  document.addEventListener('DOMContentLoaded', () => {{
    initOverviewStats();
    if (typeof Chart !== 'undefined') {{
      Chart.defaults.font.family = '"Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif';
      Chart.defaults.color = '#605e5c';
      initOverviewCharts();
    }}
    populateFilterDropdowns();
    renderMasterTable();
  }});

  function initOverviewStats() {{
    const contracts = RAW_DATA.contracts;
    const totalGthd = contracts.reduce((acc, c) => acc + c.tong_gt_hd_gomvat, 0);
    const totalWorkdone = contracts.reduce((acc, c) => acc + c.workdone_gomvat, 0);
    const totalPaid = contracts.reduce((acc, c) => acc + c.da_thanh_toan_gomvat, 0);
    const totalUnpaid = contracts.reduce((acc, c) => acc + c.cong_no_chua_tt_gomvat, 0);
    const qtContracts = contracts.filter(c => c.tinh_trang_quyet_toan === 'Đã quyết toán');

    document.getElementById('stat-total-gthd').textContent = fmtVND(totalGthd);
    document.getElementById('stat-total-count').textContent = contracts.length;

    document.getElementById('stat-total-workdone').textContent = fmtVND(totalWorkdone);
    const wdPct = totalGthd ? ((totalWorkdone / totalGthd) * 100).toFixed(1) : 0;
    document.getElementById('stat-workdone-pct').textContent = wdPct + '%';

    document.getElementById('stat-total-paid').textContent = fmtVND(totalPaid);
    const paidPct = totalWorkdone ? ((totalPaid / totalWorkdone) * 100).toFixed(1) : 0;
    document.getElementById('stat-paid-pct').textContent = paidPct + '%';

    document.getElementById('stat-total-unpaid').textContent = fmtVND(totalUnpaid);

    document.getElementById('stat-qt-count').textContent = qtContracts.length;
    const qtPct = ((qtContracts.length / contracts.length) * 100).toFixed(1);
    document.getElementById('stat-qt-pct').textContent = qtPct + '%';
  }}

  function initOverviewCharts() {{
    const contracts = RAW_DATA.contracts;
    const colors = ['#118dff', '#12239e', '#e66c37', '#6b007b', '#00b050', '#d11141', '#00a4ef'];

    // 1. Status Donut Chart
    const statusCounts = {{}};
    contracts.forEach(c => {{
      const st = c.tinh_trang_quyet_toan || 'Chưa nộp HSQT';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }});

    new Chart(document.getElementById('chart-status-donut'), {{
      type: 'doughnut',
      data: {{
        labels: Object.keys(statusCounts),
        datasets: [{{
          data: Object.values(statusCounts),
          backgroundColor: colors
        }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {{
          legend: {{ position: 'right' }}
        }}
      }}
    }});

    // 2. Project Financials Bar Chart
    const projMap = {{}};
    contracts.forEach(c => {{
      const p = c.du_an || 'Khác';
      if (!projMap[p]) projMap[p] = {{ gthd: 0, workdone: 0, paid: 0 }};
      projMap[p].gthd += c.tong_gt_hd_gomvat / 1e9;
      projMap[p].workdone += c.workdone_gomvat / 1e9;
      projMap[p].paid += c.da_thanh_toan_gomvat / 1e9;
    }});

    const projLabels = Object.keys(projMap);
    new Chart(document.getElementById('chart-project-financials'), {{
      type: 'bar',
      data: {{
        labels: projLabels,
        datasets: [
          {{ label: 'Giá Trị HĐ (Tỷ)', data: projLabels.map(p => projMap[p].gthd), backgroundColor: '#118dff' }},
          {{ label: 'Workdone (Tỷ)', data: projLabels.map(p => projMap[p].workdone), backgroundColor: '#12239e' }},
          {{ label: 'Đã Thanh Toán (Tỷ)', data: projLabels.map(p => projMap[p].paid), backgroundColor: '#e66c37' }}
        ]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        scales: {{
          x: {{ grid: {{ display: false }} }},
          y: {{ grid: {{ color: '#e1dfdd' }} }}
        }}
      }}
    }});

    // 3. Region Bar Chart
    const regionMap = {{}};
    contracts.forEach(c => {{
      const r = c.khu_vuc || 'Khác';
      regionMap[r] = (regionMap[r] || 0) + 1;
    }});

    new Chart(document.getElementById('chart-region-bar'), {{
      type: 'bar',
      data: {{
        labels: Object.keys(regionMap),
        datasets: [{{
          label: 'Số lượng hợp đồng',
          data: Object.values(regionMap),
          backgroundColor: '#118dff'
        }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
            x: {{ grid: {{ color: '#e1dfdd' }} }},
            y: {{ grid: {{ display: false }} }}
        }}
      }}
    }});

    // 4. Priority Bar Chart
    const prioMap = {{}};
    contracts.forEach(c => {{
      const pr = c.phan_loai_uu_tien || 'Chưa phân loại';
      prioMap[pr] = (prioMap[pr] || 0) + 1;
    }});

    new Chart(document.getElementById('chart-priority-bar'), {{
      type: 'bar',
      data: {{
        labels: Object.keys(prioMap),
        datasets: [{{
          label: 'Số hợp đồng',
          data: Object.values(prioMap),
          backgroundColor: '#6b007b'
        }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
            x: {{ grid: {{ display: false }} }},
            y: {{ grid: {{ color: '#e1dfdd' }} }}
        }}
      }}
    }});
  }}

  function populateFilterDropdowns() {{
    const projects = [...new Set(RAW_DATA.contracts.map(c => c.du_an).filter(Boolean))];
    const regions = [...new Set(RAW_DATA.contracts.map(c => c.khu_vuc).filter(Boolean))];
    const statuses = [...new Set(RAW_DATA.contracts.map(c => c.tinh_trang_quyet_toan).filter(Boolean))];
    const priorities = [...new Set(RAW_DATA.contracts.map(c => c.phan_loai_uu_tien).filter(Boolean))];

    const projSel = document.getElementById('filter-project');
    projects.forEach(p => projSel.add(new Option(p, p)));

    const regSel = document.getElementById('filter-region');
    regions.forEach(r => regSel.add(new Option(r, r)));

    const stSel = document.getElementById('filter-status');
    statuses.forEach(s => stSel.add(new Option(s, s)));

    const prSel = document.getElementById('filter-priority');
    priorities.forEach(p => prSel.add(new Option(p, p)));
  }}

  function applyFilters() {{
    const q = (document.getElementById('filter-search').value || '').toLowerCase();
    const proj = document.getElementById('filter-project').value;
    const reg = document.getElementById('filter-region').value;
    const st = document.getElementById('filter-status').value;
    const pr = document.getElementById('filter-priority').value;

    filteredContracts = RAW_DATA.contracts.filter(c => {{
      const matchSearch = !q || (c.so_hd_chinh + ' ' + c.nha_thau + ' ' + c.du_an + ' ' + c.noi_dung_hd).toLowerCase().includes(q);
      const matchProj = !proj || c.du_an === proj;
      const matchReg = !reg || c.khu_vuc === reg;
      const matchSt = !st || c.tinh_trang_quyet_toan === st;
      const matchPr = !pr || c.phan_loai_uu_tien === pr;

      return matchSearch && matchProj && matchReg && matchSt && matchPr;
    }});

    currentPage = 1;
    renderMasterTable();
  }}

  function renderMasterTable() {{
    const tbody = document.getElementById('master-table-body');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * pageSize;
    const pageData = filteredContracts.slice(start, start + pageSize);

    pageData.forEach((c, idx) => {{
      const tr = document.createElement('tr');
      tr.onclick = () => openModal(c);
      tr.innerHTML = `
        <td>${{start + idx + 1}}</td>
        <td>${{c.so_hd_chinh || c.so_hd_sap || 'N/A'}}</td>
        <td>${{c.du_an}}</td>
        <td>${{c.nha_thau}}</td>
        <td>${{(c.noi_dung_hd || '').substring(0, 48)}}${{(c.noi_dung_hd || '').length > 48 ? '...' : ''}}</td>
        <td>${{fmtVND(c.tong_gt_hd_gomvat)}}</td>
        <td>${{fmtVND(c.workdone_gomvat)}}</td>
        <td>${{fmtVND(c.da_thanh_toan_gomvat)}}</td>
        <td>${{c.tinh_trang_quyet_toan}}</td>
      `;
      tbody.appendChild(tr);
    }});

    document.getElementById('lbl-shown').textContent = filteredContracts.length;
    document.getElementById('lbl-total').textContent = RAW_DATA.contracts.length;

    renderPagination();
  }}

  function renderPagination() {{
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';
    const totalPages = Math.ceil(filteredContracts.length / pageSize) || 1;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn ' + (currentPage === 1 ? 'disabled' : '');
    prevBtn.innerHTML = '‹';
    prevBtn.onclick = () => {{ if (currentPage > 1) {{ currentPage--; renderMasterTable(); }} }};
    container.appendChild(prevBtn);

    const info = document.createElement('span');
    info.textContent = `Trang ${{currentPage}} / ${{totalPages}}`;
    container.appendChild(info);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn ' + (currentPage === totalPages ? 'disabled' : '');
    nextBtn.innerHTML = '›';
    nextBtn.onclick = () => {{ if (currentPage < totalPages) {{ currentPage++; renderMasterTable(); }} }};
    container.appendChild(nextBtn);
  }}

  function renderRegionalView() {{
    const container = document.getElementById('regional-container');
    if (container.children.length > 0) return;

    const summary = RAW_DATA.report_summary;
    const regionGroup = {{}};

    summary.forEach(item => {{
      const r = item.khu_vuc || 'Khác';
      if (!regionGroup[r]) regionGroup[r] = [];
      regionGroup[r].push(item);
    }});

    for (const [reg, projects] of Object.entries(regionGroup)) {{
      const regCard = document.createElement('div');
      regCard.style.background = 'var(--card-bg)';
      regCard.style.padding = '16px';
      regCard.style.boxShadow = 'var(--shadow)';
      
      const totalTarget = projects.reduce((acc, p) => acc + p.sl_can_qt, 0);
      const totalDone = projects.reduce((acc, p) => acc + p.hoan_thanh, 0);
      const regPct = totalTarget ? ((totalDone / totalTarget) * 100).toFixed(1) : 0;

      let projHtml = '<table class="master-table" style="margin-top:12px;"><thead><tr><th>Dự án</th><th>Mục tiêu 2026</th><th>Hoàn thành</th><th>Tỷ lệ</th></tr></thead><tbody>';
      projects.forEach(p => {{
        const pct = p.sl_can_qt ? ((p.hoan_thanh / p.sl_can_qt) * 100).toFixed(1) : 0;
        projHtml += `
          <tr>
            <td>${{p.du_an_vt}}</td>
            <td>${{p.sl_can_qt_2026}}</td>
            <td>${{p.hoan_thanh}} / ${{p.sl_can_qt}}</td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:6px; background:#e1dfdd; border-radius:3px;">
                  <div style="height:100%; width:${{pct}}%; background:var(--pbi-blue); border-radius:3px;"></div>
                </div>
                <span style="font-size:12px;">${{pct}}%</span>
              </div>
            </td>
          </tr>
        `;
      }});
      projHtml += '</tbody></table>';

      regCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px;">
          <div>
            <h3 style="font-size:16px; margin-bottom:4px; font-weight:600;">Khu vực: ${{reg}}</h3>
            <div style="font-size:12px; color:var(--text-muted);">Tổng mục tiêu: ${{totalTarget}} | Hoàn thành: ${{totalDone}} (${{regPct}}%)</div>
          </div>
        </div>
        ${{projHtml}}
      `;
      container.appendChild(regCard);
    }}
  }}

  let picChartInited = false;
  function renderPicCharts() {{
    if (picChartInited || typeof Chart === 'undefined') return;
    picChartInited = true;

    const contracts = RAW_DATA.contracts;

    // 1. PIC XD
    const picXdMap = {{}};
    contracts.forEach(c => {{
      const p = c.pic_xd || 'Chưa phân công';
      picXdMap[p] = (picXdMap[p] || 0) + 1;
    }});

    new Chart(document.getElementById('chart-pic-xd'), {{
      type: 'bar',
      data: {{
        labels: Object.keys(picXdMap),
        datasets: [{{ label: 'Hợp đồng', data: Object.values(picXdMap), backgroundColor: '#118dff' }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{ x: {{ grid: {{ display: false }} }}, y: {{ grid: {{ color: '#e1dfdd' }} }} }}
      }}
    }});

    // 2. PIC MEP
    const picMepMap = {{}};
    contracts.forEach(c => {{
      const p = c.pic_mep || 'Chưa phân công';
      picMepMap[p] = (picMepMap[p] || 0) + 1;
    }});

    new Chart(document.getElementById('chart-pic-mep'), {{
      type: 'bar',
      data: {{
        labels: Object.keys(picMepMap),
        datasets: [{{ label: 'Hợp đồng', data: Object.values(picMepMap), backgroundColor: '#12239e' }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{ x: {{ grid: {{ display: false }} }}, y: {{ grid: {{ color: '#e1dfdd' }} }} }}
      }}
    }});

    // 3. Blockers table
    const blockersBody = document.getElementById('blockers-table-body');
    const unresolved = contracts.filter(c => c.tinh_trang_quyet_toan !== 'Đã quyết toán');

    unresolved.slice(0, 35).forEach((c, idx) => {{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${{idx + 1}}</td>
        <td>${{c.so_hd_chinh || c.so_hd_sap}}</td>
        <td>${{c.du_an}}</td>
        <td>${{c.nha_thau}}</td>
        <td>${{c.tinh_trang_quyet_toan}}</td>
        <td style="color:#d11141;">${{c.ly_do_khong_dat || 'Đang hoàn tất hồ sơ'}}</td>
        <td>${{c.pic_xd || c.pic_mep || 'Chưa phân công'}}</td>
      `;
      blockersBody.appendChild(tr);
    }});
  }}

  function openModal(c) {{
    document.getElementById('modal-project').textContent = c.du_an;
    document.getElementById('modal-code').textContent = c.so_hd_chinh || c.so_hd_sap;
    document.getElementById('modal-title').textContent = c.noi_dung_hd || 'Chi tiết hợp đồng';

    const grid = document.getElementById('modal-details-grid');
    grid.innerHTML = `
      <div class="detail-item"><div class="detail-label">Nhà thầu / NCC</div><div class="detail-val">${{c.nha_thau}}</div></div>
      <div class="detail-item"><div class="detail-label">Pháp nhân</div><div class="detail-val">${{c.phap_nhan || 'N/A'}}</div></div>
      <div class="detail-item"><div class="detail-label">Khu vực</div><div class="detail-val">${{c.khu_vuc}}</div></div>
      <div class="detail-item"><div class="detail-label">Tình trạng quyết toán</div><div class="detail-val">${{c.tinh_trang_quyet_toan}}</div></div>
      <div class="detail-item"><div class="detail-label">Tổng giá trị HĐ (gồm VAT)</div><div class="detail-val">${{fmtFullVND(c.tong_gt_hd_gomvat)}}</div></div>
      <div class="detail-item"><div class="detail-label">Giá trị Workdone (gồm VAT)</div><div class="detail-val">${{fmtFullVND(c.workdone_gomvat)}}</div></div>
      <div class="detail-item"><div class="detail-label">Đã thanh toán (gồm VAT)</div><div class="detail-val">${{fmtFullVND(c.da_thanh_toan_gomvat)}}</div></div>
      <div class="detail-item"><div class="detail-label">Công nợ chưa thanh toán</div><div class="detail-val">${{fmtFullVND(c.cong_no_chua_tt_gomvat)}}</div></div>
      <div class="detail-item"><div class="detail-label">Ngày mục tiêu</div><div class="detail-val">${{c.ngay_muc_tieu || 'N/A'}}</div></div>
      <div class="detail-item"><div class="detail-label">Phân loại ưu tiên</div><div class="detail-val">${{c.phan_loai_uu_tien}}</div></div>
      <div class="detail-item"><div class="detail-label">PIC Xây Dựng</div><div class="detail-val">${{c.pic_xd || 'N/A'}}</div></div>
      <div class="detail-item"><div class="detail-label">PIC MEP</div><div class="detail-val">${{c.pic_mep || 'N/A'}}</div></div>
      <div class="detail-item" style="grid-column: span 2;"><div class="detail-label">Lý do không đạt / vướng mắc</div><div class="detail-val" style="color:#d11141;">${{c.ly_do_khong_dat || 'Không có ghi nhận vướng mắc'}}</div></div>
    `;

    document.getElementById('contract-modal').classList.add('active');
  }}

  function closeModal() {{
    document.getElementById('contract-modal').classList.remove('active');
  }}

  function exportToCSV() {{
    const headers = ["STT", "Mã HĐ", "Dự Án", "Khu Vực", "Nhà Thầu", "Nội Dung", "Giá Trị HĐ (VAT)", "Workdone (VAT)", "Đã Thanh Toán", "Tình Trạng QT"];
    const rows = filteredContracts.map(c => [
      c.stt,
      `"${{c.so_hd_chinh || c.so_hd_sap}}"`,
      `"${{c.du_an}}"`,
      `"${{c.khu_vuc}}"`,
      `"${{c.nha_thau}}"`,
      `"${{(c.noi_dung_hd || '').replace(/"/g, '""')}}"`,
      c.tong_gt_hd_gomvat,
      c.workdone_gomvat,
      c.da_thanh_toan_gomvat,
      `"${{c.tinh_trang_quyet_toan}}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Bao_Cao_Tracking_Quyet_Toan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
</script>

</body>
</html>
"""

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(html_path2, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Updated HTML dashboard to PowerBI Mockup style at: {html_path} and {html_path2}")
