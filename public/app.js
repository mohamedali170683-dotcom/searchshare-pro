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
let expandedCategoryData = null; // Stores expanded keywords for Total Market Volume

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
    renderVisibleVolumeBreakdown(project);

    // Toggle for visible volume breakdown
    document.getElementById('toggle-visible-breakdown')?.addEventListener('click', () => {
        const content = document.getElementById('visible-breakdown-content');
        const btn = document.getElementById('toggle-visible-breakdown');
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            btn.classList.add('expanded');
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
                Hide keyword-by-keyword breakdown
            `;
        } else {
            content.classList.add('hidden');
            btn.classList.remove('expanded');
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
                Show keyword-by-keyword breakdown
            `;
        }
    });

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
    const sos = metrics.sos || 0;
    const sov = metrics.sov || 0;
    const gap = metrics.gap || 0;

    // Main values
    document.getElementById('sos-value').textContent = sos.toFixed(1);
    document.getElementById('sov-value').textContent = sov.toFixed(1);
    document.getElementById('gap-value').textContent = (gap >= 0 ? '+' : '') + gap.toFixed(1);

    // SOS Calculation Breakdown
    const brandVolume = metrics.brandVolume || project.brand?.volume || 0;
    const totalBrandVolume = metrics.totalBrandVolume || 0;
    document.getElementById('sos-brand-volume').textContent = formatNumber(brandVolume);
    document.getElementById('sos-total-volume').textContent = formatNumber(totalBrandVolume);
    document.getElementById('sos-math').innerHTML = `
        <span class="calc-highlight">${formatNumber(brandVolume)}</span> ÷
        <span class="calc-highlight">${formatNumber(totalBrandVolume)}</span> =
        <strong>${sos.toFixed(1)}%</strong>
    `;

    // SOV Calculation Breakdown
    const visibleVolume = metrics.visibleVolume || 0;
    const totalMarketVolume = metrics.totalMarketVolume || 0;
    document.getElementById('sov-visible-volume').textContent = formatNumber(visibleVolume);
    document.getElementById('sov-market-volume').textContent = formatNumber(totalMarketVolume);
    document.getElementById('sov-math').innerHTML = `
        <span class="calc-highlight">${formatNumber(visibleVolume)}</span> ÷
        <span class="calc-highlight">${formatNumber(totalMarketVolume)}</span> =
        <strong>${sov.toFixed(1)}%</strong>
    `;

    // Show expanded keywords breakdown if available
    const marketBreakdown = document.getElementById('market-breakdown');
    const expandedNote = document.getElementById('expanded-keywords-note');
    const expandedInfo = document.getElementById('expanded-keywords-info');

    if (metrics.hasExpandedData && marketBreakdown) {
        const seedVolume = metrics.seedKeywordVolume || 0;
        const expandedCount = metrics.expandedKeywordCount || 0;
        const seedCount = metrics.seedKeywordCount || 0;

        marketBreakdown.innerHTML = `
            <div class="market-breakdown-label">Market Volume Breakdown:</div>
            <div class="market-breakdown-stats">
                <span>Seed Keywords: <strong>${formatNumber(seedVolume)}</strong> (${seedCount} keywords)</span>
                <span>|</span>
                <span>Expanded: <strong>${formatNumber(totalMarketVolume)}</strong> (${expandedCount} total)</span>
            </div>
        `;

        if (expandedNote && expandedInfo) {
            expandedNote.classList.remove('hidden');
            expandedInfo.textContent = `Total Market Volume includes ${expandedCount} keywords discovered from ${seedCount} seed keywords`;
        }
    } else if (marketBreakdown) {
        marketBreakdown.innerHTML = '';
        if (expandedNote) {
            expandedNote.classList.add('hidden');
        }
    }

    // Gap Calculation Breakdown
    document.getElementById('gap-sov').textContent = sov.toFixed(1) + '%';
    document.getElementById('gap-sos').textContent = sos.toFixed(1) + '%';
    document.getElementById('gap-math').innerHTML = `
        <span class="calc-highlight">${sov.toFixed(1)}%</span> −
        <span class="calc-highlight">${sos.toFixed(1)}%</span> =
        <strong>${(gap >= 0 ? '+' : '')}${gap.toFixed(1)}pp</strong>
    `;

    // Gap Status
    const gapCard = document.getElementById('gap-card');
    const gapIndicator = document.getElementById('gap-indicator');
    const gapStatusBox = document.getElementById('gap-status-box');
    const gapStatus = document.getElementById('gap-status');

    if (gap > 0) {
        gapCard.classList.remove('declining');
        gapCard.classList.add('growing');
        gapIndicator.classList.remove('negative');
        gapIndicator.classList.add('positive');
        gapStatusBox.classList.remove('declining');
        gapStatusBox.classList.add('growing');
        gapStatus.textContent = 'Growing - SOV > SOS predicts market share growth';
    } else if (gap < -5) {
        gapCard.classList.remove('growing');
        gapCard.classList.add('declining');
        gapIndicator.classList.remove('positive');
        gapIndicator.classList.add('negative');
        gapStatusBox.classList.remove('growing');
        gapStatusBox.classList.add('declining');
        gapStatus.textContent = 'At Risk - SOS > SOV indicates visibility gap';
    } else {
        gapCard.classList.remove('growing', 'declining');
        gapIndicator.classList.remove('positive', 'negative');
        gapStatusBox.classList.remove('growing', 'declining');
        gapStatus.textContent = 'Stable - Push SOV higher to drive growth';
    }

    // Change vs last month
    const snapshots = project.snapshots || [];
    if (snapshots.length >= 2) {
        const prev = snapshots[1];
        const curr = snapshots[0];
        const sosChange = curr.sos - prev.sos;
        const sovChange = curr.sov - prev.sov;

        document.getElementById('sos-change').textContent = (sosChange >= 0 ? '+' : '') + sosChange.toFixed(1) + 'pp';
        document.getElementById('sos-change').className = `metric-change ${sosChange >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('sov-change').textContent = (sovChange >= 0 ? '+' : '') + sovChange.toFixed(1) + 'pp';
        document.getElementById('sov-change').className = `metric-change ${sovChange >= 0 ? 'positive' : 'negative'}`;
    } else {
        document.getElementById('sos-change').textContent = 'No prior data';
        document.getElementById('sov-change').textContent = 'No prior data';
    }
}

// Chart colors for light theme
const CHART_COLORS = {
    sos: '#0d9488',      // Teal
    sov: '#f97316',      // Orange
    brand: '#0d9488',
    competitor: '#d6d3d1',
    grid: 'rgba(0, 0, 0, 0.06)',
    text: '#57534e',
    textMuted: '#a8a29e'
};

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
                    b.isBrand ? CHART_COLORS.brand : CHART_COLORS.competitor
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
                    backgroundColor: '#1c1917',
                    titleColor: '#fafafa',
                    bodyColor: '#d6d3d1',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: CHART_COLORS.grid },
                    ticks: { color: CHART_COLORS.text },
                    max: 100
                },
                y: {
                    grid: { display: false },
                    ticks: { color: CHART_COLORS.text }
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
            ? (type === 'sos' ? CHART_COLORS.sos : CHART_COLORS.sov)
            : CHART_COLORS.competitor
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

    // If no snapshots, show a placeholder message
    if (snapshots.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = CHART_COLORS.textMuted;
        ctx.textAlign = 'center';
        ctx.fillText('Click "Fetch Live Trends" to load historical data', canvas.width / 2, canvas.height / 2);
        return;
    }

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
                    borderColor: CHART_COLORS.sos,
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CHART_COLORS.sos,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'SOV',
                    data: sovData,
                    borderColor: CHART_COLORS.sov,
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CHART_COLORS.sov,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
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
                        color: CHART_COLORS.text,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#1c1917',
                    titleColor: '#fafafa',
                    bodyColor: '#d6d3d1',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: CHART_COLORS.grid },
                    ticks: { color: CHART_COLORS.text }
                },
                y: {
                    grid: { color: CHART_COLORS.grid },
                    ticks: {
                        color: CHART_COLORS.text,
                        callback: (value) => `${value}%`
                    },
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

// CTR by position lookup
const CTR_BY_POSITION = {
    1: 0.316, 2: 0.158, 3: 0.110, 4: 0.077, 5: 0.053,
    6: 0.043, 7: 0.035, 8: 0.030, 9: 0.026, 10: 0.023
};

function getCTR(position) {
    if (!position || position < 1) return 0;
    if (position <= 10) return CTR_BY_POSITION[position] || 0.023;
    if (position <= 20) return 0.01;
    if (position <= 50) return 0.005;
    return 0.001;
}

function renderVisibleVolumeBreakdown(project) {
    const tbody = document.getElementById('visible-breakdown-body');
    const totalEl = document.getElementById('visible-breakdown-total');
    const detailSection = document.getElementById('visible-volume-detail');

    if (!tbody || !totalEl) return;

    const keywords = project.marketKeywords || [];
    const positions = project.positions || {};
    const brandName = project.brand?.name;

    if (keywords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--gray-400); padding: 20px;">
                    No market keywords defined. Add keywords to calculate Visible Volume.
                </td>
            </tr>
        `;
        totalEl.textContent = '0';
        return;
    }

    let totalVisibleVolume = 0;
    let hasAnyPosition = false;

    const rows = keywords.map((kw, idx) => {
        const pos = positions[idx]?.[brandName];
        const ctr = getCTR(pos);
        const visibleVol = Math.round((kw.volume || 0) * ctr);
        totalVisibleVolume += visibleVol;

        if (pos) hasAnyPosition = true;

        // Position class for styling
        let posClass = 'none';
        let posDisplay = 'No rank';
        if (pos) {
            posDisplay = `#${pos}`;
            if (pos <= 3) posClass = 'top3';
            else if (pos <= 10) posClass = 'top10';
            else posClass = 'low';
        }

        return `
            <tr>
                <td class="kw-name" title="${escapeHtml(kw.keyword)}">${escapeHtml(kw.keyword)}</td>
                <td class="volume-cell">${formatNumber(kw.volume)}</td>
                <td class="position-cell ${posClass}">${posDisplay}</td>
                <td class="ctr-cell">${(ctr * 100).toFixed(1)}%</td>
                <td class="visible-cell ${visibleVol === 0 ? 'zero' : ''}">${formatNumber(visibleVol)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('');
    totalEl.textContent = formatNumber(totalVisibleVolume);

    // Show warning if visible volume is 0
    if (totalVisibleVolume === 0 && detailSection) {
        const existingWarning = detailSection.querySelector('.zero-visible-warning');
        if (!existingWarning) {
            const warning = document.createElement('div');
            warning.className = 'zero-visible-warning';
            warning.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>
                    <strong>Visible Volume is 0</strong> because no SERP positions are entered for your brand.
                    Edit the project and add positions in the "SERP Positions" section, or use "Fetch Positions" to get live data.
                </span>
            `;
            detailSection.appendChild(warning);
        }
    }
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

    // Reset expanded category data
    expandedCategoryData = null;

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

        // Restore expanded keywords data if available
        if (existingProject.expandedKeywords && existingProject.expandedTotalMarketVolume) {
            expandedCategoryData = {
                expandedKeywords: existingProject.expandedKeywords,
                totalMarketVolume: existingProject.expandedTotalMarketVolume,
                stats: existingProject.expansionStats,
                success: true
            };
            // Show the expanded summary
            restoreExpandedSummary(expandedCategoryData);
        }
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
    document.getElementById('expand-category-btn')?.addEventListener('click', expandCategoryKeywords);
    document.getElementById('toggle-expanded-keywords')?.addEventListener('click', toggleExpandedKeywordsList);

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

    showFetchStatus(statusEl, 'loading', `Fetching rankings for ${allDomains.length} domains...`);

    try {
        // Use Ranked Keywords API - fetches all rankings per domain (faster, no timeout)
        const result = await dataForSeo.fetchRankedKeywords(
            keywords.map(k => k.keyword),
            allDomains
        );

        const { positions, errors, debug } = result;

        // Log debug info to console
        console.log('Ranked Keywords Debug:', debug);
        if (errors?.length) {
            console.error('API Errors:', errors);
        }

        // Count how many positions were found
        let positionsFound = 0;

        // Update position matrix inputs
        Object.entries(positions).forEach(([kwIdx, brandPositions]) => {
            Object.entries(brandPositions).forEach(([domain, position]) => {
                positionsFound++;
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

        if (errors?.length > 0) {
            const errorMsg = errors.map(e => `${e.domain}: ${e.error}`).join('; ');
            showFetchStatus(statusEl, 'error', `API errors: ${errorMsg}`);
        } else if (positionsFound === 0) {
            showFetchStatus(statusEl, 'warning', 'No rankings found for these keywords. Domains may not rank in top 1000.');
        } else {
            showFetchStatus(statusEl, 'success', `Found ${positionsFound} rankings`);
        }
    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

async function fetchSOSTrends(project) {
    const statusEl = document.getElementById('trends-fetch-status');
    const summaryEl = document.getElementById('trend-summary');
    const trendChangeEl = document.getElementById('trend-change');

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

        // Process historical data to calculate SOS over time
        const brandKey = brandName.toLowerCase();
        const brandHistory = historicalData[brandKey] || [];

        // Get data points sorted by date (oldest first)
        const sortedBrandHistory = [...brandHistory].sort((a, b) =>
            new Date(a.year, a.month - 1) - new Date(b.year, b.month - 1)
        );

        // Calculate SOS for each month
        const sosHistory = [];
        const monthlyTotals = {};

        // First, aggregate all brands' monthly data
        Object.entries(historicalData).forEach(([brand, months]) => {
            months.forEach(m => {
                const key = `${m.year}-${m.month}`;
                if (!monthlyTotals[key]) {
                    monthlyTotals[key] = { total: 0, brandVolume: 0, year: m.year, month: m.month };
                }
                monthlyTotals[key].total += m.volume;
                if (brand === brandKey) {
                    monthlyTotals[key].brandVolume = m.volume;
                }
            });
        });

        // Calculate SOS for each month
        Object.entries(monthlyTotals)
            .sort((a, b) => {
                const [aYear, aMonth] = a[0].split('-').map(Number);
                const [bYear, bMonth] = b[0].split('-').map(Number);
                return new Date(aYear, aMonth - 1) - new Date(bYear, bMonth - 1);
            })
            .forEach(([key, data]) => {
                const sos = data.total > 0 ? (data.brandVolume / data.total) * 100 : 0;
                sosHistory.push({
                    date: key,
                    year: data.year,
                    month: data.month,
                    sos: sos,
                    brandVolume: data.brandVolume,
                    totalVolume: data.total
                });
            });

        if (sosHistory.length === 0) {
            showFetchStatus(statusEl, 'warning', 'No trend data could be calculated');
            return;
        }

        // Get specific time periods
        const now = sosHistory[sosHistory.length - 1];
        const sixMonthsAgo = sosHistory[Math.max(0, sosHistory.length - 7)] || now;
        const twelveMonthsAgo = sosHistory[0] || now;

        // Update trend summary
        document.getElementById('sos-now').textContent = `${now.sos.toFixed(1)}%`;
        document.getElementById('sos-6m').textContent = `${sixMonthsAgo.sos.toFixed(1)}%`;
        document.getElementById('sos-12m').textContent = `${twelveMonthsAgo.sos.toFixed(1)}%`;

        // Calculate total change
        const totalChange = now.sos - twelveMonthsAgo.sos;
        const changeClass = totalChange >= 0 ? 'positive' : 'negative';
        trendChangeEl.innerHTML = `
            <span class="change-value ${changeClass}">${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}pp</span>
            <span class="change-label">12mo change</span>
        `;

        summaryEl.classList.remove('hidden');

        // Update the trend chart with historical SOS data
        if (charts.trend) {
            charts.trend.destroy();
        }

        const canvas = document.getElementById('trend-chart');
        if (canvas) {
            const labels = sosHistory.map(d => {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[d.month - 1]} ${d.year}`;
            });

            charts.trend = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Share of Search (%)',
                        data: sosHistory.map(d => d.sos.toFixed(1)),
                        borderColor: CHART_COLORS.sos,
                        backgroundColor: 'rgba(13, 148, 136, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: CHART_COLORS.sos,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: '#1c1917',
                            titleColor: '#fafafa',
                            bodyColor: '#d6d3d1',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (ctx) => `SOS: ${ctx.raw}%`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: CHART_COLORS.grid },
                            ticks: { color: CHART_COLORS.text, maxRotation: 45 }
                        },
                        y: {
                            grid: { color: CHART_COLORS.grid },
                            ticks: {
                                color: CHART_COLORS.text,
                                callback: (value) => `${value}%`
                            },
                            min: 0,
                            suggestedMax: Math.max(...sosHistory.map(d => d.sos)) + 10
                        }
                    }
                }
            });
        }

        showFetchStatus(statusEl, 'success', `Loaded ${sosHistory.length} months of trend data`);
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

// =============================================
// CATEGORY EXPANSION
// =============================================

async function expandCategoryKeywords() {
    const keywords = getFormKeywords();
    const statusEl = document.getElementById('expansion-fetch-status');
    const summaryEl = document.getElementById('expanded-summary');
    const expandBtn = document.getElementById('expand-category-btn');

    if (keywords.length === 0) {
        showFetchStatus(statusEl, 'error', 'Please add at least one seed keyword first');
        return;
    }

    if (!currentUser?.hasApiCredentials) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    // Disable button while loading
    expandBtn.disabled = true;
    showFetchStatus(statusEl, 'loading', `Expanding ${keywords.length} seed keywords to discover full category...`);

    try {
        const result = await dataForSeo.expandCategory(keywords, 50);

        if (!result.success) {
            throw new Error(result.error || 'Failed to expand category');
        }

        // Store the expanded data
        expandedCategoryData = result;

        // Update the UI
        document.getElementById('seed-count').textContent = result.stats.seedCount;
        document.getElementById('expanded-count').textContent = result.stats.totalKeywords;
        document.getElementById('total-market-volume').textContent = formatNumber(result.totalMarketVolume);

        // Render preview of top keywords
        const previewEl = document.getElementById('expanded-keywords-preview');
        const topKeywords = result.expandedKeywords.slice(0, 10);
        previewEl.innerHTML = topKeywords.map(kw => `
            <span class="expanded-keyword-tag ${kw.isSeed ? 'seed' : ''}">
                ${escapeHtml(kw.keyword)}
                <span class="kw-volume">${formatNumber(kw.volume)}</span>
            </span>
        `).join('') + (result.expandedKeywords.length > 10 ? `
            <span class="expanded-keyword-tag">+${result.expandedKeywords.length - 10} more</span>
        ` : '');

        // Render full table
        const fullEl = document.getElementById('expanded-keywords-full');
        fullEl.innerHTML = `
            <table class="expanded-keywords-table">
                <thead>
                    <tr>
                        <th>Keyword</th>
                        <th>Volume</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.expandedKeywords.map(kw => `
                        <tr>
                            <td class="kw-keyword">${escapeHtml(kw.keyword)}</td>
                            <td class="kw-volume">${formatNumber(kw.volume)}</td>
                            <td class="kw-source">${kw.isSeed ? 'Seed' : (kw.source || 'Expanded')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        summaryEl.classList.remove('hidden');
        showFetchStatus(statusEl, 'success', `Found ${result.stats.totalKeywords} keywords with total volume of ${formatNumber(result.totalMarketVolume)}`);

    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
        expandedCategoryData = null;
    } finally {
        expandBtn.disabled = false;
    }
}

function toggleExpandedKeywordsList() {
    const fullEl = document.getElementById('expanded-keywords-full');
    const toggleBtn = document.getElementById('toggle-expanded-keywords');

    if (fullEl.classList.contains('hidden')) {
        fullEl.classList.remove('hidden');
        toggleBtn.textContent = 'Hide all keywords';
    } else {
        fullEl.classList.add('hidden');
        toggleBtn.textContent = 'Show all keywords';
    }
}

function restoreExpandedSummary(result) {
    const summaryEl = document.getElementById('expanded-summary');
    if (!summaryEl || !result) return;

    // Update stats
    document.getElementById('seed-count').textContent = result.stats?.seedCount || 0;
    document.getElementById('expanded-count').textContent = result.stats?.totalKeywords || result.expandedKeywords?.length || 0;
    document.getElementById('total-market-volume').textContent = formatNumber(result.totalMarketVolume);

    // Render preview of top keywords
    const previewEl = document.getElementById('expanded-keywords-preview');
    const topKeywords = (result.expandedKeywords || []).slice(0, 10);
    previewEl.innerHTML = topKeywords.map(kw => `
        <span class="expanded-keyword-tag ${kw.isSeed ? 'seed' : ''}">
            ${escapeHtml(kw.keyword)}
            <span class="kw-volume">${formatNumber(kw.volume)}</span>
        </span>
    `).join('') + ((result.expandedKeywords?.length || 0) > 10 ? `
        <span class="expanded-keyword-tag">+${result.expandedKeywords.length - 10} more</span>
    ` : '');

    // Render full table
    const fullEl = document.getElementById('expanded-keywords-full');
    fullEl.innerHTML = `
        <table class="expanded-keywords-table">
            <thead>
                <tr>
                    <th>Keyword</th>
                    <th>Volume</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${(result.expandedKeywords || []).map(kw => `
                    <tr>
                        <td class="kw-keyword">${escapeHtml(kw.keyword)}</td>
                        <td class="kw-volume">${formatNumber(kw.volume)}</td>
                        <td class="kw-source">${kw.isSeed ? 'Seed' : (kw.source || 'Expanded')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    summaryEl.classList.remove('hidden');
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
        positions: getFormPositions(),
        // Include expanded category data if available
        expandedKeywords: expandedCategoryData?.expandedKeywords || null,
        expandedTotalMarketVolume: expandedCategoryData?.totalMarketVolume || null,
        expansionStats: expandedCategoryData?.stats || null
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
