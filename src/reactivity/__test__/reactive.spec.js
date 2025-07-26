import { describe, it, expect, vi } from 'vitest';
import { reactive, isReactive } from '../reactive.js';
import { effect } from '../effect.js';

describe('reactive', () => {
  describe('基本功能', () => {
    it('应该使对象变为响应式', () => {
      const original = { foo: 1 };
      const observed = reactive(original);
      
      expect(observed).not.toBe(original);
      expect(isReactive(observed)).toBe(true);
      expect(isReactive(original)).toBe(false);
      expect(observed.foo).toBe(1);
    });

    it('应该返回相同的代理对象', () => {
      const original = { foo: 1 };
      const observed1 = reactive(original);
      const observed2 = reactive(original);
      
      expect(observed1).toBe(observed2);
    });

    it('如果传入的已经是响应式对象，应该直接返回', () => {
      const original = { foo: 1 };
      const observed = reactive(original);
      const observed2 = reactive(observed);
      
      expect(observed).toBe(observed2);
    });

    it('非对象类型应该直接返回', () => {
      const primitives = [1, 'string', true, null, undefined];
      
      primitives.forEach(primitive => {
        expect(reactive(primitive)).toBe(primitive);
        expect(isReactive(primitive)).toBe(false);
      });
    });
  });

  describe('嵌套对象', () => {
    it('应该能处理嵌套对象', () => {
      const original = {
        nested: {
          foo: 1
        },
        array: [{ bar: 2 }]
      };
      
      const observed = reactive(original);
      
      expect(isReactive(observed)).toBe(true);
      expect(observed.nested).toBe(original.nested);
      expect(observed.array).toBe(original.array);
    });
  });

  describe('属性访问和设置', () => {
    it('应该能正确设置和获取属性', () => {
      const observed = reactive({ foo: 1 });
      
      // 获取属性
      expect(observed.foo).toBe(1);
      
      // 设置属性
      observed.foo = 2;
      expect(observed.foo).toBe(2);
      
      // 添加新属性
      observed.bar = 3;
      expect(observed.bar).toBe(3);
    });

    it('应该正确处理 getter/setter', () => {
      const original = {
        _value: 1,
        get value() {
          return this._value;
        },
        set value(newValue) {
          this._value = newValue;
        }
      };
      
      const observed = reactive(original);
      
      expect(observed.value).toBe(1);
      observed.value = 2;
      expect(observed.value).toBe(2);
      expect(observed._value).toBe(2);
    });
  });

  describe('响应式更新', () => {
    it('应该在属性改变时触发副作用函数', () => {
      const observed = reactive({ foo: 1 });
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = observed.foo;
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(1);
      
      // 改变属性
      observed.foo = 2;
      expect(callCount).toBe(2);
      expect(dummy).toBe(2);
    });

    it('应该在设置相同值时不触发副作用函数', () => {
      const observed = reactive({ foo: 1 });
      let callCount = 0;
      
      effect(() => {
        callCount++;
        observed.foo;
      });
      
      expect(callCount).toBe(1);
      
      // 设置相同的值
      observed.foo = 1;
      expect(callCount).toBe(1); // 不应该再次触发
    });

    it('应该处理多个属性的依赖', () => {
      const observed = reactive({ foo: 1, bar: 2 });
      let dummy1, dummy2;
      let callCount1 = 0, callCount2 = 0;
      
      effect(() => {
        callCount1++;
        dummy1 = observed.foo;
      });
      
      effect(() => {
        callCount2++;
        dummy2 = observed.bar;
      });
      
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
      expect(dummy1).toBe(1);
      expect(dummy2).toBe(2);
      
      // 只改变 foo
      observed.foo = 10;
      expect(callCount1).toBe(2);
      expect(callCount2).toBe(1); // bar 的副作用函数不应该被触发
      expect(dummy1).toBe(10);
      
      // 只改变 bar
      observed.bar = 20;
      expect(callCount1).toBe(2); // foo 的副作用函数不应该被触发
      expect(callCount2).toBe(2);
      expect(dummy2).toBe(20);
    });

    it('应该处理一个副作用函数依赖多个属性', () => {
      const observed = reactive({ foo: 1, bar: 2 });
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = observed.foo + observed.bar;
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(3);
      
      // 改变 foo
      observed.foo = 10;
      expect(callCount).toBe(2);
      expect(dummy).toBe(12);
      
      // 改变 bar
      observed.bar = 20;
      expect(callCount).toBe(3);
      expect(dummy).toBe(30);
    });
  });

  describe('边界情况', () => {
    it('应该处理数组索引', () => {
      const observed = reactive([1, 2, 3]);
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = observed[0];
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(1);
      
      observed[0] = 10;
      expect(callCount).toBe(2);
      expect(dummy).toBe(10);
    });

    it('应该处理数组长度变化', () => {
      const observed = reactive([1, 2, 3]);
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = observed.length;
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(3);
      
      observed.push(4);
      expect(callCount).toBe(2);
      expect(dummy).toBe(4);
    });

    it('应该处理 Symbol 键', () => {
      const key = Symbol('test');
      const observed = reactive({ [key]: 1 });
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = observed[key];
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(1);
      
      observed[key] = 2;
      expect(callCount).toBe(2);
      expect(dummy).toBe(2);
    });

    it('应该正确处理 undefined 和 null 值', () => {
      const observed = reactive({ foo: undefined, bar: null });
      let dummy1, dummy2;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy1 = observed.foo;
        dummy2 = observed.bar;
      });
      
      expect(callCount).toBe(1);
      expect(dummy1).toBe(undefined);
      expect(dummy2).toBe(null);
      
      observed.foo = null;
      expect(callCount).toBe(2);
      expect(dummy1).toBe(null);
      
      observed.bar = undefined;
      expect(callCount).toBe(3);
      expect(dummy2).toBe(undefined);
    });
  });

  describe('isReactive', () => {
    it('应该正确识别响应式对象', () => {
      const original = { foo: 1 };
      const observed = reactive(original);
      
      expect(isReactive(observed)).toBe(true);
      expect(isReactive(original)).toBe(false);
    });

    it('应该正确处理非对象类型', () => {
      expect(isReactive(1)).toBe(false);
      expect(isReactive('string')).toBe(false);
      expect(isReactive(true)).toBe(false);
      expect(isReactive(null)).toBe(false);
      expect(isReactive(undefined)).toBe(false);
    });
  });
});