# oi-raga
Not agar.io :eyes:
 
Le principe du jeu se base sur le jeu Agar.io.
Il s'agit d'un jeu multijoueur où nous contrôlons une boule pouvant grossir en mangeant des boules plus petites que le joueur. Ces boules mangeables peuvent être des joueurs ou des petites boules créées dans l'unique but d'être mangées.
 
## Comment lancer le jeu
 
Cloner le dépôt puis installer les dépendances :
 
```bash
npm install
```
 
Lancer le serveur :
 
```bash
node index.js
```
 
Ouvrir un navigateur et aller sur :
 
```
http://localhost:3000
```
 
## Jouer en multijoueur
 
Le jeu se joue en réseau local. La personne qui héberge la partie lance le serveur comme indiqué ci-dessus, puis trouve son adresse IP locale :
 
```bash
# Windows
ipconfig
# chercher "Adresse IPv4"
 
# Mac/Linux
ifconfig | grep inet
```
 
Les autres joueurs ouvrent leur navigateur et tapent :
 
```
http://<adresse-ip>:3000
```
 
Pas besoin d'installer quoi que ce soit côté joueur, juste un navigateur.
 
## Règles
 
- **Souris** : déplacer sa cellule
- **Espace** : se diviser en deux
- **Z/W** : éjecter de la masse vers la souris
- Manger les orbes colorées pour grossir
- Manger les joueurs plus petits que soi
- Attention aux joueurs plus grands !
 
## Mécaniques
 
- Plus une cellule est grosse, plus elle est lente
- Se déplacer consomme de la masse
- Après un split, les cellules fusionnent automatiquement après 10 secondes
- La masse éjectée peut être récupérée par n'importe quel joueur
 
## Stack technique
 
- **Serveur** : Node.js + Express + Socket.io
- **Client** : HTML5 Canvas + JavaScript natif
 
## Membres
 
- BUVOT Cyprillien
- MAILLARD Antoine
 