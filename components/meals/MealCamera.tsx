"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Loader2, PencilLine } from "lucide-react";
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

type Mode = "choose" | "text";

export function MealCamera({ onAnalysis, onCancel, onLimitReached, userId, userEmail }: MealCameraProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [textInput, setTextInput] = useState("");
  const { t } = useLanguage();

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
  }, [onAnalysis, onLimitReached, userId, userEmail, t]);

  async function processText() {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textDescription: trimmed }),
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

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
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
              <Button onClick={processText} loading={analyzing} disabled={!textInput.trim()} className="flex-1">
                {analyzing ? t("meals_analyzing") : t("meals_calc_cta")}
              </Button>
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
