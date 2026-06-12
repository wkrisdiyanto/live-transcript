import React, { useState, useRef, useEffect } from "react";
import { TranscriptSegment, TranscriptionSource } from "../types";
import { Search, Edit2, Check, Plus, Copy, CheckSquare, Sparkles, MessageSquare, CornerDownLeft } from "lucide-react";

interface TranscriptAreaProps {
  segments: TranscriptSegment[];
  isRecording: boolean;
  onEditSegment: (id: string, newText: string) => void;
  onAddManualSegment: (text: string) => void;
  langCode: string;
}

export default function TranscriptArea({
  segments,
  isRecording,
  onEditSegment,
  onAddManualSegment,
  langCode,
}: TranscriptAreaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [manualNote, setManualNote] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom on new segments, only if already scrolled near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom || segments.length <= 1) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [segments]);

  const handleStartEdit = (seg: TranscriptSegment) => {
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const handleSaveEdit = (id: string) => {
    onEditSegment(id, editText);
    setEditingId(null);
  };

  const handleKeyPressEdit = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(id);
    }
  };

  const handleAddManualNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualNote.trim()) return;
    onAddManualSegment(manualNote);
    setManualNote("");
  };

  const handleCopyTranscript = () => {
    const textToCopy = segments.map(s => `[${s.timestamp}] (${s.source === TranscriptionSource.MIC ? 'Mic' : 'Screen'}): ${s.text}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
  };

  const filteredSegments = segments.filter(s => 
    s.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="transcript-area" className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      
      {/* Header with search */}
      <div id="transcript-header" className="p-4 border-b border-slate-800 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-slate-100 text-sm tracking-tight" id="transcript-title">Hasil Transkripsi Langsung</h2>
        </div>

        <div className="flex items-center gap-2" id="search-bar-wrap">
          {/* Search bar */}
          <div id="transcript-search" className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              id="search-transcript"
              type="text"
              placeholder="Cari kata kunci..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48 transition-all duration-150"
            />
          </div>

          {/* Copy Button */}
          {segments.length > 0 && (
            <button
              id="btn-copy-clipboard"
              type="button"
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg text-xs transition-colors duration-150"
              title="Salin semua teks"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Salin</span>
            </button>
          )}
        </div>
      </div>

      {/* Main logging list */}
      <div
        id="transcript-scrollbox"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[220px]"
      >
        {filteredSegments.length === 0 ? (
          <div id="empty-transcript-state" className="h-full flex flex-col items-center justify-center py-20 text-center">
            {isRecording ? (
              <div className="space-y-3">
                <span className="relative flex h-3 w-3 mx-auto">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <p className="text-xs text-slate-400 italic">Mendengarkan ucapan... Silakan mulai berbicara atau mainkan video.</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-sm">
                <Sparkles className="w-6 h-6 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500" id="msg-start-note">
                  Belum ada pembicaraan terekam. Pilih input sumber di sebelah kanan lalu klik tombol <span className="font-semibold text-slate-400">Mulai</span> untuk memulai.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isEditing = editingId === seg.id;
            const isMicSource = seg.source === TranscriptionSource.MIC;
            
            return (
              <div
                id={`seg-container-${seg.id}`}
                key={seg.id}
                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 ${
                  seg.isFinal 
                    ? "bg-slate-950/20 border-slate-800/60" 
                    : "bg-slate-950/50 border-dashed border-indigo-800/40 animate-pulse-subtle"
                }`}
              >
                {/* Meta details (Source and Local Time) */}
                <div id="seg-avatar" className="flex flex-col items-center shrink-0 w-12 sm:w-16">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${
                    isMicSource 
                      ? "bg-indigo-950/40 text-indigo-400 border border-indigo-800/30" 
                      : "bg-sky-950/40 text-sky-400 border border-sky-800/30"
                  }`}>
                    {isMicSource ? "🎤 Mic" : "🖥️ Layar"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5">{seg.timestamp}</span>
                </div>

                {/* Text string */}
                <div id="seg-body" className="flex-1 min-w-0 pr-2">
                  {isEditing ? (
                    <div id="editing-textbox" className="flex items-center gap-1.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleKeyPressEdit(e, seg.id)}
                        className="w-full bg-slate-950 text-xs text-slate-200 border border-indigo-600 rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
                        autoFocus
                      />
                      <button
                        id={`btn-edit-confirm-${seg.id}`}
                        onClick={() => handleSaveEdit(seg.id)}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition duration-150 shrink-0"
                        title="Simpan"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p
                      id={`text-paragraph-${seg.id}`}
                      onDoubleClick={() => handleStartEdit(seg)}
                      title="Klik dua kali untuk mengedit"
                      className={`text-xs leading-relaxed text-slate-200 break-words ${!seg.isFinal ? "text-slate-400" : ""}`}
                    >
                      {seg.text}
                    </p>
                  )}
                </div>

                {/* Edit Button trigger */}
                {!isEditing && (
                  <button
                    id={`btn-trigger-edit-${seg.id}`}
                    onClick={() => handleStartEdit(seg)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transitionduration-150 self-start shrink-0"
                    title="Edit teks transkripsi"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual catat / append footer */}
      <div id="manual-input-footer" className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <form onSubmit={handleAddManualNote} className="w-full flex items-center gap-2" id="form-note-append">
          <input
            id="input-manual-note"
            type="text"
            placeholder="Ketik catatan tambahan / poin yang terlewat untuk disisipkan..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            disabled={!isRecording}
            className="flex-1 bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-xl px-3 py-2.5 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-0 disabled:opacity-50 transition"
          />
          <button
            id="btn-note-submit"
            type="submit"
            disabled={!isRecording || !manualNote.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition duration-150 shrink-0 flex items-center justify-center gap-1.5"
            title="Tambahkan catatan"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Sisipkan</span>
          </button>
        </form>
      </div>
    </div>
  );
}
