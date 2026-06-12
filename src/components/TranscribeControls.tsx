import { TranscriptionSource, TranscriptionLanguage } from "../types";
import { Mic, Laptop, HelpCircle, AlertCircle, Settings, Play, Square, Pause, RotateCcw } from "lucide-react";

interface TranscribeControlsProps {
  source: TranscriptionSource;
  language: TranscriptionLanguage;
  isRecording: boolean;
  isPaused: boolean;
  onSourceChange: (source: TranscriptionSource) => void;
  onLanguageChange: (lang: TranscriptionLanguage) => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onTogglePause: () => void;
  onResetSession: () => void;
}

export default function TranscribeControls({
  source,
  language,
  isRecording,
  isPaused,
  onSourceChange,
  onLanguageChange,
  onStartSession,
  onStopSession,
  onTogglePause,
  onResetSession,
}: TranscribeControlsProps) {
  return (
    <div id="transcribe-controls" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
        <h3 className="font-semibold text-slate-200 text-sm tracking-tight" id="controls-head">Konfigurasi Pengenal Suara</h3>
      </div>

      {!isRecording ? (
        <div id="setup-form" className="space-y-4">
          {/* Source Selector */}
          <div id="source-select-group">
            <label className="block text-xs font-medium text-slate-400 mb-1.5" id="label-source">Sumber Suara</label>
            <div className="grid grid-cols-2 gap-3" id="source-grid">
              <button
                id="btn-source-mic"
                type="button"
                onClick={() => onSourceChange(TranscriptionSource.MIC)}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-150 ${
                  source === TranscriptionSource.MIC
                    ? "bg-indigo-950/40 border-indigo-500 text-slate-100"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className={`p-2 rounded-full ${source === TranscriptionSource.MIC ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold">Mikrofon</div>
                <p className="text-[10px] text-slate-500 leading-tight">Merekam ucapan langsung dari mikrofon fisik Anda.</p>
              </button>

              <button
                id="btn-source-screen"
                type="button"
                onClick={() => onSourceChange(TranscriptionSource.SCREEN)}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-150 ${
                  source === TranscriptionSource.SCREEN
                    ? "bg-indigo-950/40 border-indigo-500 text-slate-100"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className={`p-2 rounded-full ${source === TranscriptionSource.SCREEN ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold">Audio Screen Share</div>
                <p className="text-[10px] text-slate-500 leading-tight">Merekam audio internal Chrome tab / video presentasi.</p>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div id="language-select-group">
            <label className="block text-xs font-medium text-slate-400 mb-1.5" id="label-lang">Bahasa Utama</label>
            <select
              id="select-lang"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as TranscriptionLanguage)}
              className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition duration-150"
            >
              <option value={TranscriptionLanguage.ID}>Bahasa Indonesia (id-ID)</option>
              <option value={TranscriptionLanguage.EN}>English (en-US)</option>
            </select>
          </div>

          {/* Context Advisory Tip */}
          {source === TranscriptionSource.SCREEN && (
            <div id="tip-screen-share" className="space-y-2">
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200/90 leading-normal">
                  <span className="font-semibold">Saran Pembagian Layar:</span> Pilih opsi tab browser atau layar penuh dan <span className="font-bold underline">pastikan untuk mencentang &quot;Bagikan audio sistem / tab&quot; (Share audio)</span> agar audio terekam oleh AI.
                </div>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-rose-200/90 leading-normal">
                  <span className="font-semibold">⚠️ INFO PERIZINAN (Permissions Policy):</span> Jika melihat galat <span className="font-mono">display-capture disallowed</span>, pastikan Anda membuka aplikasi ini di <span className="font-bold underline">Tab Baru</span> (bukan di dalam panel pratinjau / iframe). Browser melarang fitur perekam layar di dalam frame demi keamanan.
                </div>
              </div>
            </div>
          )}

          {source === TranscriptionSource.MIC && (
            <div id="tip-web-speech" className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl flex gap-2.5 items-start">
              <Mic className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-indigo-200/95 leading-normal">
                <span className="font-semibold">Server-Side Gemini STT:</span> Merekam suara Anda dari mikrofon dan mentranskripsinya secara real-time via Gemini AI yang sangat akurat, mendukung Bahasa Indonesia dan Inggris secara mulus.
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            id="btn-trigger-start"
            type="button"
            onClick={onStartSession}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-990/10 hover:shadow-indigo-550/20 active:translate-y-px transition duration-150 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Transkripsi Real-Time</span>
          </button>
        </div>
      ) : (
        <div id="active-runtime-panel" className="space-y-4">
          {/* Active Status Display */}
          <div id="runtime-status-card" className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-indigo-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPaused ? 'bg-amber-500' : 'bg-indigo-500'}`}></span>
              </span>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {isPaused ? "Sesi Ditangguhkan (Paused)" : "Transkripsi Berlangsung"}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                  {source === TranscriptionSource.MIC ? "🎤 Menggunakan Mikrofon" : "🖥️ Menggunakan System Screen Audio"} ({language === "id-ID" ? "ID" : "EN"})
                </p>
              </div>
            </div>
          </div>

          {/* Control Triggers */}
          <div id="active-controls" className="flex gap-2">
            <button
              id="btn-active-pause"
              type="button"
              onClick={onTogglePause}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition duration-150 ${
                isPaused
                  ? "bg-slate-800 border-slate-700 text-indigo-400 hover:text-indigo-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Pause className={`w-3.5 h-3.5 ${isPaused ? 'fill-current' : ''}`} />
              <span>{isPaused ? "Lanjutkan" : "Jeda"}</span>
            </button>

            <button
              id="btn-active-reset"
              type="button"
              onClick={onResetSession}
              className="px-3 bg-slate-950 border border-slate-800 hover:bg-rose-950/10 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 rounded-lg transition duration-150"
              title="Reset data sesi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stop / Summarize Trigger */}
          <button
            id="btn-trigger-stop"
            type="button"
            onClick={onStopSession}
            className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium text-xs py-3 px-4 rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Akhiri & Buat Ringkasan AI</span>
          </button>
        </div>
      )}
    </div>
  );
}
