import { useCallback, useRef, useState } from "react";

export function useVoiceRecorder(onLevel?: (level: number) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopResolveRef = useRef<((b: Blob) => void) | null>(null);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state !== "recording") {
        resolve(new Blob());
        return;
      }
      stopResolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const startRecording = useCallback(
    async (onAutoStop?: (blob: Blob) => void) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorderRef.current = rec;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close().catch(() => {});
        analyserRef.current = null;
        setIsRecording(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const r = stopResolveRef.current;
        stopResolveRef.current = null;
        r?.(blob);
        if (onAutoStop && !r) onAutoStop(blob);
      };

      rec.start(100);
      setIsRecording(true);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let hasSpoken = false;
      const tick = () => {
        if (!analyserRef.current || rec.state !== "recording") return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        onLevel?.(avg / 128);
        if (avg > 14) {
          hasSpoken = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpoken && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            // auto-stop on sustained silence
            if (recorderRef.current?.state === "recording") {
              const cb = onAutoStop;
              const prevResolve = stopResolveRef.current;
              if (!prevResolve && cb) {
                stopResolveRef.current = (blob) => cb(blob);
              }
              recorderRef.current.stop();
            }
          }, 1400);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [onLevel],
  );

  return { isRecording, startRecording, stopRecording };
}
