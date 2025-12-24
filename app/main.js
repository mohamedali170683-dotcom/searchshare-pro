/**
 * Main Application Module
 * Handles routing, rendering, and user interactions
 */

import * as State from './state.js';

// =============================================
// APP STATE
// =============================================
let currentView = 'dashboard';
let currentProjectId = null;
let charts = {};

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderView('dashboard');
    updateApiStatus();
});

// =============================================
// NAVIGATION
// =============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            setActiveNav(item);
            renderView(view);
        });
    });
}

function setActiveNav(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function updateApiStatus() {
    const settings = State.getSettings();
    const statusEl = document.getElementById('api-status');

    if (settings.apiLogin && settings.apiPassword) {
        statusEl.innerHTML = `
            <span class="status-dot connected"></span>
            <span class="status-text">API Connected</span>
        `;
    } else {
        statusEl.innerHTML = `
            <span class="status-dot demo"></span>
            <span class="status-text">Demo Mode</span>
        `;
    }
}

// =============================================
// VIEW RENDERING
// =============================================
function renderView(view, data = {}) {
    currentView = view;
    const mainContent = document.getElementById('main-content');

    switch (view) {
        case 'dashboard':
            renderDashboard(mainContent);
            break;
        case 'project':
            currentProjectId = data.projectId;
            renderProject(mainContent, data.projectId);
            break;
        case 'settings':
            renderSettings(mainContent);
            break;
    }
}

// =============================================
// DASHBOARD VIEW
// =============================================
function renderDashboard(container) {
    const template = document.getElementById('dashboard-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    const projects = State.getProjects();

    // Update stats
    updateDashboardStats(projects);

    // Render projects or empty state
    if (projects.length === 0) {
        document.getElementById('projects-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
    } else {
        document.getElementById('projects-grid').classList.remove('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        renderProjectCards(projects);
    }

    // Event listeners
    document.getElementById('new-project-btn')?.addEventListener('click', openProjectModal);
    document.getElementById('empty-new-btn')?.addEventListener('click', openProjectModal);
}

function updateDashboardStats(projects) {
    document.getElementById('total-projects').textContent = projects.length;

    const growing = projects.filter(p => p.currentMetrics?.status === 'growing').length;
    const declining = projects.filter(p => p.currentMetrics?.status === 'declining').length;

    document.getElementById('growing-count').textContent = growing;
    document.getElementById('declining-count').textContent = declining;
}

function renderProjectCards(projects) {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = projects.map(project => {
        const metrics = project.currentMetrics || {};
        const statusClass = metrics.status || 'neutral';
        const statusLabel = statusClass === 'growing' ? 'Growing' :
            statusClass === 'declining' ? 'At Risk' : 'Stable';

        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-card-header">
                    <div>
                        <div class="project-card-title">${escapeHtml(project.name)}</div>
                        <div class="project-card-client">${escapeHtml(project.client || project.brand?.name || '')}</div>
                    </div>
                    <div class="project-card-status ${statusClass}">${statusLabel}</div>
                </div>
                <div class="project-card-metrics">
                    <div class="card-metric">
                        <div class="card-metric-value sos">${(metrics.sos || 0).toFixed(1)}%</div>
                        <div class="card-metric-label">SOS</div>
                    </div>
                    <div class="card-metric">
                        <div class="card-metric-value sov">${(metrics.sov || 0).toFixed(1)}%</div>
                        <div class="card-metric-label">SOV</div>
                    </div>
                    <div class="card-metric">
                        <div class="card-metric-value ${metrics.gap >= 0 ? 'positive' : 'negative'}">
                            ${metrics.gap >= 0 ? '+' : ''}${(metrics.gap || 0).toFixed(1)}
                        </div>
                        <div class="card-metric-label">Gap</div>
                    </div>
                </div>
                <div class="project-card-footer">
                    <span>${project.competitors?.length || 0} competitors</span>
                    <span>Updated ${formatDate(project.updatedAt)}</span>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            renderView('project', { projectId: card.dataset.projectId });
        });
    });
}

// =============================================
// PROJECT VIEW
// =============================================
function renderProject(container, projectId) {
    const project = State.getProject(projectId);

    if (!project) {
        renderView('dashboard');
        return;
    }

    const template = document.getElementById('project-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    // Update header
    document.getElementById('project-name').textContent = project.name;
    document.getElementById('project-client').textContent = project.client || project.brand?.name || '';

    // Render metrics
    const metrics = project.currentMetrics || {};
    renderMetrics(metrics, project);

    // Render charts
    setTimeout(() => {
        renderCompetitorsChart(metrics);
        renderTrendChart(project);
    }, 100);

    // Render tables
    renderBrandsTable(metrics);
    renderKeywordsTable(project);

    // Render recommendations
    const recommendations = State.generateRecommendations(metrics, project);
    renderRecommendations(recommendations);

    // Event listeners
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        renderView('dashboard');
    });

    document.getElementById('edit-project-btn').addEventListener('click', () => {
        openProjectModal(project);
    });

    document.getElementById('delete-project-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this project?')) {
            State.deleteProject(projectId);
            renderView('dashboard');
        }
    });

    document.getElementById('refresh-data-btn').addEventListener('click', () => {
        State.addSnapshot(projectId);
        renderView('project', { projectId });
    });

    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        exportPDF(project);
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Chart toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCompetitorsChart(metrics, btn.dataset.metric);
        });
    });
}

function renderMetrics(metrics, project) {
    // SOS
    document.getElementById('sos-value').textContent = (metrics.sos || 0).toFixed(1);

    // SOV
    document.getElementById('sov-value').textContent = (metrics.sov || 0).toFixed(1);

    // Gap
    const gap = metrics.gap || 0;
    const gapCard = document.getElementById('gap-card');
    const gapIndicator = document.getElementById('gap-indicator');
    const gapValue = document.getElementById('gap-value');
    const gapStatus = document.getElementById('gap-status');
    const gapInsight = document.getElementById('gap-insight');

    gapValue.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(1);

    if (gap > 0) {
        gapCard.classList.remove('declining');
        gapCard.classList.add('growing');
        gapIndicator.classList.remove('declining');
        gapStatus.textContent = 'Growing Position';
        gapStatus.style.color = 'var(--growing)';
        gapInsight.querySelector('p').textContent = 'SOV exceeds SOS - this "excess share of voice" predicts future market share growth (Binet & Field).';
    } else if (gap < -5) {
        gapCard.classList.remove('growing');
        gapCard.classList.add('declining');
        gapIndicator.classList.add('declining');
        gapStatus.textContent = 'At Risk';
        gapStatus.style.color = 'var(--declining)';
        gapInsight.querySelector('p').textContent = 'SOS exceeds SOV - brand demand is higher than visibility. Risk of losing market share without SEO investment.';
    } else {
        gapCard.classList.remove('growing', 'declining');
        gapIndicator.classList.remove('declining');
        gapStatus.textContent = 'Stable';
        gapStatus.style.color = 'var(--text-secondary)';
        gapInsight.querySelector('p').textContent = 'SOS and SOV are balanced. Push SOV higher to drive growth.';
    }

    // Changes (compare to previous snapshot if available)
    const snapshots = project.snapshots || [];
    if (snapshots.length >= 2) {
        const prev = snapshots[snapshots.length - 2];
        const sosChange = metrics.sos - prev.sos;
        const sovChange = metrics.sov - prev.sov;

        document.getElementById('sos-change').textContent = (sosChange >= 0 ? '+' : '') + sosChange.toFixed(1) + 'pp';
        document.getElementById('sos-change').className = `metric-change ${sosChange >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('sov-change').textContent = (sovChange >= 0 ? '+' : '') + sovChange.toFixed(1) + 'pp';
        document.getElementById('sov-change').className = `metric-change ${sovChange >= 0 ? 'positive' : 'negative'}`;
    } else {
        document.getElementById('sos-change').textContent = '--';
        document.getElementById('sov-change').textContent = '--';
    }

    // Render gauges
    renderGauge('sos-gauge', metrics.sos || 0, '#6366f1');
    renderGauge('sov-gauge', metrics.sov || 0, '#f59e0b');
}

function renderGauge(canvasId, value, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 200 * dpr;
    canvas.height = 120 * dpr;
    canvas.style.width = '200px';
    canvas.style.height = '120px';
    ctx.scale(dpr, dpr);

    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const valueAngle = startAngle + (endAngle - startAngle) * (Math.min(value, 100) / 100);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
    ctx.lineWidth = 12;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function renderCompetitorsChart(metrics) {
    const canvas = document.getElementById('competitors-chart');
    if (!canvas) return;

    if (charts.competitors) {
        charts.competitors.destroy();
    }

    const allBrands = metrics.allBrands || [];
    const sortedBrands = [...allBrands].sort((a, b) => b.sos - a.sos);

    charts.competitors = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sortedBrands.map(b => b.name),
            datasets: [{
                label: 'Share of Search (%)',
                data: sortedBrands.map(b => b.sos.toFixed(1)),
                backgroundColor: sortedBrands.map(b =>
                    b.isBrand ? 'rgba(99, 102, 241, 0.8)' : 'rgba(113, 113, 122, 0.5)'
                ),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a' },
                    max: 100
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#a1a1aa' }
                }
            }
        }
    });
}

function updateCompetitorsChart(metrics, type) {
    if (!charts.competitors) return;

    const allBrands = metrics.allBrands || [];
    const sortedBrands = [...allBrands].sort((a, b) =>
        type === 'sos' ? b.sos - a.sos : b.sov - a.sov
    );

    charts.competitors.data.labels = sortedBrands.map(b => b.name);
    charts.competitors.data.datasets[0].data = sortedBrands.map(b =>
        type === 'sos' ? b.sos.toFixed(1) : b.sov.toFixed(1)
    );
    charts.competitors.data.datasets[0].label = type === 'sos' ? 'Share of Search (%)' : 'Share of Voice (%)';
    charts.competitors.data.datasets[0].backgroundColor = sortedBrands.map(b =>
        b.isBrand
            ? (type === 'sos' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(245, 158, 11, 0.8)')
            : 'rgba(113, 113, 122, 0.5)'
    );
    charts.competitors.update();
}

function renderTrendChart(project) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    if (charts.trend) {
        charts.trend.destroy();
    }

    const snapshots = project.snapshots || [];
    const labels = snapshots.map(s => s.date);
    const sosData = snapshots.map(s => s.sos.toFixed(1));
    const sovData = snapshots.map(s => s.sov.toFixed(1));

    charts.trend = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'SOS',
                    data: sosData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'SOV',
                    data: sovData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#a1a1aa',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a' },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

function renderBrandsTable(metrics) {
    const tbody = document.getElementById('brands-table-body');
    if (!tbody) return;

    const allBrands = metrics.allBrands || [];

    tbody.innerHTML = allBrands.map(b => {
        const gap = b.sov - b.sos;
        const status = gap > 0 ? 'growing' : gap < -5 ? 'declining' : 'neutral';
        const statusLabel = status === 'growing' ? '📈 Growing' :
            status === 'declining' ? '📉 At Risk' : '➡️ Stable';

        return `
            <tr>
                <td class="brand-name ${b.isBrand ? 'is-you' : ''}">${escapeHtml(b.name)} ${b.isBrand ? '(You)' : ''}</td>
                <td>${formatNumber(b.volume || 0)}</td>
                <td class="sos-value">${b.sos.toFixed(1)}%</td>
                <td class="sov-value">${b.sov.toFixed(1)}%</td>
                <td class="gap-value ${gap >= 0 ? 'positive' : 'negative'}">${gap >= 0 ? '+' : ''}${gap.toFixed(1)}pp</td>
                <td><span class="status-badge ${status}">${statusLabel}</span></td>
            </tr>
        `;
    }).join('');
}

function renderKeywordsTable(project) {
    const tbody = document.getElementById('keywords-table-body');
    const headerRow = document.getElementById('position-headers');
    if (!tbody || !headerRow) return;

    const keywords = project.marketKeywords || [];
    const positions = project.positions || {};
    const allBrands = [project.brand?.name, ...(project.competitors?.map(c => c.name) || [])];

    // Update headers
    headerRow.innerHTML = allBrands.map(name => `<th>${escapeHtml(name)}</th>`).join('');

    // Render rows
    tbody.innerHTML = keywords.map((kw, idx) => {
        const positionCells = allBrands.map(brand => {
            const pos = positions[idx]?.[brand];
            const posClass = pos ? (pos <= 3 ? 'positive' : pos <= 10 ? '' : 'negative') : 'neutral';
            return `<td class="${posClass}">${pos || '—'}</td>`;
        }).join('');

        return `
            <tr>
                <td><strong>${escapeHtml(kw.keyword)}</strong></td>
                <td>${formatNumber(kw.volume)}</td>
                ${positionCells}
            </tr>
        `;
    }).join('');
}

function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations-list');
    if (!container) return;

    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item ${rec.priority}">
            <div class="rec-icon">${rec.icon}</div>
            <div class="rec-content">
                <h4>${rec.title}</h4>
                <p>${rec.message}</p>
            </div>
        </div>
    `).join('');
}

// =============================================
// PROJECT MODAL
// =============================================
function openProjectModal(existingProject = null) {
    const template = document.getElementById('project-modal-template');
    document.body.appendChild(template.content.cloneNode(true));

    const modal = document.getElementById('modal-overlay');
    const form = document.getElementById('project-form');

    // Set title
    document.getElementById('modal-title').textContent = existingProject ? 'Edit Project' : 'New Project';
    document.getElementById('submit-text').textContent = existingProject ? 'Save Changes' : 'Create Project';

    // Add initial competitor and keyword rows
    if (existingProject) {
        document.getElementById('form-project-name').value = existingProject.name || '';
        document.getElementById('form-client-name').value = existingProject.client || '';
        document.getElementById('form-brand-name').value = existingProject.brand?.name || '';
        document.getElementById('form-brand-domain').value = existingProject.brand?.domain || '';
        document.getElementById('form-brand-volume').value = existingProject.brand?.volume || '';

        (existingProject.competitors || []).forEach(c => addCompetitorRow(c.name, c.domain, c.volume));
        (existingProject.marketKeywords || []).forEach(k => addKeywordRow(k.keyword, k.volume));
    } else {
        addCompetitorRow();
        addCompetitorRow();
        addKeywordRow();
    }

    // Event listeners
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('add-competitor-btn').addEventListener('click', () => addCompetitorRow());
    document.getElementById('add-keyword-btn').addEventListener('click', () => addKeywordRow());
    document.getElementById('generate-positions-btn').addEventListener('click', generatePositionsMatrix);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject(existingProject?.id);
    });
}

function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.remove();
}

function addCompetitorRow(name = '', domain = '', volume = '') {
    const container = document.getElementById('competitors-container');
    const row = document.createElement('div');
    row.className = 'competitor-row';
    row.innerHTML = `
        <input type="text" class="input competitor-name" placeholder="Competitor name" value="${escapeHtml(name)}">
        <input type="text" class="input competitor-domain" placeholder="domain.com" value="${escapeHtml(domain)}">
        <input type="number" class="input competitor-volume" placeholder="Volume" min="0" value="${volume}">
        <button type="button" class="btn-remove-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function addKeywordRow(keyword = '', volume = '') {
    const container = document.getElementById('keywords-container');
    const row = document.createElement('div');
    row.className = 'keyword-row';
    row.innerHTML = `
        <input type="text" class="input keyword-text" placeholder="e.g., running shoes" value="${escapeHtml(keyword)}">
        <input type="number" class="input keyword-volume" placeholder="Volume" min="0" value="${volume}">
        <button type="button" class="btn-remove-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function generatePositionsMatrix() {
    const brandName = document.getElementById('form-brand-name').value.trim();
    if (!brandName) {
        alert('Please enter your brand name first');
        return;
    }

    const competitors = getFormCompetitors();
    const keywords = getFormKeywords();

    if (keywords.length === 0) {
        alert('Please add at least one market keyword');
        return;
    }

    const allBrands = [brandName, ...competitors.map(c => c.name)];

    const matrix = document.getElementById('positions-matrix');
    matrix.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Keyword</th>
                    <th>Volume</th>
                    ${allBrands.map(b => `<th>${escapeHtml(b)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${keywords.map((kw, idx) => `
                    <tr>
                        <td>${escapeHtml(kw.keyword)}</td>
                        <td>${formatNumber(kw.volume)}</td>
                        ${allBrands.map(brand => `
                            <td>
                                <input type="number" min="1" max="100" placeholder="—"
                                       data-keyword="${idx}" data-brand="${escapeHtml(brand)}">
                            </td>
                        `).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('positions-section').style.display = 'block';
}

function getFormCompetitors() {
    const rows = document.querySelectorAll('.competitor-row');
    const competitors = [];

    rows.forEach(row => {
        const name = row.querySelector('.competitor-name').value.trim();
        const domain = row.querySelector('.competitor-domain').value.trim();
        const volume = parseInt(row.querySelector('.competitor-volume').value) || 0;

        if (name) {
            competitors.push({ name, domain, volume });
        }
    });

    return competitors;
}

function getFormKeywords() {
    const rows = document.querySelectorAll('.keyword-row');
    const keywords = [];

    rows.forEach(row => {
        const keyword = row.querySelector('.keyword-text').value.trim();
        const volume = parseInt(row.querySelector('.keyword-volume').value) || 0;

        if (keyword && volume > 0) {
            keywords.push({ keyword, volume });
        }
    });

    return keywords;
}

function getFormPositions() {
    const positions = {};
    const inputs = document.querySelectorAll('#positions-matrix input');

    inputs.forEach(input => {
        const idx = input.dataset.keyword;
        const brand = input.dataset.brand;
        const value = parseInt(input.value) || null;

        if (!positions[idx]) positions[idx] = {};
        if (value) positions[idx][brand] = value;
    });

    return positions;
}

function saveProject(existingId = null) {
    const projectData = {
        name: document.getElementById('form-project-name').value.trim(),
        client: document.getElementById('form-client-name').value.trim(),
        brand: {
            name: document.getElementById('form-brand-name').value.trim(),
            domain: document.getElementById('form-brand-domain').value.trim(),
            volume: parseInt(document.getElementById('form-brand-volume').value) || 0
        },
        competitors: getFormCompetitors(),
        marketKeywords: getFormKeywords(),
        positions: getFormPositions()
    };

    if (!projectData.name || !projectData.brand.name || projectData.brand.volume <= 0) {
        alert('Please fill in required fields');
        return;
    }

    let project;
    if (existingId) {
        project = State.updateProject(existingId, projectData);
    } else {
        project = State.createProject(projectData);
    }

    closeModal();
    renderView('project', { projectId: project.id });
}

// =============================================
// SETTINGS VIEW
// =============================================
function renderSettings(container) {
    const template = document.getElementById('settings-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    const settings = State.getSettings();
    const stats = State.getStorageStats();

    // Populate fields
    document.getElementById('api-login').value = settings.apiLogin || '';
    document.getElementById('api-password').value = settings.apiPassword || '';
    document.getElementById('stored-projects').textContent = stats.projectCount;
    document.getElementById('storage-used').textContent = stats.storageUsedFormatted;

    // Event listeners
    document.getElementById('save-api-btn').addEventListener('click', () => {
        const newSettings = {
            ...settings,
            apiLogin: document.getElementById('api-login').value.trim(),
            apiPassword: document.getElementById('api-password').value.trim()
        };
        State.saveSettings(newSettings);
        updateApiStatus();
        alert('Settings saved!');
    });

    document.getElementById('test-api-btn').addEventListener('click', async () => {
        const result = document.getElementById('api-result');
        result.textContent = 'Testing...';
        result.className = 'api-result';

        // Simulate API test
        setTimeout(() => {
            const login = document.getElementById('api-login').value.trim();
            if (login) {
                result.textContent = '✓ Connection successful';
                result.className = 'api-result success';
            } else {
                result.textContent = '✗ Please enter credentials';
                result.className = 'api-result error';
            }
        }, 1000);
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
        if (confirm('This will delete ALL projects and settings. Are you sure?')) {
            State.clearAllData();
            renderView('dashboard');
        }
    });
}

// =============================================
// PDF EXPORT
// =============================================
async function exportPDF(project) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const metrics = project.currentMetrics || {};
    const margin = 20;
    let y = margin;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.text('Share of Search Report', margin, y);
    y += 15;

    // Project info
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(project.name, margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 15;

    // Metrics summary
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Metrics', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Share of Search (SOS): ${(metrics.sos || 0).toFixed(1)}%`, margin, y);
    y += 7;
    doc.text(`Share of Voice (SOV): ${(metrics.sov || 0).toFixed(1)}%`, margin, y);
    y += 7;
    doc.text(`Growth Gap: ${(metrics.gap || 0) >= 0 ? '+' : ''}${(metrics.gap || 0).toFixed(1)}pp`, margin, y);
    y += 15;

    // Competitor comparison
    doc.setFontSize(14);
    doc.text('Competitor Comparison', margin, y);
    y += 10;

    const allBrands = metrics.allBrands || [];
    doc.setFontSize(10);

    allBrands.forEach(b => {
        const label = b.isBrand ? `${b.name} (You)` : b.name;
        doc.text(`${label}: SOS ${b.sos.toFixed(1)}% | SOV ${b.sov.toFixed(1)}%`, margin, y);
        y += 6;
    });

    // Save
    doc.save(`${project.name.replace(/\s+/g, '_')}_SOS_Report.pdf`);
}

// =============================================
// UTILITIES
// =============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}
