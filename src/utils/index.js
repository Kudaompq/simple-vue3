export function isObject(value) {
    return value !== null && typeof value === 'object';
}

export function hasChanged(newValue, oldValue) {
    return newValue !== oldValue && (newValue === newValue || oldValue === oldValue);
}

export function isArray(value) {
    return Array.isArray(value);
}