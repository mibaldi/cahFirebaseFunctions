# Funciones

- initGame : Inicializa el juego cuando todos los jugadores se han unido al juego.
- changeTurnStatus : Cambia el estado del turno cuando acaba el tiempo, previamente configurado.

# Cambios de estados

Los turnos son de 3 estados:

- Estado 0: El narrador tiene n segundos para escoger una pregunta.
- Estado 1: El resto de jugadores tienen n segundos para escojer una respuesta a la pregunta del narrador.
- Estado 2: El narrador tiene n segundos para escoger una respuesta del resto de jugadores a la pregunta.
- Estado 3: Se muestra el resultado del turno

Ejemplo estado de turno:

    "Turno1" : {
      "estado" : 3,
      "narrador" : "Jugador4",
      "ganador" : "Jugador1",
      "posibles" : {
        "Jugador1" : "aaaa",
        "Jugador2" : "bbbb"
      },
      "pregunta" : "¿Que letras me gustan mas?",
      "tiempo" : 90
    }

El flujo de estados es el siguiente:

- E0 -> E1 (si el jugador ha seleccionado una pregunta) ó E3 (si no se ha seleccionado ninguna pregunta)

- E1 -> E2 (si al menos un jugador ha elegido respuesta) ó E3 (si ningún jugador ha elejido respuesta)

- E2 -> E3 (si el jugador ha seleccionado una respuesta ganadora). Si el jugador no ha seleccionado una respuesta ganadora se elegirá una respuesta aleatoria como ganadora.



