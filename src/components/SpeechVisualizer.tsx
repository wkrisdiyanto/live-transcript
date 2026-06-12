import { useEffect, useRef } from "react";

interface SpeechVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  colorClass?: string; // Optional custom color accent
}

export default function SpeechVisualizer({ stream, isActive, colorClass = "#6366f1" }: SpeechVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Filter tracks to make sure we have audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // high performance
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Retrieve sound data
        const analyserNode = analyserRef.current;
        const array = dataArrayRef.current;
        analyserNode.getByteFrequencyData(array);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw elegant smooth glowing sound wave ripples
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        
        // Calculate average volume to scale ripple amplitude
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
          sum += array[i];
        }
        const average = sum / array.length;
        const normalizedVolume = average / 255.0; // 0.0 to 1.0

        // Draw background subtle ambient glowing ring
        ctx.shadowBlur = 15;
        ctx.shadowColor = `${colorClass}55`; // Add alpha transparency to matching hex

        // Render waves center symmetric
        const centerY = height / 2;
        const numPoints = 64;
        const sliceWidth = width / numPoints;
        
        ctx.beginPath();
        ctx.strokeStyle = colorClass;

        for (let i = 0; i < numPoints; i++) {
          // Map frequency items to points
          const freqIndex = Math.min(Math.floor((i / numPoints) * array.length), array.length - 1);
          const value = array[freqIndex] || 0;
          const ratio = value / 255.0;
          
          // Generate wave amplitude
          const amplitude = ratio * (height * 0.45);
          
          // Alternate peaks and troughs with sine modulation
          const x = i * sliceWidth;
          const sineMod = Math.sin((i / numPoints) * Math.PI * 4 + Date.now() * 0.005);
          const y = centerY + (amplitude * sineMod) + (normalizedVolume * 10 * Math.sin(Date.now() * 0.01 + i));

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();

        // Draw flat center line support to make it look highly structured
        ctx.beginPath();
        ctx.strokeStyle = `${colorClass}22`;
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.error("Audio visualizer initialization error:", e);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, isActive, colorClass]);

  return (
    <div id="visualizer-container" className="relative w-full h-16 bg-slate-900/40 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        className="w-full h-full opacity-90"
      />
      {!stream && isActive && (
        <div id="vis-warning" className="absolute text-xs text-slate-500 font-mono text-center tracking-tight animate-pulse">
          Mencari Masukan Audio...
        </div>
      )}
      {!isActive && (
        <div id="vis-idle" className="absolute text-xs text-slate-500 font-mono text-center tracking-tight">
          Sesi Tidak Berjalan (Idle)
        </div>
      )}
    </div>
  );
}
