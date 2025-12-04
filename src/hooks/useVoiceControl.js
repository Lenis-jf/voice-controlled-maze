import React from "react";
import {useState, useRef, useEffect} from "react";

export default function useVoiceControl({onResult, continuous = true, interimResults = false, lang = 'de-DE'} = {}) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API is not supported in this browser.");
            setIsListening(false);
            return;
        }

        setIsSupported(true);

        const recognition = new SpeechRecognition();

        recognition.lang = lang;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;

        recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript;
            const confidence = lastResult[0].confidence;

            if(typeof onResult === "function") {
                console.log("Voice command recognized:", transcript, "Confidence:", confidence);
                onResult({ transcript, confidence, raw: event });
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            if(isListening) {
                try {
                    recognition.start();
                } catch(error) {
                    console.warn("Error restarting recognition:", error);
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            try {
                recognitionRef.current?.stop();
                setIsListening(false);
            } catch(error) {
                console.warn("Error stopping recognition on cleanup:", error);
            }

            recognitionRef.current = null;
        };
    }, [lang]);

    const start = () => {
        if(recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch(error) {
                console.warn("Error starting recognition:", error);
            }
        }
    };

    const stop = () => {
        if(recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
                setIsListening(false);
            } catch(error) {
                console.warn("Error stopping recognition:", error);
            }
        }
    };

    const toggle = () => isListening ? stop() : start();

    return {
        isListening,
        isSupported,
        start,
        stop,
        toggle
    };
}