const functions = require('firebase-functions');

const admin = require('firebase-admin');
const database = admin.database();

var utilsModule = require('./utils.js');
const _ = require('lodash');
var ref = require('./references.js')

exports.initGame = function(gameId){

    return ref.gameRef(gameId).once('value', (snapshot) => {

        const game = snapshot.val()

        const result =  utilsModule.handOut(game,game.config.numCartasJugador)

        const playersOrder = utilsModule.getPlayersOrder(result[0])
        const firstTurn = {0 : {narrador : playersOrder[0]}}

        let obj = {}
        obj.orden = playersOrder;
        obj.turnos = firstTurn;
        obj.jugadores = result[0];
        obj["cartas/blancas"] = _.values(result[1]);
        obj["estado"] = 2
        ref.gameRef(gameId).update(obj)

    });
}

exports.finishGame = function(gameId){
    ref.gameStatusRef(gameId).set(4)
}