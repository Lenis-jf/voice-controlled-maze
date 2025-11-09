export function interpretVoiceCommand(word = "") {
    const t = String(word || "").toLowerCase().trim();
    if (!t) return null;

    if (/\b(subir|arriba|up|oben|nach oben|hoch)\b/.test(t)) return "UP";
    if (/\b(bajar|abajo|down|unten|nach unten|runter)\b/.test(t)) return "DOWN";
    if (/\b(izquierda|izq|left|links)\b/.test(t)) return "LEFT";
    if (/\b(derecha|der|right|rechts)\b/.test(t)) return "RIGHT";
    if (/\b(reiniciar|reset|neu starten|generar|generate|regenerar|regenerate|generieren)\b/.test(t)) return "GENERATE";
    if (/\b(parar|stop|halt|stopp)\b/.test(t)) return "STOP";

    return null;
}

const NUM_WORDS = {
    uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10
};

function parseNumberToken(token) {
    if (!token) return null;
    if (/^\d+$/.test(token)) return parseInt(token, 10);
    return NUM_WORDS[token.toLowerCase()] || null;
}

// devuelve array de comandos (puede ser vacío)
export function interpretSequence(transcript = "") {
    const text = String(transcript || "").toLowerCase().trim();
    if (!text) return [];

    // normalizar conjunciones para separar frases: "y", "und", "and"
    const normalized = text.replace(/\s+y\s+|\s+und\s+|\s+and\s+/g, ",");
    const parts = normalized.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    const out = [];

    for (const part of parts) {
        // buscar número explícito
        const numMatch = part.match(/\b(\d+|uno|dos|tres|cuatro|cinco|one|two|three|four|five|eins|zwei|drei|vier|fünf)\b/);
        let repeat = 1;
        if (numMatch) repeat = parseNumberToken(numMatch[1]) || 1;

        // extraer todas las direcciones encontradas en la parte (puede ser varias)
        const words = part.split(/\s+/);
        const found = [];
        for (const w of words) {
            const cmd = interpretVoiceCommand(w);
            if (cmd) found.push(cmd);
        }

        // si no encontró tokens separados, intentar detectar dirección en toda la frase
        if (found.length === 0) {
            // buscar dirección completa en la frase
            for (const possible of ["up", "down", "left", "right", "generate", "stop"]) {
                const mapped = interpretVoiceCommand(possible); // map via interpretVoiceCommand
                // check original regex by testing phrase with the mapping's keywords
                if (interpretVoiceCommand(part) === mapped) found.push(mapped);
            }
        }

        if (found.length === 0) continue;

        // si la parte contiene varias direcciones, las repetimos `repeat` veces en bloque
        for (let r = 0; r < repeat; r++) {
            out.push(...found);
        }
    }

    return out;
}
