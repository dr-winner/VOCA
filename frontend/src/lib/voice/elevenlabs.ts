// ElevenLabs WebSocket streaming TTS — client only.
export class ElevenLabsTTS {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private nextStart = 0;
  private playing = false;
  private onSpeakingChange?: (b: boolean) => void;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private apiKey: string,
    private voiceId: string,
    onSpeakingChange?: (b: boolean) => void,
  ) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.onSpeakingChange = onSpeakingChange;
  }

  async ensureConnected(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.audioContext.state === "suspended") await this.audioContext.resume();
    return new Promise((resolve, reject) => {
      const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_flash_v2_5&output_format=pcm_24000`;
      const ws = new WebSocket(url);
      this.ws = ws;
      this.nextStart = this.audioContext.currentTime;
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            text: " ",
            voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
            generation_config: { chunk_length_schedule: [50, 90, 140, 200] },
            xi_api_key: this.apiKey,
          }),
        );
        resolve();
      };
      ws.onmessage = (event) => this.handleMessage(event.data);
      ws.onerror = (e) => reject(e);
      ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  private handleMessage(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
        this.scheduleAudio(bytes);
      }
      if (data.isFinal) {
        // close gracefully soon
      }
    } catch {
      /* ignore */
    }
  }

  private scheduleAudio(pcm: Uint8Array) {
    const numSamples = Math.floor(pcm.byteLength / 2);
    if (!numSamples) return;
    const buf = this.audioContext.createBuffer(1, numSamples, 24000);
    const ch = buf.getChannelData(0);
    const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    for (let i = 0; i < numSamples; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
    const src = this.audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(this.audioContext.destination);
    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.nextStart);
    src.start(startAt);
    this.nextStart = startAt + buf.duration;
    if (!this.playing) {
      this.playing = true;
      this.onSpeakingChange?.(true);
    }
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    const remaining = (this.nextStart - now) * 1000 + 150;
    this.silenceTimer = setTimeout(() => {
      this.playing = false;
      this.onSpeakingChange?.(false);
    }, remaining);
  }

  streamText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ text, try_trigger_generation: true }));
  }

  endOfInput() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ text: "" }));
  }

  disconnect() {
    try {
      this.ws?.close();
    } catch {
      /* */
    }
    this.ws = null;
  }
}
