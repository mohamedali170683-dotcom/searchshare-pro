/**
 * State Management Module
 * Handles localStorage persistence and state management
 */

const STORAGE_KEYS = {
    PROJECTS: 'searchshare_projects',
    SETTINGS: 'searchshare_settings'
};

// Default settings
const DEFAULT_SETTINGS = {
    apiLogin: '',
    apiPassword: '',
    demoMode: true
};

/**
 * Get all projects from localStorage
 */
export function getProjects() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading projects:', e);
        return [];
    }
}

/**
 * Save projects to localStorage
 */
export function saveProjects(projects) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        return true;
    } catch (e) {
        console.error('Error saving projects:', e);
        return false;
    }
}

/**
 * Get a single project by ID
 */
export function getProject(id) {
    const projects = getProjects();
    return projects.find(p => p.id === id);
}

/**
 * Create a new project
 */
export function createProject(projectData) {
    const projects = getProjects();
    const newProject = {
        id: generateId(),
        ...projectData,
        snapshots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Calculate initial metrics and create first snapshot
    const snapshot = calculateSnapshot(newProject);
    newProject.snapshots.push(snapshot);
    newProject.currentMetrics = snapshot;

    projects.push(newProject);
    saveProjects(projects);

    return newProject;
}

/**
 * Update an existing project
 */
export function updateProject(id, updates) {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return null;

    projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    // Recalculate metrics if data changed
    if (updates.brand || updates.competitors || updates.marketKeywords || updates.positions) {
        const snapshot = calculateSnapshot(projects[index]);
        projects[index].snapshots.push(snapshot);
        projects[index].currentMetrics = snapshot;
    }

    saveProjects(projects);
    return projects[index];
}

/**
 * Delete a project
 */
export function deleteProject(id) {
    const projects = getProjects();
    const filtered = projects.filter(p => p.id !== id);
    saveProjects(filtered);
    return filtered;
}

/**
 * Add a snapshot to a project (for historical tracking)
 */
export function addSnapshot(id) {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return null;

    const snapshot = calculateSnapshot(projects[index]);
    projects[index].snapshots.push(snapshot);
    projects[index].currentMetrics = snapshot;
    projects[index].updatedAt = new Date().toISOString();

    saveProjects(projects);
    return projects[index];
}

/**
 * Calculate metrics snapshot
 */
export function calculateSnapshot(project) {
    const { brand, competitors, marketKeywords, positions } = project;
    const allBrands = [
        { ...brand, isBrand: true },
        ...(competitors || []).map(c => ({ ...c, isBrand: false }))
    ];

    // =========================================
    // SHARE OF SEARCH (SOS)
    // Formula: Brand Volume / Total Brand Volumes
    // =========================================
    const totalBrandVolume = allBrands.reduce((sum, b) => sum + (b.volume || 0), 0);

    allBrands.forEach(b => {
        b.sos = totalBrandVolume > 0
            ? ((b.volume || 0) / totalBrandVolume) * 100
            : 0;
    });

    // =========================================
    // SHARE OF VOICE (SOV)
    // Formula: Visible Volume / Total Market Volume
    // =========================================
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

    // Find brand metrics
    const brandMetrics = allBrands.find(b => b.isBrand);
    const gap = (brandMetrics?.sov || 0) - (brandMetrics?.sos || 0);

    return {
        date: new Date().toISOString().slice(0, 7), // YYYY-MM
        timestamp: new Date().toISOString(),
        brandVolume: brand.volume || 0,
        totalBrandVolume,
        totalMarketVolume,
        sos: brandMetrics?.sos || 0,
        sov: brandMetrics?.sov || 0,
        visibleVolume: brandMetrics?.visibleVolume || 0,
        gap,
        status: gap > 0 ? 'growing' : gap < -5 ? 'declining' : 'neutral',
        allBrands
    };
}

/**
 * Get settings from localStorage
 */
export function getSettings() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

/**
 * Clear all data
 */
export function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

/**
 * Get storage stats
 */
export function getStorageStats() {
    const projects = getProjects();
    const projectsSize = new Blob([JSON.stringify(projects)]).size;
    const settingsSize = new Blob([localStorage.getItem(STORAGE_KEYS.SETTINGS) || '']).size;

    return {
        projectCount: projects.length,
        storageUsed: projectsSize + settingsSize,
        storageUsedFormatted: formatBytes(projectsSize + settingsSize)
    };
}

/**
 * Generate recommendations based on metrics
 */
export function generateRecommendations(snapshot, project) {
    const recommendations = [];
    const { sos, sov, gap, allBrands } = snapshot;
    const brand = allBrands.find(b => b.isBrand);
    const competitors = allBrands.filter(b => !b.isBrand);

    // Growth gap analysis
    if (gap > 5) {
        recommendations.push({
            priority: 'low',
            icon: '🚀',
            title: 'Strong Growth Position',
            message: `Your SOV (${sov.toFixed(1)}%) exceeds SOS (${sos.toFixed(1)}%) by ${gap.toFixed(1)}pp. Based on Binet's research, this "excess share of voice" predicts market share growth. Keep investing in visibility.`
        });
    } else if (gap < -5) {
        recommendations.push({
            priority: 'high',
            icon: '⚠️',
            title: 'Visibility Gap Alert',
            message: `Your SOS (${sos.toFixed(1)}%) exceeds SOV (${sov.toFixed(1)}%) by ${Math.abs(gap).toFixed(1)}pp. People are searching for your brand, but you're losing visibility on category terms. Prioritize SEO investment.`
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
    const sosRank = allBrands.sort((a, b) => b.sos - a.sos).findIndex(b => b.isBrand) + 1;
    const sovRank = allBrands.sort((a, b) => b.sov - a.sov).findIndex(b => b.isBrand) + 1;

    if (sosRank === 1) {
        recommendations.push({
            priority: 'low',
            icon: '👑',
            title: 'Brand Demand Leader',
            message: `You lead in Share of Search with ${sos.toFixed(1)}%. Focus on maintaining brand salience and defending against challenger brands.`
        });
    } else {
        const leader = allBrands.sort((a, b) => b.sos - a.sos)[0];
        recommendations.push({
            priority: 'medium',
            icon: '🎯',
            title: `Gap to ${leader.name}`,
            message: `${leader.name} leads SOS with ${leader.sos.toFixed(1)}% vs your ${sos.toFixed(1)}%. Consider brand campaigns targeting their audience segments.`
        });
    }

    // SOV-specific recommendations
    if (sov < 10 && (project.marketKeywords?.length || 0) > 0) {
        recommendations.push({
            priority: 'high',
            icon: '🔍',
            title: 'Low Category Visibility',
            message: `Only ${sov.toFixed(1)}% visibility on market keywords. Audit your SEO strategy - focus on ranking improvements for high-volume category terms.`
        });
    }

    return recommendations;
}

// Helpers
function generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
