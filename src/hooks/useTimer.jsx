import { useState, useEffect, useRef } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const timeoutRef = useRef(null);
    const onEndRef = useRef(onEnd);
    const endedRef = useRef(false);

    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    const clearTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const tick = () => {
        timeoutRef.current = setTimeout(() => {
            setTime((current) => {
                if (current <= 1) {
                    if (!endedRef.current) {
                        endedRef.current = true;
                        clearTimer();
                        onEndRef.current?.();
                    }
                    return 0;
                }
                tick();
                return current - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (!active) {
            clearTimer();
            endedRef.current = false;
            return;
        }

        endedRef.current = false;
        tick();

        return () => {
            clearTimer();
            endedRef.current = false;
        };
    }, [active]);

    const reset = (newTime) => {
        clearTimer();
        endedRef.current = false;
        setTime(newTime);

        if (active) {
            tick();
        }
    };

    return { time, reset };
};

export default useTimer;