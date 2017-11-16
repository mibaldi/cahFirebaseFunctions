const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const database = admin.database();


exports.initGame = functions.database.ref('/juegos/{idJuego}/jugadores').onWrite(event => {
	
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
     		juegoRef.update({
     			"estado":"1"});
     		console.log("Empieza la partida");
     	}else {
     		juegoRef.update({
     			"estado":"0"});
     		console.log('Faltan jugadores');
     	}
    });
});

exports.changeTurnStatus = functions.database.ref('/juegos/{idJuego}/turnos/{idTurno}/estado').onWrite(event => {

    const turnoRef = event.data.ref.parent;
    const juegoRef = turnoRef.parent.parent;
    const estado = event.data.val()
    const intervalo = 5;
    const tiempoTurno = juegoRef.child('config').child('tiempo');

     return tiempoTurno.once("value", (snapshot) => {
        let tiempo = snapshot.val();

        turnoRef.child('tiempo').set(tiempo)
        let interval = setInterval(() => {
            tiempo -= intervalo;
            turnoRef.child('tiempo').set(tiempo)
            if (tiempo <= 0) {
                clearInterval(interval);
                checkTimeout(estado,turnoRef)
            }
            
        }, intervalo*1000);
    });
});

function checkTimeout(status,turnRef){
    
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
        default:
            //TODO
            break;
    }
}

function checkQuestion(turnRef){
	return turnRef.child('pregunta').once("value", (snapshot) => {
        let question = snapshot.val();
        let nextStatus = (question != null) ? 1 : 3
        turnRef.child('estado').set(nextStatus)
    });
}

function checkAnswers(turnRef){
	return turnRef.child('posibles').once("value", (snapshot) => {
        let posibles = snapshot.val();
        let nextStatus = (posibles != null) ? 2 : 3
        turnRef.child('estado').set(nextStatus)
    });
}

function checkWinner(turnRef){

	const getWinner = turnRef.child('ganador').once('value');
  	const getPossibles = turnRef.child('posibles').once('value');

	return Promise.all([getWinner, getPossibles]).then(results => {

        let winner = results[0].val();
        const possibles = results[1].val();

        if(winner == null && possibles != null){
        	const players = Object.keys(possibles);
        	winner = players[ players.length * Math.random() << 0];
        }
        turnRef.update({ganador : winner,estado : 3})
    });
}




