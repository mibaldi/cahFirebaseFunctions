const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();
const _ = require('lodash');
var Stopwatch = require('timer-stopwatch');

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
       juegoRef.update({estado : 3});
       console.log("Empieza la partida");
    }else {
       juegoRef.update({estado : 2});
       console.log('Faltan jugadores');
   }
});
});

exports.changeGameStatus = functions.database.ref('/juegos/{idJuego}/estado').onWrite(event => {
    const status = event.data.val()
    const gameRef = event.data.ref.parent;
    if(status === 3){
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

        var timer = new Stopwatch(game.config.tiempo*1000);
        timer.start()

        console.log("creacion timer",game.config.tiempo,timer)

        checkTimeout(timer,status,turnRef,gameRef,game)
        
        // Fires when the timer is done
        timer.onDone(function(){
            console.log('Timer is complete');
            timerComplete(timer,status,turnRef,gameRef,game)
        });
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

        const result = handOut(game,game.config.numCartasJugador)

        console.log(result)

        const playersOrder = getPlayersOrder(result[0])
        const firstTurn = {0 : {narrador : playersOrder[0]}}

        let obj = {}
        obj['orden'] = playersOrder;
        obj['turnos'] = firstTurn;
        obj['jugadores'] = result[0];
        obj['cartas'] = { blancas : result[1]};

        gameRef.update(obj)

    });
}

function finishGame(gameRef){
    gameRef.update({estado : 4});
}


function getPlayersOrder(playersDict){
    return _.shuffle(_.keys(playersDict)) 
}

function getPlayerIndex(orderDict,player){
    return _.findKey(orderDict, (value) => { return value === player});
}

function checkTimeout(timer,status,turnRef,gameRef,game){

    switch(status){

        case 0: 
        checkQuestion(timer,turnRef)
        break;

        case 1:
        checkAnswers(timer,turnRef,game)
        break;

        case 2:
        checkWinner(timer,turnRef)
        break;

        case 3:
        createTurn(timer,gameRef)
        break;
    }

}

function timerComplete(timer,status,turnRef,gameRef,game){

    switch(status){

        case 0: 
        checkQuestionTimeout(timer,turnRef)
        break;

        case 1:
        checkAnswersTimeout(timer,turnRef,game)
        break;

        case 2:
        checkWinnerTimeout(timer,turnRef)
        break;

        case 3:
        createTurn(timer,gameRef)
        break;
    }

}
function checkQuestion(timer,turnRef){
	return turnRef.child('pregunta').on("value", (snapshot) => {
        let question = snapshot.val();
        if(question){
            timer.stop()
            turnRef.child('estado').set(1)
        } 
    });
}

function checkAnswers(timer,turnRef,game){
	return turnRef.child('posibles').on("value", (snapshot) => {
        let possibles = snapshot.val();
        if (possibles){
            console.log('posibles=',possibles)
            let numberChilds = Object.keys(possibles).length
            if (numberChilds == game.config.numJugadores - 1) {
                timer.stop()
                let status = 2
                turnRef.child('estado').set(status)
            }
        }
    });
}

function checkWinner(timer,turnRef){

    return turnRef.child('ganador').on("value", (snapshot) => {
        let winner = snapshot.val();
        if (winner){
            timer.stop()
            turnRef.update({ganador : winner,estado : 3})
        }
        
    });
}

//TIMEOUT
function checkQuestionTimeout(timer,turnRef){
    return turnRef.child('pregunta').once("value", (snapshot) => {
        let question = snapshot.val();
        console.log("checkQuestionTimeout",question)
        if(question == null){
            console.log("checkQuestionTimeout == null")

            timer.stop()
            turnRef.child('estado').set(3)
        } 
    });
}

function checkAnswersTimeout(timer,turnRef,game){
    return turnRef.child('posibles').once("value", (snapshot) => {
        let possibles = snapshot.val();
        if (possibles == null){
            timer.stop()
            turnRef.child('estado').set(3)
        }else {
            timer.stop()
            turnRef.child('estado').set(2)
        }
    });
}

function checkWinnerTimeout(timer,turnRef){

    return turnRef.once("value", (snapshot) => {
        const turn = snapshot.val()
        let winner = turn.ganador;
        const possibles = turn.posibles;

        if(winner == null && possibles != null){
            const players = Object.keys(possibles);
            winner = players[ players.length * Math.random() << 0];
        }
        turnRef.update({ganador : winner,estado : 3})
    })
}


function handOut(game,numCards){

    const numPlayers = game.config.numJugadores;
    const numCardsToDistribute = numPlayers * numCards;
    let whiteCards = game.cartas.blancas

    let players = game.jugadores

    let cards = _.values(whiteCards);

    const cardsDistributed = _.chunk(cards.slice(0,numCardsToDistribute),numCards)

    const playerKeys =  _.keys(players);
    for (i = 0; i < playerKeys.length; i++) { 
        let handouts;
        if(players[playerKeys[i]].cartas){
            handouts = _.assign(players[playerKeys[i]].cartas,cardsDistributed[i]);
        }else{
            handouts = cardsDistributed[i];
        }
        //_.assign(players[playerKeys[i]],{ cartas : handouts})
        players[playerKeys[i]].cartas = handouts;
    }

    let index = _.keys(whiteCards).slice(0,numCardsToDistribute);

    return [players,_.omit(whiteCards,index)];
}

function createTurn(timer,gameRef){
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





