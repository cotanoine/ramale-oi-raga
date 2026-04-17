import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));
console.log(__dirname);
const players = {};

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/index.html'));
});

// Constantes de la carte
const map_width  = 5000;
const map_height = 5000;

// Utilitaires

let letters = "0123456789ABCDEF";
function random_hex_color() {
    let color = '#';
    for (let i = 0; i < 6; i++)
        color += letters[(Math.floor(Math.random() * 16))];
    return color;
}

function distance(a, b) {
    return Math.sqrt((a.y - b.y) ** 2 + (a.x - b.x) ** 2);
}

// Génération des orbes 
const NB_ORBES = Math.floor(map_width * map_height / 10000);

function creerOrbe(x, y, rayon, couleur, dx, dy) {
    return {
        x:       x       ?? Math.random() * map_width,
        y:       y       ?? Math.random() * map_height,
        rayon:   rayon   ?? 3,
        couleur: couleur ?? random_hex_color(),
        dx:      dx      ?? 0,
        dy:      dy      ?? 0
    };
}

var orbes = Array.from({ length: NB_ORBES }, () => creerOrbe());


// Socket.io 
io.on('connection', (socket) => {

    socket.emit('your:id', socket.id);
    let id = randomUUID();
    console.log(String(id) + ' user connected');

    // Création du joueur quand il entre son pseudo
    socket.on('player:join', (data) => {
        players[socket.id] = {
            pseudo:  data.pseudo,
            couleur: random_hex_color(),
            mouse:   { x: 300, y: 200 },
            cellules: [
                { x: Math.random() * map_width, y: Math.random() * map_height, rayon: 20, splitTime: null }
            ],
        };
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('user disconnected');
    });

    // Réception de la position de la souris
    socket.on('player:move', (data) => {
        if (!players[socket.id]) return;
        players[socket.id].mouse = { x: data.x, y: data.y };
    });

    // Split
    socket.on('split', () => {
        if (!players[socket.id]) return;
        const player = players[socket.id];

        const nouvellesCellules = [];
        player.cellules.forEach(cellule => {
            cellule.was_last_split = false;
            if (cellule.rayon < 20) return;

            const nouveauRayon = cellule.rayon / Math.sqrt(2);
            const dx   = player.mouse.x - cellule.x;
            const dy   = player.mouse.y - cellule.y;
            const dist = distance(player.mouse, cellule);

            const eject = 50;
            const nx = dist > 0 ? cellule.x + (dx / dist) * eject : cellule.x + eject;
            const ny = dist > 0 ? cellule.y + (dy / dist) * eject : cellule.y;

            cellule.rayon     = nouveauRayon;
            let splitTime = Date.now();
            cellule.splitTime = splitTime;

            nouvellesCellules.push({
                x:         nx,
                y:         ny,
                rayon:     nouveauRayon,
                splitTime: splitTime,
                was_last_split : true
            });
        });

        player.cellules.push(...nouvellesCellules);
    });

    // Éjection de masse
    socket.on('eject', () => {
        if (!players[socket.id]) return;
        const player = players[socket.id];

        player.cellules.forEach(cellule => {
            if (cellule.rayon < 20) return;

            const dx   = player.mouse.x - cellule.x;
            const dy   = player.mouse.y - cellule.y;
            const dist = distance(player.mouse, cellule);

            const rayonEjecte = 10;
            cellule.rayon -= rayonEjecte;

            const vitesse = 15;
            const vx = dist > 0 ? (dx / dist) * vitesse : vitesse;
            const vy = dist > 0 ? (dy / dist) * vitesse : 0;

            orbes.push(creerOrbe(
                cellule.x + (dx / dist) * cellule.rayon,
                cellule.y + (dy / dist) * cellule.rayon,
                rayonEjecte,
                player.couleur,
                vx,
                vy
            ));
        });
    });
});

// Boucle de jeu (25ms = ~40 fois/sec) 
setInterval(() => {

    // Déplacement des orbes éjectées
    orbes.forEach(orbe => {
        if (orbe.dx || orbe.dy) {
            orbe.x  += orbe.dx;
            orbe.y  += orbe.dy;
            orbe.dx *= 0.9;
            orbe.dy *= 0.9;
            orbe.x = Math.max(orbe.rayon, Math.min(map_width  - orbe.rayon, orbe.x));
            orbe.y = Math.max(orbe.rayon, Math.min(map_height - orbe.rayon, orbe.y));
        }
    });

    // Mise à jour de la position de chaque joueur vers sa souris
    Object.values(players).forEach(player => {
        player.cellules.forEach(cellule => {
            const dx   = player.mouse.x - cellule.x;
            const dy   = player.mouse.y - cellule.y;
            const dist = distance(player.mouse, cellule);

            if (dist > 1) {
                let separation_speed = cellule.was_last_split ? 10*2**((cellule.splitTime - Date.now())/200) : 0
                const vitesse = 1 + (3 * Math.min(dist, 100) / 100) * (30 / cellule.rayon) + separation_speed;
                cellule.x += (dx / dist) * vitesse;
                cellule.y += (dy / dist) * vitesse;
            }
        });
    });

    // Bordures de la carte
    Object.values(players).forEach(player => {
        player.cellules.forEach(cellule => {
            cellule.x = Math.max(cellule.rayon, Math.min(map_width  - cellule.rayon, cellule.x));
            cellule.y = Math.max(cellule.rayon, Math.min(map_height - cellule.rayon, cellule.y));
        });
    });

    // Collision joueur → orbes
    Object.values(players).forEach(player => {
        player.cellules.forEach(cellule => {
            orbes.forEach(orbe => {
                if (distance(orbe, cellule) + orbe.rayon < cellule.rayon + 0.5 * orbe.rayon) {
                    orbes.splice(orbes.indexOf(orbe), 1);
                    cellule.rayon += orbe.rayon / 5;
                    orbes.push(creerOrbe());
                }
            });
        });
    });

    // Collision entre joueurs
    Object.entries(players).forEach(([idA, playerA]) => {
        Object.entries(players).forEach(([idB, playerB]) => {
            if (idA === idB) return;

            playerA.cellules.forEach(celluleA => {
                playerB.cellules.forEach((celluleB, indexB) => {
                    if (distance(celluleB, celluleA) + celluleB.rayon < celluleA.rayon + 0.7 * celluleB.rayon) {
                        celluleA.rayon = Math.sqrt(celluleA.rayon ** 2 + celluleB.rayon ** 2);
                        playerB.cellules.splice(indexB, 1);
                    }
                });

                if (playerB.cellules.length === 0) {
                    io.to(idB).emit('dead');
                    delete players[idB];
                }
            });
        });
    });

    const now = Date.now();

    // Collision entre cellules du même joueur (répulsion)
    Object.values(players).forEach(player => {
        if (player.cellules.length <= 1) return;

        for (let i = 0; i < player.cellules.length; i++) {
            for (let j = i + 1; j < player.cellules.length; j++) {
                const c1  = player.cellules[i];
                const c2  = player.cellules[j];
                

                if (now - c1.splitTime < 50 || now - c2.splitTime < 50) continue;

                const dist    = distance(c1, c2);
                const minDist = c1.rayon + c2.rayon;

                if (dist < minDist && dist > 0) {
                    const dx      = c2.x - c1.x;
                    const dy      = c2.y - c1.y;
                    const overlap = (minDist - dist) / 2;

                    c1.x -= (dx / dist) * overlap;
                    c1.y -= (dy / dist) * overlap;
                    c2.x += (dx / dist) * overlap;
                    c2.y += (dy / dist) * overlap;
                }
            }
        }
    });

    // Fusion automatique des cellules après 10 secondes
    Object.values(players).forEach(player => {
        if (player.cellules.length <= 1) return;

        const aFusionner = player.cellules.filter(c =>
            c.splitTime !== null && now - c.splitTime > 10000
        );

        if (aFusionner.length === 0) return;

        const restantes    = player.cellules.filter(c => !aFusionner.includes(c));
        const aireTotale   = aFusionner.reduce((sum, c) => sum + c.rayon ** 2, 0);
        const nouveauRayon = Math.sqrt(aireTotale);
        const plusGrande   = aFusionner.reduce((max, c) => c.rayon > max.rayon ? c : max);

        restantes.push({
            x:         plusGrande.x,
            y:         plusGrande.y,
            rayon:     nouveauRayon,
            splitTime: null
        });

        player.cellules = restantes;
    });

    // Envoi des positions à tous les clients
    io.emit('orbes', orbes);

    // Tri des joueurs par rayon avant envoi
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => {
            const maxA = Math.max(...a.cellules.map(c => c.rayon));
            const maxB = Math.max(...b.cellules.map(c => c.rayon));
            return maxA - maxB;
        })
        .reduce((obj, [id, player]) => {
            obj[id] = player;
            return obj;
        }, {});

    // Calcul et envoi du leaderboard
    const leaderboard = Object.values(players)
        .map(player => ({
            pseudo: player.pseudo,
            rayon:  Math.sqrt(player.cellules.reduce((sum, c) => sum + c.rayon ** 2, 0))
        }))
        .sort((a, b) => b.rayon - a.rayon)
        .slice(0, 10);

    io.emit('leaderboard', leaderboard);
    io.emit('players:update', sortedPlayers);

}, 25);

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});