'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { useDocuments } from '@/hooks/useDocuments';
import { useChatStream } from '@/hooks/useChatStream';
import { Citation } from '@/types/chat';
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
    handleDelete,
  } = useDocuments();

  const {
    messages,
    isStreaming,
    activeCitation,
    setActiveCitation,
    sendMessage,
    stopStreaming,
    clearChat,
  } = useChatStream(selectedDocIds);

  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // When a citation badge in chat is clicked, set the active citation and open the inspector
  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setIsInspectorOpen(true);
    const targetDoc = documents.find((d) => d.id === citation.doc_id);
    if (targetDoc) {
      setActivePreviewDoc(targetDoc);
    }
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
      />

      {/* Main 3-Pane Split Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Document Management */}
        <Sidebar
          documents={documents}
          selectedDocIds={selectedDocIds}
          activePreviewDoc={activePreviewDoc}
          uploadingFiles={uploadingFiles}
          onUpload={handleUpload}
          onToggleSelect={toggleDocumentSelection}
          onSelectAll={selectAllDocuments}
          onClearAll={clearDocumentSelection}
          onSelectPreview={(doc) => {
            setActivePreviewDoc(doc);
            setActiveCitation(null);
            setIsInspectorOpen(true);
          }}
          onDelete={handleDelete}
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
    </div>
  );
}
