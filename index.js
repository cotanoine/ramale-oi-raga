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


app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/index.html'));
});

var cercles = []

// Currently hardcoded in index.html...
const map_width = 1000;
const map_height = 1000;


function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}




let letters = "0123456789ABCDEF";
function random_hex_color() {
  let color = '#';
  // Generating 6 times as HTML color code 
  // consist of 6 letter or digits
  for (let i = 0; i < 6; i++)
      color += letters[(Math.floor(Math.random() * 16))];
  return color;        
}

io.on('connection', (socket) => {

 players[socket.id] = {
    couleur: random_hex_color(),
    mouse:   { x: 300, y: 200 },
    cellules: [
        { x: Math.random() * map_width, y: Math.random() * map_height, rayon: 20, splitTime: null }
    ]
  };
  socket.emit('your:id', socket.id);

  let id = randomUUID();
  console.log('a user connected');

  socket.on('disconnect', () => {
    delete players[socket.id];
    console.log('user disconnected');
  });

  socket.on('nouveau cercle', (x,y) => {
    console.log('Nouveau cercle: ' + x + ", "+y);
    let cercle = {x:x, y:y, dx:gaussianRandom(0,5), dy:gaussianRandom(0,5),rayon:gaussianRandom(40,5), couleur:random_hex_color(), owner: id};
    cercles.push(cercle);
    cercles.sort((a,b) => a.rayon - b.rayon);
  });

  socket.on('player:move', (data) => {
    players[socket.id].mouse = { x: data.x, y: data.y };
});

  socket.on('split', () => {
    const player = players[socket.id];

    const nouvellesCellules = [];
    player.cellules.forEach(cellule => {

        // Rayon minimum pour splitter (pour l'instant 20)
        if (cellule.rayon < 20) return;

        // Conserver l'aire : si on divise en 2, chaque cellule a la moitié de l'aire
        const nouveauRayon = cellule.rayon / Math.sqrt(2);

        const dx   = player.mouse.x - cellule.x;
        const dy   = player.mouse.y - cellule.y;
        const dist = distance(player.mouse, cellule);

        const eject = 50; // distance d'éjection (pareil à voir)
        const nx = dist > 0 ? cellule.x + (dx / dist) * eject : cellule.x + eject;
        const ny = dist > 0 ? cellule.y + (dy / dist) * eject : cellule.y;

        cellule.rayon = nouveauRayon;
        cellule.splitTime = Date.now();

        nouvellesCellules.push({
            x:         nx,
            y:         ny,
            rayon:     nouveauRayon,
            splitTime: Date.now()
        });
    });

    // Ajouter les nouvelles cellules au joueur
    player.cellules.push(...nouvellesCellules);
  });

  socket.on('eject', () => {
    const player = players[socket.id];

    player.cellules.forEach(cellule => {
        if (cellule.rayon < 20) return;

        const dx   = player.mouse.x - cellule.x;
        const dy   = player.mouse.y - cellule.y;
        const dist = distance(player.mouse, cellule);

        // Masse éjectée = fixe à 10
        const rayonEjecte = 10;
        cellule.rayon    -= rayonEjecte;

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

  socket.on('move left', (id) => {

  })
});

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

function distance (a,b){
  return Math.sqrt((a.y - b.y)**2 + (a.x - b.x)**2)
}

setInterval(() => {

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

  let num_cercle = 1;
  let number_of_circles = cercles.length;
    cercles.forEach(cercle => {
    cercle.x += cercle.dx;
    cercle.y += cercle.dy;
    if(cercle.x - cercle.rayon < 0){
        cercle.dx = Math.abs(cercle.dx)
    } 
    if( cercle.x+cercle.rayon > map_width){
        cercle.dx = - Math.abs(cercle.dx)
    }
    if(cercle.y - cercle.rayon < 0){
        cercle.dy = Math.abs(cercle.dy)
    } 
    if( cercle.y+cercle.rayon > map_height){
        cercle.dy = - Math.abs(cercle.dy)
    }
    
      orbes.forEach(orbe => {
        if(distance(orbe, cercle) + orbe.rayon < cercle.rayon + 0.5*orbe.rayon){
          orbes.splice(orbes.indexOf(orbe),1);
          orbes.push(creerOrbe());
          cercle.rayon += orbe.rayon/5;
          
        }
      })
      
      for(let i = num_cercle;i<number_of_circles;i++){
      let autre_cercle = cercles[i];
      if(distance(cercle, autre_cercle) + cercle.rayon < autre_cercle.rayon + 0.5*cercle.rayon){
        cercles.splice(num_cercle-1,1);
        autre_cercle.rayon += cercle.rayon/20;
        number_of_circles -= 1
        break
      }
      }
      num_cercle += 1;
    });

    // Mise à jour de la position de chaque joueur vers sa souris
    Object.values(players).forEach(player => {
    player.cellules.forEach(cellule => {
        const dx   = player.mouse.x - cellule.x;
        const dy   = player.mouse.y - cellule.y;
        const dist = distance(player.mouse, cellule);

        if (dist > 1) {
          const vitesse = (3 * Math.min(dist, 100) / 100) * (30 / cellule.rayon);
          cellule.x += (dx / dist) * vitesse;
          cellule.y += (dy / dist) * vitesse;

          // Perte de masse en se déplaçant
          if (cellule.rayon > 20) {  
            cellule.rayon *= 0.9998;
          }
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
    // Collision entre les joueurs et les orbes
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
            if (idA === idB) return; // ne pas se manger soi-même

            playerA.cellules.forEach(celluleA => {
                playerB.cellules.forEach((celluleB, indexB) => {

                    if (distance(celluleB, celluleA) + celluleB.rayon < celluleA.rayon + 0.5 * celluleA.rayon) {
                        // Conservation de l'aire
                        celluleA.rayon = Math.sqrt(celluleA.rayon ** 2 + celluleB.rayon ** 2);
                        // Supprimer la cellule mangée
                        playerB.cellules.splice(indexB, 1);
                    }
                });

                // Si le joueur n'a plus de cellules, réapparition
                if (playerB.cellules.length === 0) {
                    playerB.cellules.push({ 
                    x: Math.random() * map_width, 
                    y: Math.random() * map_height, 
                    rayon: 20, 
                    splitTime: null 
                    });
                }
            });
        });
    });
    // Collision entre cellules du même joueur (répulsion)
    Object.values(players).forEach(player => {
      if (player.cellules.length <= 1) return;

      for (let i = 0; i < player.cellules.length; i++) {
          for (let j = i + 1; j < player.cellules.length; j++) {
              const c1 = player.cellules[i];
              const c2 = player.cellules[j];

              // Ignorer si le split est trop récent (< 1s)
              const now = Date.now();
              if (now - c1.splitTime < 10 || now - c2.splitTime < 10) continue;

              const dist = distance(c1, c2);
              const minDist = c1.rayon + c2.rayon;

              if (dist < minDist && dist > 0) {
                  const dx = c2.x - c1.x;
                  const dy = c2.y - c1.y;
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
      if (player.cellules.length <= 1) return; // rien à fusionner

      const now = Date.now();
      const aFusionner = player.cellules.filter(c => 
          c.splitTime !== null && now - c.splitTime > 10000
      );

      if (aFusionner.length < 2) return;

    
      const aireTotale = aFusionner.reduce((sum, c) => sum + c.rayon ** 2, 0);
      const nouveauRayon = Math.sqrt(aireTotale);

      const plusGrande = aFusionner.reduce((max, c) => c.rayon > max.rayon ? c : max);

      player.cellules = player.cellules.filter(c => !aFusionner.includes(c));
      player.cellules.push({
          x:         plusGrande.x,
          y:         plusGrande.y,
          rayon:     nouveauRayon,
          splitTime: null
        });
    });

    // Envoi des positions à tous les clients
    io.emit('positions', cercles);
    io.emit('orbes', orbes);
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
    io.emit('players:update', sortedPlayers);

    }, 25);

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});


