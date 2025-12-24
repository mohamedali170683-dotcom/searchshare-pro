/**
 * SearchShare Pro - Full-Stack Application
 * Frontend with API integration
 */

import { auth, projects, dataForSeo, isAuthenticated, getAuthToken } from './api.js';

// =============================================
// APP STATE
// =============================================
let currentView = 'dashboard';
let currentProjectId = null;
let currentUser = null;
let charts = {};

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Listen for logout events
    window.addEventListener('auth:logout', () => {
        currentUser = null;
        showAuthView();
    });

    // Check if user is authenticated
    if (isAuthenticated()) {
        try {
            const data = await auth.getProfile();
            currentUser = data.user;
            showApp();
        } catch (error) {
            console.error('Auth check failed:', error);
            showAuthView();
        }
    } else {
        showAuthView();
    }
});

// =============================================
// AUTH VIEW
// =============================================
function showAuthView() {
    document.querySelector('.top-nav').classList.add('hidden');
    const mainContent = document.getElementById('main-content');
    const template = document.getElementById('auth-template');
    mainContent.innerHTML = '';
    mainContent.appendChild(template.content.cloneNode(true));

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const isLogin = tab.dataset.tab === 'login';
            document.getElementById('login-form').classList.toggle('hidden', !isLogin);
            document.getElementById('signup-form').classList.toggle('hidden', isLogin);
        });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.querySelector('.btn-text').classList.add('hidden');
            btn.querySelector('.btn-loading').classList.remove('hidden');
            errorEl.classList.add('hidden');

            const data = await auth.login(email, password);
            currentUser = data.user;
            showApp();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('hidden');
            btn.querySelector('.btn-loading').classList.add('hidden');
        }
    });

    // Signup form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorEl = document.getElementById('signup-error');
        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.querySelector('.btn-text').classList.add('hidden');
            btn.querySelector('.btn-loading').classList.remove('hidden');
            errorEl.classList.add('hidden');

            const data = await auth.signup(email, password, name);
            currentUser = data.user;
            showApp();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('hidden');
            btn.querySelector('.btn-loading').classList.add('hidden');
        }
    });
}

// =============================================
// MAIN APP
// =============================================
function showApp() {
    document.querySelector('.top-nav').classList.remove('hidden');
    initNavigation();
    initUserMenu();
    renderView('dashboard');
    updateApiStatus();
}

function initNavigation() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const view = tab.dataset.view;
            setActiveNav(tab);
            renderView(view);
        });
    });

    // New Project button in nav
    document.getElementById('new-project-nav-btn')?.addEventListener('click', () => {
        openProjectModal();
    });
}

function initUserMenu() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    const userEmail = document.querySelector('.user-email');

    if (currentUser && userEmail) {
        userEmail.textContent = currentUser.email;
    }

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        dropdown?.classList.add('hidden');
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        auth.logout();
    });
}

function setActiveNav(activeItem) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function updateApiStatus() {
    const statusEl = document.getElementById('api-status');
    const hasCredentials = currentUser?.hasApiCredentials;

    if (hasCredentials) {
        statusEl.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #34c759;"></span>
            <span style="font-size: 13px; color: #86868b;">API Connected</span>
        `;
    } else {
        statusEl.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ff9500;"></span>
            <span style="font-size: 13px; color: #86868b;">Demo Mode</span>
        `;
    }
}

// =============================================
// VIEW RENDERING
// =============================================
async function renderView(view, data = {}) {
    currentView = view;
    const mainContent = document.getElementById('main-content');

    // Show loading state
    mainContent.innerHTML = '<div class="loading-view"><span class="loading-spinner"></span></div>';

    try {
        switch (view) {
            case 'dashboard':
                await renderDashboard(mainContent);
                break;
            case 'project':
                currentProjectId = data.projectId;
                await renderProject(mainContent, data.projectId);
                break;
            case 'settings':
                await renderSettings(mainContent);
                break;
        }
    } catch (error) {
        console.error('Error rendering view:', error);
        mainContent.innerHTML = `
            <div class="error-view">
                <p>Error loading view: ${escapeHtml(error.message)}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// =============================================
// DASHBOARD VIEW
// =============================================
async function renderDashboard(container) {
    const template = document.getElementById('dashboard-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    // Fetch projects from API
    const projectsList = await projects.list();

    updateDashboardStats(projectsList);

    if (projectsList.length === 0) {
        document.getElementById('projects-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
    } else {
        document.getElementById('projects-grid').classList.remove('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        renderProjectCards(projectsList);
    }

    document.getElementById('new-project-btn')?.addEventListener('click', () => openProjectModal());
    document.getElementById('empty-new-btn')?.addEventListener('click', () => openProjectModal());
}

function updateDashboardStats(projectsList) {
    document.getElementById('total-projects').textContent = projectsList.length;

    const growing = projectsList.filter(p => p.currentStatus === 'growing').length;
    const declining = projectsList.filter(p => p.currentStatus === 'declining').length;

    document.getElementById('growing-count').textContent = growing;
    document.getElementById('declining-count').textContent = declining;
}

function renderProjectCards(projectsList) {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = projectsList.map(project => {
        const statusClass = project.currentStatus || 'stable';
        const statusLabel = statusClass === 'growing' ? 'Growing' :
            statusClass === 'declining' ? 'At Risk' : 'Stable';

        return `
            <div class="card card-clickable project-card" data-project-id="${project.id}">
                <div class="project-card-header">
                    <div>
                        <div class="project-name">${escapeHtml(project.name)}</div>
                        <div class="project-client">${escapeHtml(project.client || project.brand?.name || '')}</div>
                    </div>
                    <div class="project-status ${statusClass}">${statusLabel}</div>
                </div>
                <div class="project-metrics">
                    <div class="project-metric">
                        <div class="project-metric-value sos">${(project.currentSOS || 0).toFixed(1)}%</div>
                        <div class="project-metric-label">SOS</div>
                    </div>
                    <div class="project-metric">
                        <div class="project-metric-value sov">${(project.currentSOV || 0).toFixed(1)}%</div>
                        <div class="project-metric-label">SOV</div>
                    </div>
                    <div class="project-metric">
                        <div class="project-metric-change ${(project.currentGap || 0) >= 0 ? 'positive' : 'negative'}">
                            ${(project.currentGap || 0) >= 0 ? '↑' : '↓'} ${Math.abs(project.currentGap || 0).toFixed(1)}pp
                        </div>
                        <div class="project-metric-label">Gap</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            renderView('project', { projectId: card.dataset.projectId });
        });
    });
}

// =============================================
// PROJECT VIEW
// =============================================
async function renderProject(container, projectId) {
    const project = await projects.get(projectId);

    if (!project) {
        renderView('dashboard');
        return;
    }

    const template = document.getElementById('project-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    document.getElementById('project-name').textContent = project.name;
    document.getElementById('project-client').textContent = project.client || project.brand?.name || '';

    const metrics = project.currentMetrics || {};
    renderMetrics(metrics, project);

    setTimeout(() => {
        renderCompetitorsChart(metrics);
        renderTrendChart(project);
    }, 100);

    renderBrandsTable(metrics);
    renderKeywordsTable(project);

    // Fetch recommendations from API
    try {
        const recommendations = await projects.getRecommendations(projectId);
        renderRecommendations(recommendations);
    } catch (error) {
        console.error('Failed to load recommendations:', error);
    }

    // Event listeners
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        setActiveNav(document.querySelector('.nav-tab[data-view="dashboard"]'));
        renderView('dashboard');
    });

    document.getElementById('edit-project-btn').addEventListener('click', () => {
        openProjectModal(project);
    });

    document.getElementById('delete-project-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this project?')) {
            await projects.delete(projectId);
            renderView('dashboard');
        }
    });

    document.getElementById('refresh-data-btn').addEventListener('click', async () => {
        await projects.createSnapshot(projectId);
        renderView('project', { projectId });
    });

    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        exportPDF(project);
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCompetitorsChart(metrics, btn.dataset.metric);
        });
    });

    // Fetch trends button
    document.getElementById('fetch-trends-btn')?.addEventListener('click', () => {
        fetchSOSTrends(project);
    });
}

function renderMetrics(metrics, project) {
    document.getElementById('sos-value').textContent = (metrics.sos || 0).toFixed(1);
    document.getElementById('sov-value').textContent = (metrics.sov || 0).toFixed(1);

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
        gapInsight.querySelector('p').textContent = 'SOV exceeds SOS - this predicts future market share growth (Binet & Field).';
    } else if (gap < -5) {
        gapCard.classList.remove('growing');
        gapCard.classList.add('declining');
        gapIndicator.classList.add('declining');
        gapStatus.textContent = 'At Risk';
        gapStatus.style.color = 'var(--declining)';
        gapInsight.querySelector('p').textContent = 'SOS exceeds SOV - risk of losing market share without SEO investment.';
    } else {
        gapCard.classList.remove('growing', 'declining');
        gapIndicator.classList.remove('declining');
        gapStatus.textContent = 'Stable';
        gapStatus.style.color = 'var(--text-secondary)';
        gapInsight.querySelector('p').textContent = 'SOS and SOV are balanced. Push SOV higher to drive growth.';
    }

    const snapshots = project.snapshots || [];
    if (snapshots.length >= 2) {
        const prev = snapshots[1]; // Second most recent (since array is desc by timestamp)
        const curr = snapshots[0];
        const sosChange = curr.sos - prev.sos;
        const sovChange = curr.sov - prev.sov;

        document.getElementById('sos-change').textContent = (sosChange >= 0 ? '+' : '') + sosChange.toFixed(1) + 'pp';
        document.getElementById('sos-change').className = `metric-change ${sosChange >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('sov-change').textContent = (sovChange >= 0 ? '+' : '') + sovChange.toFixed(1) + 'pp';
        document.getElementById('sov-change').className = `metric-change ${sovChange >= 0 ? 'positive' : 'negative'}`;
    } else {
        document.getElementById('sos-change').textContent = '--';
        document.getElementById('sov-change').textContent = '--';
    }

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

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineCap = 'round';
    ctx.stroke();

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

    const snapshots = [...(project.snapshots || [])].reverse();
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
        const statusLabel = status === 'growing' ? 'Growing' :
            status === 'declining' ? 'At Risk' : 'Stable';

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

    headerRow.innerHTML = allBrands.map(name => `<th>${escapeHtml(name || '')}</th>`).join('');

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

    document.getElementById('modal-title').textContent = existingProject ? 'Edit Project' : 'New Project';
    document.getElementById('submit-text').textContent = existingProject ? 'Save Changes' : 'Create Project';

    // Show API status
    updateModalApiStatus();

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
    }

    // Basic event listeners
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('add-competitor-btn').addEventListener('click', () => addCompetitorRow());
    document.getElementById('add-keyword-btn').addEventListener('click', () => addKeywordRow());
    document.getElementById('generate-positions-btn').addEventListener('click', generatePositionsMatrix);

    // API fetch buttons
    document.getElementById('fetch-brand-volume-btn')?.addEventListener('click', fetchBrandVolume);
    document.getElementById('fetch-all-volumes-btn')?.addEventListener('click', fetchAllVolumes);
    document.getElementById('suggest-keywords-btn')?.addEventListener('click', fetchKeywordSuggestions);
    document.getElementById('fetch-positions-btn')?.addEventListener('click', fetchSerpPositions);

    // Settings link
    document.getElementById('open-settings-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        setActiveNav(document.querySelector('.nav-tab[data-view="settings"]'));
        renderView('settings');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject(existingProject?.id);
    });
}

function updateModalApiStatus() {
    const hasCredentials = currentUser?.hasApiCredentials;
    const demoEl = document.getElementById('api-mode-demo');
    const connectedEl = document.getElementById('api-mode-connected');

    if (demoEl && connectedEl) {
        if (hasCredentials) {
            demoEl.classList.add('hidden');
            connectedEl.classList.remove('hidden');
        } else {
            demoEl.classList.remove('hidden');
            connectedEl.classList.add('hidden');
        }
    }
}

// =============================================
// API FETCH HANDLERS
// =============================================

async function fetchBrandVolume() {
    const brandName = document.getElementById('form-brand-name').value.trim();
    const statusEl = document.getElementById('brand-fetch-status');

    if (!brandName) {
        showFetchStatus(statusEl, 'error', 'Please enter a brand name first');
        return;
    }

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', 'Fetching volume...');

    try {
        const volumes = await dataForSeo.fetchVolumes([brandName]);
        const volume = volumes[brandName.toLowerCase()];

        if (volume) {
            document.getElementById('form-brand-volume').value = volume;
            showFetchStatus(statusEl, 'success', `Found: ${formatNumber(volume)} monthly searches`);
        } else {
            showFetchStatus(statusEl, 'warning', 'No volume data found for this brand');
        }
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

async function fetchAllVolumes() {
    const brandName = document.getElementById('form-brand-name').value.trim();
    const competitors = getFormCompetitors();
    const statusEl = document.getElementById('competitors-fetch-status');

    const allBrandNames = [brandName, ...competitors.map(c => c.name)].filter(n => n);

    if (allBrandNames.length === 0) {
        showFetchStatus(statusEl, 'error', 'Please enter brand and competitor names first');
        return;
    }

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Fetching volumes for ${allBrandNames.length} brands...`);

    try {
        const volumes = await dataForSeo.fetchVolumes(allBrandNames);

        // Update brand volume
        const brandVolume = volumes[brandName.toLowerCase()];
        if (brandVolume) {
            document.getElementById('form-brand-volume').value = brandVolume;
        }

        // Update competitor volumes
        const rows = document.querySelectorAll('.competitor-row');
        rows.forEach(row => {
            const nameInput = row.querySelector('.competitor-name');
            const volumeInput = row.querySelector('.competitor-volume');
            const name = nameInput.value.trim().toLowerCase();

            if (name && volumes[name]) {
                volumeInput.value = volumes[name];
            }
        });

        const foundCount = Object.keys(volumes).length;
        showFetchStatus(statusEl, 'success', `Updated ${foundCount} of ${allBrandNames.length} brands`);
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

async function fetchKeywordSuggestions() {
    const brandName = document.getElementById('form-brand-name').value.trim();
    const categorySeed = document.getElementById('form-category-seed').value.trim();
    const statusEl = document.getElementById('keywords-fetch-status');
    const suggestionsContainer = document.getElementById('keyword-suggestions');
    const suggestionsList = document.getElementById('suggestions-list');

    const searchTerm = categorySeed || brandName;

    if (!searchTerm) {
        showFetchStatus(statusEl, 'error', 'Please enter an industry/category or brand name');
        return;
    }

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Finding keywords for "${searchTerm}"...`);

    try {
        const seedWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const [keywordIdeas, relatedKeywords] = await Promise.all([
            dataForSeo.fetchKeywordSuggestions(searchTerm, 30).catch(() => []),
            dataForSeo.fetchRelatedKeywords(searchTerm, 30).catch(() => [])
        ]);

        // Combine and deduplicate
        const keywordMap = new Map();
        [...keywordIdeas, ...relatedKeywords].forEach(kw => {
            if (kw.keyword && !keywordMap.has(kw.keyword.toLowerCase())) {
                keywordMap.set(kw.keyword.toLowerCase(), kw);
            }
        });

        // Filter
        const seedLower = searchTerm.toLowerCase();
        const keywords = [...keywordMap.values()]
            .filter(kw => {
                const kwLower = kw.keyword.toLowerCase();
                if (kwLower === seedLower) return false;
                return seedWords.some(word => kwLower.includes(word));
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 20);

        if (keywords.length === 0) {
            showFetchStatus(statusEl, 'warning', 'No matching keywords found. Try different category terms.');
            return;
        }

        // Render checkboxes
        suggestionsList.innerHTML = keywords.map((kw) => `
            <label class="suggestion-item">
                <input type="checkbox" class="suggestion-checkbox"
                       data-keyword="${escapeHtml(kw.keyword)}"
                       data-volume="${kw.volume}">
                <span class="suggestion-keyword">${escapeHtml(kw.keyword)}</span>
                <span class="suggestion-volume">${formatNumber(kw.volume)}</span>
            </label>
        `).join('');

        suggestionsContainer.classList.remove('hidden');
        showFetchStatus(statusEl, 'success', `Found ${keywords.length} relevant keywords`);

        // Add listener to add selected keywords
        suggestionsList.querySelectorAll('.suggestion-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    addKeywordRow(e.target.dataset.keyword, e.target.dataset.volume);
                } else {
                    const rows = document.querySelectorAll('.keyword-row');
                    rows.forEach(row => {
                        if (row.querySelector('.keyword-text').value === e.target.dataset.keyword) {
                            row.remove();
                        }
                    });
                }
            });
        });
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

async function fetchSerpPositions() {
    const brandDomain = document.getElementById('form-brand-domain').value.trim();
    const brandName = document.getElementById('form-brand-name').value.trim();
    const competitors = getFormCompetitors();
    const keywords = getFormKeywords();
    const statusEl = document.getElementById('positions-fetch-status');

    if (keywords.length === 0) {
        showFetchStatus(statusEl, 'error', 'Please add keywords first');
        return;
    }

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    const allDomains = [
        brandDomain || brandName,
        ...competitors.map(c => c.domain || c.name)
    ].filter(d => d);

    showFetchStatus(statusEl, 'loading', `Fetching SERP positions for ${keywords.length} keywords...`);

    try {
        const { positions } = await dataForSeo.fetchSerpPositions(
            keywords.map(k => k.keyword),
            allDomains
        );

        // Update position matrix inputs
        Object.entries(positions).forEach(([kwIdx, brandPositions]) => {
            Object.entries(brandPositions).forEach(([domain, position]) => {
                const input = document.querySelector(
                    `#positions-matrix input[data-keyword="${kwIdx}"][data-brand="${domain}"]`
                );
                if (input) {
                    input.value = position;
                }

                const allBrands = [brandName, ...competitors.map(c => c.name)];
                allBrands.forEach((name, idx) => {
                    const brandDom = idx === 0 ? brandDomain : competitors[idx - 1]?.domain;
                    if (domain === brandDom || domain === name) {
                        const inp = document.querySelector(
                            `#positions-matrix input[data-keyword="${kwIdx}"][data-brand="${name}"]`
                        );
                        if (inp) inp.value = position;
                    }
                });
            });
        });

        showFetchStatus(statusEl, 'success', 'SERP positions updated');
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

async function fetchSOSTrends(project) {
    const statusEl = document.getElementById('trends-fetch-status');
    const summaryEl = document.getElementById('trend-summary');

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    const brandName = project.brand?.name;
    const competitorNames = (project.competitors || []).map(c => c.name);
    const allBrands = [brandName, ...competitorNames].filter(n => n);

    if (allBrands.length === 0) {
        showFetchStatus(statusEl, 'error', 'No brands to analyze');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Fetching historical data for ${allBrands.length} brands...`);

    try {
        const historicalData = await dataForSeo.fetchHistoricalVolumes(allBrands);

        if (Object.keys(historicalData).length === 0) {
            showFetchStatus(statusEl, 'warning', 'No historical data available');
            return;
        }

        // Calculate basic trend display
        const brandData = historicalData[brandName.toLowerCase()];
        if (brandData) {
            document.getElementById('sos-now').textContent = '--';
            document.getElementById('sos-6m').textContent = '--';
            document.getElementById('sos-12m').textContent = '--';
            summaryEl.classList.remove('hidden');
        }

        showFetchStatus(statusEl, 'success', 'Trend data updated');
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

function showFetchStatus(element, type, message) {
    if (!element) return;

    element.className = `fetch-status ${type}`;
    element.innerHTML = type === 'loading'
        ? `<span class="loading-spinner"></span> ${message}`
        : message;

    if (type === 'success' || type === 'warning') {
        setTimeout(() => {
            element.className = 'fetch-status';
            element.innerHTML = '';
        }, 5000);
    }
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

async function saveProject(existingId = null) {
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

    try {
        let project;
        if (existingId) {
            await projects.update(existingId, projectData);
            project = { id: existingId };
        } else {
            const result = await projects.create(projectData);
            project = result.project;
        }

        closeModal();
        renderView('project', { projectId: project.id });
    } catch (error) {
        alert('Error saving project: ' + error.message);
    }
}

// =============================================
// SETTINGS VIEW
// =============================================
async function renderSettings(container) {
    const template = document.getElementById('settings-template');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));

    // Get user profile for current credentials status
    const profile = await auth.getProfile();
    currentUser = profile.user;

    document.getElementById('api-login').value = '';
    document.getElementById('api-password').value = '';
    document.getElementById('stored-projects').textContent = '--';
    document.getElementById('storage-used').textContent = 'Cloud';

    // Show credentials status
    if (currentUser.hasApiCredentials) {
        document.getElementById('api-login').placeholder = 'Credentials saved';
        document.getElementById('api-password').placeholder = 'Credentials saved';
    }

    document.getElementById('save-api-btn').addEventListener('click', async () => {
        const apiLogin = document.getElementById('api-login').value.trim();
        const apiPassword = document.getElementById('api-password').value.trim();

        try {
            await auth.updateApiCredentials(apiLogin, apiPassword);
            currentUser.hasApiCredentials = !!(apiLogin && apiPassword);
            updateApiStatus();
            alert('API credentials saved!');
        } catch (error) {
            alert('Error saving credentials: ' + error.message);
        }
    });

    document.getElementById('test-api-btn').addEventListener('click', async () => {
        const result = document.getElementById('api-result');
        result.textContent = 'Testing...';
        result.className = 'api-result';

        // Save credentials first before testing
        const apiLogin = document.getElementById('api-login').value.trim();
        const apiPassword = document.getElementById('api-password').value.trim();

        if (apiLogin && apiPassword) {
            await auth.updateApiCredentials(apiLogin, apiPassword);
            currentUser.hasApiCredentials = true;
        }

        const testResult = await dataForSeo.testConnection();

        if (testResult.success) {
            result.textContent = `Connected! Balance: $${testResult.balance.toFixed(2)}`;
            result.className = 'api-result success';
            updateApiStatus();
        } else {
            result.textContent = `${testResult.error}`;
            result.className = 'api-result error';
        }
    });

    document.getElementById('clear-data-btn').addEventListener('click', async () => {
        if (confirm('This will delete ALL your projects. Are you sure?')) {
            // Delete all projects one by one
            const projectsList = await projects.list();
            for (const project of projectsList) {
                await projects.delete(project.id);
            }
            renderView('dashboard');
        }
    });
}

// =============================================
// PDF EXPORT
// =============================================
function exportPDF(project) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const metrics = project.currentMetrics || {};
    const margin = 20;
    let y = margin;

    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.text('Share of Search Report', margin, y);
    y += 15;

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(project.name, margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 15;

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
