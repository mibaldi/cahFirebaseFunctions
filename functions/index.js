const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();
var Stopwatch = require('timer-stopwatch');
var utilsModule = require('./utils.js');
var gameModule = require('./game.js');

var turnsModule = require('./turns.js');
var ref = require('./references.js')
const _ = require('lodash');


exports.createGame = functions.database.ref('/juegos/{idJuego}').onCreate(event => {
    
    if (!event.data.exists()) {
        return;
    }

    const gameId = event.params.idJuego;

    return ref.cardsRef().once('value', (snapshot) => {
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
        ref.gameRef(gameId).update(obj)
    });
});

exports.changeNumPlayers = functions.database.ref('/juegos/{idJuego}/jugadores/{idJugador}').onCreate(event => {
	
  if (!event.data.exists()) {
    return;
  }
    
  const gameId = event.params.idJuego;
    return ref.gameRef(gameId).once("value", (snapshot) => {
        const game = snapshot.val()

        let numPlayers = _.keys(game.jugadores).length
        
        if ( numPlayers === game.config.numJugadores ) {
            gameModule.initGame(gameId)
        }
    });
});

exports.changeGameStatus = functions.database.ref('/juegos/{idJuego}/estado').onWrite(event => {
    const status = event.data.val()
    const gameId = event.params.idJuego;
    if(status === 3){
        ref.turnStatusRef(gameId,0).set(0)
    }
    return status;
});

exports.changeTurnStatus = functions.database.ref('/juegos/{idJuego}/turnos/{idTurno}/estado').onWrite(event => {

    const status = event.data.val()
    const gameId = event.params.idJuego;
    const turnId = event.params.idTurno;

    return ref.gameRef(gameId).once('value', (snapshot) => {
        const game = snapshot.val()
        if(game.config.tiempo){
            var timer = new Stopwatch(game.config.tiempo*1000);
            timer.start()

            turnsModule.checkTimeout(timer,status,turnId,gameId,game,false)

            // Fires when the timer is done
            timer.onDone(function(){
                turnsModule.checkTimeout(timer,status,turnId,gameId,game,true)
            });
        } 
    });
});











