import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Building2, Users, Tag, Settings, Loader2 } from 'lucide-react';
import { LOCATIONS } from '../types';
import { Competitor } from './CompetitorManager';
import { CategoryKeyword } from './CategoryKeywordsManager';

interface ProjectConfig {
  projectName: string;
  brandName: string;
  brandDomain: string;
  brandKeywords: string[];
  locationCode: number;
  languageCode: string;
  competitors: Competitor[];
  categoryKeywords: CategoryKeyword[];
}

interface ProjectSetupWizardProps {
  onComplete: (config: ProjectConfig) => void;
  onCancel: () => void;
  apiCredentials: { login: string; password: string };
}

type Step = 'brand' | 'competitors' | 'keywords' | 'review';

const STEPS: { id: Step; title: string; icon: React.ReactNode }[] = [
  { id: 'brand', title: 'Your Brand', icon: <Building2 size={20} /> },
  { id: 'competitors', title: 'Competitors', icon: <Users size={20} /> },
  { id: 'keywords', title: 'Keywords', icon: <Tag size={20} /> },
  { id: 'review', title: 'Review', icon: <Settings size={20} /> }
];

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  onComplete,
  onCancel,
  apiCredentials
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('brand');
  const [loading, setLoading] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDomain, setBrandDomain] = useState('');
  const [brandKeywords, setBrandKeywords] = useState('');
  const [location, setLocation] = useState('germany');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categoryKeywords, setCategoryKeywords] = useState<CategoryKeyword[]>([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', domain: '' });
  const [newKeyword, setNewKeyword] = useState('');

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'brand':
        return projectName.trim() && brandName.trim() && brandDomain.trim();
      case 'competitors':
        return competitors.length >= 1;
      case 'keywords':
        return categoryKeywords.length >= 1;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleComplete = () => {
    const config: ProjectConfig = {
      projectName,
      brandName,
      brandDomain: brandDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''),
      brandKeywords: brandKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k),
      locationCode: LOCATIONS[location],
      languageCode: 'en',
      competitors,
      categoryKeywords
    };

    // Add brand name to brand keywords if not already there
    if (!config.brandKeywords.includes(brandName.toLowerCase())) {
      config.brandKeywords.unshift(brandName.toLowerCase());
    }

    onComplete(config);
  };

  const addCompetitor = () => {
    if (!newCompetitor.name.trim() || !newCompetitor.domain.trim()) return;

    setCompetitors([
      ...competitors,
      {
        id: Date.now().toString(),
        brandName: newCompetitor.name.trim(),
        domain: newCompetitor.domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''),
        brandKeywords: [newCompetitor.name.trim().toLowerCase()]
      }
    ]);
    setNewCompetitor({ name: '', domain: '' });
  };

  const addKeyword = () => {
    const keywords = newKeyword.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    const newKws = keywords
      .filter(k => !categoryKeywords.some(ck => ck.keyword === k))
      .map((k, i) => ({
        id: Date.now().toString() + i,
        keyword: k,
        searchVolume: 0
      }));

    setCategoryKeywords([...categoryKeywords, ...newKws]);
    setNewKeyword('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6">
          <h2 className="text-2xl font-bold">Create New Project</h2>
          <p className="text-emerald-100">Set up your Share of Search & Voice analysis</p>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center gap-2 ${
                    idx <= currentStepIndex ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      idx < currentStepIndex
                        ? 'bg-emerald-600 text-white'
                        : idx === currentStepIndex
                        ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {idx < currentStepIndex ? <Check size={16} /> : step.icon}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      idx < currentStepIndex ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {/* Step 1: Brand */}
          {currentStep === 'brand' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Lavera Q1 2025 Analysis"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g., Lavera"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Domain</label>
                  <input
                    type="text"
                    value={brandDomain}
                    onChange={(e) => setBrandDomain(e.target.value)}
                    placeholder="e.g., lavera.de"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Keywords (comma-separated)
                </label>
                <textarea
                  value={brandKeywords}
                  onChange={(e) => setBrandKeywords(e.target.value)}
                  placeholder="e.g., lavera, lavera naturkosmetik, lavera lippenstift"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  These are brand-specific search terms used for Share of Search
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="germany">Germany</option>
                  <option value="usa">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="france">France</option>
                  <option value="spain">Spain</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Competitors */}
          {currentStep === 'competitors' && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Add your competitors. Their brand search volume will be compared with yours.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  placeholder="Brand name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={newCompetitor.domain}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
                  placeholder="Domain"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={addCompetitor}
                  disabled={!newCompetitor.name.trim() || !newCompetitor.domain.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
                >
                  Add
                </button>
              </div>

              {competitors.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {competitors.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 text-sm">{c.brandName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{c.domain}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setCompetitors(competitors.filter(x => x.id !== c.id))}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {competitors.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Add at least one competitor</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Keywords */}
          {currentStep === 'keywords' && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Add category keywords (non-brand). These are used to calculate Share of Voice.
              </p>

              <div className="flex gap-4">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Enter keywords (comma-separated)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                />
                <button
                  onClick={addKeyword}
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
                >
                  Add
                </button>
              </div>

              {categoryKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {categoryKeywords.map(kw => (
                    <span
                      key={kw.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                    >
                      {kw.keyword}
                      <button
                        onClick={() => setCategoryKeywords(categoryKeywords.filter(k => k.id !== kw.id))}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500">
                {categoryKeywords.length} keywords added. Search volumes will be fetched after setup.
              </p>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Your Project</h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Project Details</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name:</dt>
                      <dd className="font-medium">{projectName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Brand:</dt>
                      <dd className="font-medium">{brandName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Domain:</dt>
                      <dd className="font-medium">{brandDomain}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Location:</dt>
                      <dd className="font-medium capitalize">{location}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Brand Keywords:</dt>
                      <dd className="font-medium">{brandKeywords.split(',').filter(k => k.trim()).length + 1}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Competitors:</dt>
                      <dd className="font-medium">{competitors.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Category Keywords:</dt>
                      <dd className="font-medium">{categoryKeywords.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Ready to analyze!</strong> After creating the project, we'll fetch search volumes
                  and SERP positions from DataForSEO to calculate your Share of Search and Share of Voice.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={currentStepIndex === 0 ? onCancel : goPrev}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={currentStep === 'review' ? handleComplete : goNext}
            disabled={!canProceed() || loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : currentStep === 'review' ? (
              <>
                <Check size={18} />
                Create Project
              </>
            ) : (
              <>
                Next
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSetupWizard;
