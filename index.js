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

  players[socket.id] = { x: 300, y: 200, rayon: 20, couleur: random_hex_color() };
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

  socket.on('move left', (id) => {

  })
});

const NB_ORBES = 100;

function creerOrbe() {
    return {
        x: Math.random() * map_width,
        y: Math.random() * map_height,
        rayon: 3,
        couleur: random_hex_color()
    };
}

var orbes = Array.from({ length: NB_ORBES }, creerOrbe);

function distance (a,b){
  return Math.sqrt((a.y - b.y)**2 + (a.x - b.x)**2)
}
setInterval(() => {
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
        if (!player.mouse) return;

        const dx = player.mouse.x - player.x;
        const dy = player.mouse.y - player.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 1) {
            const vitesse = 3;
            player.x += (dx / distance) * vitesse;
            player.y += (dy / distance) * vitesse;
        }
    });

    // Envoi des positions à tous les clients
    io.emit('positions', cercles);
    io.emit('orbes', orbes);
    const sortedPlayers = Object.entries(players)
                                .sort(([, a], [, b]) => a.rayon - b.rayon)
                                .reduce((obj, [id, player]) => {
                                  obj[id] = player;
                              return obj;
    }, {});

    io.emit('players:update', sortedPlayers);

    }, 25);

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});


