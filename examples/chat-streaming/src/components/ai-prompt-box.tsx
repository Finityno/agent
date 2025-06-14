import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, Globe, BrainCog, FolderCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Embedded CSS for minimal custom styles
const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`;

// Textarea Component - Memoized
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.memo(React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#444444] scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-[#555555]",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
)));
Textarea.displayName = "Textarea";

// Tooltip Components - Memoized
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.memo(React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1F2023] px-3 py-1.5 text-sm text-gray-900 dark:text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
)));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components - Memoized
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.memo(React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
)));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.memo(React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#333333] bg-[#1F2023] p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] transition-all">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
)));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.memo(React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
)));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Button Component - Memoized
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.memo(React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = React.useMemo(() => ({
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3A3A40]",
      ghost: "bg-transparent hover:bg-[#3A3A40]",
    }), []);
    
    const sizeClasses = React.useMemo(() => ({
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    }), []);
    
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
));
Button.displayName = "Button";

// VoiceRecorder Component - Memoized
interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}

const VoiceRecorder = React.memo<VoiceRecorderProps>(({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Memoize the time formatter
  const formatTime = React.useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Memoize visualizer bars - renamed to avoid conflict
  const visualizerElements = React.useMemo(() => 
    [...Array(visualizerBars)].map((_, i) => (
      <div
        key={i}
        className="w-0.5 rounded-full bg-white/50 animate-pulse"
        style={{
          height: `${Math.max(15, Math.random() * 100)}%`,
          animationDelay: `${i * 0.05}s`,
          animationDuration: `${0.5 + Math.random() * 0.5}s`,
        }}
      />
    )), [visualizerBars]);

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording();
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, time, onStartRecording, onStopRecording]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {visualizerElements}
      </div>
    </div>
  );
});

VoiceRecorder.displayName = "VoiceRecorder";

// ImageViewDialog Component - Memoized
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog = React.memo<ImageViewDialogProps>(({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-[#1F2023] rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
});

ImageViewDialog.displayName = "ImageViewDialog";

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}

const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});

const usePromptInput = () => {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
};

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const PromptInput = React.memo(React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    
    const handleChange = React.useCallback((newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    }, [onValueChange]);

    const contextValue = React.useMemo(() => ({
      isLoading,
      value: value ?? internalValue,
      setValue: onValueChange ?? handleChange,
      maxHeight,
      onSubmit,
      disabled,
    }), [isLoading, value, internalValue, onValueChange, handleChange, maxHeight, onSubmit, disabled]);

    return (
      <TooltipProvider>
        <PromptInputContext.Provider value={contextValue}>
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-gray-200 dark:border-[#444444] bg-white dark:bg-[#1F2023] p-3 shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
              isLoading && "border-red-500/70",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
));
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}

const PromptInputTextarea = React.memo<PromptInputTextareaProps & React.ComponentProps<typeof Textarea>>(({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  }, [onSubmit, onKeyDown]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, [setValue]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
});

PromptInputTextarea.displayName = "PromptInputTextarea";

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}
const PromptInputActions = React.memo<PromptInputActionsProps>(({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
));

PromptInputActions.displayName = "PromptInputActions";

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}
const PromptInputAction = React.memo<PromptInputActionProps>(({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});

PromptInputAction.displayName = "PromptInputAction";

// Custom Divider Component - Memoized
const CustomDivider = React.memo(() => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
));

CustomDivider.displayName = "CustomDivider";

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, attachmentIds?: string[], modelId?: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptInputBox = React.memo(React.forwardRef<HTMLDivElement, PromptInputBoxProps>((props, ref) => {
  const { 
    onSend = () => {}, 
    onCancel = () => {}, 
    isLoading = false, 
    placeholder = "Type your message here...", 
    className 
  } = props;
  
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url?: string;
    isUploading?: boolean;
  }>>([]);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [showThink, setShowThink] = React.useState(false);
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState("gpt-4.1-nano");
  
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);

  // Use the backend model configurations
  const availableModels = useQuery(api.chatStreaming.getAvailableModelsQuery) || [];
  
  // Add upload mutations
  const generateUploadUrl = useMutation(api.fileUpload.generateUploadUrl);

  // Memoize file type check - now supports multiple types
  const isFileSupported = React.useCallback((file: File) => {
    const supportedTypes = [
      // Images
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      // Documents
      "application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "text/csv",
      // Audio
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4",
      // Video
      "video/mp4", "video/quicktime", "video/webm",
    ];
    return supportedTypes.includes(file.type);
  }, []);

  // Memoize file processing function
  const processFile = React.useCallback(async (file: File) => {
    if (!isFileSupported(file)) {
      alert("File type not supported");
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      alert("File size too large (max 20MB)");
      return;
    }

    // Create temporary attachment entry
    const tempId = `temp_${Date.now()}`;
    const newAttachment = {
      id: tempId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      isUploading: true,
    };

    setAttachments(prev => [...prev, newAttachment]);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Just store the storage ID directly
      setAttachments(prev => prev.map(att => 
        att.id === tempId 
          ? { ...att, id: storageId, isUploading: false }
          : att
      ));

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => prev.map(att => 
            att.id === tempId || att.id === storageId
              ? { ...att, url: e.target?.result as string }
              : att
          ));
        };
        reader.readAsDataURL(file);
      }

    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed");
      // Remove failed upload
      setAttachments(prev => prev.filter(att => att.id !== tempId));
    }
  }, [isFileSupported, generateUploadUrl]);

  // Memoize drag handlers
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => {
      if (isFileSupported(file)) {
        processFile(file);
      }
    });
  }, [isFileSupported, processFile]);

  // Memoize attachment removal handler
  const handleRemoveAttachment = React.useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  // Memoize image modal handler
  const openImageModal = React.useCallback((imageUrl: string) => setSelectedImage(imageUrl), []);

  // Memoize paste handler
  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, [processFile]);

  // Set up paste listener
  React.useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Memoize toggle handlers
  const handleToggleChange = React.useCallback((value: string) => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
      setShowThink(false);
    } else if (value === "think") {
      setShowThink((prev) => !prev);
      setShowSearch(false);
    }
  }, []);

  const handleCanvasToggle = React.useCallback(() => setShowCanvas((prev) => !prev), []);

  // Memoize submit handler
  const handleSubmit = React.useCallback(async () => {
    if (input.trim() || attachments.length > 0) {
      let messagePrefix = "";
      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Think: ";
      else if (showCanvas) messagePrefix = "[Canvas: ";
      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
      const attachmentIds = attachments.filter(att => !att.isUploading).map(att => att.id);
      onSend(formattedInput, attachmentIds, selectedModel);
      setInput("");
      setAttachments([]);
    }
  }, [input, attachments, showSearch, showThink, showCanvas, onSend, selectedModel]);

  // Memoize recording handlers
  const handleStartRecording = React.useCallback(() => {
    // Started recording
  }, []);

  const handleStopRecording = React.useCallback((duration: number) => {
    setIsRecording(false);
    onSend(`[Voice message - ${duration} seconds]`, [], selectedModel);
  }, [onSend, selectedModel]);

  // Memoize content state
  const hasContent = React.useMemo(() => input.trim() !== "" || attachments.length > 0, [input, attachments.length]);

  // Memoize upload click handler
  const handleUploadClick = React.useCallback(() => uploadInputRef.current?.click(), []);

  // Memoize file input change handler
  const handleFileInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => processFile(file));
    }
    if (e.target) e.target.value = "";
  }, [processFile]);

  // Memoize main button click handler
  const handleMainButtonClick = React.useCallback(() => {
    if (isLoading) onCancel();
    else if (isRecording) setIsRecording(false);
    else if (hasContent) handleSubmit();
    else setIsRecording(true);
  }, [isLoading, isRecording, hasContent, onCancel, handleSubmit]);

  // Memoize placeholder text
  const placeholderText = React.useMemo(() => {
    if (selectedModel === "gpt-image-1") return "Describe the image you want to generate";
    if (showSearch) return "Search the web...";
    if (showThink) return "Think deeply...";
    if (showCanvas) return "Create on canvas...";
    return placeholder;
  }, [selectedModel, showSearch, showThink, showCanvas, placeholder]);

  // Inject styles once when component mounts
  React.useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    
    return () => {
      // Clean up styles when component unmounts
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  return (
    <>

      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          "w-full max-w-2xl mx-auto bg-white dark:bg-[#1F2023] border-gray-200 dark:border-[#444444] shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ease-in-out",
          isRecording && "border-red-500/70",
          className
        )}
        disabled={isLoading || isRecording}
        ref={ref || promptBoxRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {attachments.length > 0 && !isRecording && (
          <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                {attachment.fileType.startsWith("image/") && attachment.url ? (
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                    onClick={() => openImageModal(attachment.url!)}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(attachment.id);
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {attachment.isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 max-w-20 truncate">
                      {attachment.fileName}
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="rounded-full bg-gray-200 dark:bg-gray-700 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      disabled={attachment.isUploading}
                    >
                      <X className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                    </button>
                    {attachment.isUploading && (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "transition-all duration-300",
            isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100"
          )}
        >
          <PromptInputTextarea
            placeholder={placeholderText}
            className="text-base"
          />
        </div>

        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity duration-300",
              isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible"
            )}
          >
            <PromptInputAction tooltip="Upload files (images, documents, audio, video)">
              <button
                onClick={handleUploadClick}
                className="flex h-8 w-8 text-gray-500 dark:text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-600/30 hover:text-gray-700 dark:hover:text-[#D1D5DB]"
                disabled={isLoading || isRecording}
              >
                <Paperclip className="h-5 w-5 transition-colors" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,audio/*,video/*"
                  multiple
                />
              </button>
            </PromptInputAction>

            <div className="relative flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-36 h-8 bg-transparent border border-gray-300 dark:border-gray-700/50 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-600 transition-colors rounded-md">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {availableModels.map((model: any) => (
                    <SelectItem 
                      key={model.id} 
                      value={model.id}
                      className="cursor-pointer"
                    >
                      <span className="font-medium">{model.name}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="gpt-image-1">GPT ImageGen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleToggleChange("search")}
                disabled={isLoading || isRecording}
                className={cn(
                  "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                  showSearch
                    ? "bg-[#1EAEDB]/15 border-[#1EAEDB] text-[#1EAEDB]"
                    : "bg-transparent border-transparent text-gray-500 dark:text-[#9CA3AF] hover:text-gray-700 dark:hover:text-[#D1D5DB]"
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{ rotate: showSearch ? 360 : 0, scale: showSearch ? 1.1 : 1 }}
                    whileHover={{ rotate: showSearch ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  >
                    <Globe className={cn("w-4 h-4", showSearch ? "text-[#1EAEDB]" : "text-inherit")} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showSearch && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs overflow-hidden whitespace-nowrap text-[#1EAEDB] flex-shrink-0"
                    >
                      Search
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <CustomDivider />

              <button
                type="button"
                onClick={() => handleToggleChange("think")}
                disabled={isLoading || isRecording}
                className={cn(
                  "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                  showThink
                    ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6]"
                    : "bg-transparent border-transparent text-gray-500 dark:text-[#9CA3AF] hover:text-gray-700 dark:hover:text-[#D1D5DB]"
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{ rotate: showThink ? 360 : 0, scale: showThink ? 1.1 : 1 }}
                    whileHover={{ rotate: showThink ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  >
                    <BrainCog className={cn("w-4 h-4", showThink ? "text-[#8B5CF6]" : "text-inherit")} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showThink && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs overflow-hidden whitespace-nowrap text-[#8B5CF6] flex-shrink-0"
                    >
                      Think
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <CustomDivider />

              <button
                type="button"
                onClick={handleCanvasToggle}
                disabled={isLoading || isRecording}
                className={cn(
                  "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                  showCanvas
                    ? "bg-[#F97316]/15 border-[#F97316] text-[#F97316]"
                    : "bg-transparent border-transparent text-gray-500 dark:text-[#9CA3AF] hover:text-gray-700 dark:hover:text-[#D1D5DB]"
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{ rotate: showCanvas ? 360 : 0, scale: showCanvas ? 1.1 : 1 }}
                    whileHover={{ rotate: showCanvas ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  >
                    <FolderCode className={cn("w-4 h-4", showCanvas ? "text-[#F97316]" : "text-inherit")} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showCanvas && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs overflow-hidden whitespace-nowrap text-[#F97316] flex-shrink-0"
                    >
                      Canvas
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          <PromptInputAction
            tooltip={
              isLoading
                ? "Stop generation"
                : isRecording
                ? "Stop recording"
                : hasContent
                ? "Send message"
                : "Voice message"
            }
          >
            <Button
              variant="default"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200",
                isRecording
                  ? "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-600/30 text-red-500 hover:text-red-400"
                  : hasContent
                  ? "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-white/80 text-white dark:text-[#1F2023]"
                  : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-600/30 text-gray-500 dark:text-[#9CA3AF] hover:text-gray-700 dark:hover:text-[#D1D5DB]"
              )}
              onClick={handleMainButtonClick}
            >
              {isLoading ? (
                <Square className="h-4 w-4 fill-white dark:fill-[#1F2023] animate-pulse" />
              ) : isRecording ? (
                <StopCircle className="h-5 w-5 text-red-500" />
              ) : hasContent ? (
                <ArrowUp className="h-4 w-4 text-white dark:text-[#1F2023]" />
              ) : (
                <Mic className="h-5 w-5 text-gray-500 dark:text-[#9CA3AF] transition-colors" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
}));

PromptInputBox.displayName = "PromptInputBox";
