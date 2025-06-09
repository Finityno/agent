import React from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const IMAGE_SIZES: { value: '1024x1024' | '1536x1024' | '1024x1536', label: string }[] = [
  { value: "1024x1024", label: "Square (1024x1024)" },
  { value: "1536x1024", label: "Landscape (1536x1024)" },
  { value: "1024x1536", label: "Portrait (1024x1536)" },
];

interface ImageGenDropdownProps {
  onSend: (imageUrl: string) => void;
}

export const ImageGenDropdown: React.FC<ImageGenDropdownProps> = ({ onSend }) => {
  const [prompt, setPrompt] = React.useState("");
  const [imageSize, setImageSize] = React.useState<'1024x1024' | '1536x1024' | '1024x1536'>(IMAGE_SIZES[0].value);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const generateImage = useAction(api.chatStreaming.generateImageAction);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateImage({ prompt, size: imageSize });
      setPreviewUrl(result.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    if (previewUrl) {
      onSend(previewUrl);
      setPreviewUrl(null);
      setPrompt("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={imageSize} onValueChange={val => setImageSize(val as '1024x1024' | '1536x1024' | '1024x1536')}>
        <SelectTrigger className="w-36 h-8 bg-transparent border border-gray-300 dark:border-gray-700/50 text-sm text-gray-700 dark:text-gray-300 rounded-md">
          <SelectValue placeholder="Image Size" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {IMAGE_SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="text"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate"
        className="flex-1 px-3 py-2 border rounded bg-white dark:bg-[#23232b] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isGenerating}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
          }
        }}
      />
      <Button
        className="px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50"
        disabled={isGenerating || !prompt.trim()}
        onClick={handleGenerate}
      >
        {isGenerating ? "Generating..." : "Generate"}
      </Button>
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-[#1F2023] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
            >
              <img
                src={previewUrl}
                alt="Generated preview"
                className="w-full max-h-[80vh] object-contain rounded-2xl"
              />
              <div className="flex flex-col items-center gap-2 p-4">
                <Button
                  className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
                  onClick={handleSend}
                >
                  Send Image
                </Button>
                <Button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold"
                  onClick={() => setPreviewUrl(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 