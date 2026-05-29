"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Upload, X, Loader2, PencilLine, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MealAnalysis } from "@/types";
import { useLanguage } from "@/lib/i18n";

interface MealCameraProps {
  onAnalysis: (analysis: MealAnalysis, imageDataUrl: string) => void;
  onCancel: () => void;
  onLimitReached?: () => void;
  userId?: string;
  userEmail?: string | null;
}

type Mode = "choose" | "text" | "voice";

export function MealCamera({ onAnalysis, onCancel, onLimitReached, userId, userEmail }: MealCameraProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [textInput, setTextInput] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.continuous = true;
    recognition.interimResults = false; // Only final results — avoids partial duplicates
    recognition.lang = lang === "he" ? "he-IL" : "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // Build full transcript from all final results in the event buffer.
      // Replace (not append) — the event buffer is the source of truth.
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) parts.push(e.results[i][0].transcript.trim());
      }
      setVoiceTranscript(parts.join(" ").trim());
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [lang]);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setVoiceTranscript("");
      recognitionRef.current.start();
      setListening(true);
    }
  }

  const processImage = useCallback(async (dataUrl: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const base64 = dataUrl.split(",")[1];
      const mediaType = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64,
          mediaType,
          userId,
          userEmail: userEmail ?? null,
          lang,
        }),
      });
      if (res.status === 403) {
        onLimitReached?.();
        return;
      }
      if (!res.ok) throw new Error("analysis error");
      const analysis: MealAnalysis = await res.json();
      onAnalysis(analysis, dataUrl);
    } catch {
      setError(t("meals_analysis_error") as string);
    } finally {
      setAnalyzing(false);
    }
  }, [onAnalysis, onLimitReached, userId, userEmail, t, lang]);

  async function processText(overrideText?: string) {
    const trimmed = (overrideText ?? textInput).trim();
    if (!trimmed) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textDescription: trimmed, lang }),
      });
      if (!res.ok) throw new Error("analysis error");
      const analysis: MealAnalysis = await res.json();
      onAnalysis(analysis, "");
    } catch {
      setError(t("meals_analysis_error") as string);
    } finally {
      setAnalyzing(false);
    }
  }

  /**
   * Resize + recompress the image client-side before sending to the API.
   * Phone photos can be 5-10MB raw, ~13MB as base64 — well over Vercel's
   * 4.5MB request body limit, which is what caused the 413 "Payload Too
   * Large" failures users saw as "לא הצלחנו לנתח".
   *
   * Target: max 1280px on the longest side at 85% JPEG quality, which is
   * plenty of resolution for the Claude vision model and brings typical
   * outputs down to 200-500KB.
   */
  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const sourceDataUrl = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPreview(sourceDataUrl); // fall back to original if canvas failed
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setPreview(compressed);
      };
      img.onerror = () => setPreview(sourceDataUrl); // fallback on decode failure
      img.src = sourceDataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-wing-ink">{t("meals_add_meal")}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-wing-elevated rounded-full">
            <X size={20} className="text-wing-muted" />
          </button>
        </div>

        {/* Image preview */}
        {preview ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-2xl" />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)} className="flex-1">
                {t("meals_retake")}
              </Button>
              <Button onClick={() => processImage(preview)} loading={analyzing} className="flex-1">
                {analyzing ? t("meals_analyzing") : t("meals_analyze_cta")}
              </Button>
            </div>
          </div>
        ) : mode === "text" ? (
          /* Manual text entry */
          <div className="space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t("meals_hint_ph") as string}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-wing-border bg-wing-elevated text-wing-ink placeholder:text-wing-subtle text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink"
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setMode("choose")} className="flex-1">
                {t("back")}
              </Button>
              <Button onClick={() => processText()} loading={analyzing} disabled={!textInput.trim()} className="flex-1">
                {analyzing ? t("meals_analyzing") : t("meals_calc_cta")}
              </Button>
            </div>
          </div>
        ) : mode === "voice" ? (
          /* Voice recording */
          <div className="space-y-4">
            {!voiceSupported ? (
              <p className="text-sm text-center text-wing-muted py-4">{t("meals_voice_unsupported") as string}</p>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 py-2">
                  <button
                    onClick={toggleListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                      listening
                        ? "bg-red-500 animate-pulse"
                        : "bg-gradient-to-br from-[#f5dd4b] to-[#ff6b47]"
                    }`}
                  >
                    {listening
                      ? <MicOff size={32} className="text-white" />
                      : <Mic size={32} className="text-wing-ink" />
                    }
                  </button>
                  <p className="text-sm text-wing-muted text-center">
                    {listening
                      ? t("meals_voice_listening") as string
                      : t("meals_voice_tap") as string
                    }
                  </p>
                </div>
                {voiceTranscript && (
                  <textarea
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-wing-border bg-wing-elevated text-wing-ink text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink"
                  />
                )}
              </>
            )}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setMode("choose"); recognitionRef.current?.stop(); setListening(false); setVoiceTranscript(""); }} className="flex-1">
                {t("back")}
              </Button>
              {voiceSupported && (
                <Button
                  onClick={() => processText(voiceTranscript)}
                  loading={analyzing}
                  disabled={!voiceTranscript.trim()}
                  className="flex-1"
                >
                  {analyzing ? t("meals_analyzing") : t("meals_voice_analyze")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Choose mode */
          <div className="space-y-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-wing-border rounded-2xl bg-wing-elevated hover:bg-wing-elevated transition-colors"
            >
              <Camera size={22} className="text-wing-heat" />
              <span className="text-sm font-medium text-wing-heat">{t("meals_take_photo")}</span>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-wing-border rounded-2xl bg-white hover:bg-wing-elevated transition-colors"
            >
              <Upload size={22} className="text-wing-muted" />
              <span className="text-sm font-medium text-wing-muted">{t("meals_pick_gallery")}</span>
            </button>
            <button
              onClick={() => { setMode("voice"); setVoiceTranscript(""); setListening(false); }}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-wing-border rounded-2xl bg-white hover:bg-wing-elevated transition-colors"
            >
              <Mic size={22} className="text-wing-muted" />
              <span className="text-sm font-medium text-wing-muted">{t("meals_voice") as string}</span>
            </button>
            <button
              onClick={() => setMode("text")}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-wing-border rounded-2xl bg-white hover:bg-wing-elevated transition-colors"
            >
              <PencilLine size={22} className="text-wing-muted" />
              <span className="text-sm font-medium text-wing-muted">{t("meals_type_manual")}</span>
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {analyzing && (
          <div className="flex items-center justify-center gap-2 text-wing-heat py-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">{t("meals_analyzing_ai")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
