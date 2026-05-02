import { useState, useEffect, useRef } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const intervalRef = useRef(null);
    const onEndRef = useRef(onEnd);

    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    const clearTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const startTimer = () => {
        clearTimer();

        intervalRef.current = setInterval(() => {
            setTime((current) => {
                if (current <= 1) {
                    clearTimer();
                    onEndRef.current?.();
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (!active) {
            clearTimer();
            return;
        }

        if (time > 0) {
            startTimer();
        }

        return () => {
            clearTimer();
        };
    }, [active]);

    const reset = (newTime) => {
        clearTimer();
        setTime(newTime);

        if (active) {
            startTimer();
        }
    };

    return { time, reset };
};

export default useTimer;