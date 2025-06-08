import { PlusCircle } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-2">
        <img src="/convexlogo.png" alt="Convex Logo" className="w-8 h-8" />
        <span className="font-semibold">Playground</span>
      </div>
      <Button variant="ghost">
        <PlusCircle className="w-5 h-5 mr-2" />
        New Chat
      </Button>
    </header>
  );
}