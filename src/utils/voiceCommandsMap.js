export function interpretVoiceCommand(transcript = "") {
    const cleanedTranscript = transcript.toLowerCase();

    if(/\b(subir|arriba|up|oben|nach oben)\b/.test(cleanedTranscript)) return 'UP';
    if(/\b(bajar|abajo|down|unten|nach unten)\b/.test(cleanedTranscript)) return 'DOWN';
    if(/\b(izquierda|left|links)\b/.test(cleanedTranscript)) return 'LEFT';
    if(/\b(derecha|right|rechts)\b/.test(cleanedTranscript)) return 'RIGHT';
    if(/\b(reiniciar|reset|neu starten|generar|regenerar|generate|regenerate|generieren)\b/.test(cleanedTranscript)) return 'GENERATE';
    if(/\b(parar|stop|halt|stopp)\b/.test(cleanedTranscript)) return 'STOP';

    return null;
}