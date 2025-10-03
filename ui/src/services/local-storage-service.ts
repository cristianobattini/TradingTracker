export const setLocalStorageItem = (key: string, value: string) => {
    localStorage.setItem(key, value);
}

export const getLocalStorageItem = (key: string): string | null => {
    return localStorage.getItem(key);
} 