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

 ## Code IA/Humain

 IA :
 - Toute la partie CSS,
 - La partie écran d'accueil et pop-up,
 - La mécanique de zoom sur le joueur,
 - Utilisation pour corriger des problèmes sur la mécanique de split,
 - Fonction drawFish qui permet de dessiner des poissons sur les joueurs,
 - Rédaction d'une partie du README.md

 ## Choix de design
 
### Inspiration
Le jeu s'inspire directement d'Agar.io pour les mécaniques de base (manger, grossir, se diviser). On a voulu rester fidèle à l'expérience originale tout en gardant un code simple et compréhensible, sans framework front-end ni base de données.
 
### Architecture client-serveur autoritaire
On a choisi de faire tourner toute la logique de jeu côté serveur (déplacements, collisions, physique) dans un `setInterval` à 40 ticks/seconde. Le client n'envoie que la position de la souris et reçoit l'état du jeu en retour. Ce choix garantit que tous les joueurs voient exactement la même chose et évite la triche côté client.
 
### Canvas natif
On a utilisé le Canvas HTML5 sans bibliothèque de rendu. C'est suffisant pour notre cas d'usage et ça évite d'ajouter une dépendance qu'on ne maîtrise pas encore complètement.
 
### Ce qu'on a réalisé
- Déplacement fluide à la souris avec vitesse inversement proportionnelle à la taille
- Système de split avec fusion automatique et conservation de l'aire
- Éjection de masse
- Collisions entre joueurs avec absorption
- Caméra centrée sur le joueur avec zoom automatique
- Leaderboard en temps réel
- Écran d'accueil avec pseudo
- Perte de masse en se déplaçant
### Ce qu'on n'a pas eu le temps de faire
- Virus épineux (cellules qui divisent les gros joueurs)
- Persistance des scores entre les parties
- Salles de jeu multiples
- Optimisation réseau (envoi uniquement des entités visibles par le joueur)
---
 
## Améliorations possibles
 
Si on avait plus de temps, voici ce qu'on envisagerait :
 
- **Virus** : ajouter des cellules épineuses qui divisent les joueurs trop gros qui les traversent
- **Optimisation réseau** : n'envoyer à chaque client que les entités dans son champ de vision plutôt que l'état complet de la carte, ce qui deviendrait indispensable sur de grandes cartes avec beaucoup de joueurs
- **Persistance** : sauvegarder les scores avec SQLite pour un classement global entre les parties
- **Salles de jeu** : permettre à plusieurs groupes de jouer en parallèle sur le même serveur
---
 
## Données transmises au serveur
 
| Événement | Émetteur | Contenu |
|---|---|---|
| `player:join` | Client → Serveur | `{ pseudo }` |
| `player:move` | Client → Serveur | `{ x, y }` (position souris en coordonnées monde) |
| `split` | Client → Serveur | _(aucune donnée)_ |
| `eject` | Client → Serveur | _(aucune donnée)_ |
| `players:update` | Serveur → Clients | État complet de tous les joueurs |
| `orbes` | Serveur → Clients | Liste de toutes les orbes |
| `leaderboard` | Serveur → Clients | Top 10 des joueurs |
| `dead` | Serveur → Client | _(aucune donnée)_ |
| `your:id` | Serveur → Client | `socket.id` du joueur |
 
### Gestion des erreurs
 
Les erreurs les plus courantes sont anticipées de la façon suivante :
 
- **Joueur inexistant** : tous les événements côté serveur vérifient `if (!players[socket.id]) return` avant d'accéder aux données du joueur, pour éviter les crashs si un événement arrive avant `player:join`
- **Déconnexion** : le `socket.on('disconnect')` supprime automatiquement le joueur de `players`, ce qui le fait disparaître de la carte pour les autres
- **Division par zéro** : les calculs de vecteur unitaire vérifient `if (dist > 0)` avant de diviser
---
 
## Failles de l'architecture et pistes de correction
 
### Le client est partiellement de confiance
Même si la logique est côté serveur, le client envoie la position de sa souris en coordonnées monde sans vérification. Un joueur malveillant pourrait envoyer des coordonnées hors carte ou se téléporter. Pour corriger ça, il faudrait que le serveur valide que la position de la souris est cohérente avec la position actuelle de la cellule.
 
### Pas de limitation du taux de messages
Un client peut envoyer autant de messages `player:move`, `split` ou `eject` qu'il veut. Un joueur malveillant pourrait spammer `split` pour saturer le serveur. La correction serait d'ajouter un rate limiting côté serveur (ex: ignorer les splits trop rapprochés dans le temps).
 
### L'état du jeu est entièrement broadcasté
À chaque tick, le serveur envoie l'état complet de tous les joueurs et toutes les orbes à tous les clients. Sur une grande carte avec beaucoup de joueurs, ça devient très lourd. La solution serait d'envoyer uniquement les entités dans le champ de vision de chaque joueur.
 
### Pas d'authentification
N'importe qui sur le réseau peut se connecter et jouer. Il n'y a pas de système de salle privée ni de mot de passe. Pour un usage en dehors d'un réseau de confiance, il faudrait ajouter un système de rooms avec code d'accès.
 

 ## Membres
 
- BUVOT Cyprillien
- MAILLARD Antoine