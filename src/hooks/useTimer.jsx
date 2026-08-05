import { useState, useEffect, useRef, useCallback } from "react";

const useTimer = (initial, onEnd, active = true) => {
    const [time, setTime] = useState(initial);
    const intervalRef = useRef(null);
    const onEndRef = useRef(onEnd);
    const activeRef = useRef(active);

    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    useEffect(() => {
        activeRef.current = active;
    }, [active]);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startInterval = useCallback(() => {
        clearTimer();
        intervalRef.current = window.setInterval(() => {
            setTime((prev) => {
                if (typeof prev === 'number' && prev <= 1) {
                    clearTimer();
                    onEndRef.current?.();
                    return 0;
                }
                if (typeof prev === 'number') return prev - 1;
                return prev;
            });
        }, 1000);
    }, [clearTimer]);

    useEffect(() => {
        clearTimer();
        if (!active) return;
        startInterval();
        return clearTimer;
    }, [active, clearTimer, startInterval]);

    const reset = (newTime) => {
        // Always clear any existing interval, set the time,
        // then start the interval on the next tick to avoid
        // races when called from within the interval callback.
        clearTimer();
        setTime(newTime);
        if (activeRef.current) {
            setTimeout(() => {
                // ensure still active before starting
                if (activeRef.current) startInterval();
            }, 0);
        }
    };

    return { time, reset };
};

export default useTimer;