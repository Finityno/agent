"use client"

import * as React from "react"
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ImageGenerationLoaderProps {
  children?: React.ReactNode;
}

const ImageGenerationLoader: React.FC<ImageGenerationLoaderProps> = ({ children }) => {
  const [progress, setProgress] = React.useState(0);
  const [loadingState, setLoadingState] = React.useState<
    "starting" | "generating" | "finalizing" | "completed"
  >("starting");
  
  const DURATION = 25000; // 25 seconds - slightly faster than backend

  React.useEffect(() => {
    // Start with "starting" state for 1.5 seconds
    const startingTimeout = setTimeout(() => {
      setLoadingState("generating");
      
      const startTime = Date.now();
      
      const progressInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progressPercentage = Math.min(100, (elapsedTime / DURATION) * 100);
        
        setProgress(progressPercentage);
        
        // Transition to finalizing at 90%
        if (progressPercentage >= 90 && loadingState === "generating") {
          setLoadingState("finalizing");
        }
        
        // Complete at 100%
        if (progressPercentage >= 100) {
          clearInterval(progressInterval);
          setLoadingState("completed");
        }
      }, 16); // ~60fps updates
      
      return () => clearInterval(progressInterval);
    }, 1500);

    return () => clearTimeout(startingTimeout);
  }, [loadingState]);

  const getStatusText = () => {
    switch (loadingState) {
      case "starting":
        return "Initializing...";
      case "generating":
        return "Creating your image. This may take a moment.";
      case "finalizing":
        return "Almost ready...";
      case "completed":
        return "Complete!";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      {/* Status Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="text-gray-600 dark:text-gray-400 text-sm font-medium"
          key={loadingState}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {getStatusText()}
        </motion.span>
      </motion.div>



      {/* Image Container */}
      <motion.div
        className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.4,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
      >
        {/* Loading placeholder when no children */}
        {!children && (
          <div className="w-full aspect-square flex items-center justify-center min-h-[256px]">
            <div className="text-center">
              <motion.div
                className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity, 
                  duration: 1.5, 
                  ease: "linear" 
                }}
              />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Generating...
              </p>
            </div>
          </div>
        )}
        
        {/* Actual image content */}
        {children && (
          <div className="relative">
            {children}
          </div>
        )}

        {/* Reveal overlay */}
        {(loadingState === "starting" || loadingState === "generating" || loadingState === "finalizing") && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              opacity: 1,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="absolute inset-0 backdrop-blur-sm bg-white/60 dark:bg-black/60"
              style={{
                clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
              }}
            />
            
            {/* Progress indicator line */}
            <motion.div
              className="absolute left-0 right-0 h-px bg-gray-400 dark:bg-gray-500"
              style={{ top: `${progress}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Completion indicator */}
      {loadingState === "completed" && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3,
            delay: 0.2
          }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              ✓
            </motion.span>
            Image ready
          </span>
        </motion.div>
      )}
    </div>
  );
};

ImageGenerationLoader.displayName = "ImageGenerationLoader";
export default ImageGenerationLoader;