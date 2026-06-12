import { useState, useEffect } from "react";
import { AISessionSummary } from "../types";
import { CheckCircle2, ChevronRight, Copy, Check, FileText, Sparkles, BookOpen, Clock, Tag } from "lucide-react";

interface SummaryDashboardProps {
  summary: AISessionSummary | null;
  isLoading: boolean;
  onGenerateSummary: () => void;
  hasTranscript: boolean;
}

export default function SummaryDashboard({
  summary,
  isLoading,
  onGenerateSummary,
  hasTranscript,
}: SummaryDashboardProps) {
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingQuotes = [
    "Menghubungkan ke Gemini 3.5 Flash...",
    "Membaca seluruh transkrip diskusi...",
    "Mengekstrak gagasan & perdebatan penting...",
    "Merumuskan rencana aksi & tugas kerja...",
    "Menyusun topik ke dalam Bento Grid visual...",
  ];

  // Rotate loading quotes to make the loading UI feel active and responsive
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingQuotes.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleToggleAction = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopySummaryMarkdown = () => {
    if (!summary) return;

    let md = `# ${summary.title}\n\n`;
    md += `## Ringkasan Eksekutif\n${summary.overview}\n\n`;
    md += `## Poin-poin Penting\n`;
    summary.keyPoints.forEach((kp) => {
      md += `- ${kp}\n`;
    });
    md += `\n## Rencana Tindakan / Tindak Lanjut\n`;
    summary.actionItems.forEach((ai) => {
      md += `- [ ] ${ai}\n`;
    });
    md += `\n## Pembahasan Berdasarkan Topik\n`;
    summary.topics.forEach((t) => {
      md += `### ${t.name}\n${t.detail}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state visualizer
  if (isLoading) {
    return (
      <div id="summary-loader-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div id="circular-loader" className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-500 rounded-full animate-spin"></div>
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h4 className="font-semibold text-slate-100 text-sm tracking-tight mb-2">Gemini Sedang Berpikir...</h4>
        <div className="text-xs text-slate-400 font-mono italic max-w-sm h-6 overflow-hidden">
          {loadingQuotes[loadingStep]}
        </div>
      </div>
    );
  }

  // Not processed/not initialized state
  if (!summary) {
    return (
      <div id="no-summary-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px] shadow-sm">
        <div id="summary-badge" className="p-3 bg-indigo-950/40 rounded-2xl text-indigo-400 mb-4 border border-indigo-900/30">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="font-semibold text-slate-200 text-lg tracking-tight mb-2">Ringkasan AI Belum Dibuat</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Setelah mengakhiri sesi perekaman, draf transkrip dapat langsung dianalisis oleh asisten kecerdasan buatan Gemini untuk membuat intisari terstruktur secara otomatis.
        </p>
        
        {hasTranscript ? (
          <button
            id="btn-summarize-now"
            onClick={onGenerateSummary}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs py-2.5 px-5 rounded-xl shadow-lg hover:shadow-indigo-990/10 active:translate-y-px transition duration-150 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Buat Ringkasan AI Sekarang</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-500 italic bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
            Mulai transkripsi suara terlebih dahulu agar asisten AI memiliki data untuk dianalisis.
          </span>
        )}
      </div>
    );
  }

  return (
    <div id="summary-dashboard" className="space-y-6">
      {/* Title block */}
      <div id="summary-headbar" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl shadow-md">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/30 px-2 py-0.5 rounded-md">
              Hasil Ringkasan AI
            </span>
          </div>
          <h2 className="font-bold text-slate-100 text-lg md:text-xl tracking-tight leading-snug truncate" id="summary-title text">
            {summary.title}
          </h2>
        </div>

        <button
          id="btn-copy-md"
          onClick={handleCopySummaryMarkdown}
          className="shrink-0 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-medium transition duration-150 active:translate-y-px"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-indigo-400" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Salin Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* Bento Grid */}
      <div id="summary-bento-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Executive summary (2 cols wide) */}
        <div id="bento-overview" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-slate-200 text-sm tracking-tight" id="head-overview">Ringkasan Eksekutif</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans" id="text-overview">
              {summary.overview}
            </p>
          </div>
          <div className="flex items-center gap-4 border-t border-slate-800/60 pt-3.5 mt-3.5 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-600" /> Generasi Cepat (Flash)
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-600" /> Meeting Notes
            </span>
          </div>
        </div>

        {/* Key Points */}
        <div id="bento-key-points" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight" id="head-keypoints">Poin-poin Utama</h3>
          </div>
          <ul className="space-y-2.5" id="list-keypoints">
            {summary.keyPoints.map((kp, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-350 leading-snug">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Items (Checklist - interactive!) */}
        <div id="bento-action-items" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight" id="head-actionitems">Tindak Lanjut & Tugas Kerja</h3>
          </div>
          <div className="space-y-2" id="list-actionitems">
            {summary.actionItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Tidak ada rencana kerja spesifik yang diamanatkan.</p>
            ) : (
              summary.actionItems.map((ai, idx) => {
                const isCheck = !!completedActions[idx];
                return (
                  <div
                    id={`action-row-${idx}`}
                    key={idx}
                    onClick={() => handleToggleAction(idx)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer select-none transition border duration-100 ${
                      isCheck 
                        ? "bg-indigo-950/20 border-indigo-900/30 text-slate-500 line-through" 
                        : "bg-slate-950/30 border-transparent text-slate-300 hover:border-slate-850"
                    }`}
                  >
                    <div id="checkbox-box" className="shrink-0 mt-0.5">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isCheck 
                          ? "bg-indigo-600 border-indigo-600 text-slate-900" 
                          : "border-slate-700 text-transparent"
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-xs leading-normal">{ai}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Classified Topics List */}
        <div id="bento-topics" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight" id="head-topics">Struktur Detil Pembahasan</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="topics-grid">
            {summary.topics.map((t, idx) => (
              <div
                id={`topic-card-${idx}`}
                key={idx}
                className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-850 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-tight">{t.name}</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
