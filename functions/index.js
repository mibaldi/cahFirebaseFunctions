const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();
const _ = require('lodash');

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

        const blackCards = getRandomArray(numBlackCards,numBlacks)
        const whiteCards = getRandomArray(numWhiteCards,numWhites)

        const cards = { negras : blackCards, blancas : whiteCards  }

        event.data.ref.child('cartas').set(cards)
    });
});

exports.changeNumPlayers = functions.database.ref('/juegos/{idJuego}/jugadores').onWrite(event => {
	
  if (!event.data.exists()) {
    return;
  }
    
  const juegoRef = event.data.ref.parent;
  const numJugadores = juegoRef.child('config').child('numJugadores');
  const jugadoresRef = event.data.ref;
  const juegoStateRef = juegoRef.child('estado');
  let number = 1;
  numJugadores.once("value", function(data) {
   number = data.val()
    });

  return jugadoresRef.once("value", (snapshot) => {

    if (snapshot.numChildren() === number ) {
       juegoRef.update({estado : 1});
       console.log("Empieza la partida");
    }else {
       juegoRef.update({estado : 0});
       console.log('Faltan jugadores');
   }
});
});

exports.changeGameStatus = functions.database.ref('/juegos/{idJuego}/estado').onWrite(event => {
    const status = event.data.val()
    const gameRef = event.data.ref.parent;
    if(status === 1){
        initGame(gameRef)
    }
    return status;
});

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

function getRandomArray(maxSize,minSize){
    let randomList = [];

    while(randomList.length < minSize){
        const random = _.random(maxSize)
        if(!randomList.includes(random)){
            randomList.push(random)
        }
    }
    return randomList;
}

function initGame(gameRef){

    return gameRef.once("value", (snapshot) => {

        const game = snapshot.val()

        const players = handOut(game,game.config.numCartasJugador)

        const playersOrder = getPlayersOrder(players)
        const firstTurn = {0 : {narrador : playersOrder[0]}}

        gameRef.update({orden : playersOrder, turnos : firstTurn, jugadores : players})

    });
}

function finishGame(gameRef){
    gameRef.update({estado : 2});
}


function getPlayersOrder(playersDict){
    return _.shuffle(_.keys(playersDict)) 
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
        const status = (possibles != null)? 2 : 3;
        turnRef.child('estado').set(status)
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

function handOut(game,numCards){

    const numPlayers = game.config.numJugadores;
    const numCardsToDistribute = numPlayers * numCards;

    let players = game.jugadores

    let cards = _.values(game.cartas.blancas);

    const cardsDistributed = _.chunk(cards.slice(0,numCardsToDistribute),numPlayers)

    const playerKeys =  _.keys(players);
    for (i = 0; i < playerKeys.length; i++) { 
        players[playerKeys[i]].cartas = _.assign(players[playerKeys[i]].cartas,cardsDistributed[i]) 
    }
    return players;
}

function createTurn(gameRef){
    return gameRef.once("value", (snapshot) => {
        const game = snapshot.val()
        const numCards = _.keys(game.cartas.negras).length;

        const turns = game.turnos;
        const order = game.orden;
        const lastTurn = turns[_.keys(turns)[_.keys(turns).length - 1]]
        const lastIndex = getPlayerIndex(order,lastTurn.narrador)

        if(turns.length === numCards){
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




