
let activeEffect = null;
let targetMap = new WeakMap();
/**
 * 副作用函数
 * @param {Function} fn 
 */
export function effect(fn) {
    const effectFn = () => {
        try {
            activeEffect = effectFn; // 设置当前激活的副作用函数
            return fn(); // 执行副作用函数
        } finally {
            activeEffect = null; // 确保在执行完副作用函数后清除 activeEffect
        }
    }
    effectFn()
    return effectFn; // 返回副作用函数本身

}
/**
 * 依赖收集=>放在 proxy 的 get 方法中
 * @param {Object} target 
 * @param {string} key 
 * @returns 
 */
export function track(target, key) {
    if (!activeEffect) return; // 如果没有激活的副作用函数，直接返回
    let deps = targetMap.get(target);
    if (!deps) {
        targetMap.set(target, (deps = new Map()))
    }
    let dep = deps.get(key);
    if (!dep) {
        deps.set(key, (dep = new Set()))
    }
    dep.add(activeEffect); // 将当前副作用函数添加到依赖集合中
}

/**
 * 触发依赖更新=>放在 proxy 的 set 方法中
 * @param {Object} target 
 * @param {string} key 
 * @returns 
 */
export function trigger(target, key) {
    const deps = targetMap.get(target);
    if (!deps) return; // 如果没有依赖，直接返回
    const dep = deps.get(key);
    if (!dep) return; // 如果没有对应的依赖集合，直接返回
    dep.forEach(effectFn => {
        effectFn(); // 执行所有依赖的副作用函数
    });

}