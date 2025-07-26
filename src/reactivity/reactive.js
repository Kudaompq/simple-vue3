import { isObject,hasChanged } from "../utils";
import { trigger,track } from "./effect";
import { isArray } from "../utils";

const IS_REACTIVE = Symbol('isReactive');
// 存储对象到代理对象的映射
// 使用 WeakMap 可以自动清理不再使用的对象,避免内存泄漏
// key: target value: proxy
const reactiveMap = new WeakMap();

/**
 * 创建响应式对象，源码中还有个createReactiveObject方法
 * @param {*} target 
 * @returns 
 */
export function reactive(target) {
    // 判断target是否是对象
    if (!isObject(target)) {
        return target; // 如果不是对象，直接返回
    }
    // 如果已经是响应式对象，直接返回
    if (isReactive(target)) {
        return target;
    }
    if (reactiveMap.has(target)) {
        return reactiveMap.get(target);
    }
    // 创建代理对象
    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            if (key === IS_REACTIVE) {
                return true; // 返回响应式标志
            }
            // 触发依赖收集
            track(target, key);
            const res = Reflect.get(target, key, receiver);
            // 如果是对象，递归处理嵌套对象
            return isObject(res) ? reactive(res) : res;
        },
        set(target, key, value, receiver) {
            const oldValue = target[key]
            let oldLength;
            if (isArray(target)) {
                oldLength = target.length;
            }
            const result = Reflect.set(target, key, value, receiver);
            if (hasChanged(value, oldValue)) {
                // 触发依赖更新
                trigger(target, key);
                if (isArray(target) && target.length !== oldLength) {
                    // 如果是数组且长度发生变化，触发数组相关的更新
                    trigger(target, 'length');
                }
            }
            return result;
        }
    })
    reactiveMap.set(target, proxy);
    return proxy;
}

/**
 * 判断对象是否是响应式的
 * @param {Object} target 
 * @returns 
 */
export function isReactive(target) {
    return !!(target && target[IS_REACTIVE]);
}

