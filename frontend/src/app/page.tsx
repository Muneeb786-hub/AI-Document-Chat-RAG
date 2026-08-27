'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { CommandPalette } from '@/components/common/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useDocuments } from '@/hooks/useDocuments';
import { useChatStream } from '@/hooks/useChatStream';
import { Citation, RAGSettings, DEFAULT_RAG_SETTINGS } from '@/types/chat';
import { exportChatAsMarkdown, exportChatAsJSON } from '@/lib/export';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function Home() {
  const {
    documents,
    selectedDocIds,
    activePreviewDoc,
    uploadingFiles,
    setActivePreviewDoc,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    handleUpload,
    handleLoadSample,
    handleDelete,
  } = useDocuments();

  const [ragSettings, setRagSettings] = useState<RAGSettings>(DEFAULT_RAG_SETTINGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const {
    messages,
    isStreaming,
    activeCitation,
    setActiveCitation,
    sendMessage,
    stopStreaming,
    clearChat,
  } = useChatStream(selectedDocIds, ragSettings);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K and Cmd+B / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setIsSidebarOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When a citation badge in chat is clicked, set the active citation and open the inspector
  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setIsInspectorOpen(true);
    const targetDoc = documents.find((d) => d.id === citation.doc_id);
    if (targetDoc) {
      setActivePreviewDoc(targetDoc);
    }
  };

  // Cross-document comparative query trigger
  const handleCompareSelected = () => {
    if (selectedDocIds.length < 2) return;
    const selectedNames = documents
      .filter((d) => selectedDocIds.includes(d.id))
      .map((d) => d.original_filename || d.filename)
      .join(', ');

    sendMessage(
      `Perform a comprehensive comparative analysis between the selected documents (${selectedNames}). Detail key differences, architectural approaches, and quantitative metrics in a side-by-side format.`
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090d16]">
      {/* Top Navigation Bar */}
      <Header
        documentCount={documents.length}
        selectedCount={selectedDocIds.length}
        messages={messages}
        documents={documents}
        onClearChat={clearChat}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main 3-Pane Split Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Document Management with Collapse Support */}
        <Sidebar
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
          documents={documents}
          selectedDocIds={selectedDocIds}
          activePreviewDoc={activePreviewDoc}
          uploadingFiles={uploadingFiles}
          onUpload={handleUpload}
          onLoadSample={handleLoadSample}
          onToggleSelect={toggleDocumentSelection}
          onSelectAll={selectAllDocuments}
          onClearAll={clearDocumentSelection}
          onSelectPreview={(doc) => {
            setActivePreviewDoc(doc);
            setActiveCitation(null);
            setIsInspectorOpen(true);
          }}
          onDelete={handleDelete}
          onCompareSelected={handleCompareSelected}
        />

        {/* Center Main: Interactive Chat Feed */}
        <main className="flex-1 flex flex-col min-w-0 h-[calc(100vh-4rem)] relative">
          <ChatContainer
            messages={messages}
            isStreaming={isStreaming}
            activeCitation={activeCitation}
            selectedDocCount={selectedDocIds.length}
            onSendMessage={sendMessage}
            onStopStreaming={stopStreaming}
            onCitationClick={handleCitationClick}
          />

          {/* Toggle Inspector Floating Button */}
          <button
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-lg backdrop-blur-sm"
            title={isInspectorOpen ? 'Collapse Document Inspector' : 'Expand Document Inspector'}
          >
            {isInspectorOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </main>

        {/* Right Drawer: Document & Grounding Inspector */}
        {isInspectorOpen && (
          <aside className="w-80 md:w-96 shrink-0 h-[calc(100vh-4rem)] transition-all duration-300">
            <DocumentViewer
              document={activePreviewDoc}
              activeCitation={activeCitation}
              onClose={() => setIsInspectorOpen(false)}
            />
          </aside>
        )}
      </div>

      {/* Interactive Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documents}
        onSelectDocument={(doc) => {
          setActivePreviewDoc(doc);
          setIsInspectorOpen(true);
        }}
        onLoadSample={handleLoadSample}
        onCompareSelected={handleCompareSelected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClearChat={clearChat}
        onExportMarkdown={() => exportChatAsMarkdown(messages, documents)}
        onExportJson={() => exportChatAsJSON(messages, documents)}
      />

      {/* RAG Engine Parameters Tuning Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ragSettings}
        onSaveSettings={(newSettings) => setRagSettings(newSettings)}
      />
    </div>
  );
}
