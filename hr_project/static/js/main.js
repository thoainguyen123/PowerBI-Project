// Global State variables
let state = {
    allocations: [],
    commonAllocations: [],
    projects: [],
    projectOverview: [],
    employees: [],
    regions: [],
    departments: [],
    titles: [],
    allocationMode: 'table',
    dashboardRows: [],
    dashboardPage: 1,
    dashboardPageSize: 50,
    masterdataConfig: [],
    masterdataEntries: [],
    masterdataActiveSheet: 'HRC',
    masterdataProjectCode: '',
    managementAreas: [],
    
    // Active filters from clicking charts
    chartFilters: {
        project: null,
        region: null,
        department: null,
        title: null,
        status: null,
        classification: null
    },
    
    // Active tab
    activeTab: 'project-overview',
    
    // Overview Dashboard State
    selectedOverviewRegion: null,
    selectedOverviewProject: null,
    selectedOverviewDepartment: '9.1 HRC',
    selectedOverviewAreaCode: 'ALL',
    overviewProjectEntries: [],
    
    // Chart instances
    charts: {
        region: null,
        project: null,
        department: null,
        openTitle: null,
        classification: null
    }
};

// API base path
const API_URL = '/api';
let masterdataDraftRowCounter = 0;

// Global User variable
let currentUser = null;

const PAGE_META = {
    'project-overview': { kicker: 'Novaland Group', title: 'Tổng quan dự án' },
    'region-config': { kicker: 'Cấu trúc điều hành', title: 'Quản lý khu vực' },
    dashboard: { kicker: 'Giám sát nguồn lực', title: 'Tổng quan nhân sự' },
    projects: { kicker: 'Danh mục dự án', title: 'Thông tin dự án' },
    masterdata: { kicker: 'Dữ liệu dự án', title: 'Dữ liệu thực hiện dự án' },
    allocations: { kicker: 'Điều phối nhân sự', title: 'Phân bổ dự án' },
    common: { kicker: 'Nguồn lực hệ thống', title: 'Nhân sự chung' },
    profiles: { kicker: 'Vòng đời nhân sự', title: 'Hồ sơ & đánh giá' },
    'dept-config': { kicker: 'Cơ cấu tổ chức', title: 'Cấu hình phòng ban' },
    sync: { kicker: 'Data delivery', title: 'Xuất & đồng bộ dữ liệu' }
};

// Global Fetch Interceptor for Auth
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    try {
        const response = await originalFetch(...args);
        
        // Handle unauthorized (401)
        if (response.status === 401 && !args[0].toString().includes('/api/me') && !args[0].toString().includes('/api/login')) {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.querySelector('.app-container').style.display = 'none';
            document.getElementById('header-user-profile').style.display = 'none';
            throw new Error('Chưa đăng nhập');
        }
        
        // Handle all other error responses (>= 400)
        if (!response.ok) {
            let errorMsg = `Yêu cầu thất bại (HTTP ${response.status})`;
            try {
                const data = await response.clone().json();
                errorMsg = data.error || errorMsg;
            } catch (e) {}
            
            showToast(errorMsg, true);
            throw new Error(errorMsg); // Throw to stop execution of subsequent .map() / .json() etc.
        }
        
        return response;
    } catch (err) {
        if (err.message !== 'Chưa đăng nhập') {
            // If it is a network error (TypeError), show connection message
            if (err instanceof TypeError) {
                showToast('Không thể kết nối đến máy chủ! Vui lòng kiểm tra lại đường truyền mạng.', true);
            }
        }
        throw err;
    }
};

async function checkLoginState() {
    try {
        const res = await originalFetch('/api/me');
        const data = await res.json();
        if (data.logged_in) {
            currentUser = data;
            document.getElementById('login-screen').style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
            document.getElementById('header-user-profile').style.display = 'flex';
            document.getElementById('user-display-name').innerText = data.display_name;
            const roleLabels = { admin: 'Admin Hệ thống', hr: 'Quản lý Nhân sự', manager: 'Quản lý Vùng' };
            document.getElementById('user-display-role').innerText = roleLabels[data.role] || 'Quản lý Vùng';
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.innerText = (data.display_name || data.username || 'A').trim().charAt(0).toUpperCase();
            }

            const syncNav = document.getElementById('nav-sync');
            if (syncNav) {
                syncNav.style.display = (data.role === 'admin') ? 'inline-flex' : 'none';
            }
            const regionConfigNav = document.getElementById('nav-region-config');
            if (regionConfigNav) {
                regionConfigNav.style.display = (data.role === 'admin')
                    ? 'inline-flex'
                    : 'none';
            }
            // Vai trò Nhân sự không có quyền vào "Thông tin dự án" (Master data
            // phòng ban là sub-view bên trong tab này nên ẩn luôn cả 2). Tab mặc
            // định khi tải trang luôn là "allocations" (đánh dấu active sẵn trong
            // HTML, không có cơ chế khôi phục tab từ URL/localStorage) nên không
            // cần xử lý trường hợp hr đang đứng ở tab projects.
            const projectsNav = document.getElementById('nav-projects');
            if (projectsNav) {
                projectsNav.style.display = (data.role === 'hr') ? 'none' : 'inline-flex';
            }
            return true;
        } else {
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.querySelector('.app-container').style.display = 'none';
            document.getElementById('header-user-profile').style.display = 'none';
            return false;
        }
    } catch (err) {
        console.error('Lỗi khi kiểm tra session:', err);
        return false;
    }
}

async function handleLogin(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.style.display = 'none';
    
    try {
        const res = await originalFetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });
        
        if (res.ok) {
            usernameInput.value = '';
            passwordInput.value = '';
            showToast('Đăng nhập thành công!');
            await initApp();
        } else {
            const errData = await res.json();
            errorDiv.innerText = errData.error || 'Đăng nhập thất bại!';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        errorDiv.innerText = 'Lỗi kết nối máy chủ!';
        errorDiv.style.display = 'block';
    }
}

async function handleLogout() {
    try {
        const res = await originalFetch('/api/logout', {
            method: 'POST'
        });
        if (res.ok) {
            showToast('Đã đăng xuất!');
            await initApp();
        }
    } catch (err) {
        console.error('Lỗi đăng xuất:', err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    const dateElement = document.getElementById('topbar-date');
    if (dateElement) {
        dateElement.innerText = new Intl.DateTimeFormat('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(new Date());
    }
    initApp();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSidebar();
});

// App Initialization
async function initApp() {
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('trans-date-input')) document.getElementById('trans-date-input').value = today;
    if (document.getElementById('eval-date-input')) document.getElementById('eval-date-input').value = today;
    if (document.getElementById('emp-date-input')) document.getElementById('emp-date-input').value = today;

    const loggedIn = await checkLoginState();
    if (!loggedIn) {
        return;
    }

    await loadInitialMetadata();
    await loadMasterdataConfig();
    await fetchProjectOverviewData();
    await fetchDashboardData();
    await fetchAllocationsData();
    await fetchCommonAllocationsData();
    await fetchProfilesData();
    await renderProjectOverviewDashboard();
}

// Switch between tabs
function switchTab(tabId, trigger = null) {
    state.activeTab = tabId;
    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTrigger = trigger || (window.event && window.event.currentTarget);
    if (activeTrigger) activeTrigger.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.remove('active');
    });
    const targetTabPanel = document.getElementById(`tab-${tabId}`);
    if (targetTabPanel) targetTabPanel.classList.add('active');

    const pageMeta = PAGE_META[tabId] || PAGE_META['project-overview'];
    document.getElementById('page-kicker').innerText = pageMeta.kicker;
    document.getElementById('page-title').innerText = pageMeta.title;
    document.title = `${pageMeta.title} | NVL Data Hub`;
    closeSidebar();
    
    if (tabId === 'project-overview') {
        renderProjectOverviewDashboard();
    } else if (tabId === 'region-config') {
        loadRegionManagement();
    } else if (tabId === 'dashboard') {
        fetchDashboardData();
    } else if (tabId === 'projects') {
        fetchProjectOverviewData();
    } else if (tabId === 'masterdata') {
        loadMasterdataProject();
    } else if (tabId === 'allocations') {
        fetchDashboardData();
        if (state.allocationMode === 'quick') {
            loadQuickEntryProjectData();
        } else {
            fetchAllocationsData();
        }
    } else if (tabId === 'common') {
        fetchCommonAllocationsData();
    } else if (tabId === 'dept-config') {
        loadDeptConfigMetadata();
        loadProjectDeptConfig();
    } else if (tabId === 'profiles') {
        fetchProfilesData();
    }
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
}

// Print only the currently selected workspace tab. The browser PDF dialog uses
// the tab title as the suggested file name, so each export stays easy to identify.
function printCurrentPage() {
    const activePanel = document.querySelector('.tab-content.active');
    if (!activePanel) {
        showToast('Không tìm thấy trang cần in.', true);
        return;
    }

    document.body.classList.add('is-printing');
    const clearPrintState = () => document.body.classList.remove('is-printing');
    window.addEventListener('afterprint', clearPrintState, { once: true });
    window.print();
}

// Toast notification helper
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.innerText = message;
    
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// Modal management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'modal-allocation') {
        document.getElementById('form-allocation').reset();
        document.getElementById('alloc-id-input').value = '';
        document.getElementById('new-dept-fields-container').style.display = 'none';
    } else if (modalId === 'modal-employee') {
        document.getElementById('form-employee').reset();
    } else if (modalId === 'modal-transfer') {
        document.getElementById('form-transfer').reset();
        document.getElementById('new-trans-dept-container').style.display = 'none';
    } else if (modalId === 'modal-evaluation') {
        document.getElementById('form-evaluation').reset();
    } else if (modalId === 'modal-common-allocation') {
        document.getElementById('form-common-allocation').reset();
        document.getElementById('common-alloc-id-input').value = '';
    } else if (modalId === 'modal-copy-config') {
        document.getElementById('form-copy-config').reset();
    } else if (modalId === 'modal-project') {
        document.getElementById('form-project').reset();
        document.getElementById('project-edit-code').value = '';
        document.getElementById('project-code-input').readOnly = false;
    }
}

// Load metadata for dropdowns
async function loadInitialMetadata(options = {}) {
    try {
        const includeEmployees = options.includeEmployees !== false;
        const [projRes, empRes] = await Promise.all([
            fetch(`${API_URL}/projects`),
            includeEmployees ? fetch(`${API_URL}/employees`) : Promise.resolve(null),
        ]);
        state.projects = await projRes.json();
        if (empRes) state.employees = await empRes.json();
        
        const allocProjSelect = document.getElementById('alloc-project-input');
        const transNewProjSelect = document.getElementById('trans-new-proj-input');
        const configProjSelect = document.getElementById('config-project-select');
        const quickAllocProjSelect = document.getElementById('quick-alloc-project-select');
        const copyFromProjSelect = document.getElementById('copy-from-project-select');
        const masterdataProjSelect = document.getElementById('masterdata-project-select');
        
        const projOptionsHTML = state.projects.map(p => 
            `<option value="${escapeHtml(p.ma_du_an)}">${escapeHtml(p.ten_du_an)} (${escapeHtml(p.ma_du_an)})</option>`
        ).join('');
        
        allocProjSelect.innerHTML = `<option value="">-- Chọn dự án --</option>` + projOptionsHTML;
        transNewProjSelect.innerHTML = `<option value="">-- Chọn dự án mới --</option>` + projOptionsHTML;
        if (configProjSelect) configProjSelect.innerHTML = `<option value="">-- Chọn dự án cần cấu hình --</option>` + projOptionsHTML;
        if (quickAllocProjSelect) quickAllocProjSelect.innerHTML = `<option value="">-- Chọn dự án để nhập liệu --</option>` + projOptionsHTML;
        if (copyFromProjSelect) copyFromProjSelect.innerHTML = `<option value="">-- Chọn dự án nguồn --</option>` + projOptionsHTML;
        if (masterdataProjSelect) {
            const selectedProject = state.masterdataProjectCode || masterdataProjSelect.value;
            masterdataProjSelect.innerHTML = `<option value="">-- Chọn dự án cần nhập master data --</option>` + projOptionsHTML;
            if (state.projects.some(project => project.ma_du_an === selectedProject)) {
                masterdataProjSelect.value = selectedProject;
            }
        }
        
        const allocEmpSelect = document.getElementById('alloc-employee-input');
        const commonAllocEmpSelect = document.getElementById('common-alloc-employee-input');
        
        const filteredEmployees = state.employees.filter(e => {
            const name = e.ho_ten || '';
            return !name.includes('Chưa có') && !name.startsWith('Nhân sự ');
        });
        
        const empOptionsHTML = filteredEmployees.map(e => 
            `<option value="${escapeHtml(e.ma_nhan_vien)}">${escapeHtml(e.ho_ten)} (${escapeHtml(e.ma_nhan_vien)})</option>`
        ).join('');
        
        const dropdownHTML = `
            <option value="Tuyển0">Vị trí kiêm nhiệm từ dự án khác (không tuyển chính)</option>
            <option value="Tuyển">Vị trí đang tuyển chính</option>
            <option value="Không tuyển">Vị trí không tuyển</option>
            <optgroup label="Danh sách nhân viên">
                ${empOptionsHTML}
            </optgroup>
        `;
        
        allocEmpSelect.innerHTML = dropdownHTML;
        commonAllocEmpSelect.innerHTML = dropdownHTML;
        
        const datalist = document.getElementById('quick-emp-datalist');
        if (datalist) {
            datalist.innerHTML = `
                <option value="Kiêm nhiệm từ dự án khác">Vị trí không tuyển chính</option>
                <option value="Đang tuyển chính">Vị trí đang tuyển chính</option>
                <option value="Không tuyển">Vị trí không tuyển</option>
                <option value="Chưa tuyển">Chưa tuyển</option>
            ` + filteredEmployees.map(e => 
                `<option value="${escapeHtml(e.ma_nhan_vien)}">${escapeHtml(e.ho_ten)} (${escapeHtml(e.ma_nhan_vien)})</option>`
            ).join('');
        }
    } catch (err) {
        console.error('Lỗi khi tải metadata:', err);
        showToast('Không thể tải thông tin dự án/nhân sự!', true);
    }
}

// PROJECT OVERVIEW: Power BI master-data entry
const PROJECT_OVERVIEW_FIELDS = [
    'ten_phap_ly',
    'ten_thuong_mai',
    'chu_dau_tu',
    'dia_diem_du_an',
    'tong_dien_tich_ha',
    'so_luong_san_pham',
    'nguon_goc_du_an'
];

const PROJECT_STATUS_LABELS = {
    'Đã mua đang thiết kế': 'Đã mua, đang thiết kế'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * Dùng cho tham số chuỗi nằm trong thuộc tính sự kiện, ví dụ onclick="fn(...)".
 * escapeHtml KHÔNG đủ ở đây: trình duyệt giải mã thực thể trong thuộc tính TRƯỚC
 * khi JS phân tích, nên &#039; lại thành ' và thoát được khỏi chuỗi.
 * JSON.stringify tạo literal chuỗi JS hoàn chỉnh (đã có sẵn nháy kép), sau đó
 * escapeHtml làm an toàn cho ngữ cảnh thuộc tính => dùng KHÔNG kèm nháy bao ngoài.
 */
function escapeJsArg(value) {
    return escapeHtml(JSON.stringify(String(value ?? '')));
}

function normalizeSearch(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function getProjectDataQuality(project) {
    const missing = PROJECT_OVERVIEW_FIELDS.filter(
        field => !String(project[field] ?? '').trim()
    );
    return {
        complete: missing.length === 0,
        missing,
        score: PROJECT_OVERVIEW_FIELDS.length - missing.length
    };
}

function setProjectFilterOptions(projects) {
    const regionSelect = document.getElementById('project-filter-region');
    const statusSelect = document.getElementById('project-filter-status');
    if (!regionSelect || !statusSelect) return;

    const selectedRegion = regionSelect.value;
    const selectedStatus = statusSelect.value;
    const regions = [...new Set(projects.map(p => p.khu_vuc).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
    const statuses = [...new Set(
        projects.map(p => p.hien_trang_dau_tu).filter(Boolean)
    )]
        .sort((a, b) => a.localeCompare(b, 'vi'));

    regionSelect.innerHTML = '<option value="">Tất cả khu vực</option>' +
        regions.map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('');
    statusSelect.innerHTML = '<option value="">Tất cả hiện trạng</option>' +
        statuses.map(status => {
            const label = PROJECT_STATUS_LABELS[status] || status;
            return `<option value="${escapeHtml(status)}">${escapeHtml(label)}</option>`;
        }).join('');

    regionSelect.value = selectedRegion;
    statusSelect.value = selectedStatus;
}

async function fetchProjectOverviewData() {
    const tableBody = document.getElementById('project-overview-table-body');
    if (!tableBody) return;

    try {
        const [projectsRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/projects`),
            fetch(`${API_URL}/projects/overview-stats`)
        ]);
        state.projectOverview = await projectsRes.json();
        state.projects = state.projectOverview;
        const stats = await statsRes.json();

        document.getElementById('project-kpi-total').innerText = stats.total.toLocaleString('vi-VN');
        document.getElementById('project-kpi-complete').innerText = stats.complete.toLocaleString('vi-VN');
        document.getElementById('project-kpi-incomplete').innerText = stats.incomplete.toLocaleString('vi-VN');
        document.getElementById('project-kpi-regions').innerText = stats.regions.toLocaleString('vi-VN');

        setProjectFilterOptions(state.projectOverview);
        filterProjectOverview();
    } catch (err) {
        console.error('Lỗi khi tải tổng quan dự án:', err);
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Không thể tải dữ liệu dự án.</td></tr>';
    }
}

function filterProjectOverview() {
    const searchInput = document.getElementById('project-search-input');
    if (!searchInput) return;

    const query = normalizeSearch(searchInput.value);
    const region = document.getElementById('project-filter-region').value;
    const status = document.getElementById('project-filter-status').value;
    const quality = document.getElementById('project-filter-quality').value;

    const filtered = state.projectOverview.filter(project => {
        const searchable = normalizeSearch([
            project.ma_du_an,
            project.ten_du_an,
            project.ten_phap_ly,
            project.ten_thuong_mai,
            project.chu_dau_tu,
            project.dia_diem_du_an
        ].join(' '));
        const dataQuality = getProjectDataQuality(project);
        return (!query || searchable.includes(query))
            && (!region || project.khu_vuc === region)
            && (!status || project.hien_trang_dau_tu === status)
            && (!quality || (quality === 'complete') === dataQuality.complete);
    });

    filtered.sort((a, b) => String(a.ma_du_an).localeCompare(
        String(b.ma_du_an), 'vi', { numeric: true }
    ));
    renderProjectOverviewTable(filtered);
}

function renderProjectOverviewTable(projects) {
    const tableBody = document.getElementById('project-overview-table-body');
    const count = document.getElementById('project-table-count');
    count.innerText = `Đang hiển thị ${projects.length.toLocaleString('vi-VN')} dự án`;

    if (!projects.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="bx bx-search-alt"></i> Không có dự án phù hợp với bộ lọc.
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = projects.map(project => {
        const quality = getProjectDataQuality(project);
        const projectStatus = project.hien_trang_dau_tu;
        const statusLabel = PROJECT_STATUS_LABELS[projectStatus]
            || projectStatus
            || 'Chưa phân loại';
        const displayName = project.ten_thuong_mai || project.ten_phap_ly || project.ten_du_an || 'Chưa có tên';
        const legalName = project.ten_phap_ly && project.ten_phap_ly !== displayName
            ? project.ten_phap_ly
            : project.ten_du_an;
        const scale = project.tong_dien_tich_ha
            ? `${escapeHtml(project.tong_dien_tich_ha)} ha`
            : '—';
        const products = project.so_luong_san_pham
            ? `${escapeHtml(project.so_luong_san_pham)} SP`
            : 'Chưa nhập SP';
        const qualityTitle = quality.complete
            ? 'Đã đủ 7/7 trường thông tin'
            : `Thiếu ${quality.missing.length} trường`;

        return `
            <tr>
                <td><span class="code-pill">${escapeHtml(project.ma_du_an)}</span></td>
                <td>
                    <div class="project-identity">
                        <strong>${escapeHtml(displayName)}</strong>
                        <span>${escapeHtml(legalName || 'Chưa có tên pháp lý')}</span>
                    </div>
                </td>
                <td>${escapeHtml(project.khu_vuc || '—')}</td>
                <td><span class="status-pill">${escapeHtml(statusLabel)}</span></td>
                <td>${escapeHtml(project.chu_dau_tu || '—')}</td>
                <td>
                    <strong>${scale}</strong>
                    <div class="project-meta">${products}</div>
                </td>
                <td>
                    <span class="quality-pill ${quality.complete ? 'complete' : 'incomplete'}" title="${escapeHtml(qualityTitle)}">
                        <i class="bx ${quality.complete ? 'bx-check-circle' : 'bx-error-circle'}"></i>
                        ${quality.complete ? 'Đủ dữ liệu' : `${quality.score}/7 trường`}
                    </span>
                </td>
                <td class="action-column">
                    <button class="btn-icon" data-project-code="${escapeHtml(project.ma_du_an)}" onclick="editProjectOverview(this.dataset.projectCode)" title="Chỉnh sửa hồ sơ dự án">
                        <i class="bx bx-edit-alt"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function openProjectModal() {
    const form = document.getElementById('form-project');
    form.reset();
    state.masterdataProjectCode = '';
    state.masterdataEntries = [];
    updateMasterdataKpis();
    renderMasterdataAllSections();
    document.getElementById('project-edit-code').value = '';
    document.getElementById('project-code-input').readOnly = false;
    document.getElementById('modal-project-title').innerText = 'Thêm thông tin dự án';
    document.getElementById('project-save-button').innerHTML = '<i class="bx bx-save"></i> Lưu toàn bộ hồ sơ';
    openModal('modal-project');
}

async function editProjectOverview(projectCode, focusMasterdata = false) {
    try {
        const res = await fetch(`${API_URL}/projects/${encodeURIComponent(projectCode)}`);
        const project = await res.json();
        document.getElementById('project-edit-code').value = project.ma_du_an;
        document.getElementById('project-code-input').value = project.ma_du_an || '';
        document.getElementById('project-code-input').readOnly = true;
        document.getElementById('project-name-input').value = project.ten_du_an || '';
        document.getElementById('project-region-input').value = project.khu_vuc || '';
        const statusSelect = document.getElementById('project-status-input');
        const projectStatus = project.hien_trang_dau_tu || 'Chưa phân loại';
        if (![...statusSelect.options].some(option => option.value === projectStatus)) {
            statusSelect.add(new Option(projectStatus, projectStatus));
        }
        statusSelect.value = projectStatus;
        document.getElementById('project-group-input').value = project.nhom_du_an || '';
        document.getElementById('project-corporation-input').value = project.tong_cong_ty || '';
        document.getElementById('project-type-input').value = project.loai_hinh || '';
        document.getElementById('project-priority-input').value = project.muc_do_uu_tien || '';
        document.getElementById('project-old-province-input').value = project.tinh_cu || '';
        document.getElementById('project-new-province-input').value = project.tinh_moi || '';
        document.getElementById('project-manager-input').value = project.quan_ly || '';
        document.getElementById('project-legal-name-input').value = project.ten_phap_ly || '';
        document.getElementById('project-commercial-name-input').value = project.ten_thuong_mai || '';
        document.getElementById('project-investor-input').value = project.chu_dau_tu || '';
        document.getElementById('project-address-input').value = project.dia_diem_du_an || '';
        document.getElementById('project-area-input').value = project.tong_dien_tich_ha || '';
        document.getElementById('project-products-input').value = project.so_luong_san_pham || '';
        document.getElementById('project-origin-input').value = project.nguon_goc_du_an || '';
        document.getElementById('modal-project-title').innerText = 'Cập nhật thông tin dự án';
        document.getElementById('project-save-button').innerHTML = '<i class="bx bx-save"></i> Lưu toàn bộ hồ sơ';
        openModal('modal-project');
        await loadMasterdataProject(project.ma_du_an);
        if (focusMasterdata) {
            document.getElementById('project-modal-masterdata-section')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    } catch (err) {
        console.error('Lỗi khi tải dự án:', err);
    }
}

function preventProjectFormImplicitSubmit(event) {
    if (event.key !== 'Enter' || event.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === 'submit' || target.type === 'button') return;
    event.preventDefault();
}

async function saveProject(event) {
    event.preventDefault();
    const saveButton = document.getElementById('project-save-button');
    if (saveButton?.disabled) return;
    const defaultButtonContent = saveButton?.innerHTML || '<i class="bx bx-save"></i> Lưu toàn bộ hồ sơ';
    const editingCode = document.getElementById('project-edit-code').value;
    const isNewProject = !editingCode;
    const projectCode = document.getElementById('project-code-input').value.trim();
    const payload = {
        ma_du_an: projectCode,
        ten_du_an: document.getElementById('project-name-input').value.trim(),
        khu_vuc: document.getElementById('project-region-input').value.trim(),
        hien_trang_dau_tu: document.getElementById('project-status-input').value,
        nhom_du_an: document.getElementById('project-group-input').value.trim(),
        tong_cong_ty: document.getElementById('project-corporation-input').value.trim(),
        loai_hinh: document.getElementById('project-type-input').value.trim(),
        muc_do_uu_tien: document.getElementById('project-priority-input').value.trim(),
        tinh_cu: document.getElementById('project-old-province-input').value.trim(),
        tinh_moi: document.getElementById('project-new-province-input').value.trim(),
        quan_ly: document.getElementById('project-manager-input').value.trim(),
        ten_phap_ly: document.getElementById('project-legal-name-input').value.trim(),
        ten_thuong_mai: document.getElementById('project-commercial-name-input').value.trim(),
        chu_dau_tu: document.getElementById('project-investor-input').value.trim(),
        dia_diem_du_an: document.getElementById('project-address-input').value.trim(),
        tong_dien_tich_ha: document.getElementById('project-area-input').value.trim(),
        so_luong_san_pham: document.getElementById('project-products-input').value.trim(),
        nguon_goc_du_an: document.getElementById('project-origin-input').value.trim()
    };

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.setAttribute('aria-busy', 'true');
        saveButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Đang lưu hồ sơ...';
    }

    try {
        const url = editingCode
            ? `${API_URL}/projects/${encodeURIComponent(editingCode)}`
            : `${API_URL}/projects`;
        const projectResponse = await fetch(url, {
            method: editingCode ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!projectResponse.ok) {
            const error = await projectResponse.json().catch(() => ({}));
            throw new Error(error.error || 'Không thể lưu thông tin dự án');
        }

        if (state.masterdataProjectCode === projectCode) {
            await saveAllProjectMasterdata(projectCode);
        }

        const refreshProjectViews = () => Promise.all([
            loadInitialMetadata({ includeEmployees: false }),
            fetchProjectOverviewData(),
            fetchDashboardData(),
            loadManagementAreas(true),
        ]).catch(error => {
            console.error('Không thể làm mới dữ liệu sau khi lưu dự án:', error);
        });

        if (isNewProject) {
            document.getElementById('project-edit-code').value = projectCode;
            document.getElementById('project-code-input').readOnly = true;
            document.getElementById('modal-project-title').innerText = 'Cập nhật thông tin dự án';
            document.getElementById('project-save-button').innerHTML = '<i class="bx bx-save"></i> Lưu toàn bộ hồ sơ';
            await loadMasterdataProject(projectCode);
            showToast('Đã tạo dự án. Tiếp tục nhập mục 03 rồi bấm cùng nút Lưu toàn bộ hồ sơ.');
            void refreshProjectViews();
            document.getElementById('project-modal-masterdata-section')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            return;
        }

        closeModal('modal-project');
        showToast('Đã cập nhật toàn bộ hồ sơ dự án!');
        void refreshProjectViews();
    } catch (err) {
        console.error('Lỗi khi lưu dự án:', err);
        showToast(err.message || 'Không thể lưu hồ sơ dự án!', true);
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.removeAttribute('aria-busy');
            saveButton.innerHTML = defaultButtonContent;
        }
    }
}

// MASTER DATA: nhập liệu theo các danh mục master data của Fact_MasterData
async function loadMasterdataConfig() {
    const container = document.getElementById('masterdata-all-sections');
    if (!container) return;
    try {
        const res = await fetch(`${API_URL}/masterdata/config`);
        state.masterdataConfig = await res.json();
        if (!state.masterdataConfig.some(item => item.sheet === state.masterdataActiveSheet)) {
            state.masterdataActiveSheet = state.masterdataConfig[0]?.sheet || 'HRC';
        }
        renderMasterdataAllSections();
    } catch (err) {
        console.error('Lỗi khi tải cấu hình master data:', err);
        container.innerHTML = '<div class="no-data">Không tải được cấu hình master data.</div>';
    }
}

function getMasterdataActiveConfig() {
    return state.masterdataConfig.find(item => item.sheet === state.masterdataActiveSheet);
}

async function loadMasterdataProject(projectCode = null) {
    const select = document.getElementById('masterdata-project-select');
    state.masterdataProjectCode = projectCode || select?.value || state.masterdataProjectCode || '';

    const query = state.masterdataProjectCode
        ? `?project_code=${encodeURIComponent(state.masterdataProjectCode)}`
        : '';
    const exportExcel = document.getElementById('masterdata-export-excel');
    const exportCsv = document.getElementById('masterdata-export-csv');
    if (exportExcel) exportExcel.href = `/api/masterdata/export-template${query}`;
    if (exportCsv) exportCsv.href = `/api/masterdata/export-fact${query}`;

    if (!state.masterdataProjectCode) {
        state.masterdataEntries = [];
        updateMasterdataKpis();
        renderMasterdataAllSections();
        return;
    }

    const container = document.getElementById('masterdata-all-sections');
    if (!container) return;
    container.innerHTML = '<div class="masterdata-empty-state"><i class="bx bx-loader-alt bx-spin"></i><h4>Đang tải hồ sơ dự án...</h4></div>';
    try {
        const res = await fetch(
            `${API_URL}/masterdata/entries?project_code=${encodeURIComponent(state.masterdataProjectCode)}`
        );
        state.masterdataEntries = await res.json();
        updateMasterdataKpis();
        renderMasterdataAllSections();
    } catch (err) {
        console.error('Lỗi khi tải master data dự án:', err);
        container.innerHTML = '<div class="no-data">Không thể tải dữ liệu dự án.</div>';
    }
}

function updateMasterdataKpis() {
    const sheetCount = new Set(state.masterdataEntries.map(entry => entry.source_sheet)).size;
    const records = document.getElementById('masterdata-kpi-records');
    const modules = document.getElementById('masterdata-kpi-modules');
    const missing = document.getElementById('masterdata-kpi-missing');
    if (records) records.innerText = state.masterdataEntries.length.toLocaleString('vi-VN');
    if (modules) modules.innerText = `${sheetCount}/${state.masterdataConfig.length || 15}`;
    if (missing) missing.innerText = Math.max((state.masterdataConfig.length || 15) - sheetCount, 0);
}

function renderMasterdataModules() {
    renderMasterdataAllSections();
}

function selectMasterdataSheet(sheetName) {
    state.masterdataActiveSheet = sheetName;
    document.getElementById(`masterdata-section-${sheetName}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function renderMasterdataTable() {
    renderMasterdataAllSections();
}

function renderMasterdataAllSections() {
    const container = document.getElementById('masterdata-all-sections');
    if (!container) return;

    if (!state.masterdataConfig.length) {
        container.innerHTML = '<div class="masterdata-empty-state"><i class="bx bx-loader-alt bx-spin"></i><h4>Đang tải cấu trúc dữ liệu...</h4></div>';
        return;
    }

    if (!state.masterdataProjectCode) {
        container.innerHTML = `
            <div class="masterdata-empty-state">
                <i class="bx bx-save"></i>
                <h4>Lưu thông tin chung để nhập dữ liệu chi tiết</h4>
                <p>Dự án mới cần có mã dự án trước khi thêm dữ liệu vào ${state.masterdataConfig.length} nhóm.</p>
            </div>`;
        return;
    }

    container.innerHTML = state.masterdataConfig.map(config => {
        const entries = state.masterdataEntries.filter(entry => entry.source_sheet === config.sheet);
        return `
            <section id="masterdata-section-${escapeHtml(config.sheet)}"
                     class="masterdata-section-card project-masterdata-form-section"
                     data-sheet="${escapeHtml(config.sheet)}">
                <div class="masterdata-section-header">
                    <div class="masterdata-section-index">${escapeHtml(config.nhom.split(/\s+/)[0])}</div>
                    <div class="masterdata-section-title">
                        <span>${escapeHtml(config.nhom)}</span>
                        <h4>${escapeHtml(config.phan_nhom)}</h4>
                    </div>
                    <div class="masterdata-section-actions">
                        <span class="masterdata-section-count ${entries.length ? 'has-data' : ''}">
                            ${entries.length ? `${entries.length} nội dung` : 'Chưa nhập'}
                        </span>
                        ${config.repeatable ? `
                            <button type="button" class="masterdata-section-add"
                                    onclick="addProjectMasterdataContent('${escapeHtml(config.sheet)}')">
                                <i class="bx bx-plus"></i> Thêm nội dung
                            </button>` : ''}
                    </div>
                </div>
                <div class="project-masterdata-rows" data-sheet="${escapeHtml(config.sheet)}">
                    ${(entries.length ? entries : [null])
                        .map((item, index) => renderProjectMasterdataInlineRow(config, item, index))
                        .join('')}
                </div>
            </section>`;
    }).join('');
}

const PROJECT_MASTERDATA_TEXTAREAS = new Set([
    'Chi tiết', 'Ghi chú', 'Văn bản phê duyệt',
    'Khó khăn/Vướng mắc', 'Hướng xử lý'
]);

function masterdataFieldLabel(config, header) {
    return config.field_labels?.[header] || header;
}

function masterdataFieldChoices(config, header, values = {}) {
    const dependencies = config.choice_dependencies?.[header];
    if (dependencies) {
        const parentValue = String(
            values[config.dynamic_item_field] || values.Nhóm || values.parentValue || ''
        ).trim();
        if (parentValue && dependencies[parentValue]) return dependencies[parentValue];
    }
    return config.choices?.[header] || [];
}

function renderMasterdataField(config, header, value, fieldId, inputClass) {
    const label = masterdataFieldLabel(config, header);
    const choices = masterdataFieldChoices(config, header, { Nhóm: value.parentValue });
    const isDynamicField = header === config.dynamic_item_field
        || header === config.dynamic_content_field;
    if (isDynamicField) {
        const listId = `${fieldId}-options`;
        const isParent = header === config.dynamic_item_field;
        const parentAttribute = header === config.dynamic_content_field
            ? ` data-choice-parent="${escapeHtml(config.dynamic_item_field)}"`
            : '';
        return `
            <input id="${escapeHtml(fieldId)}" type="text"
                   class="form-control ${inputClass}"
                   data-header="${escapeHtml(header)}" data-sheet="${escapeHtml(config.sheet)}"
                   list="${escapeHtml(listId)}"${parentAttribute}
                   value="${escapeHtml(value.current)}"
                   placeholder="Nhập hoặc chọn ${escapeHtml(label.toLowerCase())}"
                   ${isParent ? 'oninput="syncMasterdataDependentChoices(this)"' : ''}>
            <datalist id="${escapeHtml(listId)}">
                ${choices.map(option => `<option value="${escapeHtml(option)}"></option>`).join('')}
            </datalist>`;
    }
    if (choices.length) {
        const isDependencyParent = header === 'Nhóm'
            && Object.keys(config.choice_dependencies || {}).length > 0;
        const dependencyAttribute = config.choice_dependencies?.[header]
            ? ' data-choice-parent="Nhóm"'
            : '';
        return `
            <select id="${escapeHtml(fieldId)}" class="form-control ${inputClass}"
                    data-header="${escapeHtml(header)}" data-sheet="${escapeHtml(config.sheet)}"
                    ${dependencyAttribute}
                    ${isDependencyParent ? 'onchange="syncMasterdataDependentChoices(this)"' : ''}>
                <option value="">Chọn ${escapeHtml(label.toLowerCase())}</option>
                ${choices.map(option => `
                    <option value="${escapeHtml(option)}" ${option === value.current ? 'selected' : ''}>
                        ${escapeHtml(option)}
                    </option>`).join('')}
            </select>`;
    }
    if (PROJECT_MASTERDATA_TEXTAREAS.has(header)) {
        return `<textarea id="${escapeHtml(fieldId)}" class="form-control ${inputClass}"
                          data-header="${escapeHtml(header)}" rows="1"
                          placeholder="Nhập ${escapeHtml(label.toLowerCase())}">${escapeHtml(value.current)}</textarea>`;
    }
    return `<input id="${escapeHtml(fieldId)}" type="text"
                   class="form-control ${inputClass}"
                   data-header="${escapeHtml(header)}"
                   value="${escapeHtml(value.current)}"
                   placeholder="Nhập ${escapeHtml(label.toLowerCase())}">`;
}

function syncMasterdataDependentChoices(source) {
    const root = source.closest('.project-masterdata-row')
        || document.getElementById('masterdata-fields');
    const config = state.masterdataConfig.find(item => item.sheet === source.dataset.sheet);
    if (!root || !config) return;
    root.querySelectorAll(`[data-choice-parent="${source.dataset.header}"]`).forEach(input => {
        const choices = config.choice_dependencies?.[input.dataset.header]?.[source.value] || [];
        const list = document.getElementById(input.getAttribute('list'));
        if (list) {
            list.innerHTML = choices.map(option =>
                `<option value="${escapeHtml(option)}"></option>`
            ).join('');
        }
    });
}

function renderProjectMasterdataInlineRow(config, entry = null, rowIndex = 0) {
    const visibleHeaders = config.headers.filter(header => header !== 'Mã dự án');
    const rowToken = entry?.id || `draft-${config.sheet}-${++masterdataDraftRowCounter}`;
    const itemName = entry?.values?.[config.dynamic_item_field] || '';
    return `
        <div class="project-masterdata-row"
             data-sheet="${escapeHtml(config.sheet)}"
             data-entry-id="${entry?.id || ''}">
            ${config.repeatable ? `
                <div class="project-masterdata-row-heading">
                    <span>${itemName ? `Mục: ${escapeHtml(itemName)}` : `Nội dung ${rowIndex + 1}`}</span>
                    <button type="button" class="project-masterdata-remove"
                            onclick="removeProjectMasterdataContent(this)"
                            aria-label="Xóa nội dung này">
                        <i class="bx bx-trash"></i> Xóa
                    </button>
                </div>` : ''}
            <div class="project-masterdata-fields">
                ${visibleHeaders.map((header, fieldIndex) => {
                    const value = entry?.values?.[header] || '';
                    const isTextarea = PROJECT_MASTERDATA_TEXTAREAS.has(header);
                    const fieldId = `project-md-${config.sheet}-${rowToken}-${fieldIndex}`;
                    return `
                        <div class="form-group ${isTextarea ? 'project-masterdata-field-wide' : ''}">
                            <label for="${escapeHtml(fieldId)}">${escapeHtml(masterdataFieldLabel(config, header))}</label>
                            ${renderMasterdataField(
                                config,
                                header,
                                {
                                    current: value,
                                    parentValue: entry?.values?.[config.dynamic_item_field] || ''
                                },
                                fieldId,
                                'project-masterdata-input'
                            )}
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

function updateProjectMasterdataSectionCount(section) {
    if (!section) return;
    const rows = section.querySelectorAll('.project-masterdata-row').length;
    const count = section.querySelector('.masterdata-section-count');
    if (!count) return;
    count.innerText = `${rows} nội dung`;
    count.classList.toggle('has-data', rows > 0);
}

function addProjectMasterdataContent(sheetName) {
    const config = state.masterdataConfig.find(item => item.sheet === sheetName);
    const section = document.getElementById(`masterdata-section-${sheetName}`);
    const rows = section?.querySelector('.project-masterdata-rows');
    if (!config || !rows) return;
    const existingRows = [...rows.querySelectorAll('.project-masterdata-row')];
    const parentInput = config.dynamic_item_field
        ? existingRows.at(-1)?.querySelector(`[data-header="${config.dynamic_item_field}"]`)
        : null;
    const draftValues = {};
    if (config.dynamic_item_field && parentInput?.value) {
        draftValues[config.dynamic_item_field] = parentInput.value;
    }
    rows.insertAdjacentHTML('beforeend', renderProjectMasterdataInlineRow(config, {
        values: draftValues
    }, existingRows.length));
    updateProjectMasterdataSectionCount(section);
    const newRow = rows.lastElementChild;
    const preferredInput = config.dynamic_content_field
        ? newRow?.querySelector(`[data-header="${config.dynamic_content_field}"]`)
        : null;
    (preferredInput || newRow?.querySelector('.project-masterdata-input'))?.focus();
}

async function removeProjectMasterdataContent(button) {
    const row = button.closest('.project-masterdata-row');
    const section = button.closest('.masterdata-section-card');
    if (!row) return;
    const entryId = row.dataset.entryId;
    if (entryId) {
        await deleteMasterdataEntry(entryId);
        return;
    }
    const rows = row.parentElement.querySelectorAll('.project-masterdata-row');
    if (rows.length === 1) {
        row.querySelectorAll('.project-masterdata-input').forEach(input => { input.value = ''; });
    } else {
        row.remove();
    }
    updateProjectMasterdataSectionCount(section);
}

async function saveAllProjectMasterdata(projectCode) {
    if (!projectCode) return;
    const rows = [...document.querySelectorAll('#project-modal-masterdata-section .project-masterdata-row')];
    const entries = [];

    rows.forEach(row => {
        const values = {};
        row.querySelectorAll('.project-masterdata-input').forEach(input => {
            values[input.dataset.header] = input.value.trim();
        });
        const hasData = Object.values(values).some(Boolean);
        if (!hasData) return;

        const entryId = row.dataset.entryId;
        entries.push({
            id: entryId || null,
            source_sheet: row.dataset.sheet,
            values
        });
    });

    if (!entries.length) return { saved: 0 };
    const response = await fetch(`${API_URL}/masterdata/entries/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_code: projectCode, entries })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể lưu nội dung dự án');
    }
    return response.json();
}

function openMasterdataModal(entryId = null, sheetName = null) {
    if (!state.masterdataProjectCode) {
        showToast('Vui lòng chọn dự án trước khi nhập liệu!', true);
        return;
    }
    if (sheetName) {
        state.masterdataActiveSheet = sheetName;
    } else if (entryId) {
        state.masterdataActiveSheet = state.masterdataEntries.find(item => item.id === entryId)?.source_sheet
            || state.masterdataActiveSheet;
    }
    const config = getMasterdataActiveConfig();
    const entry = entryId
        ? state.masterdataEntries.find(item => item.id === entryId)
        : null;
    document.getElementById('masterdata-entry-id').value = entry?.id || '';
    document.getElementById('masterdata-modal-kicker').innerText = config.nhom;
    document.getElementById('masterdata-modal-title').innerText =
        entry ? 'Cập nhật dòng dữ liệu' : 'Thêm dòng dữ liệu';
    document.getElementById('masterdata-modal-project').innerText = state.masterdataProjectCode;
    document.getElementById('masterdata-modal-sheet').innerText = config.phan_nhom;

    const textareaHeaders = new Set([
        'Chi tiết', 'Ghi chú', 'Văn bản phê duyệt',
        'Khó khăn/Vướng mắc', 'Hướng xử lý'
    ]);
    document.getElementById('masterdata-fields').innerHTML = config.headers
        .filter(header => header !== 'Mã dự án')
        .map((header, index) => {
            const value = entry?.values?.[header] || '';
            const isTextarea = textareaHeaders.has(header);
            return `
                <div class="form-group ${isTextarea ? 'masterdata-field-wide' : ''}">
                    <label for="masterdata-field-${index}">${escapeHtml(masterdataFieldLabel(config, header))}</label>
                    ${renderMasterdataField(
                        config,
                        header,
                        { current: value, parentValue: entry?.values?.Nhóm || '' },
                        `masterdata-field-${index}`,
                        'masterdata-input'
                    )}
                </div>`;
        }).join('');
    openModal('modal-masterdata');
}

async function saveMasterdataEntry(event) {
    event.preventDefault();
    const entryId = document.getElementById('masterdata-entry-id').value;
    const values = {};
    document.querySelectorAll('#masterdata-fields .masterdata-input').forEach(input => {
        values[input.dataset.header] = input.value.trim();
    });
    const payload = {
        project_code: state.masterdataProjectCode,
        source_sheet: state.masterdataActiveSheet,
        values
    };
    try {
        await fetch(
            entryId ? `${API_URL}/masterdata/entries/${entryId}` : `${API_URL}/masterdata/entries`,
            {
                method: entryId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );
        closeModal('modal-masterdata');
        showToast(entryId ? 'Đã cập nhật dòng master data!' : 'Đã thêm dòng master data!');
        await loadMasterdataProject();
    } catch (err) {
        console.error('Lỗi khi lưu master data:', err);
    }
}

async function deleteMasterdataEntry(entryId) {
    if (!window.confirm('Xóa dòng dữ liệu này? Dòng này cũng sẽ không còn trong file CSV tổng hợp.')) {
        return;
    }
    try {
        await fetch(`${API_URL}/masterdata/entries/${entryId}`, { method: 'DELETE' });
        showToast('Đã xóa dòng master data.');
        await loadMasterdataProject();
    } catch (err) {
        console.error('Lỗi khi xóa master data:', err);
    }
}

// DASHBOARD: Fetch data and render charts
async function fetchDashboardData() {
    try {
        const res = await fetch(`${API_URL}/dashboard/stats`);
        const stats = await res.json();
        
        document.getElementById('kpi-headcount').innerText = stats.total_headcount.toLocaleString();
        document.getElementById('kpi-projects').innerText = stats.total_projects.toLocaleString();
        document.getElementById('kpi-open').innerText = stats.total_open_positions.toLocaleString();
        document.getElementById('kpi-concurrent').innerText = stats.total_concurrent.toLocaleString();
        
        renderClassificationChart(stats.headcount_by_classification);
        renderRegionChart(stats.headcount_by_region);
        renderProjectChart(stats.headcount_by_project);
        renderDepartmentChart(stats.headcount_by_department);
        
        updateDashboardTable();
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard:', err);
        showToast('Không thể tải số liệu thống kê!', true);
    }
}

// CHART 0: Department Classification (Doughnut)
function renderClassificationChart(data) {
    const ctx = document.getElementById('chart-classification').getContext('2d');
    if (state.charts.classification) state.charts.classification.destroy();
    
    const labels = ['BĐH dự án chính', 'Phòng ban khác'];
    const values = [data.BAN_DIEU_HANH_CHINH, data.PHONG_BAN_KHAC];
    
    state.charts.classification = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#1e5a86', '#9bb2c4'],
                hoverBackgroundColor: ['#174a70', '#849fb4'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            cutout: '68%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#5f7182', boxWidth: 11, usePointStyle: true, pointStyle: 'circle' }
                }
            },
            onClick: (evt, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    const val = idx === 0 ? 'BAN_DIEU_HANH_CHINH' : 'PHONG_BAN_KHAC';
                    setChartFilter('classification', val);
                }
            }
        }
    });
}

// CHART 1: Region Chart (Bar)
function renderRegionChart(data) {
    const ctx = document.getElementById('chart-region').getContext('2d');
    if (state.charts.region) state.charts.region.destroy();
    
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(item => item[0]);
    const values = sorted.map(item => item[1]);
    
    state.charts.region = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nhân sự thực tế',
                data: values,
                backgroundColor: 'rgba(42, 140, 130, 0.76)',
                hoverBackgroundColor: '#237a72',
                borderColor: '#2a8c82',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(15, 76, 129, 0.07)' },
                    ticks: { color: '#657589', precision: 0 }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#46576a',
                        font: { size: 10 },
                        autoSkip: false,
                        callback(value) {
                            const label = this.getLabelForValue(value);
                            return label.length > 25 ? `${label.slice(0, 23)}…` : label;
                        }
                    }
                }
            },
            onClick: (evt, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    setChartFilter('region', labels[idx]);
                }
            }
        }
    });
}

// CHART 2: Project Chart (Horizontal Bar)
function renderProjectChart(data) {
    const ctx = document.getElementById('chart-project').getContext('2d');
    if (state.charts.project) state.charts.project.destroy();
    
    const sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
        
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
    
    state.charts.project = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Headcount',
                data: values,
                backgroundColor: 'rgba(75, 127, 168, 0.76)',
                hoverBackgroundColor: '#3d6f97',
                borderColor: '#4b7fa8',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(30, 90, 134, 0.07)' }, ticks: { color: '#657589' } },
                y: { grid: { display: false }, ticks: { color: '#46576a', font: { size: 9 } } }
            },
            onClick: (evt, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    setChartFilter('project', labels[idx]);
                }
            }
        }
    });
}

// CHART 3: Department Chart (Doughnut)
function renderDepartmentChart(data) {
    const ctx = document.getElementById('chart-department').getContext('2d');
    if (state.charts.department) state.charts.department.destroy();
    
    const sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
        
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
    
    state.charts.department = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#1e5a86',
                    '#2a8c82',
                    '#4b7fa8',
                    '#69a89e',
                    '#7893aa',
                    '#a87428',
                    '#345f72',
                    '#8aa6a2'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            cutout: '62%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#5f7182', boxWidth: 9, usePointStyle: true, pointStyle: 'circle', font: { size: 9 } }
                }
            },
            onClick: (evt, activeElements) => {
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    setChartFilter('department', labels[idx]);
                }
            }
        }
    });
}

// Set a filter from clicking on chart
function setChartFilter(key, value) {
    state.chartFilters[key] = value;
    updateFilterChips();
    updateDashboardTable();
}

// Update filter chips in HTML
function updateFilterChips() {
    const bar = document.getElementById('active-filters-bar');
    const list = document.getElementById('active-filters-list');
    
    let hasFilters = false;
    let chipsHTML = '';
    
    const keysMap = {
        project: 'Dự án',
        region: 'Vùng',
        department: 'Phòng ban',
        title: 'Chức danh',
        status: 'Trạng thái',
        classification: 'Phân loại OC'
    };
    
    for (const [key, val] of Object.entries(state.chartFilters)) {
        if (val) {
            hasFilters = true;
            let displayVal = val;
            if (key === 'status') {
                displayVal = val === 'hiring' ? 'Vị trí lập kế hoạch' : 'Đã có nhân sự';
            } else if (key === 'classification') {
                displayVal = val === 'BAN_DIEU_HANH_CHINH' ? 'Ban điều hành chính' : 'Phòng ban còn lại';
            }
            chipsHTML += `
                <div class="filter-chip">
                    <span>${keysMap[key]}: ${escapeHtml(displayVal)}</span>
                    <span class="filter-chip-clear" onclick="clearChartFilter(${escapeJsArg(key)})">&times;</span>
                </div>
            `;
        }
    }
    
    list.innerHTML = chipsHTML;
    bar.style.display = hasFilters ? 'flex' : 'none';
}

// Clear a single chart filter
function clearChartFilter(key) {
    state.chartFilters[key] = null;
    updateFilterChips();
    updateDashboardTable();
}

// Clear all chart filters
function clearAllChartFilters() {
    state.chartFilters = {
        project: null,
        region: null,
        department: null,
        title: null,
        status: null,
        classification: null
    };
    updateFilterChips();
    updateDashboardTable();
}

// Helper: Check if Employee ID is placeholder
function isPlaceholder(id) {
    if (!id) return true;
    const lower = id.toString().toLowerCase().trim();
    return ['tuyển0', 'tuyển1', 'tuyển', 'không tuyển', 'không tồn tại', 'chưa tuyển', 'tuyến1', 'nan', 'null'].includes(lower);
}

function getPlaceholderLabel(id) {
    const key = String(id ?? '').toLowerCase().trim();
    const labels = {
        'tuyển0': 'Kiêm nhiệm từ dự án khác',
        'tuyển1': 'Đang tuyển chính',
        'tuyển': 'Đang tuyển chính',
        'tuyến1': 'Đang tuyển chính',
        'không tuyển': 'Không tuyển',
        'chưa tuyển': 'Chưa tuyển',
        'không tồn tại': 'Chưa xác định',
        'nan': 'Chưa xác định',
        'null': 'Chưa xác định',
        '': 'Chưa xác định'
    };
    return labels[key] || String(id ?? '');
}

function getPlaceholderStatusLabel(id) {
    const key = String(id ?? '').toLowerCase().trim();
    if (['tuyển1', 'tuyển', 'tuyến1'].includes(key)) return 'Đang tuyển';
    if (key === 'tuyển0') return 'Kiêm nhiệm';
    if (key === 'không tuyển') return 'Không tuyển';
    return 'Chưa tuyển';
}

function getPlaceholderPersonLabel(id) {
    const key = String(id ?? '').toLowerCase().trim();
    if (key === 'tuyển0') return 'Kiêm nhiệm chưa xác định';
    if (['tuyển1', 'tuyển', 'tuyến1'].includes(key)) return 'Chưa tuyển';
    if (key === 'không tuyển') return 'Không tuyển';
    return 'Chưa xác định nhân sự';
}

function normalizePlaceholderInput(value) {
    const key = normalizeSearch(value);
    const mapping = {
        'kiem nhiem tu du an khac': 'Tuyển0',
        'vi tri kiem nhiem': 'Tuyển0',
        'dang tuyen': 'Tuyển',
        'dang tuyen chinh': 'Tuyển',
        'vi tri dang tuyen': 'Tuyển',
        'khong tuyen': 'Không tuyển',
        'chua tuyen': 'Chưa tuyển'
    };
    return mapping[key] || '';
}

// Load and filter table under Dashboard based on active filters
async function updateDashboardTable() {
    const tbody = document.getElementById('dashboard-table-body');
    tbody.innerHTML = `<tr><td colspan="9" class="no-data"><i class="bx bx-loader-alt bx-spin"></i> Đang cập nhật danh sách...</td></tr>`;
    
    try {
        let queryParams = [];
        if (state.chartFilters.project) queryParams.push(`project=${encodeURIComponent(state.chartFilters.project)}`);
        if (state.chartFilters.region) queryParams.push(`region=${encodeURIComponent(state.chartFilters.region)}`);
        if (state.chartFilters.department) queryParams.push(`department=${encodeURIComponent(state.chartFilters.department)}`);
        if (state.chartFilters.title) queryParams.push(`title=${encodeURIComponent(state.chartFilters.title)}`);
        if (state.chartFilters.status) queryParams.push(`status=${state.chartFilters.status}`);
        if (state.chartFilters.classification) queryParams.push(`classification=${state.chartFilters.classification}`);
        
        const qStr = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
        const res = await fetch(`${API_URL}/allocations${qStr}`);
        const data = await res.json();

        state.dashboardRows = data;
        state.dashboardPage = 1;
        renderDashboardTablePage();
    } catch (err) {
        console.error('Lỗi khi tải bảng danh sách dashboard:', err);
        tbody.innerHTML = `<tr><td colspan="9" class="no-data error"><i class="bx bx-error"></i> Lỗi khi tải dữ liệu!</td></tr>`;
    }
}

function renderDashboardTablePage() {
    const tbody = document.getElementById('dashboard-table-body');
    const rows = state.dashboardRows || [];
    const total = rows.length;
    const pageSize = state.dashboardPageSize;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    state.dashboardPage = Math.min(Math.max(1, state.dashboardPage), pageCount);

    const start = (state.dashboardPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageRows = rows.slice(start, end);
    const countEl = document.getElementById('dashboard-table-count');
    const indicator = document.getElementById('dashboard-page-indicator');
    const prevButton = document.getElementById('dashboard-page-prev');
    const nextButton = document.getElementById('dashboard-page-next');

    countEl.innerText = total ? `Hiển thị ${start + 1}–${end} / ${total.toLocaleString('vi-VN')} dòng` : 'Không có dữ liệu';
    indicator.innerText = `Trang ${state.dashboardPage} / ${pageCount}`;
    prevButton.disabled = state.dashboardPage <= 1;
    nextButton.disabled = state.dashboardPage >= pageCount;

    if (total === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="no-data"><i class="bx bx-search-alt"></i> Không tìm thấy nhân sự phù hợp bộ lọc.</td></tr>`;
            return;
    }

    tbody.innerHTML = pageRows.map(item => {
            const isHiring = isPlaceholder(item.ma_nhan_vien);
            const nameDisplay = isHiring ? `<span style="color: var(--text-muted); font-style: italic;">${escapeHtml(getPlaceholderPersonLabel(item.ma_nhan_vien))}</span>` : (escapeHtml(item.ho_ten) || `Nhân sự ${escapeHtml(item.ma_nhan_vien)}`);
            const codeDisplay = isHiring ? `<span class="badge badge-planning">${escapeHtml(getPlaceholderLabel(item.ma_nhan_vien))}</span>` : escapeHtml(item.ma_nhan_vien);
            const projectDisplay = item.ten_du_an ? `${escapeHtml(item.ten_du_an)} (${escapeHtml(item.ma_du_an)})` : escapeHtml(item.ma_du_an);
            
            let classBadge = '';
            if (item.phan_loai_oc === 'BAN_DIEU_HANH_CHINH') {
                classBadge = `<span class="badge badge-planning">Ban điều hành chính</span>`;
            } else {
                classBadge = `<span class="badge" style="background: #eef3f7; color: var(--text-muted);">Khác</span>`;
            }
            
            let statusBadge = '';
            if (isHiring) {
                statusBadge = `<span class="badge badge-planning">${escapeHtml(getPlaceholderStatusLabel(item.ma_nhan_vien))}</span>`;
            } else if (item.tinh_trang && (item.tinh_trang.includes('KN') || item.tinh_trang.toLowerCase().includes('kiêm nhiệm'))) {
                statusBadge = `<span class="badge badge-kiemnhiem">Kiêm nhiệm</span>`;
            } else {
                statusBadge = `<span class="badge badge-active">Chính thức</span>`;
            }
            
            return `
                <tr>
                    <td><strong>${projectDisplay}</strong></td>
                    <td>${nameDisplay}</td>
                    <td>${codeDisplay}</td>
                    <td>${escapeHtml(item.vung || 'N/A')}</td>
                    <td>${escapeHtml(item.name_oc || 'N/A')}</td>
                    <td>${escapeHtml(item.chuc_danh || 'N/A')}</td>
                    <td>${classBadge}</td>
                    <td>${statusBadge}</td>
                    <td style="font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.ghi_chu || '')}">${escapeHtml(item.ghi_chu || '')}</td>
                </tr>
            `;
    }).join('');
}

function changeDashboardPage(delta) {
    state.dashboardPage += Number(delta);
    renderDashboardTablePage();
    document.getElementById('dashboard-pagination')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeDashboardPageSize(value) {
    state.dashboardPageSize = Number(value) || 50;
    state.dashboardPage = 1;
    renderDashboardTablePage();
}

// ALLOCATIONS TAB: Fetch and Filter Allocations Table
async function fetchAllocationsData() {
    try {
        const res = await fetch(`${API_URL}/allocations`);
        state.allocations = await res.json();
        
        const regionSet = new Set();
        const deptSet = new Set();
        
        state.allocations.forEach(a => {
            if (a.vung) regionSet.add(a.vung);
            if (a.name_oc) deptSet.add(a.name_oc);
        });
        
        state.regions = Array.from(regionSet).sort();
        state.departments = Array.from(deptSet).sort();
        
        const rgnSelect = document.getElementById('alloc-filter-region');
        rgnSelect.innerHTML = '<option value="">Tất cả Vùng</option>' + 
            state.regions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
            
        const deptSelect = document.getElementById('alloc-filter-dept');
        deptSelect.innerHTML = '<option value="">Tất cả Phòng ban</option>' + 
            state.departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
            
        renderAllocationsTable(state.allocations);
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân bổ:', err);
        showToast('Lỗi khi tải danh sách phân bổ!', true);
    }
}

// Render allocations list
function renderAllocationsTable(data) {
    const tbody = document.getElementById('allocations-table-body');
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="no-data"><i class="bx bx-search-alt"></i> Không tìm thấy bản ghi phân bổ nào.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(item => {
        const isHiring = isPlaceholder(item.ma_nhan_vien);
        const nameDisplay = isHiring ? `<span style="color: var(--text-muted); font-style: italic;">${escapeHtml(getPlaceholderPersonLabel(item.ma_nhan_vien))}</span>` : (escapeHtml(item.ho_ten) || `Nhân sự ${escapeHtml(item.ma_nhan_vien)}`);
        const codeDisplay = isHiring ? `<span class="badge badge-planning">${escapeHtml(getPlaceholderLabel(item.ma_nhan_vien))}</span>` : escapeHtml(item.ma_nhan_vien);
        
        let classBadge = '';
        if (item.phan_loai_oc === 'BAN_DIEU_HANH_CHINH') {
            classBadge = `<span class="badge badge-planning">Ban điều hành chính</span>`;
        } else {
            classBadge = `<span class="badge" style="background: #eef3f7; color: var(--text-muted);">Khác</span>`;
        }
        
        let statusBadge = '';
        if (isHiring) {
            statusBadge = `<span class="badge badge-planning">${escapeHtml(getPlaceholderStatusLabel(item.ma_nhan_vien))}</span>`;
        } else if (item.tinh_trang && (item.tinh_trang.includes('KN') || item.tinh_trang.toLowerCase().includes('kiêm nhiệm'))) {
            statusBadge = `<span class="badge badge-kiemnhiem">Kiêm nhiệm (${escapeHtml(item.tinh_trang)})</span>`;
        } else {
            statusBadge = `<span class="badge badge-active">Chính thức</span>`;
        }
        
        let actionsHTML = '';
        if (!isHiring) {
            actionsHTML = `
                <button class="btn-icon edit" onclick="editAllocation(${item.id})" title="Chỉnh sửa phân bổ"><i class="bx bx-edit"></i></button>
                <button class="btn-icon transfer" onclick="openTransferModal(${item.id})" title="Luân chuyển dự án"><i class="bx bx-git-compare"></i></button>
                <button class="btn-icon evaluate" onclick="openEvaluationModal(${escapeJsArg(item.ma_nhan_vien)}, ${escapeJsArg(item.ho_ten)})" title="Đánh giá cá nhân"><i class="bx bx-check-shield"></i></button>
                <button class="btn-icon delete" onclick="deleteAllocation(${item.id})" title="Xóa phân bổ"><i class="bx bx-trash"></i></button>
            `;
        } else {
            actionsHTML = `
                <button class="btn-icon edit" onclick="editAllocation(${item.id})" title="Chỉnh sửa chỉ tiêu tuyển dụng"><i class="bx bx-edit"></i></button>
                <button class="btn-icon evaluate" onclick="hireEmployeeForSlot(${item.id})" style="color: var(--success);" title="Tuyển dụng vào vị trí này"><i class="bx bx-user-plus"></i></button>
                <button class="btn-icon delete" onclick="deleteAllocation(${item.id})" title="Xóa chỉ tiêu tuyển dụng"><i class="bx bx-trash"></i></button>
            `;
        }
        
        return `
            <tr>
                <td><strong>${escapeHtml(item.ma_du_an)}</strong></td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.ten_du_an || '')}">${escapeHtml(item.ten_du_an || 'N/A')}</td>
                <td>
                    <div style="font-weight: 500;">${nameDisplay}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${codeDisplay}</div>
                </td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.name_oc || '')}">${escapeHtml(item.name_oc || 'N/A')}</td>
                <td>${classBadge}</td>
                <td>${escapeHtml(item.chuc_danh || 'N/A')}</td>
                <td>${statusBadge}</td>
                <td>${escapeHtml(item.vung || 'N/A')}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.ghi_chu || '')}">${escapeHtml(item.ghi_chu || '')}</td>
                <td>
                    <div class="actions">
                        ${actionsHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter Allocations Client Side
function filterAllocations() {
    const searchVal = document.getElementById('alloc-search-input').value.toLowerCase().trim();
    const regionVal = document.getElementById('alloc-filter-region').value;
    const deptVal = document.getElementById('alloc-filter-dept').value;
    const statusVal = document.getElementById('alloc-filter-status').value;
    const classVal = document.getElementById('alloc-filter-class').value;
    
    const filtered = state.allocations.filter(item => {
        const matchSearch = !searchVal || 
            (item.ma_nhan_vien && item.ma_nhan_vien.toString().toLowerCase().includes(searchVal)) ||
            (item.ho_ten && item.ho_ten.toLowerCase().includes(searchVal)) ||
            (item.chuc_danh && item.chuc_danh.toLowerCase().includes(searchVal)) ||
            (item.ma_du_an && item.ma_du_an.toLowerCase().includes(searchVal)) ||
            (item.ten_du_an && item.ten_du_an.toLowerCase().includes(searchVal));
            
        const matchRegion = !regionVal || item.vung === regionVal;
        const matchDept = !deptVal || item.name_oc === deptVal;
        const matchClass = !classVal || item.phan_loai_oc === classVal;
        
        let matchStatus = true;
        const isHiring = isPlaceholder(item.ma_nhan_vien);
        if (statusVal === 'employee') {
            matchStatus = !isHiring;
        } else if (statusVal === 'hiring') {
            matchStatus = isHiring;
        }
        
        return matchSearch && matchRegion && matchDept && matchStatus && matchClass;
    });
    
    renderAllocationsTable(filtered);
}

// Triggered when selected project changes in Allocations Modal
async function onAllocProjectChange() {
    const projCode = document.getElementById('alloc-project-input').value;
    const select = document.getElementById('alloc-dept-select');
    const container = document.getElementById('new-dept-fields-container');
    
    container.style.display = 'none';
    
    if (!projCode) {
        select.innerHTML = '<option value="">-- Chọn dự án trước --</option>';
        return;
    }
    
    select.innerHTML = '<option value="">-- Đang tải phòng ban... --</option>';
    
    try {
        const res = await fetch(`${API_URL}/projects/${projCode}/departments`);
        const depts = await res.json();
        
        let optionsHTML = depts.map(d => 
            `<option value="${escapeHtml(d.ma_oc)}" data-name="${escapeHtml(d.name_oc)}">${escapeHtml(d.name_oc)} (${escapeHtml(d.ma_oc)})</option>`
        ).join('');
        
        select.innerHTML = `
            <option value="">-- Chọn phòng ban --</option>
            ${optionsHTML}
            <option value="NEW" style="color: var(--secondary); font-weight: 600;">+ Thêm phòng ban mới...</option>
        `;
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="NEW">+ Thêm phòng ban mới...</option>';
    }
}

// Triggered when selected department changes in Allocations Modal
function onAllocDeptSelectChange() {
    const select = document.getElementById('alloc-dept-select');
    const container = document.getElementById('new-dept-fields-container');
    const codeInput = document.getElementById('alloc-oc-code-input');
    const nameInput = document.getElementById('alloc-oc-name-input');
    
    if (select.value === 'NEW') {
        container.style.display = 'flex';
        codeInput.value = '';
        nameInput.value = '';
        codeInput.required = true;
        nameInput.required = true;
    } else {
        container.style.display = 'none';
        codeInput.required = false;
        nameInput.required = false;
        
        if (select.value) {
            const selectedOption = select.options[select.selectedIndex];
            codeInput.value = select.value;
            nameInput.value = selectedOption.getAttribute('data-name');
        } else {
            codeInput.value = '';
            nameInput.value = '';
        }
    }
}

// Save Allocation modal submit
async function saveAllocation(e) {
    e.preventDefault();
    
    const id = document.getElementById('alloc-id-input').value;
    const ma_du_an = document.getElementById('alloc-project-input').value;
    const ma_nhan_vien = document.getElementById('alloc-employee-input').value;
    const ma_oc = document.getElementById('alloc-oc-code-input').value.trim();
    const name_oc = document.getElementById('alloc-oc-name-input').value.trim();
    const chuc_danh = document.getElementById('alloc-title-input').value;
    const tinh_trang = document.getElementById('alloc-status-input').checked ? 'KN' : '';
    const ghi_chu = document.getElementById('alloc-notes-input').value;
    const vung = document.getElementById('alloc-region-input').value;
    
    if (!ma_du_an || !chuc_danh || !name_oc || !vung) {
        showToast('Vui lòng nhập đầy đủ các trường bắt buộc!', true);
        return;
    }
    
    const payload = {
        ma_du_an,
        ma_nhan_vien: ma_nhan_vien || 'Tuyển0',
        ma_oc,
        name_oc,
        chuc_danh,
        tinh_trang,
        ghi_chu,
        vung
    };
    
    try {
        let res;
        if (id) {
            res = await fetch(`${API_URL}/allocations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_URL}/allocations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const result = await res.json();
        if (res.ok) {
            showToast(id ? 'Cập nhật phân bổ thành công!' : 'Thêm phân bổ mới thành công!');
            closeModal('modal-allocation');
            await fetchAllocationsData();
            await fetchDashboardData();
        } else {
            showToast(result.error || 'Có lỗi xảy ra!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

function openAddAllocationModal() {
    document.getElementById('modal-alloc-title').innerText = 'Thêm Phân Bổ Nhân Sự / Vị Trí Mới';
    document.getElementById('alloc-id-input').value = '';
    document.getElementById('alloc-project-input').value = '';
    document.getElementById('alloc-dept-select').innerHTML = '<option value="">-- Chọn dự án trước --</option>';
    document.getElementById('new-dept-fields-container').style.display = 'none';
    openModal('modal-allocation');
}

// Edit Allocation Loader
async function editAllocation(id) {
    const alloc = state.allocations.find(a => a.id === id);
    if (!alloc) return;
    
    document.getElementById('modal-alloc-title').innerText = 'Chỉnh Sửa Phân Bổ / Chỉ Tiêu Lập Kế Hoạch';
    document.getElementById('alloc-id-input').value = alloc.id;
    document.getElementById('alloc-project-input').value = alloc.ma_du_an;
    document.getElementById('alloc-employee-input').value =
        ['Tuyển1', 'Tuyến1'].includes(alloc.ma_nhan_vien) ? 'Tuyển' : (alloc.ma_nhan_vien || 'Tuyển0');
    document.getElementById('alloc-title-input').value = alloc.chuc_danh || '';
    document.getElementById('alloc-status-input').checked = !!(alloc.tinh_trang && (alloc.tinh_trang.includes('KN') || alloc.tinh_trang.toLowerCase().includes('kiêm nhiệm')));
    document.getElementById('alloc-notes-input').value = alloc.ghi_chu || '';
    document.getElementById('alloc-region-input').value = alloc.vung || '';
    
    // Load departments specifically for this project
    const select = document.getElementById('alloc-dept-select');
    select.innerHTML = '<option value="">-- Đang tải... --</option>';
    
    try {
        const res = await fetch(`${API_URL}/projects/${alloc.ma_du_an}/departments`);
        const depts = await res.json();
        
        let optionsHTML = depts.map(d => 
            `<option value="${escapeHtml(d.ma_oc)}" data-name="${escapeHtml(d.name_oc)}">${escapeHtml(d.name_oc)} (${escapeHtml(d.ma_oc)})</option>`
        ).join('');
        
        select.innerHTML = `
            <option value="">-- Chọn phòng ban --</option>
            ${optionsHTML}
            <option value="NEW" style="color: var(--secondary); font-weight: 600;">+ Thêm phòng ban mới...</option>
        `;
        
        // Find if this ma_oc is in the loaded list
        const exists = depts.some(d => d.ma_oc === alloc.ma_oc);
        if (exists && alloc.ma_oc) {
            select.value = alloc.ma_oc;
            document.getElementById('new-dept-fields-container').style.display = 'none';
            document.getElementById('alloc-oc-code-input').value = alloc.ma_oc;
            document.getElementById('alloc-oc-name-input').value = alloc.name_oc;
        } else {
            // Select custom
            select.value = 'NEW';
            document.getElementById('new-dept-fields-container').style.display = 'flex';
            document.getElementById('alloc-oc-code-input').value = alloc.ma_oc || '';
            document.getElementById('alloc-oc-name-input').value = alloc.name_oc || '';
        }
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="NEW">+ Thêm phòng ban mới...</option>';
        select.value = 'NEW';
        document.getElementById('new-dept-fields-container').style.display = 'flex';
        document.getElementById('alloc-oc-code-input').value = alloc.ma_oc || '';
        document.getElementById('alloc-oc-name-input').value = alloc.name_oc || '';
    }
    
    openModal('modal-allocation');
}

function hireEmployeeForSlot(id) {
    const alloc = state.allocations.find(a => a.id === id);
    if (!alloc) return;
    editAllocation(id);
    document.getElementById('modal-alloc-title').innerText =
        `Bố trí nhân sự cho vị trí: ${escapeHtml(getPlaceholderLabel(alloc.ma_nhan_vien))}`;
    document.getElementById('alloc-employee-input').focus();
}

async function deleteAllocation(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi phân bổ này? Vị trí nhân sự này sẽ bị gỡ khỏi dự án.')) {
        return;
    }
    try {
        const res = await fetch(`${API_URL}/allocations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Đã xóa phân bổ nhân sự thành công!');
            await fetchAllocationsData();
            await fetchDashboardData();
        } else {
            showToast('Lỗi khi xóa phân bổ!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// COMMON ALLOCATIONS (NS chung) View CRUD
async function fetchCommonAllocationsData() {
    try {
        const res = await fetch(`${API_URL}/common-allocations`);
        state.commonAllocations = await res.json();
        renderCommonAllocationsTable(state.commonAllocations);
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu nhân sự chung:', err);
        showToast('Lỗi khi tải danh sách nhân sự dùng chung!', true);
    }
}

function renderCommonAllocationsTable(data) {
    const tbody = document.getElementById('common-table-body');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-data"><i class="bx bx-search-alt"></i> Không tìm thấy nhân sự dùng chung nào.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(item => {
        const isHiring = isPlaceholder(item.ma_nhan_vien);
        const nameDisplay = isHiring ? `<span style="color: var(--text-muted); font-style: italic;">${escapeHtml(getPlaceholderPersonLabel(item.ma_nhan_vien))}</span>` : (escapeHtml(item.ho_ten) || `Nhân sự ${escapeHtml(item.ma_nhan_vien)}`);
        const codeDisplay = isHiring ? `<span class="badge badge-planning">${escapeHtml(getPlaceholderLabel(item.ma_nhan_vien))}</span>` : escapeHtml(item.ma_nhan_vien);
        
        let statusBadge = '';
        if (isHiring) {
            statusBadge = `<span class="badge badge-planning">${escapeHtml(getPlaceholderStatusLabel(item.ma_nhan_vien))}</span>`;
        } else if (item.tinh_trang && (item.tinh_trang.includes('KN') || item.tinh_trang.toLowerCase().includes('kiêm nhiệm'))) {
            statusBadge = `<span class="badge badge-kiemnhiem">Kiêm nhiệm (${escapeHtml(item.tinh_trang)})</span>`;
        } else {
            statusBadge = `<span class="badge badge-active">Chính thức</span>`;
        }
        
        return `
            <tr>
                <td><strong>${escapeHtml(item.ma_oc || 'N/A')}</strong></td>
                <td><strong>${escapeHtml(item.name_oc || 'N/A')}</strong></td>
                <td>
                    <div style="font-weight: 500;">${nameDisplay}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${codeDisplay}</div>
                </td>
                <td>${escapeHtml(item.chuc_danh || 'N/A')}</td>
                <td>${statusBadge}</td>
                <td>${escapeHtml(item.ghi_chu || '')}</td>
                <td>
                    <div class="actions">
                        <button class="btn-icon edit" onclick="editCommonAllocation(${item.id})" title="Chỉnh sửa"><i class="bx bx-edit"></i></button>
                        <button class="btn-icon delete" onclick="deleteCommonAllocation(${item.id})" title="Xóa"><i class="bx bx-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterCommonAllocations() {
    const query = document.getElementById('common-search-input').value.toLowerCase().trim();
    const filtered = state.commonAllocations.filter(item => 
        (item.ma_nhan_vien && item.ma_nhan_vien.toString().toLowerCase().includes(query)) ||
        (item.ho_ten && item.ho_ten.toLowerCase().includes(query)) ||
        (item.chuc_danh && item.chuc_danh.toLowerCase().includes(query)) ||
        (item.name_oc && item.name_oc.toLowerCase().includes(query)) ||
        (item.ma_oc && item.ma_oc.toLowerCase().includes(query))
    );
    renderCommonAllocationsTable(filtered);
}

function openAddCommonAllocationModal() {
    document.getElementById('modal-common-alloc-title').innerText = 'Thêm Vai Trò Nhân Sự Hệ Thống';
    document.getElementById('common-alloc-id-input').value = '';
    openModal('modal-common-allocation');
}

function editCommonAllocation(id) {
    const alloc = state.commonAllocations.find(a => a.id === id);
    if (!alloc) return;
    
    document.getElementById('modal-common-alloc-title').innerText = 'Chỉnh Sửa Nhân Sự Dùng Chung';
    document.getElementById('common-alloc-id-input').value = alloc.id;
    document.getElementById('common-alloc-employee-input').value =
        ['Tuyển1', 'Tuyến1'].includes(alloc.ma_nhan_vien) ? 'Tuyển' : (alloc.ma_nhan_vien || 'Tuyển0');
    document.getElementById('common-alloc-oc-code-input').value = alloc.ma_oc || '';
    document.getElementById('common-alloc-oc-name-input').value = alloc.name_oc || '';
    document.getElementById('common-alloc-title-input').value = alloc.chuc_danh || '';
    document.getElementById('common-alloc-status-input').checked = !!(alloc.tinh_trang && (alloc.tinh_trang.includes('KN') || alloc.tinh_trang.toLowerCase().includes('kiêm nhiệm')));
    document.getElementById('common-alloc-notes-input').value = alloc.ghi_chu || '';
    
    openModal('modal-common-allocation');
}

async function saveCommonAllocation(e) {
    e.preventDefault();
    
    const id = document.getElementById('common-alloc-id-input').value;
    const ma_nhan_vien = document.getElementById('common-alloc-employee-input').value;
    const ma_oc = document.getElementById('common-alloc-oc-code-input').value;
    const name_oc = document.getElementById('common-alloc-oc-name-input').value;
    const chuc_danh = document.getElementById('common-alloc-title-input').value;
    const tinh_trang = document.getElementById('common-alloc-status-input').checked ? 'KN' : '';
    const ghi_chu = document.getElementById('common-alloc-notes-input').value;
    
    if (!name_oc || !chuc_danh) {
        showToast('Vui lòng nhập đầy đủ bộ phận và chức danh!', true);
        return;
    }
    
    const payload = {
        ma_nhan_vien: ma_nhan_vien || 'Tuyển0',
        ma_oc,
        name_oc,
        chuc_danh,
        tinh_trang,
        ghi_chu
    };
    
    try {
        let res;
        if (id) {
            res = await fetch(`${API_URL}/common-allocations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_URL}/common-allocations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const result = await res.json();
        if (res.ok) {
            showToast(id ? 'Cập nhật thành công!' : 'Thêm vai trò hệ thống thành công!');
            closeModal('modal-common-allocation');
            await fetchCommonAllocationsData();
            await fetchDashboardData();
        } else {
            showToast(result.error || 'Có lỗi xảy ra!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

async function deleteCommonAllocation(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi nhân sự hệ thống này?')) {
        return;
    }
    try {
        const res = await fetch(`${API_URL}/common-allocations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Đã xóa nhân sự dùng chung thành công!');
            await fetchCommonAllocationsData();
            await fetchDashboardData();
        } else {
            showToast('Lỗi khi xóa bản ghi!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// EMPLOYEES CRUD: Add/Save New Employee Profile
async function saveEmployee(e) {
    e.preventDefault();
    
    const ma_nhan_vien = document.getElementById('emp-id-input').value.trim();
    const ho_ten = document.getElementById('emp-name-input').value.trim();
    const email = document.getElementById('emp-email-input').value.trim();
    const so_dien_thoai = document.getElementById('emp-phone-input').value.trim();
    const ngay_vao_lam = document.getElementById('emp-date-input').value;
    
    if (!ma_nhan_vien || !ho_ten) {
        showToast('Vui lòng nhập Mã nhân sự và Họ tên!', true);
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ma_nhan_vien,
                ho_ten,
                email,
                so_dien_thoai,
                ngay_vao_lam
            })
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Tạo hồ sơ nhân sự mới thành công!');
            closeModal('modal-employee');
            await loadInitialMetadata();
            if (state.activeTab === 'profiles') {
                await fetchProfilesData();
            }
        } else {
            showToast(result.error || 'Có lỗi xảy ra!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Không thể kết nối máy chủ!', true);
    }
}

function openAddEmployeeModal() {
    document.getElementById('emp-id-input').readOnly = false;
    document.getElementById('emp-id-input').style.background = 'var(--bg-main)';
    openModal('modal-employee');
}

async function fetchProfilesData() {
    try {
        const res = await fetch(`${API_URL}/employees`);
        state.employees = await res.json();
        renderProfileList(state.employees);
    } catch (err) {
        console.error('Lỗi khi tải hồ sơ nhân viên:', err);
    }
}

function renderProfileList(data) {
    const listContainer = document.getElementById('profile-list-container');
    if (data.length === 0) {
        listContainer.innerHTML = '<div class="no-data" style="padding: 2rem;">Không tìm thấy nhân sự nào.</div>';
        return;
    }
    
    listContainer.innerHTML = data.map(emp => {
        const activeClass = state.selectedEmployeeId === emp.ma_nhan_vien ? 'active' : '';
        return `
            <div class="list-item ${activeClass}" onclick="selectEmployeeProfile(${escapeJsArg(emp.ma_nhan_vien)})">
                <div class="list-item-title">${escapeHtml(emp.ho_ten)}</div>
                <div class="list-item-sub">Mã NV: ${escapeHtml(emp.ma_nhan_vien)} | SĐT: ${escapeHtml(emp.so_dien_thoai || 'N/A')}</div>
            </div>
        `;
    }).join('');
}

function filterProfileList() {
    const query = document.getElementById('profile-search-input').value.toLowerCase().trim();
    const filtered = state.employees.filter(emp => 
        emp.ho_ten.toLowerCase().includes(query) ||
        emp.ma_nhan_vien.toString().toLowerCase().includes(query) ||
        (emp.email && emp.email.toLowerCase().includes(query))
    );
    renderProfileList(filtered);
}

// Select employee profile detail
async function selectEmployeeProfile(empId) {
    state.selectedEmployeeId = empId;
    renderProfileList(state.employees);
    
    const detailContainer = document.getElementById('profile-detail-container');
    detailContainer.innerHTML = `<div class="no-data"><i class="bx bx-loader-alt bx-spin" style="font-size: 2rem;"></i> Đang tải thông tin hồ sơ...</div>`;
    
    try {
        const empRes = await fetch(`${API_URL}/employees/${empId}`);
        const emp = await empRes.json();
        
        const transRes = await fetch(`${API_URL}/transfer/history/${empId}`);
        const transfers = await transRes.json();
        
        const evalRes = await fetch(`${API_URL}/evaluations/${empId}`);
        const evaluations = await evalRes.json();
        
        renderProfileDetail(emp, transfers, evaluations);
    } catch (err) {
        console.error(err);
        detailContainer.innerHTML = `<div class="no-data error"><i class="bx bx-error"></i> Có lỗi xảy ra khi tải thông tin chi tiết!</div>`;
    }
}

// Render profile detail pane
function renderProfileDetail(emp, transfers, evaluations) {
    const detailContainer = document.getElementById('profile-detail-container');
    const initials = emp.ho_ten.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    let allocsHTML = '';
    if (!emp.allocations || emp.allocations.length === 0) {
        allocsHTML = '<div class="profile-empty-state"><i class="bx bx-info-circle"></i><span>Nhân sự này hiện chưa được phân bổ vào dự án nào.</span></div>';
    } else {
        allocsHTML = emp.allocations.map(a => {
            let badge = a.tinh_trang ? `<span class="badge badge-kiemnhiem">Kiêm nhiệm (${escapeHtml(a.tinh_trang)})</span>` : `<span class="badge badge-active">Chính thức</span>`;
            let classText = a.phan_loai_oc === 'BAN_DIEU_HANH_CHINH' ? '<span class="profile-allocation-kind">(BĐH dự án chính)</span>' : '';
            return `
                <div class="profile-allocation-card">
                    <div>
                        <h4>${escapeHtml(a.ten_du_an || 'N/A')} (${escapeHtml(a.ma_du_an)}) ${classText}</h4>
                        <p>Phòng ban: ${escapeHtml(a.name_oc || 'N/A')} · Chức danh: ${escapeHtml(a.chuc_danh)}</p>
                        ${a.ghi_chu ? `<p class="profile-allocation-note">Ghi chú: ${escapeHtml(a.ghi_chu)}</p>` : ''}
                    </div>
                    <div>
                        ${badge}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    let commonAllocsHTML = '';
    if (!emp.common_allocations || emp.common_allocations.length === 0) {
        commonAllocsHTML = '<div class="profile-empty-state"><i class="bx bx-info-circle"></i><span>Nhân sự không giữ chức vụ dùng chung nào tại tổng công ty.</span></div>';
    } else {
        commonAllocsHTML = emp.common_allocations.map(ca => {
            let badge = ca.tinh_trang ? `<span class="badge badge-kiemnhiem">Kiêm nhiệm (${escapeHtml(ca.tinh_trang)})</span>` : `<span class="badge badge-active">Chính thức</span>`;
            return `
                <div class="profile-allocation-card">
                    <div>
                        <h4>${escapeHtml(ca.name_oc || 'N/A')} (${escapeHtml(ca.ma_oc || 'N/A')})</h4>
                        <p>Chức danh hệ thống: <strong>${escapeHtml(ca.chuc_danh)}</strong></p>
                        ${ca.ghi_chu ? `<p class="profile-allocation-note">Ghi chú: ${escapeHtml(ca.ghi_chu)}</p>` : ''}
                    </div>
                    <div>
                        ${badge}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    let transfersHTML = '';
    if (transfers.length === 0) {
        transfersHTML = '<div class="profile-empty-state"><i class="bx bx-info-circle"></i><span>Chưa có lịch sử luân chuyển dự án.</span></div>';
    } else {
        transfersHTML = `
            <div class="timeline">
                ${transfers.map(t => `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">${escapeHtml(t.ngay_luan_chuyen)}</div>
                            <div class="timeline-title">${escapeHtml(t.tu_du_an)} &rarr; ${escapeHtml(t.den_du_an)}</div>
                            <div class="timeline-desc">
                                <strong>Chức danh:</strong> ${escapeHtml(t.tu_chuc_danh || 'Chưa rõ')} &rarr; ${escapeHtml(t.den_chuc_danh)}<br>
                                <strong>Bộ phận:</strong> ${escapeHtml(t.tu_phong_ban || 'Chưa rõ')} &rarr; ${escapeHtml(t.den_phong_ban)}<br>
                                ${t.ly_do ? `<strong>Lý do:</strong> ${escapeHtml(t.ly_do)}<br>` : ''}
                                ${t.ghi_chu ? `<strong>Ghi chú:</strong> ${escapeHtml(t.ghi_chu)}` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    let evaluationsHTML = '';
    if (evaluations.length === 0) {
        evaluationsHTML = '<div class="profile-empty-state"><i class="bx bx-info-circle"></i><span>Nhân sự chưa có đánh giá năng lực.</span></div>';
    } else {
        evaluationsHTML = evaluations.map(ev => {
            const stars = '⭐'.repeat(ev.diem_so);
            let skillProf = 0, skillComm = 0, skillTeam = 0, skillTime = 0, skillInit = 0;
            try {
                const skills = JSON.parse(ev.nang_luc);
                skillProf = skills.chuyen_mon || 0;
                skillComm = skills.giao_tiep || 0;
                skillTeam = skills.lam_viec_nhom || 0;
                skillTime = skills.tien_do || 0;
                skillInit = skills.chu_dong || 0;
            } catch(e) {}
            
            return `
                <div class="eval-card">
                    <div class="eval-header">
                        <div class="eval-meta">Đánh giá ngày: <strong>${escapeHtml(ev.ngay_danh_gia)}</strong> bởi <strong>${escapeHtml(ev.nguoi_danh_gia)}</strong></div>
                        <div class="eval-stars">${stars} (${escapeHtml(ev.diem_so)}/5)</div>
                    </div>
                    <div class="eval-radar-grid">
                        <div class="eval-radar-item">
                            <div class="eval-radar-label">Chuyên môn</div>
                            <div class="eval-radar-val">${skillProf}/5</div>
                        </div>
                        <div class="eval-radar-item">
                            <div class="eval-radar-label">Giao tiếp</div>
                            <div class="eval-radar-val">${skillComm}/5</div>
                        </div>
                        <div class="eval-radar-item">
                            <div class="eval-radar-label">Làm nhóm</div>
                            <div class="eval-radar-val">${skillTeam}/5</div>
                        </div>
                        <div class="eval-radar-item">
                            <div class="eval-radar-label">Tiến độ</div>
                            <div class="eval-radar-val">${skillTime}/5</div>
                        </div>
                        <div class="eval-radar-item">
                            <div class="eval-radar-label">Chủ động</div>
                            <div class="eval-radar-val">${skillInit}/5</div>
                        </div>
                    </div>
                    <div class="eval-body">
                        ${ev.uu_diem ? `<p><strong>Điểm mạnh:</strong> ${escapeHtml(ev.uu_diem)}</p>` : ''}
                        ${ev.nhuoc_diem ? `<p><strong>Điểm cần cải thiện:</strong> ${escapeHtml(ev.nhuoc_diem)}</p>` : ''}
                        ${ev.nhan_xet_chung ? `<p style="margin-top: 0.5rem; background: rgba(255,255,255,0.01); border-left: 3px solid var(--primary); padding-left: 0.5rem;"><strong>Nhận xét chung:</strong> ${escapeHtml(ev.nhan_xet_chung)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    detailContainer.innerHTML = `
        <div class="profile-summary">
            <div class="profile-avatar">${initials}</div>
            <div class="profile-title">
                <h2>${escapeHtml(emp.ho_ten)}</h2>
                <p>Mã nhân viên: ${escapeHtml(emp.ma_nhan_vien)}</p>
                
                <div class="profile-meta">
                    <div class="profile-meta-item">Email: <strong>${escapeHtml(emp.email || 'N/A')}</strong></div>
                    <div class="profile-meta-item">SĐT: <strong>${escapeHtml(emp.so_dien_thoai || 'N/A')}</strong></div>
                    <div class="profile-meta-item">Ngày vào làm: <strong>${escapeHtml(emp.ngay_vao_lam || 'N/A')}</strong></div>
                </div>
            </div>
            <div>
                <button class="btn profile-edit-btn" onclick="openEditEmployeeProfileModal(${escapeJsArg(emp.ma_nhan_vien)})">
                    <i class="bx bx-user-pin"></i> Sửa hồ sơ
                </button>
            </div>
        </div>

        <section class="profile-section profile-section--common">
            <div class="profile-section-header">
                <div class="profile-section-heading">
                    <span class="profile-section-icon"><i class="bx bx-network-chart"></i></span>
                    <div>
                        <h3>Chức vụ chung hệ thống</h3>
                        <p>Vai trò dùng chung ngoài phạm vi một dự án</p>
                    </div>
                </div>
            </div>
            ${commonAllocsHTML}
        </section>
        
        <section class="profile-section profile-section--current">
            <div class="profile-section-header">
                <div class="profile-section-heading">
                    <span class="profile-section-icon"><i class="bx bx-buildings"></i></span>
                    <div>
                        <h3>Phân bổ dự án hiện tại</h3>
                        <p>Đơn vị, chức danh và trạng thái phân bổ đang hiệu lực</p>
                    </div>
                </div>
            </div>
            ${allocsHTML}
        </section>
        
        <section class="profile-section profile-section--history">
            <div class="profile-section-header">
                <div class="profile-section-heading">
                    <span class="profile-section-icon"><i class="bx bx-transfer-alt"></i></span>
                    <div>
                        <h3>Lịch sử luân chuyển dự án</h3>
                        <p>Hành trình thay đổi dự án, bộ phận và chức danh</p>
                    </div>
                </div>
            </div>
            ${transfersHTML}
        </section>

        <section class="profile-section profile-section--evaluation">
            <div class="profile-section-header">
                <div class="profile-section-heading">
                    <span class="profile-section-icon"><i class="bx bx-line-chart"></i></span>
                    <div>
                        <h3>Nhật ký đánh giá năng lực</h3>
                        <p>Kết quả đánh giá và định hướng phát triển</p>
                    </div>
                </div>
                <button class="btn btn-primary profile-section-action" onclick="openAddEvaluationModal(${escapeJsArg(emp.ma_nhan_vien)}, ${escapeJsArg(emp.ho_ten)})">
                    <i class="bx bx-plus"></i> Viết đánh giá
                </button>
            </div>
            ${evaluationsHTML}
        </section>
    `;
}

function openEditEmployeeProfileModal(empId) {
    const emp = state.employees.find(e => e.ma_nhan_vien === empId);
    if (!emp) return;
    document.getElementById('emp-id-input').value = emp.ma_nhan_vien;
    document.getElementById('emp-id-input').readOnly = true;
    document.getElementById('emp-id-input').style.background = 'rgba(255,255,255,0.03)';
    document.getElementById('emp-name-input').value = emp.ho_ten;
    document.getElementById('emp-email-input').value = emp.email || '';
    document.getElementById('emp-phone-input').value = emp.so_dien_thoai || '';
    document.getElementById('emp-date-input').value = emp.ngay_vao_lam || '';
    openModal('modal-employee');
}

// Triggered when selected project changes in Transfer Modal
async function onTransProjectChange() {
    const projCode = document.getElementById('trans-new-proj-input').value;
    const select = document.getElementById('trans-new-dept-select');
    const container = document.getElementById('new-trans-dept-container');
    
    container.style.display = 'none';
    
    if (!projCode) {
        select.innerHTML = '<option value="">-- Chọn dự án trước --</option>';
        return;
    }
    
    select.innerHTML = '<option value="">-- Đang tải phòng ban... --</option>';
    
    try {
        const res = await fetch(`${API_URL}/projects/${projCode}/departments`);
        const depts = await res.json();
        
        let optionsHTML = depts.map(d => 
            `<option value="${escapeHtml(d.name_oc)}" data-code="${escapeHtml(d.ma_oc)}">${escapeHtml(d.name_oc)} (${escapeHtml(d.ma_oc)})</option>`
        ).join('');
        
        select.innerHTML = `
            <option value="">-- Chọn phòng ban chuyển đến --</option>
            ${optionsHTML}
            <option value="NEW" style="color: var(--secondary); font-weight: 600;">+ Thêm phòng ban mới...</option>
        `;
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="NEW">+ Thêm phòng ban mới...</option>';
    }
}

// Triggered when selected department changes in Transfer Modal
function onTransDeptSelectChange() {
    const select = document.getElementById('trans-new-dept-select');
    const container = document.getElementById('new-trans-dept-container');
    const textInput = document.getElementById('trans-new-dept-input');
    
    if (select.value === 'NEW') {
        container.style.display = 'block';
        textInput.value = '';
        textInput.required = true;
    } else {
        container.style.display = 'none';
        textInput.required = false;
        textInput.value = select.value;
    }
}

// Open Transfer Modal
function openTransferModal(allocId) {
    const alloc = state.allocations.find(a => a.id === allocId);
    if (!alloc) return;
    
    document.getElementById('trans-alloc-id-input').value = alloc.id;
    document.getElementById('trans-empid-input').value = alloc.ma_nhan_vien;
    document.getElementById('trans-empname-display').value = `${escapeHtml(alloc.ho_ten || 'Nhân viên')} (Mã: ${escapeHtml(alloc.ma_nhan_vien)})`;
    document.getElementById('trans-old-proj-display').value = alloc.ma_du_an;
    document.getElementById('trans-old-dept-display').value = alloc.name_oc || '';
    document.getElementById('trans-old-title-display').value = alloc.chuc_danh || '';
    
    document.getElementById('trans-new-proj-input').value = '';
    document.getElementById('trans-new-dept-select').innerHTML = '<option value="">-- Chọn dự án trước --</option>';
    document.getElementById('new-trans-dept-container').style.display = 'none';
    
    openModal('modal-transfer');
}

// Submit Transfer
async function saveTransfer(e) {
    e.preventDefault();
    
    const allocation_id = document.getElementById('trans-alloc-id-input').value;
    const ma_nhan_vien = document.getElementById('trans-empid-input').value;
    const tu_du_an = document.getElementById('trans-old-proj-display').value;
    const tu_phong_ban = document.getElementById('trans-old-dept-display').value;
    const tu_chuc_danh = document.getElementById('trans-old-title-display').value;
    
    const den_du_an = document.getElementById('trans-new-proj-input').value;
    const den_dept_select = document.getElementById('trans-new-dept-select');
    
    let den_phong_ban = '';
    if (den_dept_select.value === 'NEW') {
        den_phong_ban = document.getElementById('trans-new-dept-input').value.trim();
    } else {
        den_phong_ban = den_dept_select.value;
    }
    
    const den_chuc_danh = document.getElementById('trans-new-title-input').value.trim();
    const ngay_luan_chuyen = document.getElementById('trans-date-input').value;
    const ly_do = document.getElementById('trans-reason-input').value.trim();
    const ghi_chu = document.getElementById('trans-notes-input').value.trim();
    
    if (!den_du_an || !den_phong_ban || !den_chuc_danh || !ngay_luan_chuyen) {
        showToast('Vui lòng nhập đầy đủ thông tin điều chuyển mới!', true);
        return;
    }
    
    const payload = {
        allocation_id: allocation_id ? parseInt(allocation_id) : null,
        ma_nhan_vien,
        tu_du_an,
        tu_phong_ban,
        tu_chuc_danh,
        den_du_an,
        den_phong_ban,
        den_chuc_danh,
        ngay_luan_chuyen,
        ly_do,
        ghi_chu
    };
    
    try {
        const res = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Điều chuyển nhân sự thành công!');
            closeModal('modal-transfer');
            await fetchAllocationsData();
            await fetchDashboardData();
            if (state.selectedEmployeeId === ma_nhan_vien) {
                await selectEmployeeProfile(ma_nhan_vien);
            }
        } else {
            showToast(result.error || 'Lỗi khi luân chuyển!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

function openEvaluationModal(empId, empName) {
    document.getElementById('eval-empid-input').value = empId;
    document.getElementById('eval-empname-display').value = `${empName || 'Nhân sự'} (Mã: ${empId})`;
    openModal('modal-evaluation');
}

function openAddEvaluationModal(empId, empName) {
    openEvaluationModal(empId, empName);
}

async function saveEvaluation(e) {
    e.preventDefault();
    
    const empId = document.getElementById('eval-empid-input').value;
    const ngay_danh_gia = document.getElementById('eval-date-input').value;
    const nguoi_danh_gia = document.getElementById('eval-evaluator-input').value.trim();
    const diem_so = parseInt(document.getElementById('eval-score-input').value);
    
    const skillProf = parseInt(document.getElementById('eval-skill-prof').value);
    const skillComm = parseInt(document.getElementById('eval-skill-comm').value);
    const skillTeam = parseInt(document.getElementById('eval-skill-team').value);
    const skillTime = parseInt(document.getElementById('eval-skill-time').value);
    const skillInit = parseInt(document.getElementById('eval-skill-init').value);
    
    const uu_diem = document.getElementById('eval-strength-input').value.trim();
    const nhuoc_diem = document.getElementById('eval-weakness-input').value.trim();
    const nhan_xet_chung = document.getElementById('eval-feedback-input').value.trim();
    
    if (!nguoi_danh_gia || !ngay_danh_gia) {
        showToast('Vui lòng nhập người đánh giá và ngày đánh giá!', true);
        return;
    }
    
    const payload = {
        ngay_danh_gia,
        nguoi_danh_gia,
        diem_so,
        nang_luc: {
            chuyen_mon: skillProf,
            giao_tiep: skillComm,
            lam_viec_nhom: skillTeam,
            tien_do: skillTime,
            chu_dong: skillInit
        },
        uu_diem,
        nhuoc_diem,
        nhan_xet_chung
    };
    
    try {
        const res = await fetch(`${API_URL}/evaluations/${empId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Lưu đánh giá năng lực thành công!');
            closeModal('modal-evaluation');
            if (state.selectedEmployeeId === empId) {
                await selectEmployeeProfile(empId);
            }
        } else {
            showToast(result.error || 'Lỗi khi lưu đánh giá!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// EXCEL SYNC: Save database back to Excel file
async function syncToExcel() {
    const btn = document.getElementById('btn-sync-action');
    const status = document.getElementById('sync-status-msg');
    
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Đang đồng bộ hóa...`;
    status.innerHTML = `<span style="color: var(--text-muted);">Hệ thống đang xuất dữ liệu SQLite và viết lại vào file Excel. Vui lòng chờ...</span>`;
    
    try {
        const res = await fetch(`${API_URL}/excel/sync`, { method: 'POST' });
        const result = await res.json();
        
        btn.disabled = false;
        btn.innerHTML = `<i class="bx bx-sync"></i> Thực hiện đồng bộ hóa`;
        
        if (res.ok) {
            status.innerHTML = `<span style="color: var(--success);"><i class="bx bx-check-double"></i> ${escapeHtml(result.message)}</span>`;
            showToast('Đồng bộ Excel hoàn tất!');
        } else {
            status.innerHTML = `<span style="color: var(--danger);"><i class="bx bx-error"></i> ${escapeHtml(result.error)}</span>`;
            showToast('Lỗi đồng bộ Excel!', true);
        }
    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `<i class="bx bx-sync"></i> Thực hiện đồng bộ hóa`;
        status.innerHTML = `<span style="color: var(--danger);"><i class="bx bx-error"></i> Lỗi kết nối đến máy chủ!</span>`;
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// Allocation tab: Switch between Table view and Quick Entry view
function switchAllocationMode(mode) {
    state.allocationMode = mode;
    
    const btnTable = document.getElementById('btn-alloc-mode-table');
    const btnQuick = document.getElementById('btn-alloc-mode-quick');
    const tableView = document.getElementById('alloc-table-view-section');
    const quickView = document.getElementById('alloc-quick-entry-section');
    
    if (mode === 'table') {
        btnTable.classList.add('btn-primary');
        btnQuick.classList.remove('btn-primary');
        btnQuick.style.borderColor = 'var(--border-color)';
        
        tableView.style.display = 'block';
        quickView.style.display = 'none';
        
        fetchAllocationsData();
    } else {
        btnQuick.classList.add('btn-primary');
        btnTable.classList.remove('btn-primary');
        btnTable.style.borderColor = 'var(--border-color)';
        
        tableView.style.display = 'none';
        quickView.style.display = 'block';
        
        loadQuickEntryProjectData();
    }
}

// ----------------------------------------------------
// TAB: DEPARTMENT CONFIGURATION LOGIC
// ----------------------------------------------------

// Load metadata for department config dropdown
async function loadDeptConfigMetadata() {
    try {
        const res = await fetch(`${API_URL}/departments/distinct`);
        const distinctDepts = await res.json();
        
        const configDeptSource = document.getElementById('config-dept-source');
        if (configDeptSource) {
            let optionsHTML = distinctDepts.map(d => 
                `<option value="${escapeHtml(d.ma_oc)}" data-name="${escapeHtml(d.name_oc)}">${escapeHtml(d.name_oc)} (${escapeHtml(d.ma_oc)})</option>`
            ).join('');
            configDeptSource.innerHTML = '<option value="">-- Chọn một phòng ban gợi ý --</option>' + optionsHTML;
        }
    } catch (err) {
        console.error('Lỗi khi tải danh sách phòng ban gợi ý:', err);
    }
}

// Automatically fill fields when select distinct department
function onConfigDeptSourceChange() {
    const select = document.getElementById('config-dept-source');
    const codeInput = document.getElementById('config-oc-code-input');
    const nameInput = document.getElementById('config-oc-name-input');
    
    if (select.value) {
        const selectedOption = select.options[select.selectedIndex];
        codeInput.value = select.value;
        nameInput.value = selectedOption.getAttribute('data-name');
    } else {
        codeInput.value = '';
        nameInput.value = '';
    }
}

// Load department configurations for selected project
async function loadProjectDeptConfig() {
    const projCode = document.getElementById('config-project-select').value;
    const tbody = document.getElementById('config-dept-table-body');
    const countSpan = document.getElementById('config-dept-count');
    
    if (!projCode) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data"><i class="bx bx-select-multiple"></i> Vui lòng chọn một dự án ở trên để xem cấu hình phòng ban.</td></tr>';
        countSpan.innerText = 'Đang hiển thị 0 phòng ban';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="4" class="no-data"><i class="bx bx-loader-alt bx-spin"></i> Đang tải cấu hình phòng ban...</td></tr>';
    
    try {
        const res = await fetch(`${API_URL}/projects/${projCode}/departments`);
        const depts = await res.json();
        
        countSpan.innerText = `Đang hiển thị ${depts.length} phòng ban`;
        
        if (depts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data"><i class="bx bx-info-circle"></i> Chưa cấu hình phòng ban nào cho dự án này. Hãy thêm phòng ban ở khung bên trái hoặc sao chép cấu hình từ dự án khác.</td></tr>';
            return;
        }
        
        tbody.innerHTML = depts.map(d => {
            const isBDH = classifyOC(d.ma_oc) === 'BAN_DIEU_HANH_CHINH';
            const badgeHTML = isBDH ? 
                `<span class="badge" style="background: rgba(138, 63, 252, 0.15); color: #d0bfff;">Ban điều hành chính</span>` : 
                `<span class="badge" style="background: rgba(255,255,255,0.03); color: var(--text-muted);">Khác</span>`;
                
            return `
                <tr>
                    <td><strong>${escapeHtml(d.ma_oc)}</strong></td>
                    <td>${escapeHtml(d.name_oc)}</td>
                    <td>${badgeHTML}</td>
                    <td style="text-align: center;">
                        <button class="btn-icon delete" onclick="deleteDeptFromProjectConfig(${d.id})" title="Gỡ cấu hình phòng ban này"><i class="bx bx-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" class="no-data error"><i class="bx bx-error"></i> Lỗi khi tải dữ liệu!</td></tr>';
    }
}

// Classify OC code (helper for frontend)
function classifyOC(ma_oc) {
    if (!ma_oc) return 'PHONG_BAN_KHAC';
    const ma_oc_clean = ma_oc.toString().trim().toUpperCase();
    const core_prefixes = ['GMD', 'PMD', 'PLP', 'DMD', 'PCD', 'PM'];
    for (const pref of core_prefixes) {
        if (ma_oc_clean === pref || ma_oc_clean.startsWith(pref) || ma_oc_clean.includes('.' + pref) || ma_oc_clean.includes(pref + '.')) {
            return 'BAN_DIEU_HANH_CHINH';
        }
    }
    return 'PHONG_BAN_KHAC';
}

// Add department to project configuration
async function addDeptToProjectConfig(e) {
    e.preventDefault();
    
    const projCode = document.getElementById('config-project-select').value;
    const ma_oc = document.getElementById('config-oc-code-input').value.trim();
    const name_oc = document.getElementById('config-oc-name-input').value.trim();
    
    if (!projCode) {
        showToast('Vui lòng chọn một dự án trước khi lưu cấu hình!', true);
        return;
    }
    
    if (!ma_oc || !name_oc) {
        showToast('Vui lòng nhập Mã và Tên phòng ban!', true);
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/project-departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ma_du_an: projCode,
                ma_oc: ma_oc,
                name_oc: name_oc
            })
        });
        const result = await res.json();
        
        if (res.ok) {
            showToast('Đã thêm phòng ban vào cấu hình dự án!');
            document.getElementById('form-add-dept-config').reset();
            await loadProjectDeptConfig();
            await loadDeptConfigMetadata(); // Refresh options
        } else {
            showToast(result.error || 'Lỗi khi lưu cấu hình!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// Delete department config from project
async function deleteDeptFromProjectConfig(id) {
    if (!confirm('Bạn có chắc muốn gỡ phòng ban này khỏi cấu hình dự án? Việc này không xóa phân bổ nhân viên cũ nhưng phòng ban sẽ không hiện trong danh sách nhập liệu.')) {
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/project-departments/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            showToast('Đã gỡ cấu hình phòng ban thành công!');
            await loadProjectDeptConfig();
        } else {
            showToast('Lỗi khi gỡ cấu hình phòng ban!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// Open Copy Config Modal
function openCopyConfigModal() {
    const projCode = document.getElementById('config-project-select').value;
    if (!projCode) {
        showToast('Vui lòng chọn dự án đích cần cấu hình phòng ban trước!', true);
        return;
    }
    
    const proj = state.projects.find(p => p.ma_du_an === projCode);
    
    document.getElementById('copy-to-project-id').value = projCode;
    document.getElementById('copy-to-project-display').value = `${escapeHtml(proj.ten_du_an)} (${projCode})`;
    document.getElementById('copy-from-project-select').value = '';
    
    openModal('modal-copy-config');
}

// Save Copy Config action
async function saveCopyConfig(e) {
    e.preventDefault();
    
    const from_project = document.getElementById('copy-from-project-select').value;
    const to_project = document.getElementById('copy-to-project-id').value;
    
    if (!from_project || !to_project) {
        showToast('Vui lòng chọn đầy đủ dự án nguồn và dự án đích!', true);
        return;
    }
    
    if (from_project === to_project) {
        showToast('Dự án nguồn và dự án đích không được trùng nhau!', true);
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/project-departments/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_project, to_project })
        });
        const result = await res.json();
        
        if (res.ok) {
            showToast('Đã sao chép cấu hình phòng ban thành công!');
            closeModal('modal-copy-config');
            await loadProjectDeptConfig();
        } else {
            showToast(result.error || 'Lỗi khi sao chép cấu hình!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}

// ----------------------------------------------------
// TAB: ALLOCATIONS - QUICK ENTRY BY PROJECT LOGIC
// ----------------------------------------------------

// Fetch departments and allocations, group and render quick cards
async function loadQuickEntryProjectData() {
    const projCode = document.getElementById('quick-alloc-project-select').value;
    const container = document.getElementById('quick-alloc-cards-container');
    
    if (!projCode) {
        container.innerHTML = `
            <div class="no-data">
                <i class="bx bx-select-multiple" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
                <p>Vui lòng chọn một dự án từ danh sách bên trên để hiển thị các bộ phận cần nhập liệu.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="no-data">
            <i class="bx bx-loader-alt bx-spin" style="font-size: 2rem; color: var(--primary);"></i>
            <p>Đang tải dữ liệu nhập liệu nhanh của dự án...</p>
        </div>
    `;
    
    try {
        // Fetch project departments
        const deptsRes = await fetch(`${API_URL}/projects/${projCode}/departments`);
        const depts = await deptsRes.json();
        
        // Fetch current project info to retrieve default region
        const proj = state.projects.find(p => p.ma_du_an === projCode);
        const defaultRegion = proj ? (proj.khu_vuc || 'Vùng Đồng Nai 1') : 'Vùng Đồng Nai 1';
        
        // Fetch allocations for this project
        const allocsRes = await fetch(`${API_URL}/allocations?project=${encodeURIComponent(projCode)}`);
        const allocs = await allocsRes.json();
        
        if (depts.length === 0) {
            container.innerHTML = `
                <div class="no-data" style="padding: 3rem;">
                    <i class="bx bx-cog" style="font-size: 2.5rem; color: var(--text-muted);"></i>
                    <p>Dự án này chưa được cấu hình phòng ban hoạt động.</p>
                    <button class="btn btn-primary" onclick="switchTab('dept-config'); document.getElementById('config-project-select').value = ${escapeJsArg(projCode)}; loadProjectDeptConfig();" style="margin-top: 1rem;">
                        <i class="bx bx-cog"></i> Đi tới cấu hình phòng ban
                    </button>
                </div>
            `;
            return;
        }
        
        // Render cards
        let cardsHTML = '';
        
        // Options for employee dropdown selection
        const filteredEmployees = state.employees.filter(e => {
            const name = e.ho_ten || '';
            return !name.includes('Chưa có') && !name.startsWith('Nhân sự ');
        });
        const empOptionsHTML = filteredEmployees.map(e => 
            `<option value="${escapeHtml(e.ma_nhan_vien)}">${escapeHtml(e.ho_ten)} (${escapeHtml(e.ma_nhan_vien)})</option>`
        ).join('');
        
        const dropdownHTML = `
            <option value="Tuyển0">Vị trí kiêm nhiệm từ dự án khác (không tuyển chính)</option>
            <option value="Tuyển">Vị trí đang tuyển chính</option>
            <option value="Không tuyển">Vị trí không tuyển</option>
            <option value="Chưa tuyển">Chưa tuyển</option>
            <optgroup label="Danh sách nhân viên">
                ${empOptionsHTML}
            </optgroup>
        `;
        
        depts.forEach(dept => {
            // Filter allocations belonging to this department
            const deptAllocs = allocs.filter(a => a.ma_oc === dept.ma_oc || (a.name_oc === dept.name_oc && (!a.ma_oc || a.ma_oc === 'MISC' || a.ma_oc === '')));
            
            const isBDH = classifyOC(dept.ma_oc) === 'BAN_DIEU_HANH_CHINH';
            const cardBadge = isBDH ? 
                `<span class="badge" style="background: rgba(138, 63, 252, 0.15); color: #d0bfff; font-size: 0.7rem;">BĐH dự án chính</span>` : 
                `<span class="badge" style="background: rgba(255,255,255,0.03); color: var(--text-muted); font-size: 0.7rem;">Phòng ban khác</span>`;
                
            let rowsHTML = '';
            if (deptAllocs.length === 0) {
                rowsHTML = `<tr><td colspan="5" class="no-data" style="padding: 1.5rem; font-size: 0.8rem;"><i class="bx bx-user-plus" style="font-size: 1.25rem; margin-bottom: 0.25rem;"></i>Chưa có nhân sự. Hãy nhập dòng dưới đây.</td></tr>`;
            } else {
                rowsHTML = deptAllocs.map(a => {
                    const isHiring = isPlaceholder(a.ma_nhan_vien);
                    const nameDisplay = isHiring ? `<span style="color: var(--text-muted); font-style: italic;">${escapeHtml(getPlaceholderPersonLabel(a.ma_nhan_vien))}</span>` : (escapeHtml(a.ho_ten) || `Nhân sự ${escapeHtml(a.ma_nhan_vien)}`);
                    const codeDisplay = isHiring ? `<span class="badge badge-planning">${escapeHtml(getPlaceholderLabel(a.ma_nhan_vien))}</span>` : escapeHtml(a.ma_nhan_vien);
                    
                    let statusBadge = '';
                    if (isHiring) {
                        statusBadge = `<span class="badge badge-planning">${escapeHtml(getPlaceholderStatusLabel(a.ma_nhan_vien))}</span>`;
                    } else if (a.tinh_trang && (a.tinh_trang.includes('KN') || a.tinh_trang.toLowerCase().includes('kiêm nhiệm'))) {
                        statusBadge = `<span class="badge badge-kiemnhiem">Kiêm nhiệm</span>`;
                    } else {
                        statusBadge = `<span class="badge badge-active">Chính thức</span>`;
                    }
                    
                    return `
                        <tr>
                            <td>
                                <strong>${nameDisplay}</strong>
                                <div style="font-size: 0.7rem; color: var(--text-muted);">${codeDisplay}</div>
                            </td>
                            <td>${escapeHtml(a.chuc_danh || 'N/A')}</td>
                            <td>${statusBadge}</td>
                            <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(a.ghi_chu || '')}">${escapeHtml(a.ghi_chu || '')}</td>
                            <td style="text-align: center;">
                                <div class="actions" style="justify-content: center;">
                                    ${!isHiring ? `<button class="btn-icon transfer" onclick="openTransferModal(${a.id})" title="Luân chuyển dự án"><i class="bx bx-git-compare"></i></button>` : ''}
                                    <button class="btn-icon delete" onclick="deleteQuickAllocation(${a.id}, ${escapeJsArg(projCode)})" title="Xóa phân bổ"><i class="bx bx-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
            
            cardsHTML += `
                <div class="quick-alloc-card">
                    <div class="quick-alloc-card-header">
                        <div>
                            <div class="quick-alloc-card-title">
                                <i class="bx bx-hive" style="color: var(--primary);"></i>
                                ${escapeHtml(dept.name_oc)}
                            </div>
                            <div class="quick-alloc-card-subtitle">Mã bộ phận: <strong>${escapeHtml(dept.ma_oc)}</strong></div>
                        </div>
                        <div>
                            ${cardBadge}
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
                        <table class="quick-alloc-table">
                            <thead>
                                <tr>
                                    <th>Nhân viên</th>
                                    <th>Chức danh</th>
                                    <th>Vai trò</th>
                                    <th>Ghi chú</th>
                                    <th style="width: 80px; text-align: center;">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHTML}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Inline quick add form -->
                    <div class="quick-input-row-form">
                        <form onsubmit="saveQuickAllocation(event, ${escapeJsArg(projCode)}, ${escapeJsArg(dept.ma_oc)}, ${escapeJsArg(dept.name_oc)})">
                            <input type="hidden" class="quick-region-val" value="${defaultRegion}">
                            <div class="quick-input-fields">
                                <input type="text" class="form-control quick-emp-input" list="quick-emp-datalist" placeholder="Mã NV (ví dụ: 2325, 35110)..." required>
                                <input type="text" class="form-control quick-title-input" placeholder="Chức danh..." required>
                                <div style="display: flex; align-items: center; justify-content: center; height: 34px;">
                                    <label class="custom-checkbox-container" style="padding-left: 20px; height: 20px; font-size: 0.8rem; margin: 0;" title="Kiêm nhiệm (KN)">
                                        <input type="checkbox" class="quick-status-input">
                                        <span class="checkmark" style="height: 20px; width: 20px;"></span>
                                        <span style="display: none;">KN</span>
                                    </label>
                                </div>
                                <input type="text" class="form-control quick-notes-input" placeholder="Ghi chú...">
                                <button type="submit" class="btn btn-primary btn-quick-add" title="Thêm nhân sự trực tiếp">
                                    <i class="bx bx-plus"></i> Thêm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = cardsHTML;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="no-data error">
                <i class="bx bx-error" style="font-size: 2.5rem; color: var(--danger);"></i>
                <p>Đã xảy ra lỗi khi tải thẻ phòng ban nhập liệu!</p>
            </div>
        `;
    }
}

// Save allocation from quick entry inline form
async function saveQuickAllocation(e, ma_du_an, ma_oc, name_oc) {
    e.preventDefault();
    
    const form = e.target;
    const ma_nhan_vien_raw = form.querySelector('.quick-emp-input').value.trim();
    const chuc_danh = form.querySelector('.quick-title-input').value.trim();
    const tinh_trang = form.querySelector('.quick-status-input').checked ? 'KN' : '';
    const ghi_chu = form.querySelector('.quick-notes-input').value.trim();
    const vung = form.querySelector('.quick-region-val').value;
    
    if (!ma_nhan_vien_raw || !chuc_danh) {
        showToast('Vui lòng điền mã nhân viên và chức danh!', true);
        return;
    }
    
    // Split the input value by comma, semicolon or whitespace to handle multiple employee IDs
    const placeholderCode = normalizePlaceholderInput(ma_nhan_vien_raw);
    const empCodes = placeholderCode
        ? [placeholderCode]
        : ma_nhan_vien_raw.split(/[\s,;]+/).map(c => c.trim()).filter(c => c !== '');
    if (empCodes.length === 0) {
        showToast('Mã nhân viên không hợp lệ!', true);
        return;
    }
    
    let successCount = 0;
    let errors = [];
    
    for (const code of empCodes) {
        const payload = {
            ma_du_an,
            ma_nhan_vien: code,
            ma_oc,
            name_oc,
            chuc_danh,
            tinh_trang,
            ghi_chu,
            vung
        };
        
        try {
            const res = await fetch(`${API_URL}/allocations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if (res.ok) {
                successCount++;
            } else {
                errors.push(`${code}: ${result.error || 'Lỗi chưa xác định'}`);
            }
        } catch (err) {
            console.error(err);
            errors.push(`${code}: Lỗi kết nối`);
        }
    }
    
    if (successCount > 0) {
        showToast(`Đã phân bổ thành công ${successCount} nhân sự!`);
        form.querySelector('.quick-emp-input').value = '';
        form.querySelector('.quick-title-input').value = '';
        form.querySelector('.quick-status-input').checked = false;
        form.querySelector('.quick-notes-input').value = '';
        await loadQuickEntryProjectData();
        await fetchDashboardData();
    }
    
    if (errors.length > 0) {
        alert("Lỗi khi thêm một số nhân sự:\n" + errors.join("\n"));
    }
}

// Delete allocation from quick entry
async function deleteQuickAllocation(id, ma_du_an) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi phân bổ này? Vị trí nhân sự này sẽ bị gỡ khỏi dự án.')) {
        return;
    }
    try {
        const res = await fetch(`${API_URL}/allocations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Đã xóa phân bổ nhân sự thành công!');
            await loadQuickEntryProjectData();
            await fetchDashboardData();
        } else {
            showToast('Lỗi khi xóa phân bổ!', true);
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối máy chủ!', true);
    }
}


async function openProjectDataEntry(projectCode) {
    if (!projectCode) return;
    await editProjectOverview(projectCode, true);
}

/* Giữ tương thích với các nút/link cũ: dữ liệu chi tiết giờ nằm trong form dự án. */
function switchProjectSubTab(mode, selectedProjectCode = null) {
    if (mode === 'masterdata') {
        openProjectDataEntry(selectedProjectCode);
        return;
    }
    document.getElementById('project-subview-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/* ==========================================================================
   MULTI-LAYER PROJECT OVERVIEW DASHBOARD LOGIC (TỔNG QUAN DỰ ÁN)
   ========================================================================== */

const REGION_DEFINITIONS = [
    { code: 'GMD.HCM1-NVLG', name: 'Vùng TP.HCM 1' },
    { code: 'GMD.HCM2.1-NVLG', name: 'Vùng TP.HCM 2.1' },
    { code: 'GMD.HCM2.2-NVLG', name: 'Vùng TP.HCM 2.2' },
    { code: 'GMD.HCM2.3-NVLG', name: 'Vùng HCM 2.3' },
    { code: 'GMD.HCM3-NVLG', name: 'Vùng TP.HCM 3' },
    { code: 'GMD.BRVT-NVLG', name: 'Vùng Bà Rịa - Vũng Tàu' },
    { code: 'GMD.HT1-NVLG', name: 'Vùng Hồ Tràm 1' },
    { code: 'GMD.HT2-NVLG', name: 'Vùng Hồ Tràm 2' },
    { code: 'GMD.ĐN1-NVLG', name: 'Vùng Đồng Nai 1' },
    { code: 'GMD.ĐN2-NVLG', name: 'Vùng Đồng Nai 2' },
    { code: 'GMD.ĐN3-NVLG', name: 'Vùng Đồng Nai 3' },
    { code: 'GMD.HDNGL-NVLG', name: 'Vùng Huế - Đà Nẵng - Gia Lai' },
    { code: 'GMD.PT1-NVLG', name: 'Vùng Phan Thiết 1' },
    { code: 'GMD.PT2-NVLG', name: 'Vùng Phan Thiết 2' },
    { code: 'GMD.PT3-NVLG', name: 'Vùng Phan Thiết 3' },
    { code: 'GMD.PQ-NVLG', name: 'Vùng Phú Quốc' },
    { code: 'GMD.ĐL1-NVLG', name: 'Vùng Đà Lạt 1' },
    { code: 'GMD.ĐL2-NVLG', name: 'Vùng Đà Lạt 2' },
    { code: 'GMD.ĐL3-NVLG', name: 'Vùng Đà Lạt 3' },
    { code: 'GMD.HNHPQN-NVLG', name: 'Vùng Hà Nội - Hải Phòng Quảng Ninh' },
    { code: 'GMD.DBSCL1-NVLG', name: 'Vùng Đồng Bằng Sông Cửu Long 1' },
    { code: 'GMD.DBSCL2-NVLG', name: 'Vùng Đồng Bằng Sông Cửu Long 2' },
    { code: 'GMD.TN-NVLG', name: 'Vùng Tây Ninh (Long An)' },
    { code: 'GMD.KH-NVLG', name: 'Vùng Khánh Hòa' },
    { code: 'GMD.TĐ-NVLG', name: 'Vùng Dự Án Trọng Điểm' },
    { code: 'GMD.KCN-NVLG', name: 'Vùng Dự Án Khu Công Nghiệp' },
    { code: 'GMD.HT-NVLG', name: 'Vùng Dự Án Hạ Tầng' },
    { code: '', name: 'GMD vùng đầu tư' },
    { code: 'GMD.STAY-NVLG', name: 'Vùng Stay' },
    { code: 'GMD.PLAY-NVLG', name: 'Vùng Play' }
];

function showOverviewLayer(layerNum) {
    document.querySelectorAll('.overview-layer').forEach(el => el.style.display = 'none');
    const targetLayer = document.getElementById(`overview-layer-${layerNum}`);
    if (targetLayer) targetLayer.style.display = 'block';
}

function renderOverviewLayer1() {
    showOverviewLayer(1);
    const container = document.getElementById('regions-cards-container');
    if (!container) return;

    const regionCounts = {};
    (state.allocations || []).forEach(alloc => {
        const v = alloc.vung || alloc.khu_vuc || '';
        if (v) {
            regionCounts[v] = (regionCounts[v] || 0) + 1;
        }
    });

    const projectCounts = {};
    (state.projects || []).forEach(p => {
        const v = p.khu_vuc || '';
        if (v) {
            projectCounts[v] = (projectCounts[v] || 0) + 1;
        }
    });

    container.innerHTML = REGION_DEFINITIONS.map(r => {
        let count = 0;
        for (const [key, val] of Object.entries(regionCounts)) {
            if (key.toLowerCase().includes(r.name.toLowerCase()) || (r.code && key.includes(r.code))) {
                count += val;
            }
        }
        if (count === 0) {
            for (const [key, val] of Object.entries(projectCounts)) {
                if (key.toLowerCase().includes(r.name.toLowerCase()) || (r.code && key.includes(r.code))) {
                    count += val;
                }
            }
        }

        const countDisplay = count > 0 
            ? `<div class="region-card-headcount"><i class="bx bx-user"></i> ${count}</div>` 
            : (r.name.includes('GMD vùng') ? `<div class="region-card-headcount"><i class="bx bx-user"></i> (Blank)</div>` : '');

        return `
            <div class="region-card" onclick="selectOverviewRegion('${r.name.replace(/'/g, "\\'")}', '${(r.code || '').replace(/'/g, "\\'")}')">
                <div class="region-card-name">${r.name}</div>
                ${r.code ? `<div class="region-card-code">(${r.code})</div>` : ''}
                ${countDisplay}
            </div>
        `;
    }).join('');
}

async function selectOverviewRegion(regionName, regionCode) {
    state.selectedOverviewRegion = { name: regionName, code: regionCode };
    showOverviewLayer(2);

    const execLeaderEl = document.getElementById('layer2-exec-leader');
    const execMembersEl = document.getElementById('layer2-exec-members');
    if (execLeaderEl) execLeaderEl.innerText = 'Đang tải chức danh...';
    if (execMembersEl) execMembersEl.innerText = 'Đang tải nhân sự...';

    let regionalOverview = null;
    try {
        const response = await fetch(
            `${API_URL}/overview/region-team?region=${encodeURIComponent(regionName)}`
        );
        if (response.ok) {
            regionalOverview = await response.json();
        }
    } catch (error) {
        console.error('Không thể tải nhân sự Ban điều hành theo vùng:', error);
    }
    renderOverviewLayer2(regionName, regionCode, regionalOverview);
}

function renderOverviewLayer2(regionName, regionCode, regionalOverview = null) {
    showOverviewLayer(2);

    const titleStr = regionName.toUpperCase();
    document.getElementById('layer2-region-title').innerText = `BAN ĐIỀU HÀNH DỰ ÁN ${titleStr}`;
    document.getElementById('layer2-exec-title').innerText = `BAN ĐIỀU HÀNH DỰ ÁN ${titleStr}`;

    const fallbackAllocations = (state.allocations || []).filter(alloc => {
            const region = (alloc.vung || alloc.khu_vuc || '').toLowerCase();
            return region.includes(regionName.toLowerCase())
                || (regionCode && region.includes(regionCode.toLowerCase()));
        });

    // Chỉ mã OC chính xác GMD là lãnh đạo Ban Điều hành Dự án khu vực.
    // GMD4 là thư ký và không thuộc card lãnh đạo. Dữ liệu được lặp lại theo
    // từng dự án, nên gom theo mã nhân viên trước khi hiển thị.
    const regionalTeam = new Map();
    const teamSource = Array.isArray(regionalOverview?.team)
        ? regionalOverview.team
        : fallbackAllocations;
    teamSource.forEach(alloc => {
        const v = (alloc.vung || alloc.khu_vuc || '').toLowerCase();
        const regMatch = regionalOverview
            ? true
            : v.includes(regionName.toLowerCase())
                || (regionCode && v.includes(regionCode.toLowerCase()));

        const departmentCode = (alloc.ma_oc || '').toUpperCase();
        const isGMD = departmentCode === 'GMD';
        if (regMatch && isGMD && alloc.ho_ten && !isPlaceholder(alloc.ma_nhan_vien)) {
            const employeeKey = String(alloc.ma_nhan_vien || alloc.ho_ten);
            if (!regionalTeam.has(employeeKey)) {
                regionalTeam.set(employeeKey, {
                    name: alloc.ho_ten,
                    title: alloc.chuc_danh || '',
                });
            }
        }
    });

    const teamMembers = [...regionalTeam.values()];
    const leaders = teamMembers.filter(member =>
        member.title.toLowerCase().includes('giám đốc')
    ).sort((a, b) => {
        const aIsDeputy = a.title.toLowerCase().includes('phó');
        const bIsDeputy = b.title.toLowerCase().includes('phó');
        return Number(aIsDeputy) - Number(bIsDeputy);
    });
    const primaryLeader = leaders[0] || null;
    const orderedMembers = primaryLeader
        ? [
            primaryLeader,
            ...teamMembers.filter(member => member !== primaryLeader),
        ]
        : teamMembers;

    const execLeaderEl = document.getElementById('layer2-exec-leader');
    const execMembersEl = document.getElementById('layer2-exec-members');

    if (execLeaderEl) {
        execLeaderEl.innerText = primaryLeader?.title || 'Chưa có dữ liệu lãnh đạo';
    }
    if (execMembersEl) {
        execMembersEl.innerHTML = orderedMembers.length
            ? orderedMembers.slice(0, 4).map(member => escapeHtml(member.name)).join('<br>')
            : 'Chưa có dữ liệu nhân sự';
    }

    const regionProjects = (state.projects || []).filter(p => {
        const k = p.khu_vuc || '';
        return k.toLowerCase().includes(regionName.toLowerCase()) || (regionCode && k.includes(regionCode));
    });

    const employeeCodes = new Set(
        fallbackAllocations
            .filter(alloc => alloc.ho_ten && !isPlaceholder(alloc.ma_nhan_vien))
            .map(alloc => String(alloc.ma_nhan_vien || alloc.ho_ten))
    );
    const headcount = Number.isFinite(Number(regionalOverview?.headcount))
        ? Number(regionalOverview.headcount)
        : employeeCodes.size;
    document.getElementById('layer2-exec-headcount').innerText = headcount;

    const categories = {
        research: [],
        design: [],
        construction: [],
        handover: [],
        divestment: []
    };

    if (regionProjects.length === 0) {
        categories.research = [
            { ma_du_an: 'DEMO1', ten_du_an: '104 Nguyễn Văn Cừ' },
            { ma_du_an: 'DEMO2', ten_du_an: '2600 Hà Bình Chánh' },
            { ma_du_an: 'DEMO3', ten_du_an: '2Bis Ntmk Cái Mếp' },
            { ma_du_an: 'DEMO4', ten_du_an: '2Bis Ntmk Nam Phong' },
            { ma_du_an: 'DEMO5', ten_du_an: 'Dự Án 0,4 Ha, Đường 12 Ấp Bình Khánh' }
        ];
        categories.design = [
            { ma_du_an: 'DEMO6', ten_du_an: '136 Lct' },
            { ma_du_an: 'DEMO7', ten_du_an: '136 Thạnh Mỹ Lợi' },
            { ma_du_an: 'DEMO8', ten_du_an: '18 Nguyễn Văn Trỗi' },
            { ma_du_an: 'DEMO9', ten_du_an: '299 Tôn Thất Thuyết' }
        ];
        categories.construction = [
            { ma_du_an: 'DEMO10', ten_du_an: 'Grand Manhattan' },
            { ma_du_an: 'DEMO11', ten_du_an: 'Park Avenue' },
            { ma_du_an: 'DEMO12', ten_du_an: 'Sunrise Garden Cần Giờ' },
            { ma_du_an: 'DEMO13', ten_du_an: 'Sunrise Riverside' },
            { ma_du_an: 'DEMO14', ten_du_an: 'Victoria Village' }
        ];
        categories.handover = [
            { ma_du_an: 'DEMO15', ten_du_an: '19 Lê Quý Đôn' },
            { ma_du_an: 'DEMO16', ten_du_an: 'Botanica Premier' },
            { ma_du_an: 'DEMO17', ten_du_an: 'Galaxy 9' },
            { ma_du_an: 'DEMO18', ten_du_an: 'Garden Gate' },
            { ma_du_an: 'DEMO19', ten_du_an: 'Golden Mansion' }
        ];
        categories.divestment = [
            { ma_du_an: 'DEMO20', ten_du_an: '14B Trần Ngọc Diện' },
            { ma_du_an: 'DEMO21', ten_du_an: '232 Đỗ Xuân Hợp' },
            { ma_du_an: 'DEMO22', ten_du_an: 'Chung Cư Hoàng Kim' },
            { ma_du_an: 'DEMO23', ten_du_an: 'Saigon Broadway' }
        ];
    } else {
        regionProjects.forEach((p, idx) => {
            const st = (
                p.hien_trang_dau_tu || p.nhom_du_an || ''
            ).toLowerCase();
            if (st.includes('nghiên cứu') || st.includes('chuẩn bị')) {
                categories.research.push(p);
            } else if (st.includes('thiết kế') || st.includes('đã mua')) {
                categories.design.push(p);
            } else if (st.includes('xây dựng') || st.includes('thi công')) {
                categories.construction.push(p);
            } else if (st.includes('bàn giao') || st.includes('hoàn thành')) {
                categories.handover.push(p);
            } else if (st.includes('thoái vốn') || st.includes('dừng')) {
                categories.divestment.push(p);
            } else {
                const mod = idx % 5;
                if (mod === 0) categories.research.push(p);
                else if (mod === 1) categories.design.push(p);
                else if (mod === 2) categories.construction.push(p);
                else if (mod === 3) categories.handover.push(p);
                else categories.divestment.push(p);
            }
        });
    }

    const renderCol = (list, colId, countId) => {
        document.getElementById(countId).innerText = list.length;
        const el = document.getElementById(colId);
        if (!el) return;
        el.innerHTML = list.map((item, i) => `
            <div class="project-kanban-item" onclick="selectOverviewProject('${item.ma_du_an}')">
                ${String(i + 1).padStart(2, '0')}. ${item.ten_du_an || item.ten_thuong_mai || item.ma_du_an}
            </div>
        `).join('');
    };

    renderCol(categories.research, 'list-research', 'count-research');
    renderCol(categories.design, 'list-design', 'count-design');
    renderCol(categories.construction, 'list-construction', 'count-construction');
    renderCol(categories.handover, 'list-handover', 'count-handover');
    renderCol(categories.divestment, 'list-divestment', 'count-divestment');
}

async function selectOverviewProject(projectCode) {
    showOverviewLayer(3);
    
    let p = (state.projects || []).find(item => item.ma_du_an === projectCode);
    if (!p) {
        try {
            const res = await fetch(`${API_URL}/projects/${projectCode}`);
            if (res.ok) p = await res.json();
        } catch (e) {
            console.error('Fetch project detail error:', e);
        }
    }

    const name = p?.ten_thuong_mai || p?.ten_phap_ly || p?.ten_du_an || projectCode;
    document.getElementById('l3-project-name').innerText = name;
    document.getElementById('l3-ten-phap-ly').innerText = p?.ten_phap_ly || name;
    document.getElementById('l3-ten-thuong-mai').innerText = p?.ten_thuong_mai || name;
    document.getElementById('l3-chu-dau-tu').innerText = p?.chu_dau_tu || 'Công ty TNHH Bất động sản Đà Lạt Valley';
    document.getElementById('l3-quy-mo').innerText = p?.tong_dien_tich_ha ? `${p.tong_dien_tich_ha} ha` : '85.08 ha';
    document.getElementById('l3-so-luong').innerText = p?.so_luong_san_pham ? `${p.so_luong_san_pham} căn NOTM` : '2586 căn NOTM';
    document.getElementById('l3-dia-diem').innerText = p?.dia_diem_du_an || p?.khu_vuc || 'Phường Long Hưng, Thành phố Đồng Nai';
    
    if (p?.nguon_goc_du_an) {
        document.getElementById('l3-nguon-goc').innerText = p.nguon_goc_du_an;
    }
}

async function renderProjectOverviewDashboard() {
    if (!state.projects || state.projects.length === 0) {
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (res.ok) {
                state.projects = await res.json();
            }
        } catch (e) {
            console.error('Fetch projects error:', e);
        }
    }
    renderOverviewLayer1();
}

/* ==========================================================================
   PROJECT COMMAND CENTER V2
   Cấu hình khu vực từ database, không dùng dữ liệu demo/hard-code khi hiển thị.
   Các declaration bên dưới thay thế implementation dashboard thử nghiệm phía trên.
   ========================================================================== */

function safeAreaColor(value) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : '#0f766e';
}

function findManagementRegion(regionCode) {
    for (const area of state.managementAreas || []) {
        const region = (area.regions || []).find(item => item.region_code === regionCode);
        if (region) return { area, region };
    }
    return null;
}

function getRegionLeader(region) {
    const leaders = (region?.team || []).filter(member =>
        String(member.chuc_danh || '').toLowerCase().includes('giám đốc')
    );
    leaders.sort((a, b) => {
        const aDeputy = String(a.chuc_danh || '').toLowerCase().includes('phó');
        const bDeputy = String(b.chuc_danh || '').toLowerCase().includes('phó');
        return Number(aDeputy) - Number(bDeputy);
    });
    return leaders[0] || (region?.team || [])[0] || null;
}

async function loadManagementAreas(force = false) {
    if (!force && state.managementAreas?.length) return state.managementAreas;
    try {
        const response = await fetch(`${API_URL}/overview/areas`);
        if (!response.ok) return [];
        state.managementAreas = await response.json();
        return state.managementAreas;
    } catch (error) {
        console.error('Không thể tải cấu hình khu vực:', error);
        return [];
    }
}

function showOverviewLayer(layerNum) {
    document.querySelectorAll('#tab-project-overview .overview-layer').forEach(layer => {
        layer.hidden = true;
    });
    const targetLayer = document.getElementById(`overview-layer-${layerNum}`);
    if (targetLayer) targetLayer.hidden = false;
    document.querySelector('#tab-project-overview .overview-stage')
        ?.classList.toggle('is-drilldown', layerNum > 1);
    document.getElementById('tab-project-overview')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
    });
}

function renderOverviewLayer1() {
    showOverviewLayer(1);
    const container = document.getElementById('management-areas-container');
    if (!container) return;

    const areas = state.managementAreas || [];
    const allRegionRecords = areas.flatMap(area =>
        (area.regions || []).map(region => ({ area, region }))
    );
    document.getElementById('overview-kpi-areas').innerText = areas.length;
    document.getElementById('overview-kpi-regions').innerText = allRegionRecords.length;
    document.getElementById('overview-kpi-projects').innerText = areas.reduce(
        (total, area) => total + Number(area.project_count || 0), 0
    ).toLocaleString('vi-VN');
    document.getElementById('overview-kpi-headcount').innerText = areas.reduce(
        (total, area) => total + Number(area.headcount || 0), 0
    ).toLocaleString('vi-VN');
    const overviewSubtitle = document.getElementById('overview-section-subtitle');
    if (overviewSubtitle) {
        overviewSubtitle.innerText = `Hiển thị toàn bộ ${areas.length} Khu vực và ${allRegionRecords.length} Vùng trực thuộc.`;
    }

    if (!areas.length) {
        container.innerHTML = `
            <div class="overview-empty">
                <i class="bx bx-map-pin"></i>
                <strong>Chưa có cấu hình khu vực</strong>
                <span>Kiểm tra kết nối dữ liệu hoặc mở trang Quản lý khu vực.</span>
            </div>`;
        return;
    }

    state.selectedOverviewAreaCode = 'ALL';

    const areaLeadership = area => [
        area.director_name && `GĐ: ${area.director_name}`,
        area.deputy_director_name && `PGĐ: ${area.deputy_director_name}`,
    ].filter(Boolean).join(' · ');

    const renderRegionTile = (region, area) => {
        const leader = getRegionLeader(region);
        return `
            <button class="region-command-tile" type="button"
                data-region-code="${escapeHtml(region.region_code)}"
                style="--region-accent:${safeAreaColor(area.accent_color)}"
                onclick="selectOverviewRegionByCode(this.dataset.regionCode)">
                <div class="region-tile-top">
                    <span class="region-tile-code">${escapeHtml(region.region_code)}</span>
                    <i class="bx bx-right-arrow-alt"></i>
                </div>
                <h4>${escapeHtml(region.short_name || region.region_name)}</h4>
                <p>${escapeHtml(leader?.ho_ten || 'Chưa có nhân sự GMD')}</p>
                <div class="region-tile-footer">
                    <span><i class="bx bx-buildings"></i>${Number(region.project_count || 0)} dự án</span>
                    <span><i class="bx bx-user"></i>${Number(region.headcount || 0)} NS</span>
                </div>
            </button>`;
    };

    const areaColumns = areas.map(area => {
        const regions = area.regions || [];
        const leadership = areaLeadership(area);
        return `
            <article class="management-area-lane"
                style="--area-accent:${safeAreaColor(area.accent_color)}">
                <header class="management-area-lane-header">
                    <div class="management-area-lane-top">
                        <span class="area-number">${escapeHtml(area.area_code)}</span>
                        <span class="management-area-lane-projects">
                            <strong>${Number(area.project_count || 0).toLocaleString('vi-VN')}</strong>
                            <small>dự án</small>
                        </span>
                    </div>
                    <div class="management-area-lane-title">
                        <h3>${escapeHtml(area.area_name)}</h3>
                        <span>${regions.length} Vùng</span>
                    </div>
                    <p>${escapeHtml(area.area_scope || 'Chưa cấu hình phạm vi')}</p>
                </header>
                <div class="management-area-lane-leadership ${leadership ? '' : 'is-empty'}">
                    <i class="bx bx-user-voice"></i>
                    <span>${escapeHtml(leadership || 'Chưa cấu hình Giám đốc / Phó Giám đốc khu vực')}</span>
                </div>
                <div class="management-area-lane-regions">
                    ${regions.map(region => renderRegionTile(region, area)).join('')}
                </div>
            </article>`;
    }).join('');

    container.innerHTML = `
        <div class="management-areas-all-grid" aria-label="Toàn bộ Khu vực và Vùng trực thuộc">
            ${areaColumns}
        </div>`;
}

function selectOverviewArea(areaCode) {
    if (areaCode !== 'ALL' && !state.managementAreas?.some(area => area.area_code === areaCode)) return;
    state.selectedOverviewAreaCode = areaCode;
    renderOverviewLayer1();
}

function selectOverviewRegionByCode(regionCode) {
    const selected = findManagementRegion(regionCode);
    if (!selected) {
        showToast('Không tìm thấy cấu hình vùng dự án!', true);
        return;
    }
    state.selectedOverviewRegion = selected.region;
    renderOverviewLayer2(selected.region, selected.area);
}

function projectStatusBucket(project) {
    const status = String(project.hien_trang_dau_tu || '').toLowerCase();
    if (status.includes('nghiên cứu')) return 'research';
    if (status.includes('thiết kế') || status.includes('đã mua')) return 'design';
    if (status.includes('xây dựng') || status.includes('thi công')) return 'construction';
    if (
        status.includes('bàn giao')
        || status.includes('hoàn thành')
        || status.includes('vận hành')
        || status.includes('hoạt động')
    ) return 'handover';
    if (
        status.includes('thoái vốn')
        || status.includes('đóng cửa')
        || status.includes('dừng')
    ) return 'divestment';
    return 'research';
}

function renderKanbanColumn(items, columnId, countId) {
    const count = document.getElementById(countId);
    const container = document.getElementById(columnId);
    if (count) count.innerText = items.length;
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<div class="kanban-empty">Không có dự án</div>';
        return;
    }
    container.innerHTML = items.map(project => `
        <button class="project-kanban-item" type="button"
            data-project-code="${escapeHtml(project.ma_du_an)}"
            onclick="selectOverviewProject(this.dataset.projectCode)">
            <span class="project-kanban-code">${escapeHtml(project.ma_du_an)}</span>
            <strong>${escapeHtml(
                project.ten_thuong_mai
                || project.ten_phap_ly
                || project.ten_du_an
                || project.ma_du_an
            )}</strong>
            <i class="bx bx-chevron-right"></i>
        </button>
    `).join('');
}

function renderOverviewLayer2(region, area = null) {
    showOverviewLayer(2);
    state.selectedOverviewRegion = region;
    const regionTitle = `BAN ĐIỀU HÀNH DỰ ÁN ${String(region.region_name).toUpperCase()}`;
    document.getElementById('layer2-region-title').innerText = regionTitle;
    document.getElementById('layer2-exec-title').innerText = regionTitle;
    document.getElementById('layer2-region-code').innerText = region.region_code;
    document.getElementById('layer2-project-count').innerText = Number(
        region.project_count || 0
    ).toLocaleString('vi-VN');
    document.getElementById('layer2-exec-headcount').innerText = Number(
        region.headcount || 0
    ).toLocaleString('vi-VN');

    const leader = getRegionLeader(region);
    document.getElementById('layer2-exec-leader').innerText =
        leader?.chuc_danh || 'Chưa có dữ liệu lãnh đạo OC GMD';
    document.getElementById('layer2-exec-members').innerHTML = (region.team || []).length
        ? (region.team || []).map(member => `
            <span>
                <strong>${escapeHtml(member.ho_ten)}</strong>
                <small>${escapeHtml(member.chuc_danh || 'Chưa cập nhật chức danh')}</small>
            </span>`).join('')
        : '<span class="org-member-empty">Chưa có nhân sự mã OC GMD</span>';

    const regionName = String(region.region_name || '').toLowerCase();
    const projects = (state.projects || []).filter(project =>
        String(project.khu_vuc || '').toLowerCase().includes(regionName)
    );
    const buckets = {
        research: [], design: [], construction: [], handover: [], divestment: [],
    };
    projects.forEach(project => buckets[projectStatusBucket(project)].push(project));
    const columns = [
        ['research', 'list-research', 'count-research'],
        ['design', 'list-design', 'count-design'],
        ['construction', 'list-construction', 'count-construction'],
        ['handover', 'list-handover', 'count-handover'],
        ['divestment', 'list-divestment', 'count-divestment'],
    ];
    columns.forEach(([bucket, listId, countId]) => {
        buckets[bucket].sort((a, b) => String(a.ten_du_an || '').localeCompare(
            String(b.ten_du_an || ''), 'vi'
        ));
        renderKanbanColumn(buckets[bucket], listId, countId);
    });

    document.getElementById('layer3-back-label').innerText =
        region.short_name || region.region_name;
}

function masterEntryCompletion(entry, config) {
    const values = entry?.values || {};
    const editableHeaders = (config?.headers || []).filter(header => header !== 'Mã dự án');
    if (!editableHeaders.length) return 0;
    const completed = editableHeaders.filter(header =>
        String(values[header] ?? '').trim()
    ).length;
    return Math.round((completed / editableHeaders.length) * 100);
}

function firstMasterValue(values, keys) {
    for (const key of keys) {
        const value = String(values?.[key] ?? '').trim();
        if (value) return value;
    }
    return '';
}

function formatProjectDate(value) {
    const text = String(value || '').trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00)?$/);
    if (!isoMatch) return text;
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
}

function overviewDepartmentGroups() {
    const grouped = new Map();
    (state.masterdataConfig || []).forEach(config => {
        if (!/^(9\.[1-9]|4\.[1-4])\b/.test(config.nhom)) return;
        if (!grouped.has(config.nhom)) grouped.set(config.nhom, []);
        grouped.get(config.nhom).push(config);
    });
    return [...grouped.entries()].map(([code, configs]) => ({
        code,
        configs,
        type: code.startsWith('9.') ? 'Phòng gián tiếp' : 'Phòng trực tiếp',
        name: [...new Set(configs.map(config => config.phan_nhom))].join(' / '),
        sort: Math.min(...configs.map(config => Number(config.sort_colum || 999))),
    })).sort((a, b) => a.sort - b.sort);
}

function renderOverviewDepartmentSelector() {
    const groups = overviewDepartmentGroups();
    const chips = document.getElementById('l3-department-chips');
    if (!chips || !groups.length) return;
    if (!groups.some(group => group.code === state.selectedOverviewDepartment)) {
        state.selectedOverviewDepartment = groups[0].code;
    }
    const indirect = groups.filter(group => group.type === 'Phòng gián tiếp');
    const direct = groups.filter(group => group.type === 'Phòng trực tiếp');
    const renderGroup = (label, items) => `
        <div class="department-chip-group">
            <span class="department-chip-group-label">${label}</span>
            <div class="department-chip-list" role="tablist" aria-label="${label}">
                ${items.map(group => `
                    <button class="department-chip${group.code === state.selectedOverviewDepartment ? ' is-active' : ''}"
                            type="button" role="tab"
                            aria-selected="${group.code === state.selectedOverviewDepartment}"
                            title="${escapeHtml(`${group.code} · ${group.name}`)}"
                            data-department-code="${escapeHtml(group.code)}"
                            onclick="selectOverviewDepartment(this.dataset.departmentCode)">
                        ${escapeHtml(group.code)} · ${escapeHtml(group.name)}
                    </button>`).join('')}
            </div>
        </div>`;
    chips.innerHTML = `${renderGroup('9 Phòng Ban gián tiếp', indirect)}${renderGroup('4 Phòng Ban trực tiếp', direct)}`;
}

function selectOverviewDepartment(departmentCode) {
    state.selectedOverviewDepartment = departmentCode || '9.1 HRC';
    renderOverviewDepartmentSelector();
    renderProjectDetailTable();
}

function renderProjectDetailTable() {
    const department = overviewDepartmentGroups()
        .find(group => group.code === state.selectedOverviewDepartment);
    const configs = department?.configs || [];
    const sheets = new Set(configs.map(config => config.sheet));
    const rows = (state.overviewProjectEntries || [])
        .filter(entry => sheets.has(entry.source_sheet));
    const headers = [];
    configs.forEach(config => config.headers
        .filter(header => header !== 'Mã dự án')
        .forEach(header => {
            if (!headers.includes(header)) headers.push(header);
        }));
    const fieldLabels = Object.assign({}, ...configs.map(config => config.field_labels || {}));
    const tableHead = document.getElementById('l3-details-table-head');
    const body = document.getElementById('l3-details-table-body');
    const columnCount = Math.max(headers.length + 1, 1);
    tableHead.innerHTML = `<tr><th>STT</th>${headers.map(header =>
        `<th>${escapeHtml(fieldLabels[header] || header)}</th>`
    ).join('')}</tr>`;
    document.getElementById('l3-detail-count').innerText =
        `${rows.length.toLocaleString('vi-VN')} mục`;
    if (!rows.length) {
        body.innerHTML = `
            <tr><td colspan="${columnCount}" class="no-data">
                <i class="bx bx-data"></i> Phòng ban này chưa có dữ liệu chi tiết.
            </td></tr>`;
        return;
    }
    body.innerHTML = rows.map((entry, index) => `
        <tr>
            <td><span class="detail-row-number">${index + 1}</span></td>
            ${headers.map(header => {
                let value = entry.values?.[header] || '';
                if (header === 'Ngày hoàn thành' || header === 'Ngày tổ chức') {
                    value = formatProjectDate(value);
                }
                return `<td>${escapeHtml(value || '—')}</td>`;
            }).join('')}
        </tr>
    `).join('');
}

async function selectOverviewProject(projectCode) {
    showOverviewLayer(3);
    state.selectedOverviewProject = projectCode;
    state.selectedOverviewDepartment = '9.1 HRC';
    state.overviewProjectEntries = [];
    document.getElementById('l3-project-name').innerText = 'Đang tải dự án...';
    document.getElementById('l3-profile-completeness').innerText = '0/7';
    document.getElementById('l3-masterdata-count').innerText = '0 mục';
    document.getElementById('l3-details-table-body').innerHTML =
        '<tr><td colspan="7" class="no-data"><i class="bx bx-loader-alt bx-spin"></i> Đang tải master data...</td></tr>';

    let project = (state.projects || []).find(item => item.ma_du_an === projectCode);
    try {
        const requests = [
            project
                ? Promise.resolve(null)
                : fetch(`${API_URL}/projects/${encodeURIComponent(projectCode)}`),
            fetch(`${API_URL}/masterdata/entries?project_code=${encodeURIComponent(projectCode)}`),
        ];
        const [projectResponse, entriesResponse] = await Promise.all(requests);
        if (projectResponse?.ok) project = await projectResponse.json();
        const entries = entriesResponse.ok ? await entriesResponse.json() : [];
        if (!state.masterdataConfig?.length) await loadMasterdataConfig();

        const displayName = project?.ten_thuong_mai
            || project?.ten_phap_ly
            || project?.ten_du_an
            || projectCode;
        const setText = (id, value, fallback = '—') => {
            const element = document.getElementById(id);
            if (element) element.innerText = String(value || fallback);
        };
        setText('l3-project-name', displayName);
        setText('l3-project-code', project?.ma_du_an);
        setText('l3-project-status', project?.hien_trang_dau_tu, 'Chưa phân loại');
        setText('l3-project-region', project?.khu_vuc);
        const overviewQuality = getProjectDataQuality(project || {});
        setText(
            'l3-profile-completeness',
            `${overviewQuality.score}/${PROJECT_OVERVIEW_FIELDS.length}`
        );
        setText(
            'l3-masterdata-count',
            `${entries.length.toLocaleString('vi-VN')} mục`
        );
        setText('l3-ten-phap-ly', project?.ten_phap_ly || project?.ten_du_an);
        setText('l3-ten-thuong-mai', project?.ten_thuong_mai);
        setText('l3-chu-dau-tu', project?.chu_dau_tu);
        setText('l3-loai-hinh', project?.loai_hinh);
        setText(
            'l3-quy-mo',
            project?.tong_dien_tich_ha ? `${project.tong_dien_tich_ha} ha` : ''
        );
        setText(
            'l3-so-luong',
            project?.so_luong_san_pham
                ? `${project.so_luong_san_pham} sản phẩm`
                : ''
        );
        setText('l3-dia-diem', project?.dia_diem_du_an || project?.khu_vuc);
        const originText = String(project?.nguon_goc_du_an || '').trim();
        const originElement = document.getElementById('l3-nguon-goc');
        const originEmpty = document.getElementById('l3-nguon-goc-empty');
        if (originElement) {
            originElement.innerText = originText;
            originElement.hidden = !originText;
        }
        if (originEmpty) originEmpty.hidden = Boolean(originText);
        setText(
            'l3-current-date',
            new Intl.DateTimeFormat('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).format(new Date())
        );
        state.overviewProjectEntries = entries;
        renderOverviewDepartmentSelector();
        renderProjectDetailTable();
    } catch (error) {
        console.error('Không thể tải chi tiết dự án:', error);
        showToast('Không thể tải chi tiết dự án!', true);
    }
}

async function renderProjectOverviewDashboard() {
    showOverviewLayer(1);
    if (!state.projects?.length) {
        try {
            const response = await fetch(`${API_URL}/projects`);
            if (response.ok) state.projects = await response.json();
        } catch (error) {
            console.error('Không thể tải danh mục dự án:', error);
        }
    }
    await loadManagementAreas(true);
    renderOverviewLayer1();
}

function renderRegionManagement() {
    const container = document.getElementById('region-management-container');
    if (!container) return;
    const areas = state.managementAreas || [];
    if (!areas.length) {
        container.innerHTML = '<div class="overview-empty">Chưa có cấu hình khu vực.</div>';
        return;
    }
    container.innerHTML = areas.map(area => `
        <article class="region-config-card" style="--area-accent:${safeAreaColor(area.accent_color)}">
            <form onsubmit="saveManagementArea(event, ${escapeJsArg(area.area_code)})">
                <div class="region-config-heading">
                    <span>${escapeHtml(area.area_code)}</span>
                    <div><h3>${escapeHtml(area.area_name)}</h3><p>${(area.regions || []).length} vùng đang hoạt động</p></div>
                    <button class="btn btn-primary btn-sm" type="submit"><i class="bx bx-save"></i> Lưu khu vực</button>
                </div>
                <div class="region-config-fields">
                    <label>Tên khu vực<input class="form-control" name="area_name" value="${escapeHtml(area.area_name)}"></label>
                    <label>Phạm vi vùng<input class="form-control" name="area_scope" value="${escapeHtml(area.area_scope || '')}"></label>
                    <label>Giám đốc khu vực<input class="form-control" name="director_name" value="${escapeHtml(area.director_name || '')}"></label>
                    <label>Phó Giám đốc khu vực<input class="form-control" name="deputy_director_name" value="${escapeHtml(area.deputy_director_name || '')}"></label>
                    <label>Phụ trách Pháp lý<input class="form-control" name="legal_lead" value="${escapeHtml(area.legal_lead || '')}"></label>
                    <label>Phụ trách Đầu tư<input class="form-control" name="investment_lead" value="${escapeHtml(area.investment_lead || '')}"></label>
                    <label>Phụ trách Đối ngoại<input class="form-control" name="external_relations_lead" value="${escapeHtml(area.external_relations_lead || '')}"></label>
                </div>
            </form>
            <div class="region-config-table-wrap">
                <table class="region-config-table">
                    <thead><tr><th>Mã vùng</th><th>Tên hiển thị</th><th>Tên đối chiếu dữ liệu</th><th>Thứ tự</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        ${(area.regions || []).map(region => `
                            <tr data-region-code="${escapeHtml(region.region_code)}">
                                <td><code>${escapeHtml(region.region_code)}</code></td>
                                <td><input class="form-control js-short-name" value="${escapeHtml(region.short_name || '')}"></td>
                                <td><input class="form-control js-region-name" value="${escapeHtml(region.region_name || '')}"></td>
                                <td><input class="form-control js-sort-order" type="number" value="${Number(region.sort_order || 0)}"></td>
                                <td><button class="btn-icon" type="button" onclick="saveManagementRegion(this)"><i class="bx bx-check"></i></button></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </article>
    `).join('');
}

async function loadRegionManagement() {
    await loadManagementAreas(true);
    renderRegionManagement();
}

async function saveManagementArea(event, areaCode) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        await fetch(`${API_URL}/management/areas/${encodeURIComponent(areaCode)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        showToast(`Đã lưu cấu hình ${areaCode}.`);
        await loadRegionManagement();
    } catch (error) {
        console.error(error);
    }
}

async function saveManagementRegion(button) {
    const row = button.closest('tr');
    const regionCode = row?.dataset.regionCode;
    if (!regionCode) return;
    const payload = {
        short_name: row.querySelector('.js-short-name').value.trim(),
        region_name: row.querySelector('.js-region-name').value.trim(),
        sort_order: Number(row.querySelector('.js-sort-order').value || 0),
        is_active: 1,
    };
    try {
        await fetch(`${API_URL}/management/regions/${encodeURIComponent(regionCode)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        showToast(`Đã lưu vùng ${regionCode}.`);
        await loadRegionManagement();
    } catch (error) {
        console.error(error);
    }
}
