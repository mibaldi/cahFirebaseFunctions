const functions = require('firebase-functions');

const admin = require('firebase-admin');
const database = admin.database();

var modulo = require('./utils.js');
const _ = require('lodash');


exports.initGame = function(gameId){

    database.ref('/juegos/'+gameId).once('value', (snapshot) => {

        const game = snapshot.val()

        const result =  modulo.handOut(game,game.config.numCartasJugador)

        console.log(result)

        const playersOrder = modulo.getPlayersOrder(result[0])
        const firstTurn = {0 : {narrador : playersOrder[0]}}

        let obj = {}
        obj.orden = playersOrder;
        obj.turnos = firstTurn;
        obj.jugadores = result[0];
        obj["cartas/blancas"] = _.values(result[1]);

        database.ref('/juegos/'+gameId).update(obj)

    });
}