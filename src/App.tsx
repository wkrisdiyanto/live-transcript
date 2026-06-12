import { useState, useEffect, useRef } from "react";
import {
  TranscriptionSource,
  TranscriptionLanguage,
  TranscriptSegment,
  AISessionSummary,
  SavedSession,
} from "./types";
import HistorySidebar from "./components/HistorySidebar";
import TranscribeControls from "./components/TranscribeControls";
import TranscriptArea from "./components/TranscriptArea";
import SummaryDashboard from "./components/SummaryDashboard";
import SpeechVisualizer from "./components/SpeechVisualizer";
import { Sparkles, Mic, Laptop, HelpCircle, LayoutDashboard, Share2, ClipboardList, CheckCircle2, ChevronRight, MessageSquare, Clock } from "lucide-react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function App() {
  // --- Sessions & History States ---
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // --- Active Transcription Session States ---
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<AISessionSummary | null>(null);
  const [sessionName, setSessionName] = useState("Sesi Baru");
  const [sessionLang, setSessionLang] = useState<TranscriptionLanguage>(TranscriptionLanguage.ID);
  const [sessionSource, setSessionSource] = useState<TranscriptionSource>(TranscriptionSource.MIC);
  const [dateTimeStr, setDateTimeStr] = useState("");

  // --- Recording States ---
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mixMicrophone, setMixMicrophone] = useState(true); // overlay mic with screen share
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // --- Active Media streams ---
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Refs for Async Callback access to avoid closure issues ---
  const isRecordingRef = useRef(isRecording);
  const isPausedRef = useRef(isPaused);
  const sourceRef = useRef(sessionSource);
  const languageRef = useRef(sessionLang);
  const segmentsRef = useRef(segments);

  // --- Recording Engines Refs ---
  const recognitionRef = useRef<any>(null); // Chromium Web Speech-to-Text
  const recorderRef = useRef<MediaRecorder | null>(null); // Screen audio recorder
  const audioStreamRef = useRef<MediaStream | null>(null); // Track the active audio stream to transcribe
  const isRecordingActiveRef = useRef(false); // custom loop guard
  const chunkTimeoutRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Sync refs with state values
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { sourceRef.current = sessionSource; }, [sessionSource]);
  useEffect(() => { languageRef.current = sessionLang; }, [sessionLang]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);

  // Load saved sessions on startup from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("TRANSCRIPT_SESSIONS");
      if (stored) {
        const parsed = JSON.parse(stored) as SavedSession[];
        setSessions(parsed);
        if (parsed.length > 0) {
          // Select newest session by default
          loadSession(parsed[0]);
        }
      }
    } catch (e) {
      console.error("Gagal mendata riwayat sesi dari localStorage:", e);
    }
  }, []);

  // Save sessions to localStorage whenever they are edited
  const saveSessionsToStorage = (updatedSessions: SavedSession[]) => {
    try {
      localStorage.setItem("TRANSCRIPT_SESSIONS", JSON.stringify(updatedSessions));
    } catch (e) {
      console.error("Gagal menyimpan sessions ke localStorage:", e);
    }
  };

  // --- Stopwatch timer loop ---
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  // Format Elapsed Seconds as mm:ss
  const getFormatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get current timestamp for new segment
  const getDurationStamp = () => {
    return getFormatDuration(elapsedSeconds);
  };

  // Switch/Load Session View
  const loadSession = (session: SavedSession) => {
    setSelectedSessionId(session.id);
    setSegments(session.segments);
    setSummary(session.summary);
    setSessionName(session.name);
    setSessionLang(session.language);
    setSessionSource(session.sourceType as TranscriptionSource);
    setDateTimeStr(session.dateTime);
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setApiError(null);
    cleanupMediaStreams();
  };

  // Delete specific session
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveSessionsToStorage(updated);

    if (selectedSessionId === id) {
      if (updated.length > 0) {
        loadSession(updated[0]);
      } else {
        handleStartNewSession();
      }
    }
  };

  // Clear all history
  const handleClearAllSessions = () => {
    const confirmClear = window.confirm("Apakah Anda yakin ingin menghapus seluruh riwayat transkripsi?");
    if (!confirmClear) return;

    setSessions([]);
    localStorage.removeItem("TRANSCRIPT_SESSIONS");
    handleStartNewSession();
  };

  // Reset to static empty view for a new session
  const handleStartNewSession = () => {
    setSelectedSessionId(null);
    setSegments([]);
    setSummary(null);
    setSessionName(`Sesi ${new Date().toLocaleDateString("id-ID")}`);
    setDateTimeStr(new Date().toISOString());
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setApiError(null);
    cleanupMediaStreams();
  };

  // Cleanup helper
  const cleanupMediaStreams = () => {
    isRecordingActiveRef.current = false;
    
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch (e) {}
      recorderRef.current = null;
    }

    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      setActiveStream(null);
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // --- Real-time Segment Insertion (Handles Overwriting non-final blocks) ---
  const addSegmentText = (text: string, source: TranscriptionSource, isFinal: boolean) => {
    // We ignore adding empty words
    if (!text.trim()) return;

    setSegments((prev) => {
      const size = prev.length;
      if (size === 0) {
        return [
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: getDurationStamp(),
            text,
            source,
            isFinal,
          },
        ];
      }

      const lastSeg = prev[size - 1];
      // If last segment was non-final (interim result) and of same source, we overwrite it to show incremental progress
      if (lastSeg && !lastSeg.isFinal && lastSeg.source === source) {
        const updated = [...prev];
        updated[size - 1] = {
          ...lastSeg,
          text,
          isFinal,
        };
        return updated;
      }

      // Otherwise, we append a new segment block
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: getDurationStamp(),
          text,
          source,
          isFinal,
        },
      ];
    });
  };

  // Edit segment content inline
  const handleEditSegment = (id: string, newText: string) => {
    const updated = segments.map((seg) => {
      if (seg.id === id) {
        return { ...seg, text: newText };
      }
      return seg;
    });
    setSegments(updated);
    
    // Auto-persist changes back to Saved Session if selected
    if (selectedSessionId) {
      const updatedSess = sessions.map((s) => {
        if (s.id === selectedSessionId) {
          const rawJoinedText = updated.map((seg) => seg.text).join(" ");
          return { ...s, segments: updated, rawTranscript: rawJoinedText };
        }
        return s;
      });
      setSessions(updatedSess);
      saveSessionsToStorage(updatedSess);
    }
  };

  // Manually add note segment
  const handleAddManualSegment = (text: string) => {
    const manualTimestamp = getDurationStamp();
    const newSeg: TranscriptSegment = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: manualTimestamp,
      text: text.trim(),
      source: TranscriptionSource.MIC, // logged as microphone notes
      isFinal: true,
    };

    setSegments((prev) => [...prev, newSeg]);
  };

  // --- TRANSCRIPTION CORE ENGINE STARTERS ---

  // Converts Blob to Base64 String
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Post 5s audio slice blobs to `/api/transcribe` for server Gemini STT processing
  const uploadAndTranscribeChunk = async (blob: Blob, source: TranscriptionSource) => {
    try {
      const base64Audio = await blobToBase64(blob);
      const payload = {
        audio: base64Audio,
        mimeType: blob.type || "audio/webm",
      };

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Gagal mengurai suara dari server.");
      }

      const data = await res.json();
      if (data.text && data.text.trim().length > 0) {
        addSegmentText(data.text.trim(), source, true);
      }
    } catch (err: any) {
      console.warn("Chunk transcription warning/error:", err.message);
    }
  };

  // Cyclical Audio capture lookahead loop (for both Microphone / Screen)
  const startAudioChunkingLoop = (audioTracks: MediaStreamTrack[], source: TranscriptionSource) => {
    if (!isRecordingActiveRef.current) return;

    try {
      const chunkStream = new MediaStream(audioTracks);
      
      // Select best supported MIME/type on context browser
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/mp4";
        if (!MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = ""; // use browser default fallback
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const chunkRecorder = new MediaRecorder(chunkStream, options);

      let localChunks: Blob[] = [];
      chunkRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          localChunks.push(e.data);
        }
      };

      chunkRecorder.onstop = async () => {
        if (localChunks.length > 0) {
          const actualMime = mimeType || chunkRecorder.mimeType || "audio/webm";
          const combinedBlob = new Blob(localChunks, { type: actualMime });
          await uploadAndTranscribeChunk(combinedBlob, source);
        }

        // Restart cyclical loop next 5s chunk
        if (isRecordingActiveRef.current && !isPausedRef.current) {
          startAudioChunkingLoop(audioTracks, source);
        }
      };

      recorderRef.current = chunkRecorder;
      chunkRecorder.start();

      // Trigger stop and upload in 5 seconds
      chunkTimeoutRef.current = setTimeout(() => {
        if (chunkRecorder.state === "recording") {
          chunkRecorder.stop();
        }
      }, 5000);
    } catch (e) {
      console.error("Gagal memulai perekam audio chunk:", e);
    }
  };

  // Trigger setup media devices and engage speech recognition engines
  const handleStartSession = async () => {
    cleanupMediaStreams();
    setApiError(null);
    setSegments([]);
    setSummary(null);
    setElapsedSeconds(0);

    const useMic = sessionSource === TranscriptionSource.MIC;
    const useScreen = sessionSource === TranscriptionSource.SCREEN;

    // Reset dates
    const currentISO = new Date().toISOString();
    setDateTimeStr(currentISO);
    setSessionName(`Sesi ${new Date().toLocaleDateString("id-ID")} - ${useMic ? "Mic" : "Screen"}`);

    try {
      if (useMic) {
        // --- MIC FLOW: Generative AI Server-Side Robust Transcription ---
        const micMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
        setActiveStream(micMedia);
        audioStreamRef.current = micMedia;
        
        setIsRecording(true);
        setIsPaused(false);
        isRecordingActiveRef.current = true;

        startAudioChunkingLoop(micMedia.getAudioTracks(), TranscriptionSource.MIC);

      } else if (useScreen) {
        // --- SCREEN FLOW: Display Media + Gemini Multimodal ---
        // Request visual presentational screen with audio capture
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 320, height: 180, frameRate: 15 }, // optimized minimal tracks size
          audio: true,
        });

        const screenAudioTracks = displayStream.getAudioTracks();
        if (screenAudioTracks.length === 0) {
          displayStream.getTracks().forEach((track) => track.stop());
          throw new Error("Audio screen share tidak ditemukan. Pastikan Anda mencentang tombol 'Bagikan Audio' (Share tab/system audio) saat dialog jendela muncul!");
        }

        let outputAudioStream = displayStream;

        // Optionally Mix mic audio track overlay
        if (mixMicrophone) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const mixContext = new AudioCtx();
            audioContextRef.current = mixContext;

            const mixedDestination = mixContext.createMediaStreamDestination();

            // Feed Screen track
            const screenSourceNode = mixContext.createMediaStreamSource(new MediaStream(screenAudioTracks));
            screenSourceNode.connect(mixedDestination);

            // Feed Mic track
            const micSourceNode = mixContext.createMediaStreamSource(micStream);
            micSourceNode.connect(mixedDestination);

            outputAudioStream = mixedDestination.stream;
          } catch (mixErr) {
            console.warn("Gagal menyatukan audio mikrofon ke screen share stream:", mixErr);
            // fallback using pure screen audio track
          }
        }

        setActiveStream(displayStream);
        audioStreamRef.current = outputAudioStream;
        setIsRecording(true);
        setIsPaused(false);
        isRecordingActiveRef.current = true;

        // Capture independent 5-second packets
        startAudioChunkingLoop(outputAudioStream.getAudioTracks(), TranscriptionSource.SCREEN);
      }
    } catch (err: any) {
      console.error("Gagal memulai sesi perekaman:", err);
      setApiError(err.message || "Gagal mengakses alat masukan suara.");
      cleanupMediaStreams();
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    if (!isRecording) return;
    
    const nextPausedState = !isPaused;
    setIsPaused(nextPausedState);

    if (nextPausedState) {
      // Stop current slice
      if (chunkTimeoutRef.current) clearTimeout(chunkTimeoutRef.current);
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    } else {
      // Resume cyclical loop
      if (audioStreamRef.current) {
        startAudioChunkingLoop(audioStreamRef.current.getAudioTracks(), sessionSource);
      }
    }
  };

  // Halt Recording Session and Compile Final saved data model
  const handleStopSession = async () => {
    if (!isRecording) return;

    // Finalize intermediate/interim non-final segment if it exists
    setSegments((prev) => {
      return prev.map((seg) => {
        if (!seg.isFinal) {
          return { ...seg, isFinal: true };
        }
        return seg;
      });
    });

    setIsRecording(false);
    setIsPaused(false);
    cleanupMediaStreams();

    // Trigger AI summarization automatically after session finishes!
    // We delay slightly to let states finalize segments references
    setTimeout(() => {
      handleGenerateSummaryText();
    }, 500);
  };

  // Trigger Gemini AI summarizing from server route
  const handleGenerateSummaryText = async () => {
    // Collect active text transcripts
    const textSegments = segmentsRef.current.filter((s) => s.text.trim().length > 0);
    const joinedSpeech = textSegments.map((s) => s.text).join(" ");

    if (joinedSpeech.trim().length === 0) {
      setApiError("Transkrip kosong. Pembicaraan tidak terekam, sehingga tidak dapat dirangkum.");
      return;
    }

    setIsSummaryLoading(true);
    setApiError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: joinedSpeech }),
      });

      if (!response.ok) {
        throw new Error("Asisten AI Gemini gagal menyusun ringkasan.");
      }

      const summaryJSON = (await response.json()) as AISessionSummary;
      setSummary(summaryJSON);

      // Construct a SavedSession model to save inside local storage and state lists
      const finalSession: SavedSession = {
        id: selectedSessionId || Math.random().toString(36).substring(2, 9),
        dateTime: dateTimeStr || new Date().toISOString(),
        name: summaryJSON.title || sessionName,
        sourceType: sessionSource,
        language: sessionLang,
        segments: segmentsRef.current,
        rawTranscript: joinedSpeech,
        summary: summaryJSON,
      };

      // Upsert into sessions lists
      setSessions((prev) => {
        const matchesExist = prev.some((s) => s.id === finalSession.id);
        let updated: SavedSession[] = [];
        if (matchesExist) {
          updated = prev.map((s) => (s.id === finalSession.id ? finalSession : s));
        } else {
          updated = [finalSession, ...prev];
        }
        saveSessionsToStorage(updated);
        return updated;
      });

      setSelectedSessionId(finalSession.id);
      setSessionName(finalSession.name);

    } catch (err: any) {
      console.error("Gagal menjaring ringkasan AI:", err);
      setApiError(err.message || "Gagal menyusun ringkasan otomatis menggunakan asisten AI Gemini.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <div id="application-container" className="flex flex-col lg:flex-row h-screen w-screen bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar history */}
      <HistorySidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={(id) => {
          const sess = sessions.find((s) => s.id === id);
          if (sess) loadSession(sess);
        }}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllSessions}
        onStartNewSession={handleStartNewSession}
      />

      {/* Main viewport area */}
      <div id="main-scrollarea" className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0F172A]/90">
        
        {/* App Title Head Board */}
        <header id="app-headboard" className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div id="logo-badge" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              G
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white leading-tight">
                Gemini<span className="text-indigo-400">Live</span> Transcript
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Powered by Google Cloud Speech & Gemini 3.5</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isRecording && !isPaused && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-[9px] font-semibold text-rose-450 uppercase tracking-wider">Live Sesi</span>
              </div>
            )}

            <div id="duration-badge" className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-3.5 py-1.5 font-mono text-[11px] text-slate-350">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Sesi: <span className="font-semibold text-white">{getFormatDuration(elapsedSeconds)}</span></span>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {apiError && (
          <div id="error-banner" className="m-4 p-4.5 bg-rose-950/20 border border-rose-900/50 rounded-2xl flex items-start gap-3">
            <span className="p-1 bg-rose-500/15 text-rose-400 rounded-lg shrink-0 mt-0.5">⚠️</span>
            <div>
              <h4 className="font-bold text-xs text-rose-300">Terjadi Kesalahan Sistem</h4>
              <p className="text-xs text-rose-400/90 mt-1 leading-normal">{apiError}</p>
            </div>
          </div>
        )}

        {/* Interactive Dashboard canvas layout */}
        <div id="canvas-grid" className="p-4 lg:p-6 space-y-6 flex-1">
          
          {/* Top row widget card section */}
          <div id="top-row-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Real-time speech wave feedback */}
            <div id="realtime-wave-card" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm tracking-tight">Detektor Frekuensi Gelombang Suara</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Memantau tingkat resonansi audio di kanal aktif.</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isRecording && !isPaused ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'bg-slate-950 text-slate-500 border border-slate-850'}`}>
                  {isRecording && !isPaused ? "Sinyal Aktif" : "Sinyal Terputus"}
                </span>
              </div>

              {/* Form mixed option */}
              {sessionSource === TranscriptionSource.SCREEN && !isRecording && (
                <div id="mix-overlay-selector" className="flex items-center gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-850">
                  <input
                    id="chk-mix-mic"
                    type="checkbox"
                    checked={mixMicrophone}
                    onChange={(e) => setMixMicrophone(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-950 rounded border-slate-800 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="chk-mix-mic" className="text-[11px] font-medium text-slate-400 leading-none cursor-pointer">
                    Gabungkan suara Mikrofon Anda sendiri ke dalam rekaman presentasi
                  </label>
                </div>
              )}

              {/* Interactive Audio Visualizer */}
              <SpeechVisualizer stream={activeStream} isActive={isRecording && !isPaused} />
            </div>

            {/* Quick config controls panel */}
            <TranscribeControls
              source={sessionSource}
              language={sessionLang}
              isRecording={isRecording}
              isPaused={isPaused}
              onSourceChange={setSessionSource}
              onLanguageChange={setSessionLang}
              onStartSession={handleStartSession}
              onStopSession={handleStopSession}
              onTogglePause={handleTogglePause}
              onResetSession={handleStartNewSession}
            />

          </div>

          {/* Bottom row transcription tracking and summaries */}
          <div id="bottom-row-layout" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Live Text transcript Area */}
            <TranscriptArea
              segments={segments}
              isRecording={isRecording}
              onEditSegment={handleEditSegment}
              onAddManualSegment={handleAddManualSegment}
              langCode={sessionLang}
            />

            {/* AI Summarization Dashboard */}
            <SummaryDashboard
              summary={summary}
              isLoading={isSummaryLoading}
              onGenerateSummary={handleGenerateSummaryText}
              hasTranscript={segments.length > 0}
            />

          </div>

        </div>

      </div>
    </div>
  );
}
