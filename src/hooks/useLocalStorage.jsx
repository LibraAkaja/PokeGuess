import { useState } from "react";

const useLocalStorage = (key, initialValue) => {
    const [value, setValue] = useState(() => {
        const stored = localStorage.getItem(key);
        return stored? JSON.parse(stored): initialValue;
    });

    const update = (newValue) => {
        setValue(newValue);
        localStorage.setItem(key, JSON.stringify(newValue));
    };

    return [value, update];
};

export default useLocalStorage;