import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ApiKeyGate from "@/components/ApiKeyGate";
import ConvexProviderGate from "@/components/ConvexProviderGate";
import Play from "./pages/Play";

const base = import.meta.env.BASE_URL;

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={base}>
        <Routes>
          <Route
            path="/play/:url"
            element={
              <ConvexProviderGate>
                <ApiKeyGate>
                  {(apiKey, api) => <Play apiKey={apiKey} api={api} />}
                </ApiKeyGate>
              </ConvexProviderGate>
            }
          />
          <Route
            path="/play"
            element={
              <ConvexProviderGate>
                <ApiKeyGate>
                  {(apiKey, api) => <Play apiKey={apiKey} api={api} />}
                </ApiKeyGate>
              </ConvexProviderGate>
            }
          />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
