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

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/index.html'));
});

var cercles = []

// Currently hardcoded in index.html...
const map_width = 600;
const map_height = 400;


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

  let id = randomUUID();
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('nouveau cercle', (x,y) => {
    console.log('Nouveau cercle: ' + x + ", "+y);
    let cercle = {x:x, y:y, dx:gaussianRandom(0,5), dy:gaussianRandom(0,5),rayon:gaussianRandom(40,5), couleur:random_hex_color(), owner: id};
    cercles.push(cercle);
    cercles.sort((a,b) => a.rayon - b.rayon);
  });

  socket.on('move left', (id) => {

  })
});



setInterval(() => {
    cercles.forEach(cercle => {
    cercle.x += cercle.dx;
    cercle.y += cercle.dy;
    if(cercle.x - cercle.rayon < 0 || cercle.x+cercle.rayon > map_width){
        cercle.dx = - cercle.dx;
    }
    if(cercle.y - cercle.rayon < 0 || cercle.y+cercle.rayon > map_height){
        cercle.dy = - cercle.dy;
    }     
  });
    io.emit('positions', cercles);
}, 25);

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});


