import { hasChanged,isObject } from '../utils';
import { reactive } from './reactive';
import { track, trigger } from './effect.js';

const IS_REF = Symbol('isRef');
export function ref(value) {
    if (isRef(value)) {
        return value; // 如果已经是 ref，直接返回
    }
    return new RefImpl(value);
}


class RefImpl{
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value; // 如果是对象，转换为响应式对象
        this[IS_REF] = true; // 标记为 ref
    }

    get value() {
        // 触发依赖收集
        track(this, 'value');
        return this._value;
    }

    set value(newValue) {
        if (hasChanged(newValue, this._value)) {
            this._value = isObject(newValue) ? reactive(newValue) : newValue; // 如果是对象，转换为响应式对象
            trigger(this, 'value'); // 触发依赖更新
        }
    }
}

export function isRef(value) {
    return !!(value && value[IS_REF]); // 检查是否是 ref
}
