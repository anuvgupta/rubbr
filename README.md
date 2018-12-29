# rubbr
An online multiplayer game with cars and... well basically [agar.io](http://agar.io) with cars.  
*Hosted at: [rubbr.anuv.me](http://rubbr.anuv.me)*  
&nbsp;  
*Update 2018: rubbr now runs on socket.io instead of pocketjs. The pocketjs code lives in its own branch. Play the pocketjs version* [here](http://pjs.rubbr.anuv.me).
  
## instructions
 Visit [rubbr.anuv.me](http://rubbr.anuv.me) to play!

 1. Name - type a name (alphanumeric) and hit join - you will be assigned a color
 2. Controls - move the mouse around to move your car in different directions and at varying speeds
    1. If this doesn't work, click on the grid to focus your cursor - it should turn into a crosshair
    2. Hit space to boost
 3. Money - move around and collect money, you will need this for boosts
    1. Boosts cost $20 each
 4. Health - you have 100% health and if you run out, game over
    1. If you are low on health, search for health packs (white circles with a red cross) to gain back some health
    2. Or just wait in the corner, your health regenerates slowly by itself
 5. Rankings - our place in the leaderboard (only top 5 are shown) is determined by the number of kills you have
    1. Boosts - To get a kill, you must boost into another player. To do so, either go through one of the nitro gates (big green hexagons) for a free boost or collect $20 and hit the space bar (every non-nitro-gate boost costs $20).
    2. Kills - Once you boost into a player (who is not boosting) you will get 1 kill and they will lose 25% health, but they will become invulnerable for a couple seconds. If you boost into a player low on health and they die after your hit, you get 2 kills rather than one.

Have fun!

## inspiration
At an internship in 2016, kids at our workshop were obsessed with the online games [agar.io](http://agar.io), [slither.io](http://slither.io), and even [diep.io](http://diep.io). So, my friend and I decided to make the "next big .io game," and decided to appeal to gamers' appreciation for crashing cars and feeling like they're gaining money. And thus, the idea for rubbr was born. He started making it by changing the mechanics and graphics of an agar clone, so I challenged him - I would make the entire thing from scratch. So while he finished his version in two weeks, I decided not to use an agar clone, and not even use Node.js. That summer I created [pocketjs](https://github.com/anuvgupta/pocketjs), my own PHP WebSocket implementation. Meanwhile, we put his version on Heroku, and you can play it at [rubbr.io](http://rubbr.io) if it's still up. This summer (2017), I decided to go back and use pocketjs to make my own version of rubbr; it's a little different, but you can check it out at [rubbr.anuv.me](http://rubbr.anuv.me) to play. I'll move it to [rubbr.ml](http://rubbr.ml) if I ever get that domain back. Update: In winter 2018, I ported the game over to socket.io as an experiment, but that is now the offical version.

## code
rubbr uses JavaScript WebSockets; the WebSocket server uses my own PHP WebSocket server library, pocketjs.  
&nbsp;  
External Resources Used  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[jQuery](https://jquery.com/) - v3.3.1 - UI manipulation  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[block.js](https://github.com/anuvgupta/block.js) - v3.0 - UI development and design  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[socket.io](https://socket.io) - v2.2.0 - WebSocket server  

*Original car icon courtesy of Laurence Willmott of [The Noun Project](https://thenounproject.com/)*   
