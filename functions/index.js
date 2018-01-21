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
        initGame(gameId)
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

                checkTimeout(timer,status,turnId,gameId,game)

                // Fires when the timer is done
                timer.onDone(function(){
                    console.log('Timer is complete');
                    timerComplete(timer,status,turnId,gameId,game)
                });
            } 
        });
});


getRandomArray = function(maxSize,minSize){
    let randomList = [];

    while(randomList.length < minSize){
        const random = _.random(maxSize)
        if(!randomList.includes(random)){
            randomList.push(random)
        }
    }
    return randomList;
}

initGame = function(gameId){

    database.ref('/juegos/'+gameId).once('value', (snapshot) => {

        const game = snapshot.val()

        const result = handOut(game,game.config.numCartasJugador)

        console.log(result)

        const playersOrder = getPlayersOrder(result[0])
        const firstTurn = {0 : {narrador : playersOrder[0]}}

        let obj = {}
        obj.orden = playersOrder;
        obj.turnos = firstTurn;
        obj.jugadores = result[0];
        obj["cartas/blancas"] = _.values(result[1]);

        database.ref('/juegos/'+gameId).update(obj)

    });
}

finishGame = function(gameId){
    database.ref('/juegos/'+gameId+'/estado').set(4)
}


getPlayersOrder = function(playersDict){
    return _.shuffle(_.keys(playersDict)) 
}

getPlayerIndex = function(orderDict,player){
    return _.findKey(orderDict, (value) => { return value === player});
}

checkTimeout = function(timer,status,turnId,gameId,game){

    switch(status){

        case 0: 
        checkQuestion(timer,turnId, game, gameId)
        break;

        case 1:
        checkAnswers(timer,turnId,game,gameId)
        break;

        case 2:
        checkWinner(timer,turnId)
        break;

        case 3:
        createTurn(timer,turnId,game,gameId)
        break;
    }

}

timerComplete = function(timer,status,turnId,gameId,game){

    switch(status){

        case 0: 
        checkQuestionTimeout(timer,turnId,gameId)
        break;

        case 1:
        checkAnswersTimeout(timer,turnId,game,gameId)
        break;

        case 2:
        checkWinnerTimeout(timer,turnId, gameId)
        break;

        case 3:
        createTurn(timer,turnRef,gameRef)
        break;
    }

}
checkQuestion = function(timer,turnId, game, gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/pregunta').on('value', (snapshot) => {
        let question = snapshot.val();
        if(question != null){
            timer.stop()
            console.log("checkQuestion:")
            let blackCards = updateBlackCards(game,question)
            console.log("checkQuestion2:",turnId)
            let obj = {}
            console.log("checkQuestion3:")
            console.log("Primera comprobacion:",blackCards)
            obj["cartas/negras"] = blackCards
            console.log("Segunda comprobacion",turnId)
            obj["turnos/"+turnId+"/estado"]= 1
            database.ref('/juegos/'+gameId).update(obj)
        } 
    });
}

checkAnswers = function(timer,turnId,game, gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/posibles').on('value', (snapshot) => {
        let possibles = snapshot.val();
        if (possibles){
            console.log('posibles=',possibles)
            let numberChilds = Object.keys(possibles).length
            console.log("NUM HIJOS",numberChilds)
            if (numberChilds === parseInt(game.config.numJugadores)) {
                console.log("ENTRA AQUI")
                timer.stop()
                let players = updatePlayerCards(game.jugadores,possibles)
                let obj = {}
                obj["turnos/"+turnId+"/estado"]= 2
                obj["jugadores"] = players
                database.ref('/juegos/'+gameId).update(obj)
            }else{
                console.log("NO ENTRA",numberChilds)
                console.log("NO ENTRA",game.config.numJugadores)
            }
        }
    });
}

checkWinner = function(timer,turnId,gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/ganador').on('value', (snapshot) => {
        let winner = snapshot.val();
        console.log("WINNER",winner)
        if (winner){
            timer.stop()
            database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(3)
        }
    });
}

//TIMEOUT
checkQuestionTimeout = function(timer,turnId,gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/pregunta').once('value', (snapshot) => {
        let question = snapshot.val();
        console.log("checkQuestionTimeout",question)
        if(question == null){
            console.log("checkQuestionTimeout == null")

            timer.stop()
            database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(3)
        } 
    });
}

checkAnswersTimeout = function(timer,turnId,game, gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/posibles').once('value', (snapshot) => {
        let possibles = snapshot.val();
        let status = 2;
        timer.stop()
        if (possibles == null){
            status = 3
        }
        database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(status)
    });
}

checkWinnerTimeout = function(timer,turnId,gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId).once("value", (snapshot) => {
        const turn = snapshot.val()
        let winner = turn.ganador;
        const possibles = turn.posibles;

        if(winner == null && possibles != null){
            const players = Object.keys(possibles);
            winner = players[ players.length * Math.random() << 0];
        }
        database.ref('/juegos/'+gameId+'/turnos/'+turnId).update({ganador : winner,estado : 3})
    })
}


handOut = function(game,numCards){

    const numPlayers = game.config.numJugadores;
    const numCardsToDistribute = numPlayers * numCards;
    let whiteCards = game.cartas.blancas

    let players = game.jugadores

    let cards = _.values(whiteCards);

    const cardsDistributed = _.chunk(cards.slice(0,numCardsToDistribute),numCards)

    console.log("Cartas:",cardsDistributed)

    const playerKeys =  _.keys(players);
    for (i = 0; i < playerKeys.length; i++) { 
        let handouts;
        if(players[playerKeys[i]].cartas){
            handouts = _.concat(players[playerKeys[i]].cartas,cardsDistributed[i])
        }else{
            handouts = cardsDistributed[i];
        }
        players[playerKeys[i]].cartas = handouts;
    }

    let index = _.keys(whiteCards).slice(0,numCardsToDistribute);

    return [players,_.omit(whiteCards,index)];
}

createTurn = function(timer,turnId,game,gameId){
    timer.stop()
    
    const turns = game.turnos;
    const order = game.orden;
    const lastTurn = turns[_.keys(turns)[turnId]];
    console.log("LAST TURN", lastTurn)
    const lastIndexOrder = getPlayerIndex(order,lastTurn.narrador)

    if(!game.cartas){
        finishGame(gameId)
    }else{
        let newIndexOrder;
        if(lastIndexOrder == order.length - 1){
            newIndexOrder = 0;
        }else{
            newIndexOrder = parseInt(lastIndexOrder) + 1;
        }
        const newIndexTurn = parseInt(turnId) + 1;
        const newTurn = { narrador : order[newIndexOrder]}

        return database.ref('/juegos/'+gameId).once("value", (snapshot) => {
            let gameAux = snapshot.val()

            const result = handOut(gameAux,1)
            let obj = {}

            obj["cartas/blancas"] = _.values(result[1]);
            obj["turnos/"+newIndexTurn]= newTurn
            obj["jugadores"] = result[0]

            database.ref('/juegos/'+gameId).update(obj)
        });

        
    }
}

updateBlackCards = function(game,question){
    console.log("updateBlackCards:")
    
    let blackCards = _.omitBy(game.cartas.negras, function(value, key) {
        return value === question
    })
    
    return  _.values(blackCards);
}

updateWhiteCards = function(game,cards){
    console.log("UPDATEWHITECARDS")
    let cardsValue = _.values(cards).filter(String)
    console.log("VALORES BLANCAS:"+cardsValue)
    let whiteCards = _.omitBy(game.cartas.blancas, function(value, key) {
        return _.indexOf(cardsValue,value) >= 0
    });
    return _.values(whiteCards)
}

updatePlayerCards = function(players,cards){
    let playersUpdated = players;

    for(let key of _.keys(cards)){
        let playerCards = _.omitBy(players[key].cartas, function(value, keyPlayer) {
            return value === cards[key]
        });
        playersUpdated[key].cartas = _.values(playerCards)
    }
    console.log("CARTAS ACTUALIZADAS:"+playersUpdated)
    return playersUpdated
}





