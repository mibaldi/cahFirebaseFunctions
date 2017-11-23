const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();
const _ = require('lodash');


exports.changeNumPlayers = functions.database.ref('/juegos/{idJuego}/jugadores').onUpdate(event => {
	
  const juegoRef = event.data.ref.parent;
  const numJugadores = juegoRef.child('config').child('numJugadores');
  const jugadoresRef = event.data.ref;
  const juegoStateRef = juegoRef.child('estado');
  let number = 1;
  numJugadores.once("value", function(data) {
     number = data.val()
 });

  return jugadoresRef.once("value", (snapshot) => {
      console.log(snapshot.numChildren())

      if (snapshot.numChildren() === number ) {
         juegoRef.update({estado : 1});
         console.log("Empieza la partida");
     }else {
         juegoRef.update({estado : 0});
         console.log('Faltan jugadores');
     }
 });
});

exports.changeGameStatus = functions.database.ref('/juegos/{idJuego}/estado').onUpdate(event => {
    const status = event.data.val()
    const gameRef = event.data.ref.parent;
    if(status === 1){
        initGame(gameRef)
    }
       
    return status;
});

function initGame(gameRef){
    gameRef.once("value", (snapshot) => {
        const game = snapshot.val()
        const playersOrder = getPlayersOrder(game.jugadores)
        const firstTurn = {0 : {narrador : playersOrder[0]}}
        //TODO Preparar las cartas
        gameRef.update({orden : playersOrder, turnos : firstTurn})
    });
}

function finishGame(gameRef){
    gameRef.update({estado : 2});
}

exports.changeTurnStatus = functions.database.ref('/juegos/{idJuego}/turnos/{idTurno}/estado').onWrite(event => {

    const turnRef = event.data.ref.parent;
    const gameRef = turnRef.parent.parent;
    const status = event.data.val()

    return gameRef.once("value", (snapshot) => {

        const game = snapshot.val()

        setTimeout(() => {
            checkTimeout(status,turnRef,gameRef)
        }, game.config.tiempo*1000);
    });
});

function getPlayersOrder(playersDict){
    const players = _.shuffle(_.keys(playersDict)) 
    return _.zipObject(_.range(players.length),players)
}

function getPlayerIndex(orderDict,player){
    return _.findKey(orderDict, (value) => { return value === player});
}

function checkTimeout(status,turnRef,gameRef){

    switch(status){

        case 0: 
        checkQuestion(turnRef)
        break;

        case 1:
        checkAnswers(turnRef)
        break;

        case 2:
        checkWinner(turnRef)
        break;

        case 3:
        createTurn(gameRef)
        break;
    }

}

function checkQuestion(turnRef){
	return turnRef.child('pregunta').once("value", (snapshot) => {
        let question = snapshot.val();
        if(question == null){
            turnRef.child('estado').set(3)
        } 
    });
}

function checkAnswers(turnRef){
	return turnRef.child('posibles').once("value", (snapshot) => {
        let possibles = snapshot.val();
        if(possibles == null){
            turnRef.child('estado').set(3)
        } 
    });
}

function checkWinner(turnRef){

    return turnRef.once("value", (snapshot) => {

        const turn = snapshot.val()

        let winner = turn.ganador;
        const possibles = turn.posibles;

        if(winner == null && possibles != null){
        	const players = Object.keys(possibles);
        	winner = players[ players.length * Math.random() << 0];
        }
        turnRef.update({ganador : winner,estado : 3})
    });
}

function createTurn(gameRef){
    return gameRef.once("value", (snapshot) => {
        const game = snapshot.val()
        let numUsedCards = game.usadas;
        const numCards = _.keys(game.cartas.negras).length;

            const turns = game.turnos;
            const order = game.orden;
            const lastTurn = turns[_.keys(turns)[_.keys(turns).length - 1]]
            const lastIndex = getPlayerIndex(order,lastTurn.narrador)

            if(turns.length === numCards - 1){
               finishGame(gameRef)
            }else{
                let newIndex = parseInt(lastIndex) + 1;
            const newTurn = { narrador : order[newIndex]}

            let obj = {}
            obj["turnos/"+newIndex] = newTurn;
            gameRef.update(obj)
            }

    });
}




