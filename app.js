/**
 * SearchShare Pro - Complete Application Bundle
 * Combined state management and UI for file:// protocol compatibility
 */

// =============================================
// STATE MANAGEMENT
// =============================================

const STORAGE_KEYS = {
    PROJECTS: 'searchshare_projects',
    SETTINGS: 'searchshare_settings'
};

const DEFAULT_SETTINGS = {
    apiLogin: '',
    apiPassword: '',
    demoMode: true
};

const State = {
    getProjects() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading projects:', e);
            return [];
        }
    },

    saveProjects(projects) {
        try {
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
            return true;
        } catch (e) {
            console.error('Error saving projects:', e);
            return false;
        }
    },

    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    createProject(projectData) {
        const projects = this.getProjects();
        const newProject = {
            id: 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...projectData,
            snapshots: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const snapshot = this.calculateSnapshot(newProject);
        newProject.snapshots.push(snapshot);
        newProject.currentMetrics = snapshot;

        projects.push(newProject);
        this.saveProjects(projects);

        return newProject;
    },

    updateProject(id, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);

        if (index === -1) return null;

        projects[index] = {
            ...projects[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        if (updates.brand || updates.competitors || updates.marketKeywords || updates.positions) {
            const snapshot = this.calculateSnapshot(projects[index]);
            projects[index].snapshots.push(snapshot);
            projects[index].currentMetrics = snapshot;
        }

        this.saveProjects(projects);
        return projects[index];
    },

    deleteProject(id) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== id);
        this.saveProjects(filtered);
        return filtered;
    },

    addSnapshot(id) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);

        if (index === -1) return null;

        const snapshot = this.calculateSnapshot(projects[index]);
        projects[index].snapshots.push(snapshot);
        projects[index].currentMetrics = snapshot;
        projects[index].updatedAt = new Date().toISOString();

        this.saveProjects(projects);
        return projects[index];
    },

    calculateSnapshot(project) {
        const { brand, competitors, marketKeywords, positions } = project;
        const allBrands = [
            { ...brand, isBrand: true },
            ...(competitors || []).map(c => ({ ...c, isBrand: false }))
        ];

        // SHARE OF SEARCH (SOS)
        const totalBrandVolume = allBrands.reduce((sum, b) => sum + (b.volume || 0), 0);

        allBrands.forEach(b => {
            b.sos = totalBrandVolume > 0
                ? ((b.volume || 0) / totalBrandVolume) * 100
                : 0;
        });

        // SHARE OF VOICE (SOV)
        const CTR = {
            1: 0.316, 2: 0.158, 3: 0.110, 4: 0.077, 5: 0.053,
            6: 0.043, 7: 0.035, 8: 0.030, 9: 0.026, 10: 0.023
        };

        const getCTR = (pos) => {
            if (!pos || pos > 100) return 0;
            if (pos <= 10) return CTR[pos];
            if (pos <= 20) return 0.01;
            if (pos <= 50) return 0.005;
            return 0.001;
        };

        const keywords = marketKeywords || [];
        const totalMarketVolume = keywords.reduce((sum, k) => sum + (k.volume || 0), 0);

        allBrands.forEach(b => {
            let visibleVolume = 0;

            keywords.forEach((kw, idx) => {
                const pos = positions?.[idx]?.[b.name];
                const ctr = getCTR(pos);
                visibleVolume += (kw.volume || 0) * ctr;
            });

            b.visibleVolume = Math.round(visibleVolume);
            b.sov = totalMarketVolume > 0
                ? (visibleVolume / totalMarketVolume) * 100
                : 0;
        });

        const brandMetrics = allBrands.find(b => b.isBrand);
        const gap = (brandMetrics?.sov || 0) - (brandMetrics?.sos || 0);

        return {
            date: new Date().toISOString().slice(0, 7),
            timestamp: new Date().toISOString(),
            brandVolume: brand?.volume || 0,
            totalBrandVolume,
            totalMarketVolume,
            sos: brandMetrics?.sos || 0,
            sov: brandMetrics?.sov || 0,
            visibleVolume: brandMetrics?.visibleVolume || 0,
            gap,
            status: gap > 0 ? 'growing' : gap < -5 ? 'declining' : 'neutral',
            allBrands
        };
    },

    getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    clearAllData() {
        localStorage.removeItem(STORAGE_KEYS.PROJECTS);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    },

    getStorageStats() {
        const projects = this.getProjects();
        const projectsSize = new Blob([JSON.stringify(projects)]).size;
        const settingsSize = new Blob([localStorage.getItem(STORAGE_KEYS.SETTINGS) || '']).size;

        return {
            projectCount: projects.length,
            storageUsed: projectsSize + settingsSize,
            storageUsedFormatted: formatBytes(projectsSize + settingsSize)
        };
    },

    generateRecommendations(snapshot, project) {
        const recommendations = [];
        const { sos, sov, gap, allBrands } = snapshot;

        // Growth gap analysis
        if (gap > 5) {
            recommendations.push({
                priority: 'low',
                icon: '🚀',
                title: 'Strong Growth Position',
                message: `Your SOV (${sov.toFixed(1)}%) exceeds SOS (${sos.toFixed(1)}%) by ${gap.toFixed(1)}pp. Based on Binet's research, this "excess share of voice" predicts market share growth.`
            });
        } else if (gap < -5) {
            recommendations.push({
                priority: 'high',
                icon: '⚠️',
                title: 'Visibility Gap Alert',
                message: `Your SOS (${sos.toFixed(1)}%) exceeds SOV (${sov.toFixed(1)}%) by ${Math.abs(gap).toFixed(1)}pp. People are searching for your brand, but you're losing visibility. Prioritize SEO investment.`
            });
        } else {
            recommendations.push({
                priority: 'medium',
                icon: '📊',
                title: 'Balanced Position',
                message: `Your SOS and SOV are closely aligned (${Math.abs(gap).toFixed(1)}pp gap). To drive growth, aim for SOV to exceed SOS by 5-10 percentage points.`
            });
        }

        // Market position
        const sosRank = [...allBrands].sort((a, b) => b.sos - a.sos).findIndex(b => b.isBrand) + 1;

        if (sosRank === 1) {
            recommendations.push({
                priority: 'low',
                icon: '👑',
                title: 'Brand Demand Leader',
                message: `You lead in Share of Search with ${sos.toFixed(1)}%. Focus on maintaining brand salience and defending against challengers.`
            });
        } else {
            const leader = [...allBrands].sort((a, b) => b.sos - a.sos)[0];
            if (leader) {
                recommendations.push({
                    priority: 'medium',
                    icon: '🎯',
                    title: `Gap to ${leader.name}`,
                    message: `${leader.name} leads SOS with ${leader.sos.toFixed(1)}% vs your ${sos.toFixed(1)}%. Consider brand campaigns targeting their audience.`
                });
            }
        }

        // SOV-specific
        if (sov < 10 && (project.marketKeywords?.length || 0) > 0) {
            recommendations.push({
                priority: 'high',
                icon: '🔍',
                title: 'Low Category Visibility',
                message: `Only ${sov.toFixed(1)}% visibility on market keywords. Focus on SEO improvements for high-volume category terms.`
            });
        }

        return recommendations;
    },

    /**
     * Calculate SOS trends from historical data
     * @param {Object} historicalData - Historical volumes from API
     * @param {Array} brandNames - Array of brand names
     * @returns {Object} - SOS values for now, 6 months ago, 12 months ago per brand
     */
    calculateSOSTrend(historicalData, brandNames) {
        const trends = {};
        const now = new Date();
        const month6Ago = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const month12Ago = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        // Helper to get volume for a specific month
        const getVolumeForMonth = (monthly, year, month) => {
            const entry = monthly.find(m => m.year === year && m.month === month);
            return entry ? entry.volume : 0;
        };

        // Calculate total volumes for each time period
        const periods = [
            { name: 'now', date: now },
            { name: '6m', date: month6Ago },
            { name: '12m', date: month12Ago }
        ];

        periods.forEach(period => {
            let totalVolume = 0;
            const brandVolumes = {};

            brandNames.forEach(name => {
                const data = historicalData[name.toLowerCase()];
                if (data && data.monthly) {
                    const volume = period.name === 'now'
                        ? data.current
                        : getVolumeForMonth(data.monthly, period.date.getFullYear(), period.date.getMonth() + 1);
                    brandVolumes[name] = volume;
                    totalVolume += volume;
                }
            });

            // Calculate SOS for each brand at this time period
            brandNames.forEach(name => {
                if (!trends[name]) trends[name] = {};
                const volume = brandVolumes[name] || 0;
                trends[name][period.name] = totalVolume > 0
                    ? (volume / totalVolume) * 100
                    : 0;
            });
        });

        return trends;
    }
};

// =============================================
// DATAFORSEO API CLIENT
// =============================================
const DataForSEO = {
    BASE_URL: 'https://api.dataforseo.com/v3',

    // Get auth header from settings
    getAuthHeader() {
        const settings = State.getSettings();
        if (!settings.apiLogin || !settings.apiPassword) {
            return null;
        }
        const credentials = btoa(`${settings.apiLogin}:${settings.apiPassword}`);
        return `Basic ${credentials}`;
    },

    // Check if API is configured
    isConfigured() {
        return this.getAuthHeader() !== null;
    },

    // Make authenticated API request
    async request(endpoint, body) {
        const authHeader = this.getAuthHeader();
        if (!authHeader) {
            throw new Error('API credentials not configured. Go to Settings to add your DataForSEO credentials.');
        }

        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.status_message || `API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error - check your connection or CORS settings');
            }
            throw error;
        }
    },

    // Test API connection
    async testConnection() {
        try {
            const result = await this.request('/appendix/user_data', [{}]);
            return {
                success: true,
                balance: result.tasks?.[0]?.result?.[0]?.money?.balance || 0
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch search volume for branded keywords
     * @param {string[]} keywords - Array of brand names (e.g., ["nike", "adidas"])
     * @param {number} locationCode - Location code (2840 = US)
     * @returns {Object} - Map of keyword to volume
     */
    async fetchBrandedVolumes(keywords, locationCode = 2840) {
        if (!keywords || keywords.length === 0) return {};

        const result = await this.request('/keywords_data/google/search_volume/live', [{
            keywords: keywords.map(k => k.toLowerCase()),
            location_code: locationCode,
            language_code: 'en'
        }]);

        const volumes = {};
        const items = result.tasks?.[0]?.result || [];

        items.forEach(item => {
            if (item.keyword && item.search_volume) {
                volumes[item.keyword] = item.search_volume;
            }
        });

        return volumes;
    },

    /**
     * Fetch keyword suggestions using Google autocomplete
     * Returns keywords that people actually search for (more relevant)
     * @param {string} seedKeyword - Category or product term
     * @param {number} limit - Max keywords to return
     * @returns {Array} - Array of relevant keywords with volumes
     */
    async fetchKeywordSuggestions(seedKeyword, limit = 30, locationCode = 2840) {
        if (!seedKeyword) return [];

        const cleanKeyword = seedKeyword.trim().toLowerCase();

        // Use Google autocomplete/suggestions endpoint for more relevant results
        const result = await this.request('/dataforseo_labs/google/keyword_suggestions/live', [{
            keyword: cleanKeyword,
            location_code: locationCode,
            language_code: 'en',
            limit: limit,
            include_serp_info: false,
            include_seed_keyword: false,
            order_by: ['keyword_info.search_volume,desc']
        }]);

        const items = result.tasks?.[0]?.result?.[0]?.items || [];

        return items.map(item => ({
            keyword: item.keyword,
            volume: item.keyword_info?.search_volume || 0,
            competition: item.keyword_info?.competition || 0,
            cpc: item.keyword_info?.cpc || 0
        })).filter(k => k.volume > 0);
    },

    /**
     * Fetch category keyword suggestions based on brand/product name
     * Uses Keyword Ideas endpoint which finds keywords in the same product category
     * @param {string} seedKeyword - Brand or product name (e.g., "lavera", "natural cosmetics")
     * @param {number} limit - Max keywords to return
     * @returns {Array} - Array of category-relevant keywords with volumes
     */
    async fetchKeywordIdeas(seedKeyword, limit = 30, locationCode = 2840) {
        if (!seedKeyword) return [];

        // Clean the keyword
        const cleanKeyword = seedKeyword.trim().toLowerCase();

        const result = await this.request('/dataforseo_labs/google/keyword_ideas/live', [{
            keywords: [cleanKeyword],
            location_code: locationCode,
            language_code: 'en',
            limit: limit,
            include_serp_info: false,
            filters: [
                ['keyword_info.search_volume', '>', 500]
            ],
            order_by: ['keyword_info.search_volume,desc']
        }]);

        const items = result.tasks?.[0]?.result?.[0]?.items || [];

        return items.map(item => ({
            keyword: item.keyword,
            volume: item.keyword_info?.search_volume || 0,
            competition: item.keyword_info?.competition || 0,
            cpc: item.keyword_info?.cpc || 0
        })).filter(k => k.volume > 0);
    },

    /**
     * Fetch related keywords (Google's "searches related to")
     * @param {string} seedKeyword - Brand or product name
     * @returns {Array} - Array of related keywords
     */
    async fetchRelatedKeywords(seedKeyword, limit = 20, locationCode = 2840) {
        if (!seedKeyword) return [];

        const result = await this.request('/dataforseo_labs/google/related_keywords/live', [{
            keyword: seedKeyword.trim().toLowerCase(),
            location_code: locationCode,
            language_code: 'en',
            limit: limit,
            order_by: ['keyword_info.search_volume,desc']
        }]);

        const items = result.tasks?.[0]?.result?.[0]?.items || [];

        return items.map(item => ({
            keyword: item.keyword_data?.keyword || item.keyword,
            volume: item.keyword_data?.keyword_info?.search_volume || 0,
            competition: item.keyword_data?.keyword_info?.competition || 0
        })).filter(k => k.volume > 0);
    },

    /**
     * Fetch historical search volume data for brands
     * Returns monthly volumes for the past year
     * @param {string[]} keywords - Brand names to get history for
     * @param {number} locationCode - Location code
     * @returns {Object} - Historical data by keyword with monthly volumes
     */
    async fetchHistoricalVolumes(keywords, locationCode = 2840) {
        if (!keywords || keywords.length === 0) return {};

        const result = await this.request('/dataforseo_labs/google/historical_search_volume/live', [{
            keywords: keywords.map(k => k.toLowerCase()),
            location_code: locationCode,
            language_code: 'en'
        }]);

        const items = result.tasks?.[0]?.result || [];
        const history = {};

        items.forEach(item => {
            if (item.keyword && item.monthly_searches) {
                // monthly_searches is an array of {year, month, search_volume}
                history[item.keyword] = {
                    current: item.search_volume || 0,
                    monthly: item.monthly_searches.map(m => ({
                        year: m.year,
                        month: m.month,
                        volume: m.search_volume || 0
                    })).sort((a, b) => {
                        // Sort by date descending (most recent first)
                        if (a.year !== b.year) return b.year - a.year;
                        return b.month - a.month;
                    })
                };
            }
        });

        return history;
    },

    /**
     * Fetch SERP positions for domains on specific keywords
     * @param {string[]} keywords - Keywords to check
     * @param {string[]} domains - Domains to find in SERPs
     * @param {number} locationCode - Location code
     * @returns {Object} - Positions by keyword and domain
     */
    async fetchSerpPositions(keywords, domains, locationCode = 2840) {
        if (!keywords || keywords.length === 0 || !domains || domains.length === 0) {
            return { positions: {}, keywordVolumes: {} };
        }

        // Clean domains
        const cleanDomains = domains.map(d =>
            d.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
        );

        // Batch requests (one per keyword)
        const results = {};
        const keywordVolumes = {};

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];

            try {
                const result = await this.request('/serp/google/organic/live/regular', [{
                    keyword: keyword,
                    location_code: locationCode,
                    language_code: 'en',
                    depth: 100
                }]);

                const items = result.tasks?.[0]?.result?.[0]?.items || [];
                const searchInfo = result.tasks?.[0]?.result?.[0]?.search_information || {};

                results[i] = {};
                keywordVolumes[keyword] = searchInfo.search_volume || 0;

                items.forEach(item => {
                    if (item.type === 'organic') {
                        const itemDomain = (item.domain || '').toLowerCase();

                        cleanDomains.forEach((domain, domainIdx) => {
                            if (itemDomain.includes(domain) || domain.includes(itemDomain)) {
                                // Use the brand name (from original domains) as key
                                results[i][domains[domainIdx]] = item.rank_group;
                            }
                        });
                    }
                });
            } catch (error) {
                console.warn(`Failed to fetch SERP for "${keyword}":`, error);
                results[i] = {};
            }
        }

        return { positions: results, keywordVolumes };
    }
};

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

function setActiveNav(activeItem) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function updateApiStatus() {
    const settings = State.getSettings();
    const statusEl = document.getElementById('api-status');

    if (settings.apiLogin && settings.apiPassword) {
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

    updateDashboardStats(projects);

    if (projects.length === 0) {
        document.getElementById('projects-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
    } else {
        document.getElementById('projects-grid').classList.remove('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        renderProjectCards(projects);
    }

    document.getElementById('new-project-btn')?.addEventListener('click', () => openProjectModal());
    document.getElementById('empty-new-btn')?.addEventListener('click', () => openProjectModal());
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
        const statusClass = metrics.status || 'stable';
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
                        <div class="project-metric-value sos">${(metrics.sos || 0).toFixed(1)}%</div>
                        <div class="project-metric-label">SOS</div>
                    </div>
                    <div class="project-metric">
                        <div class="project-metric-value sov">${(metrics.sov || 0).toFixed(1)}%</div>
                        <div class="project-metric-label">SOV</div>
                    </div>
                    <div class="project-metric">
                        <div class="project-metric-change ${metrics.gap >= 0 ? 'positive' : 'negative'}">
                            ${metrics.gap >= 0 ? '↑' : '↓'} ${Math.abs(metrics.gap || 0).toFixed(1)}pp
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
function renderProject(container, projectId) {
    const project = State.getProject(projectId);

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

    const recommendations = State.generateRecommendations(metrics, project);
    renderRecommendations(recommendations);

    // Event listeners
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        setActiveNav(document.querySelector('.nav-item[data-view="dashboard"]'));
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
        setActiveNav(document.querySelector('.nav-item[data-view="settings"]'));
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
    const isConfigured = DataForSEO.isConfigured();
    const demoEl = document.getElementById('api-mode-demo');
    const connectedEl = document.getElementById('api-mode-connected');

    if (demoEl && connectedEl) {
        if (isConfigured) {
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

    if (!DataForSEO.isConfigured()) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', 'Fetching volume...');

    try {
        const volumes = await DataForSEO.fetchBrandedVolumes([brandName]);
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

    if (!DataForSEO.isConfigured()) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Fetching volumes for ${allBrandNames.length} brands...`);

    try {
        const volumes = await DataForSEO.fetchBrandedVolumes(allBrandNames);

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

    // Use category seed if provided, otherwise fall back to brand name
    const searchTerm = categorySeed || brandName;

    if (!searchTerm) {
        showFetchStatus(statusEl, 'error', 'Please enter an industry/category or brand name');
        return;
    }

    if (!DataForSEO.isConfigured()) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Finding keywords for "${searchTerm}"...`);

    try {
        // Get words from the seed to filter results
        const seedWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        // Try keyword suggestions endpoint first (more relevant)
        const [keywordIdeas, relatedKeywords] = await Promise.all([
            DataForSEO.fetchKeywordSuggestions ?
                DataForSEO.fetchKeywordSuggestions(searchTerm, 30).catch(() => []) :
                DataForSEO.fetchKeywordIdeas(searchTerm, 30).catch(() => []),
            DataForSEO.fetchRelatedKeywords(searchTerm, 30).catch(() => [])
        ]);

        // Combine and deduplicate
        const keywordMap = new Map();
        [...keywordIdeas, ...relatedKeywords].forEach(kw => {
            if (kw.keyword && !keywordMap.has(kw.keyword.toLowerCase())) {
                keywordMap.set(kw.keyword.toLowerCase(), kw);
            }
        });

        // Filter: keyword must contain at least one word from the seed category
        const seedLower = searchTerm.toLowerCase();
        const keywords = [...keywordMap.values()]
            .filter(kw => {
                const kwLower = kw.keyword.toLowerCase();
                // Exclude exact match
                if (kwLower === seedLower) return false;
                // Must contain at least one significant word from the seed
                return seedWords.some(word => kwLower.includes(word));
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 20);

        if (keywords.length === 0) {
            showFetchStatus(statusEl, 'warning', 'No matching keywords found. Try different category terms (e.g., "organic skincare", "vegan cosmetics").');
            return;
        }

        // Render checkboxes
        suggestionsList.innerHTML = keywords.map((kw, idx) => `
            <label class="suggestion-item">
                <input type="checkbox" class="suggestion-checkbox" 
                       data-keyword="${escapeHtml(kw.keyword)}" 
                       data-volume="${kw.volume}">
                <span class="suggestion-keyword">${escapeHtml(kw.keyword)}</span>
                <span class="suggestion-volume">${formatNumber(kw.volume)}</span>
            </label>
        `).join('');

        suggestionsContainer.classList.remove('hidden');
        showFetchStatus(statusEl, 'success', `Found ${keywords.length} relevant keywords for "${searchTerm}"`);

        // Add listener to add selected keywords
        suggestionsList.querySelectorAll('.suggestion-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    addKeywordRow(e.target.dataset.keyword, e.target.dataset.volume);
                } else {
                    // Remove keyword row if unchecked
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

    if (!DataForSEO.isConfigured()) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    const allDomains = [
        brandDomain || brandName,
        ...competitors.map(c => c.domain || c.name)
    ].filter(d => d);

    showFetchStatus(statusEl, 'loading', `Fetching SERP positions for ${keywords.length} keywords...`);

    try {
        const { positions, keywordVolumes } = await DataForSEO.fetchSerpPositions(
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

                // Also try to match by brand name
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

/**
 * Fetch historical SOS trends from API and display in project view
 */
async function fetchSOSTrends(project) {
    const statusEl = document.getElementById('trends-fetch-status');
    const summaryEl = document.getElementById('trend-summary');

    if (!DataForSEO.isConfigured()) {
        showFetchStatus(statusEl, 'error', 'API not configured. Go to Settings to add credentials.');
        return;
    }

    // Get all brand names
    const brandName = project.brand?.name;
    const competitorNames = (project.competitors || []).map(c => c.name);
    const allBrands = [brandName, ...competitorNames].filter(n => n);

    if (allBrands.length === 0) {
        showFetchStatus(statusEl, 'error', 'No brands to analyze');
        return;
    }

    showFetchStatus(statusEl, 'loading', `Fetching historical data for ${allBrands.length} brands...`);

    try {
        // Fetch historical volumes
        const historicalData = await DataForSEO.fetchHistoricalVolumes(allBrands);

        if (Object.keys(historicalData).length === 0) {
            showFetchStatus(statusEl, 'warning', 'No historical data available');
            return;
        }

        // Calculate SOS trends
        const trends = State.calculateSOSTrend(historicalData, allBrands);
        const brandTrend = trends[brandName] || {};

        // Update UI
        document.getElementById('sos-12m').textContent = `${(brandTrend['12m'] || 0).toFixed(1)}%`;
        document.getElementById('sos-6m').textContent = `${(brandTrend['6m'] || 0).toFixed(1)}%`;
        document.getElementById('sos-now').textContent = `${(brandTrend['now'] || 0).toFixed(1)}%`;

        // Calculate and display change
        const change = (brandTrend['now'] || 0) - (brandTrend['12m'] || 0);
        const changeEl = document.getElementById('trend-change');
        changeEl.innerHTML = `
            <span class="change-value ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}pp
            </span>
            <span class="change-label">12-month change</span>
        `;

        summaryEl.classList.remove('hidden');

        // Update trend chart with real data
        renderTrendChartWithData(historicalData, brandName, competitorNames);

        showFetchStatus(statusEl, 'success', 'Trend data updated');

        // Store trend data in project
        project.trendData = { historicalData, trends, lastFetched: new Date().toISOString() };
        State.updateProject(project.id, { trendData: project.trendData });

    } catch (error) {
        showFetchStatus(statusEl, 'error', error.message);
    }
}

/**
 * Render trend chart with real historical data
 */
function renderTrendChartWithData(historicalData, brandName, competitorNames) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    // Destroy existing chart if present
    if (window.trendChartInstance) {
        window.trendChartInstance.destroy();
    }

    const brandData = historicalData[brandName.toLowerCase()];
    if (!brandData || !brandData.monthly) return;

    // Get last 12 months of data
    const monthlyData = brandData.monthly.slice(0, 12).reverse();
    const labels = monthlyData.map(m => {
        const date = new Date(m.year, m.month - 1);
        return date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    });

    // Calculate SOS for each month
    const sosData = monthlyData.map((month, idx) => {
        let total = month.volume;
        competitorNames.forEach(name => {
            const compData = historicalData[name.toLowerCase()];
            if (compData && compData.monthly && compData.monthly[idx]) {
                total += compData.monthly[idx].volume || 0;
            }
        });
        return total > 0 ? (month.volume / total) * 100 : 0;
    });

    window.trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `${brandName} SOS`,
                data: sosData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `SOS: ${context.parsed.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: {
                        color: '#71717a',
                        callback: v => v + '%'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#71717a' }
                }
            }
        }
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

    document.getElementById('api-login').value = settings.apiLogin || '';
    document.getElementById('api-password').value = settings.apiPassword || '';
    document.getElementById('stored-projects').textContent = stats.projectCount;
    document.getElementById('storage-used').textContent = stats.storageUsedFormatted;

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

        // Save credentials first before testing
        const newSettings = {
            ...settings,
            apiLogin: document.getElementById('api-login').value.trim(),
            apiPassword: document.getElementById('api-password').value.trim()
        };
        State.saveSettings(newSettings);

        const testResult = await DataForSEO.testConnection();

        if (testResult.success) {
            result.textContent = `✓ Connected! Balance: $${testResult.balance.toFixed(2)}`;
            result.className = 'api-result success';
            updateApiStatus();
        } else {
            result.textContent = `✗ ${testResult.error}`;
            result.className = 'api-result error';
        }
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

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
