const admin = require('firebase-admin');
const database = admin.database();


exports.gameRef = (gameId) => database.ref('/juegos/'+gameId)
exports.gameStatusRef = (gameId) => database.ref('/juegos/'+gameId+'/estado')

exports.turnRef = (gameId,turnId) => database.ref('/juegos/'+gameId+'/turnos/'+turnId)
exports.turnStatusRef = (gameId,turnId) => database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/estado')
exports.turnQuestionRef = (gameId,turnId) => database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/pregunta')
exports.turnAnswersRef = (gameId,turnId) => database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/posibles')
exports.turnWinnerRef = (gameId,turnId) => database.ref('/juegos/'+gameId+'/turnos/'+turnId+'/ganador')

exports.cardsRef = () => database.ref('/cartas')