"use client";

import { useState, useCallback, useRef } from "react";
import { useStorage } from "@/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon, Link as LinkIcon, LoaderCircle } from "lucide-react";
import Image from "next/image";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  disabled?: boolean;
};

export function ImageUpload({ 
  value, 
  onChange, 
  folder = "images",
  className,
  disabled = false 
}: ImageUploadProps) {
  const storage = useStorage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("A imagem deve ter no maximo 5MB.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${folder}/${timestamp}-${sanitizedName}`;
      const storageRef = ref(storage, fileName);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (uploadError) => {
          console.error("Upload error:", uploadError);
          setError("Erro ao enviar imagem. Tente novamente.");
          setIsUploading(false);
        },
        async () => {
          // Upload completed
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onChange(downloadUrl);
          setIsUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Erro ao enviar imagem. Tente novamente.");
      setIsUploading(false);
    }
  }, [storage, folder, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback(async () => {
    if (!value) return;

    // If it's a Firebase Storage URL, try to delete the file
    if (value.includes("firebasestorage.googleapis.com") || value.includes("firebasestorage.app")) {
      try {
        const imageRef = ref(storage, value);
        await deleteObject(imageRef);
      } catch (err) {
        // File might not exist or user doesn't have permission - that's ok
        console.warn("Could not delete image from storage:", err);
      }
    }

    onChange("");
  }, [value, storage, onChange]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
      setShowUrlInput(false);
    }
  }, [urlInput, onChange]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preview or Upload Area */}
      {value ? (
        <div className="relative rounded-lg border overflow-hidden bg-muted">
          <div className="relative aspect-video w-full">
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remover imagem</span>
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isUploading 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              <Progress value={uploadProgress} className="w-full max-w-xs" />
              <p className="text-sm text-muted-foreground">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  disabled={disabled}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  URL
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
              />
            </>
          )}
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && !value && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
            disabled={disabled}
          />
          <Button
            type="button"
            onClick={handleUrlSubmit}
            disabled={disabled || !urlInput.trim()}
          >
            Adicionar
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Current URL (for reference) */}
      {value && (
        <p className="text-xs text-muted-foreground truncate">
          {value}
        </p>
      )}
    </div>
  );
}
