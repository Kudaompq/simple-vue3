import { isFunction } from "../utils";
import { effect, track,trigger } from "./effect";

export function computed(getterOrOptions) {
    let getter, setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions; // 如果传入的是函数，直接作为getter
        setter = () => {
            console.warn('Computed property is readonly'); // 如果没有setter，警告用户
        }
    } else {
        getter = getterOrOptions.get; // 如果传入的是对象，获取getter
        setter = getterOrOptions.set; // 获取setter
    }
    return new ComputedRefImpl(getter, setter); // 返回计算属性的实现

}

class ComputedRefImpl {
    constructor(getter, setter) {
        this._setter = setter; // 存储计算属性的 setter 函数（如果有）
        this._dirty = true; // 标记计算属性是否需要重新计算
        this._value = undefined; // 存储计算属性的值
        this.effect = effect(getter, {
            lazy: true, // 设置为懒执行，只有在访问 value 时才会执行
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true;
                    // 依赖当前computed的effect会被重新执行
                    trigger(this, 'value')
                }
            }
        })
    } 

    get value() {
        // 依赖收集应该总是进行，不管是否需要重新计算
        track(this, 'value');
        
        if (this._dirty) {
            /**
             * 计算新值，并且重置脏标记
             * this.effect() 会执行getter函数，在getter中可以访问响应式数据
             * 触发依赖收集
             * computed有调度器，所以在其他依赖更新后会触发scheduler
             * 将dirty设置为true，trigger依赖于当前computed的effect，这个时候dirty为true，会重新计算
             */
            this._value = this.effect();
            this._dirty = false; // 重置脏标记
        }
        return this._value; // 返回计算后的值
    }

    set value(newValue) {
        this._setter(newValue); // 调用 setter 设置新值
    }
}


