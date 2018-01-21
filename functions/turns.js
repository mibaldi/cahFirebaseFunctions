const functions = require('firebase-functions');

const admin = require('firebase-admin');
const database = admin.database();

var modulo = require('./utils.js');
const _ = require('lodash');


exports.checkTimeout = function(timer,status,turnId,gameId,game,isTimeout){

    switch(status){

        case 0: 
        checkQuestion(timer,turnId, game, gameId, isTimeout)
        break;

        case 1:
        checkAnswers(timer,turnId,game,gameId, isTimeout)
        break;

        case 2:
        checkWinner(timer,turnId, isTimeout)
        break;

        case 3:
        createTurn(timer,turnId,game,gameId)
        break;
    }

}

checkQuestion = function(timer,turnId, game, gameId, isTimeout){

    let ref = database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/pregunta')

    if(isTimeout){
        return ref.once('value', (snapshot) => {
            let question = snapshot.val();
            if(question == null){
                timer.stop()
                database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(3)
            } 
        });
    }else{
        return ref.on('value', (snapshot) => {
            let question = snapshot.val();
            if(question != null){
                timer.stop()
                let blackCards = modulo.updateBlackCards(game,question)
                let obj = {}
                obj["cartas/negras"] = blackCards
                obj["turnos/"+turnId+"/estado"]= 1
                database.ref('/juegos/'+gameId).update(obj)
            } 
        });
    }
}

checkAnswers = function(timer,turnId,game, gameId, isTimeout){

    let ref = database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/posibles')

    if(isTimeout){
        return ref.once('value', (snapshot) => {
            let possibles = snapshot.val();
            let status = 2;
            timer.stop()
            if (possibles == null){
                status = 3
            }
            database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(status)
        });
    }else{
        return ref.on('value', (snapshot) => {
            let possibles = snapshot.val();
            if (possibles){
                let numberChilds = Object.keys(possibles).length
                if (numberChilds === parseInt(game.config.numJugadores)) {
                    timer.stop()
                    let players = modulo.updatePlayerCards(game.jugadores,possibles)
                    let obj = {}
                    obj["turnos/"+turnId+"/estado"]= 2
                    obj["jugadores"] = players
                    database.ref('/juegos/'+gameId).update(obj)
                }
            }
        });
    }
}

checkWinner = function(timer,turnId,gameId, isTimeout){

    let ref = database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/ganador')

    if(isTimeout){
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
    }else{
        return ref.on('value', (snapshot) => {
            let winner = snapshot.val();
            if (winner){
                timer.stop()
                database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado').set(3)
            }
        });
    }
}

createTurn = function(timer,turnId,game,gameId){
    timer.stop()
    
    const turns = game.turnos;
    const order = game.orden;
    const lastTurn = turns[_.keys(turns)[turnId]];
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