const _ = require('lodash');
const admin = require('firebase-admin');
const database = admin.database();

exports.getRandomArray = function(maxSize,minSize){
    let randomList = [];

    while(randomList.length < minSize){
        const random = _.random(maxSize)
        if(!randomList.includes(random)){
            randomList.push(random)
        }
    }
    return randomList;
}

exports.finishGame = function(gameId){
    database.ref('/juegos/'+gameId+'/estado').set(4)
}


exports.getPlayersOrder = function(playersDict){
    return _.shuffle(_.keys(playersDict)) 
}

exports.getPlayerIndex = function(orderDict,player){
    return _.findKey(orderDict, (value) => { return value === player});
}

exports.handOut = function(game,numCards){

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
            handouts = _.concat(players[playerKeys[i]].cartas,cardsDistributed[i])
        }else{
            handouts = cardsDistributed[i];
        }
        players[playerKeys[i]].cartas = handouts;
    }

    let index = _.keys(whiteCards).slice(0,numCardsToDistribute);

    return [players,_.omit(whiteCards,index)];
}



exports.updateBlackCards = function(game,question){
    let blackCards = _.omitBy(game.cartas.negras, function(value, key) {
        return value === question
    })
    
    return  _.values(blackCards);
}

exports.updatePlayerCards = function(players,cards){
    let playersUpdated = players;

    for(let key of _.keys(cards)){
        let playerCards = _.omitBy(players[key].cartas, function(value, keyPlayer) {
            return value === cards[key]
        });
        playersUpdated[key].cartas = _.values(playerCards)
    }
    return playersUpdated
}