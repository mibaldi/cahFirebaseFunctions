const functions = require('firebase-functions');

const admin = require('firebase-admin');
const database = admin.database();

var utilsModule = require('./utils.js');
var gameModule = require('./game.js');
var ref = require('./references.js')

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
        checkWinner(timer,turnId,gameId, isTimeout)
        break;

        case 3:
        createTurn(timer,turnId,game,gameId)
        break;
    }

}

checkQuestion = function(timer,turnId, game, gameId, isTimeout){

    let res = ref.turnQuestionRef(gameId,turnId)

    if(isTimeout){
        return res.once('value', (snapshot) => {
            let question = snapshot.val();
            if(question == null){
                timer.stop()
                ref.turnStatusRef(gameId,turnId).set(3)
            } 
        });
    }else{
        return res.on('value', (snapshot) => {
            let question = snapshot.val();
            if(question != null){
                timer.stop()
                let blackCards = utilsModule.updateBlackCards(game,question)
                let obj = {}
                obj["cartas/negras"] = blackCards
                obj["turnos/"+turnId+"/estado"]= 1
                ref.gameRef(gameId).update(obj)
            } 
        });
    }
}

checkAnswers = function(timer,turnId,game, gameId, isTimeout){

    let res = ref.turnAnswersRef(gameId,turnId)

    if(isTimeout){
        return res.once('value', (snapshot) => {
            let possibles = snapshot.val();
            let status = 2;
            timer.stop()
            let obj = {}
            if(possibles){
                let players = utilsModule.updatePlayerCards(game.jugadores,possibles)
                obj["jugadores"] = players
            }else{
                status = 3
            }
            obj["turnos/"+turnId+"/estado"]= status
            ref.gameRef(gameId).update(obj)
        });
    }else{

        return res.on('value', (snapshot) => {
            let possibles = snapshot.val();
            if (possibles){
                let numberChilds = Object.keys(possibles).length
                if (numberChilds === parseInt(game.config.numJugadores)) {
                    timer.stop()
                    let players = utilsModule.updatePlayerCards(game.jugadores,possibles)
                    let obj = {}
                    obj["turnos/"+turnId+"/estado"]= 2
                    obj["jugadores"] = players

                    ref.gameRef(gameId).update(obj)
                }
            }
        });
    }
}

checkWinner = function(timer,turnId,gameId, isTimeout){

    if(isTimeout){
        return ref.turnRef(gameId,turnId).once("value", (snapshot) => {

            const turn = snapshot.val()
            let winner = turn.ganador;
            const possibles = turn.posibles;
    
            if(winner == null && possibles != null){
                const players = _.keys(possibles);
                winner = players[ players.length * Math.random() << 0];
            }
            ref.turnRef(gameId,turnId).update({ganador : winner,estado : 3})
        })
    }else{
        return ref.turnWinnerRef(gameId,turnId).on('value', (snapshot) => {
            let winner = snapshot.val();
            if (winner){
                timer.stop()
                ref.turnStatusRef(gameId,turnId).set(3)
            }
        });
    }
}

createTurn = function(timer,turnId,game,gameId){
    timer.stop()
    
    const turns = game.turnos;
    const order = game.orden;
    const lastTurn = turns[_.keys(turns)[turnId]];
    const lastIndexOrder = utilsModule.getPlayerIndex(order,lastTurn.narrador)

    if(!game.cartas){
        gameModule.finishGame(gameId)
    }else{
        let newIndexOrder;
        if(lastIndexOrder == order.length - 1){
            newIndexOrder = 0;
        }else{
            newIndexOrder = parseInt(lastIndexOrder) + 1;
        }
        const newIndexTurn = parseInt(turnId) + 1;
        const newTurn = { narrador : order[newIndexOrder]}
        
        const result = utilsModule.handOut(game,1)
        let obj = {}

        obj["cartas/blancas"] = _.values(result[1]);
        obj["turnos/"+newIndexTurn]= newTurn
        obj["jugadores"] = result[0]

        ref.gameRef(gameId).update(obj)
    }
}
