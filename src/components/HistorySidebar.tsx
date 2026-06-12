import { useState } from "react";
import { SavedSession } from "../types";
import { History, Search, Trash2, Calendar, FileText, ChevronRight } from "lucide-react";

interface HistorySidebarProps {
  sessions: SavedSession[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onStartNewSession: () => void;
}

export default function HistorySidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
  onStartNewSession,
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) => {
    const titleMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const transcriptMatch = s.rawTranscript.toLowerCase().includes(searchQuery.toLowerCase());
    const summaryMatch = s.summary?.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.summary?.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || transcriptMatch || summaryMatch;
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="history-sidebar" className="w-full lg:w-80 bg-slate-900/40 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Header */}
      <div id="sidebar-header" className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" id="hist-icon" />
          <h2 className="font-semibold text-slate-100 text-sm tracking-tight" id="sidebar-title">Riwayat Sesi</h2>
        </div>
        <span id="session-count" className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono">
          {sessions.length}
        </span>
      </div>

      {/* Action Bar */}
      <div id="sidebar-actions" className="p-3 gap-2 flex flex-col">
        <button
          id="btn-new-session"
          onClick={onStartNewSession}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-md hover:shadow-indigo-900/20 active:translate-y-px transition duration-150 text-center flex items-center justify-center gap-2"
        >
          <span>+ Sesi Baru</span>
        </button>

        {/* Search */}
        <div id="search-container" className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            id="search-input"
            type="text"
            placeholder="Cari transkrip / riwayat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 text-xs text-slate-200 border border-slate-800 rounded-lg placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-150"
          />
        </div>
      </div>

      {/* List */}
      <div id="sidebar-list" className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Placeholder Sesi Baru Aktif */}
        {selectedSessionId === null && (
          <div
            id="session-item-draft"
            className="group flex items-center justify-between p-3 rounded-xl cursor-default select-none transition border duration-150 bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 mb-2"
          >
            <div id="item-info" className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded-md animate-pulse">
                  ✨ Sesi Aktif
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Draf Baru
                </span>
              </div>
              <h3 className="font-semibold text-xs text-white">
                Input Siap Direkam
              </h3>
              <p className="text-[10px] text-slate-400/90 mt-0.5">
                Konfigurasikan lalu klik Mulai
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
        )}

        {filteredSessions.length === 0 ? (
          selectedSessionId !== null && (
            <div id="no-history-state" className="text-center py-12 px-4">
              <p className="text-xs text-slate-500 italic">
                {searchQuery ? "Sesi tidak ditemukan" : "Belum ada riwayat transkrip"}
              </p>
            </div>
          )
        ) : (
          filteredSessions.map((session) => {
            const isSelected = session.id === selectedSessionId;
            const displayTitle = session.summary?.title || session.name || "Sesi Tanpa Judul";
            
            return (
              <div
                id={`session-item-${session.id}`}
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer select-none transition border duration-150 ${
                  isSelected
                    ? "bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                    : "bg-slate-950/40 hover:bg-slate-800/50 border-transparent text-slate-300"
                }`}
              >
                <div id="item-info" className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded-md">
                      {session.sourceType === "MICROPHONE" ? "🎤 Mic" : "🖥️ Layar"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {session.language === "id-ID" ? "ID" : "EN"}
                    </span>
                  </div>
                  <h3 className="font-medium text-xs truncate text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {displayTitle}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{formatDate(session.dateTime)}</span>
                  </div>
                </div>

                <div id="item-actions" className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    id={`btn-delete-${session.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition duration-150"
                    title="Hapus riwayat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Footer */}
      {sessions.length > 0 && (
        <div id="sidebar-footer" className="p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            id="btn-clear-all"
            onClick={onClearAll}
            className="w-full text-center text-[11px] text-slate-500 hover:text-rose-400 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-rose-950/20 transition duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Semua Sesi</span>
          </button>
        </div>
      )}
    </div>
  );
}
