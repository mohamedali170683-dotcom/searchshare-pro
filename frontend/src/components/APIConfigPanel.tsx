import React, { useState } from 'react';
import { LOCATIONS } from '../types';
import { ChevronDown, ChevronUp, Key, Globe, Building2, Loader2 } from 'lucide-react';

interface APIConfigPanelProps {
  onFetch: (config: {
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
  }) => Promise<void>;
  loading: boolean;
}

export const APIConfigPanel: React.FC<APIConfigPanelProps> = ({ onFetch, loading }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('lavera.de');
  const [location, setLocation] = useState('germany');

  const handleFetch = async () => {
    await onFetch({
      login,
      password,
      domain,
      locationCode: LOCATIONS[location],
      languageCode: 'en'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Key size={20} className="text-gray-500" />
          <span className="font-medium text-gray-700">API Configuration</span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DataForSEO Login
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DataForSEO Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="API password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Building2 size={14} />
                  Target Domain
                </div>
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Globe size={14} />
                  Location
                </div>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="germany">Germany</option>
                <option value="usa">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="france">France</option>
                <option value="spain">Spain</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleFetch}
              disabled={loading || !login || !password || !domain}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Collapse
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Get your DataForSEO credentials at{' '}
            <a href="https://dataforseo.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
              dataforseo.com
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default APIConfigPanel;
