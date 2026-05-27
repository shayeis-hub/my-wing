"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Send } from "lucide-react";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { createWingPost } from "@/lib/firebase/firestore";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { nanoid } from "@/lib/utils/nanoid";
import type { WingPost } from "@/types";

interface CreatePostFormProps {
  wingId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  onPostCreated: (post: WingPost) => void;
}

export function CreatePostForm({ wingId, userId, userName, userPhotoURL, onPostCreated }: CreatePostFormProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed && !imageDataUrl) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      let imageURL: string | undefined;
      if (imageDataUrl) {
        const storage = getStorage();
        const path = `posts/${userId}/${nanoid()}.jpg`;
        const ref = storageRef(storage, path);
        await uploadString(ref, imageDataUrl, "data_url");
        imageURL = await getDownloadURL(ref);
      }

      const postData: Omit<WingPost, "id" | "createdAt"> = {
        wingId,
        userId,
        userName,
        ...(userPhotoURL ? { userPhotoURL } : {}),
        ...(trimmed ? { text: trimmed } : {}),
        ...(imageURL ? { imageURL } : {}),
        reactions: [],
        comments: [],
      };

      const id = await createWingPost(wingId, postData);
      onPostCreated({
        id,
        ...postData,
        createdAt: { toDate: () => new Date() } as unknown as WingPost["createdAt"],
      });
      setText("");
      setImageDataUrl(null);
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("לא הצליח לפרסם. נסה שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = (text.trim().length > 0 || imageDataUrl) && !submitting;

  return (
    <div className="bg-wing-surface border border-wing-border rounded-[20px] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name={userName} photoURL={userPhotoURL} size={40} isCurrentUser />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("post_create_placeholder") as string}
          rows={text.length > 60 || imageDataUrl ? 3 : 2}
          className="flex-1 bg-wing-elevated border border-wing-border rounded-[14px] px-3 py-2.5 text-sm text-wing-ink placeholder:text-wing-subtle resize-none focus:outline-none focus:ring-2 focus:ring-wing-ink transition-all"
        />
      </div>

      {imageDataUrl && (
        <div className="relative rounded-[14px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageDataUrl} alt="preview" className="w-full max-h-72 object-cover" />
          <button
            onClick={() => setImageDataUrl(null)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
            aria-label="remove"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-wing-elevated border border-wing-border text-wing-ink hover:border-wing-ink transition-colors text-sm font-medium disabled:opacity-50"
        >
          <ImagePlus size={16} className="text-wing-heat" />
          {t("post_add_photo") as string}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] font-bold text-sm text-wing-ink transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: canSubmit ? "linear-gradient(135deg, #f5dd4b, #ff6b47)" : "#e8dfc8" }}
        >
          {submitting ? t("post_create_posting") as string : t("post_create_btn") as string}
          {!submitting && <Send size={14} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}

