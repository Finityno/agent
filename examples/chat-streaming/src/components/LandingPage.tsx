import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap } from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();

  const handleStartChat = () => {
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-primary/10 size-12 rounded-xl flex items-center justify-center">
              <MessageCircle className="size-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-primary tracking-tight">
              zola.chat
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience intelligent conversations with our AI-powered chat platform. 
            Get creative stories, helpful answers, and engaging discussions.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 my-12">
          <div className="space-y-3 p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 size-10 rounded-lg flex items-center justify-center mx-auto">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold">Creative Stories</h3>
            <p className="text-sm text-muted-foreground">
              Get engaging stories with unexpected twist endings that will keep you entertained.
            </p>
          </div>
          
          <div className="space-y-3 p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 size-10 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold">Real-time Streaming</h3>
            <p className="text-sm text-muted-foreground">
              Watch responses unfold in real-time with our advanced streaming technology.
            </p>
          </div>
          
          <div className="space-y-3 p-6 rounded-lg border bg-card">
            <div className="bg-primary/10 size-10 rounded-lg flex items-center justify-center mx-auto">
              <MessageCircle className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold">Persistent Chats</h3>
            <p className="text-sm text-muted-foreground">
              Your conversations are saved and organized for easy access anytime.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button 
            onClick={handleStartChat}
            size="lg"
            className="text-lg px-8 py-6 h-auto"
          >
            <MessageCircle className="size-5 mr-2" />
            Start Chatting
          </Button>
          <p className="text-sm text-muted-foreground">
            Ready to begin? Click above to start your first conversation.
          </p>
        </div>
      </div>
    </div>
  );
}