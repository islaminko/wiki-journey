import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Article, GameState, NewGameResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock,
  MousePointerClick,
  Target,
  ArrowRight,
  RotateCcw,
  Trophy,
  ChevronRight,
  Loader2,
  Play,
} from "lucide-react";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function StartScreen({ onStart, isLoading }: { onStart: () => void; isLoading: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full p-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-title">
              WikiGame
            </h1>
            <p className="text-muted-foreground text-lg">
              Navigate Wikipedia from one article to another
            </p>
          </div>

          <div className="space-y-4 text-left">
            <h2 className="font-semibold text-lg">How to Play</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
                <span>You&apos;ll be given a starting and target Wikipedia article</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
                <span>Navigate by clicking links within articles</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
                <span>Reach the target article in as few clicks as possible</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
                <span>No going back - think carefully before you click!</span>
              </li>
            </ul>
          </div>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={onStart}
            disabled={isLoading}
            data-testid="button-start-game"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Game
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function GameHeader({
  gameState,
  elapsedTime,
  onNewGame,
}: {
  gameState: GameState;
  elapsedTime: number;
  onNewGame: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg font-semibold tabular-nums" data-testid="text-timer">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MousePointerClick className="w-4 h-4" />
              <span className="font-mono text-lg font-semibold" data-testid="text-clicks">
                {gameState.clicks}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Target:</span>
            <Badge variant="secondary" data-testid="badge-target">
              {gameState.targetArticle.replace(/_/g, " ")}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNewGame}
            className="gap-2"
            data-testid="button-new-game"
          >
            <RotateCcw className="w-4 h-4" />
            New Game
          </Button>
        </div>
      </div>
    </header>
  );
}

function PathTracker({ path }: { path: string[] }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <ArrowRight className="w-4 h-4" />
        Your Path
      </h3>
      <ScrollArea className="max-h-[calc(100vh-220px)]">
        <div className="space-y-2">
          {path.map((article, index) => (
            <div
              key={`${article}-${index}`}
              className={`flex items-center gap-2 p-2 rounded-md ${
                index === path.length - 1
                  ? "bg-accent"
                  : "bg-muted/50"
              }`}
              data-testid={`path-item-${index}`}
            >
              <span className="text-sm font-medium text-muted-foreground w-6">
                {index + 1}.
              </span>
              <span className={`text-sm ${index === path.length - 1 ? "font-semibold" : ""}`}>
                {article.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

function ArticleContent({
  article,
  onLinkClick,
  isLoading,
}: {
  article: Article | undefined;
  onLinkClick: (title: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No article loaded
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a[data-wiki-link]") as HTMLAnchorElement | null;
    if (link && link.dataset.wikiLink) {
      e.preventDefault();
      const decodedTitle = decodeURIComponent(link.dataset.wikiLink);
      onLinkClick(decodedTitle);
    }
  };

  return (
    <div onClick={handleClick}>
      <h1 className="text-3xl font-bold mb-6 font-serif" data-testid="text-article-title">
        {article.title.replace(/_/g, " ")}
      </h1>
      <div
        className="prose prose-neutral dark:prose-invert max-w-none font-serif leading-relaxed
          [&_a]:text-foreground [&_a]:underline [&_a]:decoration-muted-foreground/50 
          [&_a]:underline-offset-2 [&_a:hover]:decoration-foreground [&_a]:transition-colors
          [&_a]:cursor-pointer"
        dangerouslySetInnerHTML={{ __html: article.content }}
        data-testid="article-content"
      />
    </div>
  );
}

function WinModal({
  isOpen,
  gameState,
  elapsedTime,
  onNewGame,
  onClose,
}: {
  isOpen: boolean;
  gameState: GameState;
  elapsedTime: number;
  onNewGame: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-500" />
            You Won!
          </DialogTitle>
          <DialogDescription>
            You navigated from{" "}
            <span className="font-semibold text-foreground">
              {gameState.startArticle.replace(/_/g, " ")}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {gameState.targetArticle.replace(/_/g, " ")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold font-mono" data-testid="text-final-clicks">
              {gameState.clicks}
            </div>
            <div className="text-sm text-muted-foreground">Clicks</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold font-mono" data-testid="text-final-time">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-sm text-muted-foreground">Time</div>
          </Card>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Your Path:</h4>
          <div className="flex flex-wrap gap-1">
            {gameState.path.map((article, index) => (
              <span key={`${article}-${index}`} className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {article.replace(/_/g, " ")}
                </Badge>
                {index < gameState.path.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
        </div>

        <Button onClick={onNewGame} className="w-full gap-2 mt-2" data-testid="button-play-again">
          <RotateCcw className="w-4 h-4" />
          Play Again
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);

  const newGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/game/new");
      return (await response.json()) as NewGameResponse;
    },
    onSuccess: (data) => {
      setGameState({
        startArticle: data.startArticle,
        targetArticle: data.targetArticle,
        currentArticle: data.startArticle,
        path: [data.startArticle],
        clicks: 0,
        startTime: Date.now(),
        isComplete: false,
      });
      setElapsedTime(0);
      setShowWinModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/article"] });
    },
  });

  const articleQuery = useQuery<Article>({
    queryKey: ["/api/article", gameState?.currentArticle],
    enabled: !!gameState?.currentArticle,
  });

  // Handle redirects - update game state with canonical title
  useEffect(() => {
    if (!gameState || gameState.isComplete || !articleQuery.data) return;
    
    const canonicalTitle = articleQuery.data.title;
    const currentTitle = gameState.currentArticle;
    
    // If the canonical title is different, update the path and check for win
    if (canonicalTitle !== currentTitle) {
      const newPath = [...gameState.path.slice(0, -1), canonicalTitle];
      const isWin = canonicalTitle === gameState.targetArticle;
      
      setGameState({
        ...gameState,
        currentArticle: canonicalTitle,
        path: newPath,
        isComplete: isWin,
      });
      
      if (isWin) {
        setShowWinModal(true);
      }
    }
  }, [articleQuery.data, gameState]);

  useEffect(() => {
    if (!gameState || gameState.isComplete) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - gameState.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleLinkClick = useCallback(
    (title: string) => {
      if (!gameState || gameState.isComplete) return;

      const newPath = [...gameState.path, title];
      const isWin = title === gameState.targetArticle;

      setGameState({
        ...gameState,
        currentArticle: title,
        path: newPath,
        clicks: gameState.clicks + 1,
        isComplete: isWin,
      });

      if (isWin) {
        setShowWinModal(true);
      }
    },
    [gameState]
  );

  const handleNewGame = useCallback(() => {
    newGameMutation.mutate();
  }, [newGameMutation]);

  if (!gameState) {
    return (
      <StartScreen onStart={handleNewGame} isLoading={newGameMutation.isPending} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GameHeader
        gameState={gameState}
        elapsedTime={elapsedTime}
        onNewGame={handleNewGame}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <main className="min-w-0">
            <Card className="p-6">
              <ArticleContent
                article={articleQuery.data}
                onLinkClick={handleLinkClick}
                isLoading={articleQuery.isLoading}
              />
            </Card>
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <PathTracker path={gameState.path} />
            </div>
          </aside>
        </div>
      </div>

      <WinModal
        isOpen={showWinModal}
        gameState={gameState}
        elapsedTime={elapsedTime}
        onNewGame={handleNewGame}
        onClose={() => setShowWinModal(false)}
      />
    </div>
  );
}
