import "@/wiki-layout.css";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Frown,
  Moon,
  Sun,
  Home,
  Users,
  Copy,
  User,
  Gamepad2,
  Undo2,
  AlertCircle
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { io } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

// Initialize socket outside component
const socket = io({ path: "/socket.io", autoConnect: false });

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

interface LobbyState {
  roomId: string;
  isHost: boolean;
  isOpen: boolean;
  players: { id: string; name: string }[];
}

interface OpponentState {
  id: string;
  name: string;
  clicks: number;
  currentArticle: string;
  isWinner: boolean;
}

// Start Screen Component
function StartScreen({
  onStart,
  isLoading,
  lobbyState,
  setLobbyState,
  initialView
}: {
  onStart: (start?: string, target?: string, mode?: "random" | "manual" | "multiplayer") => void;
  isLoading: boolean;
  lobbyState: LobbyState;
  setLobbyState: React.Dispatch<React.SetStateAction<LobbyState>>;
  initialView?: "main" | "single" | "multi";
}) {
  const [view, setView] = useState<"main" | "single" | "multi">(initialView || "main");
  const [singleMode, setSingleMode] = useState<"random" | "manual">("random");
  const [startArticle, setStartArticle] = useState("");
  const [targetArticle, setTargetArticle] = useState("");
  const [username, setUsername] = useState("");

  const [joinRoomId, setJoinRoomId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    socket.connect();

    socket.on("game_started", ({ start, target }) => {
      onStart(start, target, "multiplayer");
    });

    socket.on("player_joined", ({ players }: { players: { id: string; name: string }[] }) => {
      setLobbyState(prev => ({ ...prev, players }));
      toast({ title: "Player updated", description: `Current players: ${players.length}` });
    });

    socket.on("player_left", ({ players }: { players: { id: string; name: string }[] }) => {
      setLobbyState(prev => ({ ...prev, players }));
      toast({ title: "Player disconnected" });
    });

    return () => {
      socket.off("game_started");
      socket.off("player_joined");
      socket.off("player_left");
    };
  }, [onStart, toast, setLobbyState]);

  const handleSingleStart = () => {
    if (singleMode === "manual") {
      if (!startArticle || !targetArticle) return;
      onStart(startArticle, targetArticle, "manual");
    } else {
      onStart(undefined, undefined, "random");
    }
  };

  const createRoom = () => {
    if (!username.trim()) {
      toast({ title: "Please enter a username", variant: "destructive" });
      return;
    }
    socket.emit("create_room", { username }, (response: any) => {
      if (response.roomId) {
        setLobbyState({ roomId: response.roomId, isHost: true, isOpen: true, players: response.players || [] });
      }
    });
  };

  const joinRoom = () => {
    if (!joinRoomId) return;
    if (!username.trim()) {
      toast({ title: "Please enter a username", variant: "destructive" });
      return;
    }
    socket.emit("join_room", { roomId: joinRoomId, username }, (response: any) => {
      if (response.success) {
        setLobbyState({ roomId: joinRoomId, isHost: false, isOpen: true, players: response.players || [] });
      } else {
        toast({
          title: "Error joining room",
          description: response.error,
          variant: "destructive",
        });
      }
    });
  };

  const startMultiplayerGame = () => {
    if (singleMode === "manual") {
      if (!startArticle || !targetArticle) return;
      socket.emit("start_game", { roomId: lobbyState.roomId, start: startArticle, target: targetArticle });
    } else {
      apiRequest("POST", "/api/game/new", { startArticle: undefined, targetArticle: undefined })
        .then(res => res.json())
        .then((data: NewGameResponse) => {
          socket.emit("start_game", { roomId: lobbyState.roomId, start: data.startArticle, target: data.targetArticle });
        });
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(lobbyState.roomId);
    toast({ title: "Room ID copied!" });
  };

  if (lobbyState.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setLobbyState({ ...lobbyState, isOpen: false })}>
              <Undo2 className="w-4 h-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-bold">Lobby</h2>
            <div className="w-10"></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-muted-foreground">Room ID:</div>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-muted p-2 rounded text-lg font-mono">{lobbyState.roomId}</code>
                <Button size="icon" variant="ghost" onClick={copyRoomId}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> Players ({lobbyState.players.length}/8)
              </h3>
              <ul className="space-y-2 max-h-[200px] overflow-auto">
                {lobbyState.players.map((p) => (
                  <li key={p.id} className="flex items-center justify-center gap-2 text-sm">
                    <User className="w-3 h-3" />
                    <span className={p.id === socket.id ? "font-bold" : ""}>
                      {p.name} {p.id === socket.id && "(You)"}
                    </span>
                  </li>
                ))}
                {lobbyState.players.length === 0 && <li className="text-muted-foreground text-sm">Connecting...</li>}
              </ul>
            </Card>

            <div className="text-sm text-muted-foreground">
              {lobbyState.players.length < 2
                ? "Waiting for more players (need at least 2)..."
                : lobbyState.isHost ? "Ready to start!" : "Waiting for host to start..."}
            </div>
          </div>

          <div className="border-t pt-4">
            {lobbyState.isHost ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Game Settings</h3>
                <Tabs defaultValue="random" onValueChange={(v) => setSingleMode(v as "random" | "manual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="random">Random</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-2 text-left mt-2">
                    <Label>Start Article</Label>
                    <Input value={startArticle} onChange={e => setStartArticle(e.target.value)} placeholder="Start Article" />
                    <Label>Target Article</Label>
                    <Input value={targetArticle} onChange={e => setTargetArticle(e.target.value)} placeholder="Target Article" />
                  </TabsContent>
                </Tabs>

                <Button className="w-full" onClick={startMultiplayerGame} disabled={lobbyState.players.length < 2 || (singleMode === "manual" && (!startArticle || !targetArticle))}>
                  Start Game
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground animate-pulse">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-6">
          {view !== "main" ? (
            <Button variant="ghost" size="sm" onClick={() => setView("main")}>
              <Undo2 className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div className="w-10"></div>
          )}
          <ModeToggle />
        </div>

        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-title">
              WikiGame
            </h1>
            <p className="text-muted-foreground text-lg">
              Navigate Wikipedia from one article to another
            </p>
          </div>

          {view === "main" && (
            <div className="grid grid-cols-1 gap-4 mt-8">
              <Button size="lg" className="h-20 text-xl gap-4" onClick={() => setView("single")}>
                <User className="w-8 h-8" />
                1 Player
              </Button>
              <Button size="lg" variant="secondary" className="h-20 text-xl gap-4" onClick={() => setView("multi")}>
                <Users className="w-8 h-8" />
                Multiplayer
              </Button>
            </div>
          )}

          {view === "single" && (
            <div className="space-y-6">
              <Tabs defaultValue="random" onValueChange={(v) => setSingleMode(v as "random" | "manual")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="random">Random Mode</TabsTrigger>
                  <TabsTrigger value="manual">Manual Mode</TabsTrigger>
                </TabsList>

                <TabsContent value="random" className="mt-4">
                  <div className="space-y-4 text-left">
                    <p className="text-muted-foreground">Start with random articles.</p>
                    <Button size="lg" className="w-full gap-2" onClick={handleSingleStart} disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : <Play />} Start Game
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-4 space-y-4">
                  <div className="space-y-2 text-left">
                    <Label>Start Article</Label>
                    <Input value={startArticle} onChange={e => setStartArticle(e.target.value)} />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label>Target Article</Label>
                    <Input value={targetArticle} onChange={e => setTargetArticle(e.target.value)} />
                  </div>
                  <Button size="lg" className="w-full gap-2" onClick={handleSingleStart} disabled={isLoading || !startArticle || !targetArticle}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Play />} Start Game
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {view === "multi" && (
            <div className="space-y-4 mt-8">
              <div className="text-left space-y-2">
                <Label>Your Name</Label>
                <Input placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="h-4"></div>

              <Card className="p-6 cursor-pointer hover:bg-accent transition-colors" onClick={createRoom}>
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2"><Gamepad2 /> Create Room</h3>
                <p className="text-muted-foreground">Host a game.</p>
              </Card>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Join Room</h3>
                <div className="flex gap-2">
                  <Input placeholder="Room ID" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)} />
                  <Button onClick={joinRoom}>Join</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// GameHeader
// WikiSidebar Component
function WikiSidebar({
  path,
  gameState,
  onBackToMenu,
  onNewGame
}: {
  path: string[];
  gameState: GameState | null;
  onBackToMenu: () => void;
  onNewGame: () => void;
}) {
  return (
    <div className="w-[180px] bg-muted/30 border-r border-border hidden md:flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="text-3xl font-serif italic text-center py-8 cursor-pointer text-primary" onClick={onBackToMenu}>
        Wiki
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start font-normal text-sm" onClick={onBackToMenu}>
            Main page
          </Button>
          <Button variant="ghost" className="w-full justify-start font-normal text-sm" onClick={() => onNewGame()}>
            Random article
          </Button>
          <div className="border-t my-2 border-gray-300 dark:border-gray-700"></div>
          <div className="text-xs text-muted-foreground uppercase mb-2">Game Info</div>
          {gameState && (
            <div className="text-xs space-y-1">
              <div>Start: <span className="font-semibold">{gameState.startArticle.replace(/_/g, " ")}</span></div>
              <div>Target: <span className="font-semibold">{gameState.targetArticle.replace(/_/g, " ")}</span></div>
            </div>
          )}
        </div>

        {path.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase mb-2">History ({path.length})</div>
            <ScrollArea className="h-[300px] w-full pr-2">
              <div className="space-y-1">
                {path.map((p, i) => (
                  <div key={i} className={`text-xs truncate ${i === path.length - 1 ? "font-bold" : "text-muted-foreground"}`}>
                    {i + 1}. {p.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// UserInfoBox (Replaces GameHeader)
function UserInfoBox({
  gameState,
  timeLeft,
  lobbyState,
  opponents
}: {
  gameState: GameState;
  timeLeft: number;
  lobbyState: LobbyState;
  opponents: Record<string, OpponentState>;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="user-info-box absolute top-0 right-0 p-4 flex flex-col items-end pointer-events-none z-50">
      <div className="flex items-center gap-4 bg-background/95 backdrop-blur p-3 rounded-lg border shadow-sm pointer-events-auto mb-2">
        <div className="user-info-item text-foreground font-medium">
          <MousePointerClick className="w-4 h-4 mr-2" />
          <span className="font-mono font-bold text-lg">{gameState.clicks}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="user-info-item text-foreground font-medium">
          <Clock className="w-4 h-4 mr-2" />
          <span className={`font-mono font-bold text-lg tabular-nums ${timeLeft < 30 ? "text-red-500 animate-pulse" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {lobbyState.players.length > 1 && (
        <Card className="pointer-events-auto bg-background/90 backdrop-blur min-w-[200px] shadow-md border-muted">
          <div className="p-2 border-b bg-muted/50 rounded-t-lg">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-3 h-3" /> Players
            </h4>
          </div>
          <div className="p-2 space-y-2 max-h-[300px] overflow-auto">
            {lobbyState.players
              .filter(p => p.id !== socket.id)
              .map(p => {
                const stat = opponents[p.id];
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium truncate max-w-[100px]">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {stat?.isWinner ? (
                        <span className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Winner
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground">{stat?.clicks || 0}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}

function ArticleContent({
  article,
  onLinkClick,
  isLoading,
  gameState,
  title
}: {
  article: Article | undefined;
  onLinkClick: (title: string) => void;
  isLoading: boolean;
  gameState: GameState | null;
  title: string;
}) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!article && !gameState) return null;

  const displayTitle = article?.title || title || "Loading...";

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
    <div className="wiki-main">
      <div className="wiki-header">
        <div className="flex flex-col w-full">
          <h1 className="wiki-title">{displayTitle.replace(/_/g, " ")}</h1>
          <div className="flex justify-between items-end border-b w-full">
            <div className="wiki-tabs">
              <div className="wiki-tab active text-sm font-semibold">Article</div>
              <div className="wiki-tab text-sm text-blue-600">Talk</div>
            </div>
            <div className="wiki-tabs">
              <div className="wiki-tab active text-sm font-semibold">Read</div>
              <div className="wiki-tab text-sm text-blue-600">View source</div>
              <div className="wiki-tab text-sm text-blue-600">View history</div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="wiki-content prose prose-neutral dark:prose-invert max-w-none"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: article?.content || "" }}
      />
    </div>
  );
}

function WinModal({
  isOpen,
  gameState,
  timeLeft,
  onNewGame,
  onClose,
  isMultiplayer = false,
  message,
}: {
  isOpen: boolean;
  gameState: GameState;
  timeLeft: number;
  onNewGame: () => void;
  onClose: () => void;
  isMultiplayer?: boolean;
  message?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {message || "You Won!"}
          </DialogTitle>
          <DialogDescription>
            {!message && (
              <>
                You navigated from{" "}
                <span className="font-semibold text-foreground">
                  {gameState.startArticle.replace(/_/g, " ")}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {gameState.targetArticle.replace(/_/g, " ")}
                </span>
              </>
            )}
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
              {formatTime(180 - timeLeft)}
            </div>
            <div className="text-sm text-muted-foreground">Time</div>
          </Card>
        </div>

        <Button onClick={onNewGame} className="w-full gap-2 mt-2" data-testid="button-play-again">
          <RotateCcw className="w-4 h-4" />
          {isMultiplayer ? "Back to Lobby" : "Play Again"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function LoseModal({
  isOpen,
  gameState,
  onNewGame,
  onClose,
  message,
  isMultiplayer = false,
  winnerPath,
  winnerName,
}: {
  isOpen: boolean;
  gameState: GameState;
  onNewGame: () => void;
  onClose: () => void;
  message?: string;
  isMultiplayer?: boolean;
  winnerPath?: string[];
  winnerName?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Frown className="w-6 h-6 text-red-500" />
            {message || "Time's Up!"}
          </DialogTitle>
          <DialogDescription>
            You ran out of time navigating from{" "}
            <span className="font-semibold text-foreground">
              {gameState.startArticle.replace(/_/g, " ")}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {gameState.targetArticle.replace(/_/g, " ")}
            </span>
          </DialogDescription>
        </DialogHeader>

        {winnerPath && winnerPath.length > 0 && (
          <div className="py-2 flex-1 overflow-auto">
            <h4 className="font-semibold mb-2">{winnerName || "Winner"}'s Path:</h4>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {winnerPath.map((article, index) => (
                <div key={index} className="text-sm py-1 border-b last:border-0">
                  {index + 1}. {article.replace(/_/g, " ")}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        <Button onClick={onNewGame} className="w-full gap-2 mt-2">
          <RotateCcw className="w-4 h-4" />
          {isMultiplayer ? "Back to Lobby" : "Select Mode"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);

  // Track game mode
  const [gameMode, setGameMode] = useState<"random" | "manual" | "multiplayer">("random");

  // Lobby State (lifted up)
  const [lobbyState, setLobbyState] = useState<LobbyState>({ roomId: "", isHost: false, isOpen: false, players: [] });
  const [initialView, setInitialView] = useState<"main" | "single" | "multi">("main");

  const [opponents, setOpponents] = useState<Record<string, OpponentState>>({});

  const [winnerPath, setWinnerPath] = useState<string[]>([]);
  const [winnerName, setWinnerName] = useState("");
  const { toast } = useToast();
  const { theme } = useTheme();

  const newGameMutation = useMutation({
    mutationFn: async ({ start, target }: { start?: string; target?: string } = {}) => {
      const response = await apiRequest("POST", "/api/game/new", { startArticle: start, targetArticle: target });
      return (await response.json()) as NewGameResponse;
    },
    onSuccess: (data) => {
      setGameState({
        startArticle: data.startArticle,
        targetArticle: data.targetArticle,
        currentArticle: data.startArticle, // Initially current is start
        path: [data.startArticle],
        clicks: 0,
        startTime: Date.now(),
        isComplete: false,
      });
      setTimeLeft(180);
      setShowWinModal(false);
      setShowLoseModal(false);
      setShowWinModal(false);
      setShowLoseModal(false);
      setOpponents({});
      // setLoseMessage("");
      setWinnerPath([]);
      setWinnerName("");
      queryClient.invalidateQueries({ queryKey: ["/api/article"] });
    },
  });

  const articleQuery = useQuery<Article>({
    queryKey: ["/api/article", gameState?.currentArticle],
    enabled: !!gameState?.currentArticle,
  });

  // Multiplayer Listeners
  useEffect(() => {
    if (gameMode !== "multiplayer") return;

    socket.on("opponent_progress", (data: any) => {
      setOpponents(prev => ({
        ...prev,
        [data.playerId]: {
          id: data.playerId,
          name: data.name,
          clicks: data.clicks,
          currentArticle: data.currentArticle,
          isWinner: prev[data.playerId]?.isWinner || false
        }
      }));
    });

    socket.on("player_won", (data: any) => {
      setOpponents(prev => ({
        ...prev,
        [data.winnerId]: {
          ...(prev[data.winnerId] || { id: data.winnerId, name: data.winnerName, clicks: 0, currentArticle: "" }),
          isWinner: true
        }
      }));

      if (data.winnerId !== socket.id) {
        toast({
          title: "Winner!",
          description: `${data.winnerName} has finished the game!`,
          className: "bg-yellow-500 text-white border-none"
        });
      }
    });

    socket.on("player_left", ({ players }: { players: any[] }) => {
      setLobbyState(prev => ({ ...prev, players }));
      // Cleanup left players from opponents map
      setOpponents(prev => {
        const next = { ...prev };
        const currentIds = new Set(players.map(p => p.id));
        Object.keys(next).forEach(key => {
          if (!currentIds.has(key)) {
            delete next[key];
          }
        });
        return next;
      });

      toast({
        title: "Player disconnected",
        description: "Someone left the game.",
      });
    });

    socket.on("reset_to_lobby", () => {
      setGameState(null);
      setTimeLeft(180);
      setShowWinModal(false);
      setShowLoseModal(false);
      setOpponents({});
      setWinnerPath([]);
      setWinnerName("");
      setLobbyState(prev => ({ ...prev, isOpen: true }));
    });

    return () => {
      socket.off("opponent_progress");
      socket.off("player_won");
      socket.off("player_left");
      socket.off("reset_to_lobby");
    };
  }, [gameMode, toast]);

  useEffect(() => {
    if (!gameState || gameState.isComplete || !articleQuery.data) return;
    const canonicalTitle = articleQuery.data.title;
    const currentTitle = gameState.currentArticle;

    // Check if we need to update canonical title (redirect handling)
    if (canonicalTitle !== currentTitle) {
      // Logic to update path if redirect happened invisible to user or just fix state
      // Actually if we just clicked, we want to record the new title

      // If looking at fresh state:
      if (gameState.path.length === 1 && gameState.path[0] === gameState.startArticle && currentTitle === gameState.startArticle) {
        // Initial load, do nothing if matching
      }
    }
  }, [articleQuery.data, gameState]);

  useEffect(() => {
    if (!gameState || gameState.isComplete) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState(state => state ? ({ ...state, isComplete: true }) : null);
          setShowLoseModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.isComplete]);

  const handleLinkClick = useCallback((title: string) => {
    if (!gameState || gameState.isComplete) return;
    const newPath = [...gameState.path, title];
    const isWin = title === gameState.targetArticle;
    const newClicks = gameState.clicks + 1;

    setGameState({ ...gameState, currentArticle: title, path: newPath, clicks: newClicks, isComplete: isWin });

    if (gameMode === "multiplayer") {
      socket.emit("update_progress", { roomId: lobbyState.roomId, currentArticle: title, clicks: newClicks });
    }

    if (isWin) {
      setShowWinModal(true);
      if (gameMode === "multiplayer") {
        socket.emit("game_win", { roomId: lobbyState.roomId, path: newPath });
      }
    }
  }, [gameState, gameMode, lobbyState.roomId]);

  const handleNewGame = useCallback((start?: string, target?: string, mode?: "random" | "manual" | "multiplayer") => {
    // Explicit Mode Start (First launch)
    if (start && target) {
      setGameMode(mode || "manual");
      newGameMutation.mutate({ start, target });
      return;
    }
    // Random Start (First launch)
    if (mode === "random" || (!mode && !start && !target && gameMode !== "multiplayer" && gameMode !== "manual")) {
      setGameMode("random");
      newGameMutation.mutate({});
      return;
    }

    // Replay Logic
    if (gameMode === "multiplayer") {
      // Synchronized Return
      socket.emit("return_to_lobby", { roomId: lobbyState.roomId });
    } else {
      // Single player: Return to Single Select screen
      setGameState(null);
      setTimeLeft(180);
      setShowWinModal(false);
      setShowLoseModal(false);
      setShowLoseModal(false);
      setOpponents({});
      setInitialView("single");
    }
  }, [newGameMutation, gameMode, lobbyState.roomId]);

  const handleBackToMenu = () => {
    setGameState(null);
    setGameMode("random");
    setTimeLeft(180);
    setOpponents({});
    setLobbyState({ roomId: "", isHost: false, isOpen: false, players: [] });
    setInitialView("main");
    socket.disconnect();
  };

  if (!gameState) {
    return <StartScreen
      onStart={handleNewGame}
      isLoading={newGameMutation.isPending}
      lobbyState={lobbyState}
      setLobbyState={setLobbyState}
      initialView={initialView}
    />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      <WikiSidebar
        path={gameState.path}
        gameState={gameState}
        onBackToMenu={handleBackToMenu}
        onNewGame={() => handleNewGame()}
      />

      {/* Wiki Content Area - Scoped Styles */}
      <div className="flex-1 relative h-screen overflow-y-auto w-full">
        <UserInfoBox
          gameState={gameState}
          timeLeft={timeLeft}
          lobbyState={lobbyState}
          opponents={opponents}
        />

        <div className={`wiki-embed min-h-full ${theme === "dark" ? "dark" : ""}`}>
          <ArticleContent
            article={articleQuery.data}
            onLinkClick={handleLinkClick}
            isLoading={articleQuery.isLoading}
            gameState={gameState}
            title={gameState.currentArticle}
          />
        </div>
      </div>

      <WinModal
        isOpen={showWinModal}
        gameState={gameState}
        timeLeft={timeLeft}
        onNewGame={() => handleNewGame()}
        onClose={() => setShowWinModal(false)}
        isMultiplayer={gameMode === "multiplayer"}
      />
      <LoseModal
        isOpen={showLoseModal}
        gameState={gameState}
        onNewGame={() => handleNewGame()}
        onClose={() => setShowLoseModal(false)}
        isMultiplayer={gameMode === "multiplayer"}
        winnerPath={winnerPath}
        winnerName={winnerName}
      />
    </div>
  );
}
