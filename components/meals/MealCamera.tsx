"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MealAnalysis } from "@/types";

interface MealCameraProps {
  onAnalysis: (analysis: MealAnalysis, imageDataUrl: string) => void;
  onCancel: () => void;
}

export function MealCamera({ onAnalysis, onCancel }: MealCameraProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (dataUrl: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const base64 = dataUrl.split(",")[1];
      const mediaType = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64, mediaType }),
      });

      if (!res.ok) throw new Error("שגיאה בניתוח");
      const analysis: MealAnalysis = await res.json();
      onAnalysis(analysis, dataUrl);
    } catch {
      setError("לא הצלחנו לנתח את התמונה. נסה שוב.");
    } finally {
      setAnalyzing(false);
    }
  }, [onAnalysis]);

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
          <h2 className="font-bold text-lg text-slate-800">צלם את הארוחה</h2>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {preview ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-2xl" />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)} className="flex-1">
                צלם מחדש
              </Button>
              <Button
                onClick={() => processImage(preview)}
                loading={analyzing}
                className="flex-1"
              >
                {analyzing ? "מנתח..." : "נתח ✨"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-wing-accent rounded-2xl bg-wing-soft hover:bg-sky-100 transition-colors"
            >
              <Camera size={22} className="text-wing-primary" />
              <span className="text-sm font-medium text-wing-primary">צלם תמונה</span>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 h-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors"
            >
              <Upload size={22} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-600">בחר מהגלריה</span>
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
          <div className="flex items-center justify-center gap-2 text-wing-primary py-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Claude AI מנתח את הארוחה...</span>
          </div>
        )}
      </div>
    </div>
  );
}
