const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();
var Stopwatch = require('timer-stopwatch');
var utilsModule = require('./utils.js');
var gameModule = require('./game.js');
var turnsModule = require('./turns.js');


exports.createGame = functions.database.ref('/juegos/{idJuego}').onCreate(event => {
    
    if (!event.data.exists()) {
        return;
    }

    return database.ref('/cartas').once('value', (snapshot) => {
        const numWhiteCards = snapshot.child('blancas').numChildren()
        const numBlackCards = snapshot.child('negras').numChildren()

        const game = event.data.val()

        const config = game.config;

        const numBlacks = config.rondas * config.numJugadores
        const numWhites = numBlacks * config.numCartasJugador;

        const blackCards = utilsModule.getRandomArray(numBlackCards,numBlacks)

        const whiteCards = utilsModule.getRandomArray(numWhiteCards,numWhites)

        const cards = { negras : blackCards, blancas : whiteCards  }


        let obj = {}
        obj['cartas'] = cards;
        obj['estado'] = 1; 
        console.log("Cartas generadas");
        event.data.ref.update(obj)
    });
});

exports.changeNumPlayers = functions.database.ref('/juegos/{idJuego}/jugadores').onWrite(event => {
	
  if (!event.data.exists()) {
    return;
  }
    
  const gameId = event.params.idJuego;
  let numPlayersAdded = event.data.numChildren()
  console.log("NUM JUGADORES:"+numPlayersAdded)

return database.ref('/juegos/'+gameId).once("value", (snapshot) => {
    const game = snapshot.val()
    let status = 2;
    if (numPlayersAdded === game.config.numJugadores ) {
        status = 3;
        console.log("Empieza la partida");
        }else {
        console.log('Faltan jugadores');
        }
        database.ref('/juegos/'+gameId+'/estado').set(status);
});
});

exports.changeGameStatus = functions.database.ref('/juegos/{idJuego}/estado').onWrite(event => {
    const status = event.data.val()
    const gameId = event.params.idJuego;
    if(status === 3){
        gameModule.initGame(gameId)
    }
    return status;
});

exports.changeTurnStatus = functions.database.ref('/juegos/{idJuego}/turnos/{idTurno}/estado').onWrite(event => {

    const status = event.data.val()
    const gameId = event.params.idJuego;
    const turnId = event.params.idTurno;

        return database.ref('/juegos/'+gameId).once('value', (snapshot) => {

            const game = snapshot.val()
            console.log("game",game)
            if(game.config.tiempo){
                var timer = new Stopwatch(game.config.tiempo*1000);
                timer.start()

                console.log("creacion timer",game.config.tiempo,timer)

                turnsModule.checkTimeout(timer,status,turnId,gameId,game)

                // Fires when the timer is done
                timer.onDone(function(){
                    console.log('Timer is complete');
                    turnsModule.timerComplete(timer,status,turnId,gameId,game)
                });
            } 
        });
});











