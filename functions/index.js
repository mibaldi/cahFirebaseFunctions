const functions = require('firebase-functions');
const admin = require('firebase-admin');


admin.initializeApp(functions.config().firebase);

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

    let tiempoTurno = juegoRef.child('config').child('tiempo');

     return tiempoTurno.once("value", (snapshot) => {
        let tiempo = snapshot.val();

        turnoRef.child('tiempo').set(tiempo)
        let interval = setInterval(() => {
            tiempo -= intervalo;
            turnoRef.child('tiempo').set(tiempo)
            if (tiempo <= 0) {
                clearInterval(interval);
                console.log("TIME'S UP!")
                checkTimeout(estado,turnoRef)
            }
            
        }, intervalo*1000);
        //TODO
    });
});

function checkTimeout(status,turnRef){
    
    switch(status){

        case 0: 
            //TODO
            turnRef.child('estado').set(3)
            break;
        case 1:
            //TODO
            turnRef.child('estado').set(2)
            break;
        case 2:
            //TODO
            turnRef.child('estado').set(3)
            break;
        default:
            //TODO
            break;
    }

}


