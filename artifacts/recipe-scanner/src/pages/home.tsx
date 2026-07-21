import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, ImageIcon, ChefHat, X } from "lucide-react";
import { useAnalyzeRecipe } from "@workspace/api-client-react";
import { useRecipeStore } from "@/lib/recipe-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Home() {
  const [, setLocation] = useLocation();
  const { setRecipeData } = useRecipeStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = useAnalyzeRecipe();

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Неподходящий формат. Загрузите изображение.");
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 10 МБ.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile || !previewUrl) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      analyzeMutation.mutate(
        {
          data: {
            imageBase64: base64,
            mimeType: selectedFile.type,
          }
        },
        {
          onSuccess: (recipe) => {
            setRecipeData(recipe, previewUrl);
            setLocation("/result");
          },
          onError: (error: any) => {
            toast.error(error?.data?.error || "Не удалось распознать блюдо. Попробуйте ещё раз.");
          }
        }
      );
    };
    reader.readAsDataURL(selectedFile);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 tracking-tight">
          Что у вас на тарелке?
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Загрузите фотографию любого блюда — наш кулинарный ИИ распознает его и составит точный рецепт с ингредиентами, шагами и КБЖУ.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-xl aspect-square sm:aspect-video rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 text-center cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="area-file-drop"
          >
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-primary">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Загрузите фото блюда</h3>
            <p className="text-muted-foreground mb-8 text-sm">
              Перетащите файл сюда или нажмите, чтобы выбрать
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs mt-auto" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="w-full rounded-xl h-12"
                onClick={() => cameraInputRef.current?.click()}
                data-testid="button-camera"
              >
                <Camera className="w-5 h-5 mr-2" />
                Сделать фото
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl h-12"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-browse"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Выбрать файл
              </Button>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              data-testid="input-file-upload"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              data-testid="input-camera-upload"
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl flex flex-col items-center"
          >
            <div className="relative w-full aspect-square sm:aspect-video rounded-3xl overflow-hidden shadow-xl mb-8 group">
              <img
                src={previewUrl}
                alt="Выбранное блюдо"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {!analyzeMutation.isPending && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full w-10 h-10 shadow-md z-10"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                  aria-label="Удалить фото"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {analyzeMutation.isPending ? (
              <div className="flex flex-col items-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-primary mb-6"
                >
                  <ChefHat className="w-12 h-12" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                  className="text-xl font-serif text-foreground flex items-center gap-3"
                  data-testid="text-analyzing"
                >
                  Анализируем ваше блюдо
                  <span className="flex space-x-1">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}>.</motion.span>
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}>.</motion.span>
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}>.</motion.span>
                  </span>
                </motion.div>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full sm:w-auto min-w-[240px] h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                onClick={handleAnalyze}
                data-testid="button-analyze"
              >
                Распознать блюдо
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
