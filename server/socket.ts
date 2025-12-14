import { Server } from "socket.io";
import { type Server as HttpServer } from "http";

interface PlayerState {
    id: string;
    name: string;
    clicks: number;
    currentArticle: string;
    history: string[];
}

interface Room {
    id: string;
    players: string[]; // socket IDs
    gameState: "waiting" | "playing" | "finished";
    startArticle?: string;
    targetArticle?: string;
    playerStates: Record<string, PlayerState>;
}

const rooms: Record<string, Room> = {};

const ADJECTIVES = ["Neon", "Cyber", "Mega", "Super", "Ultra", "Quantum", "Pixel", "Techno", "Retro", "Binary"];
const ANIMALS = ["Fox", "Owl", "Wolf", "Bear", "Cat", "Dog", "Hawk", "Eagle", "Shark", "Dragon"];

function generateName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `${adj} ${animal}`;
}

export function setupSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        path: "/socket.io",
        addTrailingSlash: false,
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("create_room", ({ username }: { username: string }, callback) => {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const playerName = username || generateName();

            rooms[roomId] = {
                id: roomId,
                players: [socket.id],
                gameState: "waiting",
                playerStates: {
                    [socket.id]: {
                        id: socket.id,
                        name: playerName,
                        clicks: 0,
                        currentArticle: "",
                        history: [],
                    },
                },
            };
            socket.join(roomId);
            callback({ roomId, players: [{ id: socket.id, name: playerName }] });
            console.log(`Room created: ${roomId} by ${playerName} (${socket.id})`);
        });

        socket.on("join_room", ({ roomId, username }: { roomId: string, username: string }, callback) => {
            const room = rooms[roomId];
            if (!room) {
                callback({ error: "Room not found" });
                return;
            }
            if (room.gameState !== "waiting") {
                callback({ error: "Game already started" });
                return;
            }
            if (room.players.length >= 8) {
                callback({ error: "Room is full" });
                return;
            }

            const playerName = username || generateName();
            room.players.push(socket.id);
            room.playerStates[socket.id] = {
                id: socket.id,
                name: playerName,
                clicks: 0,
                currentArticle: "",
                history: [],
            };
            socket.join(roomId);

            const allPlayers = room.players.map(pid => ({
                id: pid,
                name: room.playerStates[pid].name
            }));

            callback({ success: true, roomId, players: allPlayers });

            console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
            io.to(roomId).emit("player_joined", { players: allPlayers });
        });

        socket.on("start_game", async ({ roomId, start, target }: { roomId: string, start: string, target: string }) => {
            const room = rooms[roomId];
            if (!room) return;

            if (room.players.length < 2) {
                // Should be handled by client but good to enforce
                return;
            }

            room.startArticle = start;
            room.targetArticle = target;
            room.gameState = "playing";

            // Reset stats just in case
            room.players.forEach(pid => {
                if (room.playerStates[pid]) {
                    room.playerStates[pid].clicks = 0;
                    room.playerStates[pid].currentArticle = start;
                    room.playerStates[pid].history = [start];
                }
            });

            io.to(roomId).emit("game_started", { start, target });
            console.log(`Game started in room ${roomId}: ${start} -> ${target}`);
        });

        socket.on("update_progress", ({ roomId, currentArticle, clicks }) => {
            const room = rooms[roomId];
            if (!room || room.gameState !== "playing") return;

            const player = room.playerStates[socket.id];
            if (player) {
                player.currentArticle = currentArticle;
                player.clicks = clicks;
                player.history.push(currentArticle);

                socket.to(roomId).emit("opponent_progress", {
                    playerId: socket.id,
                    name: player.name,
                    currentArticle,
                    clicks
                });
            }
        });

        socket.on("game_win", ({ roomId, path }: { roomId: string, path: string[] }) => {
            const room = rooms[roomId];
            if (!room || room.gameState !== "playing") return;

            // Do NOT end game for everyone
            // room.gameState = "finished"; 

            const winnerName = room.playerStates[socket.id].name;
            console.log(`Player ${winnerName} won in room ${roomId}`);

            // Broadcast that SOMEONE won, but game continues
            io.to(roomId).emit("player_won", { winnerId: socket.id, winnerName, path });
        });

        socket.on("return_to_lobby", ({ roomId }: { roomId: string }) => {
            const room = rooms[roomId];
            if (room) {
                room.gameState = "waiting";
                // Reset players ready status if we tracked it, but here we just send them back to lobby UI
                io.to(roomId).emit("reset_to_lobby");
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            for (const roomId in rooms) {
                const room = rooms[roomId];
                if (room.players.includes(socket.id)) {
                    console.log(`Removing player ${socket.id} from room ${roomId}`);
                    room.players = room.players.filter(id => id !== socket.id);

                    const remainingPlayers = room.players.map(pid => ({
                        id: pid,
                        name: room.playerStates[pid].name
                    }));

                    io.to(roomId).emit("player_left", { playerId: socket.id, players: remainingPlayers });

                    if (room.players.length === 0) {
                        delete rooms[roomId];
                        console.log(`Room ${roomId} deleted (empty)`);
                    }
                }
            }
        });
    });
}
