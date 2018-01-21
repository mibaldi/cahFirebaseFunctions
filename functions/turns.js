const functions = require('firebase-functions');

const admin = require('firebase-admin');
const database = admin.database();

var modulo = require('./utils.js');
const _ = require('lodash');


exports.checkTimeout = function(timer,status,turnId,gameId,game){

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

exports.timerComplete = function(timer,status,turnId,gameId,game){

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

createTurn = function(timer,turnId,game,gameId){
    timer.stop()
    
    const turns = game.turnos;
    const order = game.orden;
    const lastTurn = turns[_.keys(turns)[turnId]];
    console.log("LAST TURN", lastTurn)
    const lastIndexOrder = modulo.getPlayerIndex(order,lastTurn.narrador)

    if(!game.cartas){
        modulo.finishGame(gameId)
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

            const result = modulo.handOut(gameAux,1)
            let obj = {}

            obj["cartas/blancas"] = _.values(result[1]);
            obj["turnos/"+newIndexTurn]= newTurn
            obj["jugadores"] = result[0]

            database.ref('/juegos/'+gameId).update(obj)
        }); 
    }
}

checkQuestion = function(timer,turnId, game, gameId){
    return database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/pregunta').on('value', (snapshot) => {
        let question = snapshot.val();
        if(question != null){
            timer.stop()
            console.log("checkQuestion:")
            let blackCards = modulo.updateBlackCards(game,question)
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
                let players = modulo.updatePlayerCards(game.jugadores,possibles)
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