import React, { useState } from 'react';
import {
  FolderLock,
  Plus,
  Lock,
  Calendar,
  Trash2,
  User,
  GraduationCap,
  Briefcase,
  CreditCard,
  FileCheck,
  Search,
  X,
  Zap,
  ShieldCheck,
  ChevronRight,
  Upload,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Clock,
  Eye,
  AlertTriangle, RefreshCw, CheckCircle2, Landmark
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { VaultCategory, VaultItem, DocumentAnalysisResult } from '../types';
import { MaskedValue } from '../components/common/MaskedValue';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { buildVaultExpiryPayload } from '../utils/executionBuilder';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { FormFillingAssistantModal } from '../components/forms/FormFillingAssistantModal';
import { LetterGeneratorModal } from '../components/letters/LetterGeneratorModal';

export const LifeVault: React.FC = () => {
  const { vaultItems, addVaultItem, updateVaultItem, deleteVaultItem, analyzedDocuments, recalculateInsights } = useLifeOS();
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | 'all' | 'analyzed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isFormFillingModalOpen, setIsFormFillingModalOpen] = useState<boolean>(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [selectedAnalyzedDoc, setSelectedAnalyzedDoc] = useState<DocumentAnalysisResult | null>(null);
  const [activeExecutionPayload, setActiveExecutionPayload] = useState<ExecutionPayload | null>(null);
  const [missingInfoInput, setMissingInfoInput] = useState<string>('');
  const [showMissingInput, setShowMissingInput] = useState<boolean>(false);

  const handleProvideMissingInfo = () => {
    if (!selectedItem || !missingInfoInput.trim()) return;
    
    // Merge new info into extractedData
    const updatedExtractedData = {
      ...(selectedItem.extractedData || {}),
      userProvidedAdditionalInfo: missingInfoInput.trim()
    };
    
    // Update the vault item
    updateVaultItem(selectedItem.id, {
      extractedData: updatedExtractedData,
      isIncomplete: false,
      status: 'verified',
      missingFields: []
    });
    
    // Update local state to reflect UI change immediately
    setSelectedItem(prev => prev ? {
      ...prev,
      extractedData: updatedExtractedData,
      isIncomplete: false,
      status: 'verified',
      missingFields: []
    } : null);
    
    setMissingInfoInput('');
    setShowMissingInput(false);
  };


  // Form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<VaultCategory>('identity');
  const [newDocType, setNewDocType] = useState<string>('');
  const [newIdentifier, setNewIdentifier] = useState<string>('');
  const [newIsSensitive, setNewIsSensitive] = useState<boolean>(true);
  const [newIssuer, setNewIssuer] = useState<string>('');
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const CATEGORIES: { id: VaultCategory; label: string; icon: any }[] = [
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'financial', label: 'Financial', icon: CreditCard },
    { id: 'documents', label: 'Legal & Insurance', icon: FileCheck },
    { id: 'government', label: 'Government', icon: Landmark },
  ];

  const filteredItems = vaultItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.issuer && item.issuer.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredAnalyzedDocs = analyzedDocuments.filter(doc => {
    const matchesSearch = (doc.title || doc.documentType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.issuingOrganization || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDocType.trim()) return;

    addVaultItem({
      category: newCategory,
      title: newTitle.trim(),
      documentType: newDocType.trim(),
      identifierNumber: newIdentifier.trim() || undefined,
      isSensitiveIdentifier: newIsSensitive,
      issuer: newIssuer.trim() || undefined,
      expiryDate: newExpiryDate || undefined,
      notes: newNotes.trim() || undefined,
      status: newExpiryDate ? (new Date(newExpiryDate) < new Date(Date.now() + 60 * 86400000) ? 'expiring_soon' : 'verified') : 'verified',
      isEncryptedInVault: true,
      fields: newIdentifier ? [
        { id: 'f_id', label: 'Identifier', value: newIdentifier.trim(), isSensitive: newIsSensitive, isMaskedByDefault: newIsSensitive }
      ] : []
    });

    // Reset form
    setNewTitle('');
    setNewDocType('');
    setNewIdentifier('');
    setNewIssuer('');
    setNewExpiryDate('');
    setNewNotes('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Quick Action Buttons */}
      {refreshMessage && (
        <div className={`p-3 mb-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${refreshMessage.includes('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {refreshMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Life Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your encrypted personal locker for identity records, education, and documents.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={async () => {
              if (recalculateInsights) {
                setIsRefreshing(true);
                setRefreshMessage(null);
                try {
                  await recalculateInsights();
                  setRefreshMessage('Life Vault refreshed successfully.');
                  setTimeout(() => setRefreshMessage(null), 3000);
                } catch (e: any) {
                  setRefreshMessage('Refresh error: ' + e.message);
                } finally {
                  setIsRefreshing(false);
                }
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-opacity cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add record</span>
          </button>

        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Vault ({vaultItems.length})
          </button>

          {analyzedDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory('analyzed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'analyzed'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Analyzed ({analyzedDocuments.length})</span>
            </button>
          )}

          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = vaultItems.filter(v => v.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, document type, or issuer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>
      </div>

      {/* If Analyzed category selected, show AI Document Intelligence cards */}
      {selectedCategory === 'analyzed' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Documents Analyzed with Gemini Multimodal Intelligence ({filteredAnalyzedDocs.length})
            </span>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload another document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredAnalyzedDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedAnalyzedDoc(doc)}
                className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-indigo-100 dark:border-indigo-950/60 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold tracking-wider uppercase">
                      {doc.documentType || 'Analyzed Record'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Confidence: {doc.confidence || 'High'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-2">
                    {doc.title || doc.documentType}
                  </h4>

                  {doc.issuingOrganization && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Issued by: {doc.issuingOrganization}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {doc.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px]">
                    {doc.expiryDate ? `Expires: ${doc.expiryDate}` : 'Permanent Record'}
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <span>View AI Extract</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Regular Vault Items List */
        filteredItems.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 space-y-3">
            <FolderLock className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Your secure vault is empty.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Add an important document or upload a contract/policy to analyze with Gemini.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload & Understand</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              >
                Add manual record
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isExpiring = item.status === 'expiring_soon';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {item.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.documentType} {item.issuer ? `· ${item.issuer}` : ''}
                        </p>
                      </div>

                      {isExpiring && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 shrink-0">
                          Expiring soon
                        </span>
                      )}
                    </div>

                    {item.identifierNumber && (
                      <div className="my-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[11px] font-medium">Record:</span>
                        <MaskedValue value={item.identifierNumber} isSensitive={item.isSensitiveIdentifier} />
                      </div>
                    )}
                  </div>

                  {item.isIncomplete && (
                    <div className="mb-2 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-900/60 flex items-center gap-1 w-max">
                      <AlertTriangle className="w-3 h-3" />
                      Missing Information
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                      {item.hasExpiry === false ? 'Permanent record' : item.expiryDate ? `Expires: ${item.expiryDate}` : 'No Expiry Set'}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1">
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Item Detail Modal (Progressive Disclosure) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedItem.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditingItem ? 'Edit Document Data' : selectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedItem(null); setIsEditingItem(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEditingItem ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                      value={editFormData.title || ''}
                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Document Type</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.documentType || ''}
                        onChange={(e) => setEditFormData({...editFormData, documentType: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Category</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.category || ''}
                        onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                      >
                        <option value="identity">Identity</option>
                        <option value="education">Education</option>
                        <option value="financial">Financial</option>
                        <option value="government">Government</option>
                        <option value="documents">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Issuer / Authority</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.issuer || ''}
                        onChange={(e) => setEditFormData({...editFormData, issuer: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Expiration (YYYY-MM-DD)</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.expiryDate || ''}
                        placeholder="Leave blank if permanent"
                        onChange={(e) => setEditFormData({...editFormData, expiryDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-2">Structured Data</span>
                  <div className="space-y-3">
                    {Object.entries(editFormData.extractedData || {}).map(([key, value], idx) => (
                      <div key={idx}>
                        <label className="block text-[10px] text-indigo-500 font-medium mb-1">{key}</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                          value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          onChange={(e) => {
                            setEditFormData({
                              ...editFormData,
                              extractedData: {
                                ...editFormData.extractedData,
                                [key]: e.target.value
                              }
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingItem(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateVaultItem(selectedItem.id, editFormData);
                      // Force local update so it feels instant
                      setSelectedItem({...selectedItem, ...editFormData});
                      setIsEditingItem(false);
                      // Optionally we can trigger re-evaluation here
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // Original View Mode
              <>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Document Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.documentType}</span>
                  </div>

                  {selectedItem.issuer && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500">Issuer / Authority</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.issuer}</span>
                    </div>
                  )}

                  {selectedItem.identifierNumber && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 items-center">
                      <span className="text-slate-500">Masked Identifier</span>
                      <MaskedValue value={selectedItem.identifierNumber} isSensitive={selectedItem.isSensitiveIdentifier} />
                    </div>
                  )}

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Expiration</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedItem.expiryDate || 'Permanent / No Expiration'}
                    </span>
                  </div>

                  {selectedItem.notes && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-1">Notes</span>
                      <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedItem.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.extractedData && Object.keys(selectedItem.extractedData).length > 0 && (
                  <div className="pt-2">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Structured AI Extract</span>
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                      {Object.entries(selectedItem.extractedData).map(([key, value], idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.isIncomplete && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Provide Missing Information
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed">
                      Important details (such as {selectedItem.missingFields?.join(', ') || 'required fields'}) could not be extracted from the document.
                    </p>
                    {showMissingInput ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                          placeholder="Enter missing details..."
                          value={missingInfoInput}
                          onChange={(e) => setMissingInfoInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleProvideMissingInfo}
                          disabled={!missingInfoInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMissingInput(true)}
                        className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Provide Now &rarr;
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Isolated by user account. Never exposed without authorization.</span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormData(JSON.parse(JSON.stringify(selectedItem)));
                        setIsEditingItem(true);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      Edit Data
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteVaultItem(selectedItem.id);
                        setSelectedItem(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedItem(null); setIsEditingItem(false); }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add to Life Vault
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as VaultCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="identity">Identity</option>
                  <option value="education">Education</option>
                  <option value="employment">Employment</option>
                  <option value="financial">Financial</option>
                  <option value="documents">Legal & Insurance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport, Degree Certificate, Health Insurance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Passport"
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issuer / Authority
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Govt / University"
                    value={newIssuer}
                    onChange={(e) => setNewIssuer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Identifier Number
                  </label>
                  <input
                    type="text"
                    placeholder="Masked automatically"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analyzed Document Detail Modal */}
      {selectedAnalyzedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl p-5 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase">
                  {selectedAnalyzedDoc.documentType || 'Analyzed'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedAnalyzedDoc.title || 'Document Extract'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnalyzedDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Summary</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedAnalyzedDoc.summary}
                </p>
              </div>

              {selectedAnalyzedDoc.importantClauses && selectedAnalyzedDoc.importantClauses.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Important Clauses</span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    {selectedAnalyzedDoc.importantClauses.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalyzedDoc.deadlines && selectedAnalyzedDoc.deadlines.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">Extracted Deadlines</span>
                  <ul className="space-y-1 text-amber-900 dark:text-amber-300">
                    {selectedAnalyzedDoc.deadlines.map((dl, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span>{dl.title}</span>
                        <strong className="font-mono text-[11px]">{dl.dueDate}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAnalyzedDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload & Intelligence Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Form Filling Assistant Modal */}
      <FormFillingAssistantModal
        isOpen={isFormFillingModalOpen}
        onClose={() => setIsFormFillingModalOpen(false)}
      />

      {/* Formal Letter Generator Modal */}
      <LetterGeneratorModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
      />

      {/* 1-Place Execution Modal */}
      <OnePlaceExecutionModal
        isOpen={Boolean(activeExecutionPayload)}
        onClose={() => setActiveExecutionPayload(null)}
        payload={activeExecutionPayload}
      />
    </div>
  );
};
