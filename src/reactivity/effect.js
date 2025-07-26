
let activeEffect = null;
/**
 * effectStack 用于解决嵌套循环下的副作用函数问题
 * 每次执行 effect 时，将当前的 activeEffect 压入栈中
 * 执行完毕后再将其弹出
 */
let effectStack = [];
let targetMap = new WeakMap();

/**
 * 副作用函数
 * @param {Function} fn 
 */
export function effect(fn) {
    const effectFn = () => {
        // 💡 关键：每次执行前清理之前的依赖
        cleanup(effectFn);
        
        try {
            effectStack.push(activeEffect); // 将当前激活的副作用函数压入栈中
            activeEffect = effectFn; // 设置当前激活的副作用函数
            return fn(); // 执行副作用函数
        } finally {
            effectStack.pop(); // 从栈中移除当前副作用函数
            activeEffect = effectStack[effectStack.length - 1];
        }
    }
    
    // 💡 关键：给副作用函数添加依赖列表
    effectFn.deps = [];
    
    effectFn()
    return effectFn; // 返回副作用函数本身
}

/**
 * 清理副作用函数的所有依赖
 * @param {Function} effectFn 副作用函数
 */
function cleanup(effectFn) {
    // 从所有依赖的 Set 中移除当前副作用函数
    for (let i = 0; i < effectFn.deps.length; i++) {
        const dep = effectFn.deps[i];
        dep.delete(effectFn);
    }
    // 清空依赖数组，准备重新收集
    effectFn.deps.length = 0;
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
    
    // 💡 关键：建立双向连接
    dep.add(activeEffect); // 将当前副作用函数添加到依赖集合中
    activeEffect.deps.push(dep); // 将依赖集合添加到副作用函数的依赖列表中
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
    
    // 💡 关键：创建副本避免无限循环
    const effectsToRun = new Set(dep);
    effectsToRun.forEach(effectFn => {
        effectFn(); // 执行所有依赖的副作用函数
    });
}

