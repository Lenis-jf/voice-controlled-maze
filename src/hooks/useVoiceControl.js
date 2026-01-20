import React from "react";
import {useState, useRef, useEffect} from "react";

export default function useVoiceControl({onResult, continuous = true, interimResults = false, lang = 'de-DE'} = {}) {
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const recognitionRef = useRef(null);
    const onResultRef = useRef(onResult);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

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
            // Iterate over all new results starting from the resultIndex
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                // Only process final results
                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();
                    const confidence = result[0].confidence;
                    
                    if (typeof onResultRef.current === "function") {
                        console.log(`Voice recognized [idx=${i}]: "${transcript}" (${confidence})`);
                        onResultRef.current({ transcript, confidence, raw: event });
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setIsListening(false);
                isListeningRef.current = false;
            }
        };

        recognition.onend = () => {
            if(isListeningRef.current) {
                try {
                    console.log("Restarting speech recognition logic...");
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
                isListeningRef.current = false; // Ensure we don't restart on unmount
                setIsListening(false);
            } catch(error) {
                console.warn("Error stopping recognition on cleanup:", error);
            }

            recognitionRef.current = null;
        };
    }, [lang, continuous, interimResults]);

    const start = () => {
        if(recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                isListeningRef.current = true;
            } catch(error) {
                console.warn("Error starting recognition:", error);
            }
        }
    };

    const stop = () => {
        if(recognitionRef.current && isListening) {
            try {
                isListeningRef.current = false; // Critical: prevent auto-restart
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