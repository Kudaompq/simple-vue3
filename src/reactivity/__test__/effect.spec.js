import { describe, it, expect, vi } from 'vitest';
import { effect, track, trigger } from '../effect.js';

describe('effect', () => {
  describe('基本功能', () => {
    it('应该执行传入的函数', () => {
      const fn = vi.fn();
      effect(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该返回副作用函数', () => {
      const fn = () => {};
      const effectFn = effect(fn);
      expect(typeof effectFn).toBe('function');
    });

    it('应该能手动执行返回的副作用函数', () => {
      const fn = vi.fn();
      const effectFn = effect(fn);
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      effectFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该能获取副作用函数的返回值', () => {
      const fn = () => 'test result';
      const effectFn = effect(fn);
      
      const result = effectFn();
      expect(result).toBe('test result');
    });
  });

  describe('依赖收集和触发', () => {
    it('track 应该正确收集依赖', () => {
      const target = { foo: 1 };
      const key = 'foo';
      let dummy;
      
      const effectFn = effect(() => {
        dummy = target[key];
        track(target, key);
      });
      
      expect(dummy).toBe(1);
    });

    it('trigger 应该触发相关的副作用函数', () => {
      const target = { foo: 1 };
      const key = 'foo';
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = target[key];
        track(target, key);
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(1);
      
      // 修改值并触发更新
      target[key] = 2;
      trigger(target, key);
      
      expect(callCount).toBe(2);
      expect(dummy).toBe(2);
    });

    it('应该支持多个副作用函数依赖同一个属性', () => {
      const target = { foo: 1 };
      const key = 'foo';
      let dummy1, dummy2;
      let callCount1 = 0, callCount2 = 0;
      
      effect(() => {
        callCount1++;
        dummy1 = target[key];
        track(target, key);
      });
      
      effect(() => {
        callCount2++;
        dummy2 = target[key] * 2;
        track(target, key);
      });
      
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
      expect(dummy1).toBe(1);
      expect(dummy2).toBe(2);
      
      // 触发更新
      target[key] = 3;
      trigger(target, key);
      
      expect(callCount1).toBe(2);
      expect(callCount2).toBe(2);
      expect(dummy1).toBe(3);
      expect(dummy2).toBe(6);
    });

    it('应该支持一个副作用函数依赖多个属性', () => {
      const target = { foo: 1, bar: 2 };
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = target.foo + target.bar;
        track(target, 'foo');
        track(target, 'bar');
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(3);
      
      // 触发 foo 的更新
      target.foo = 10;
      trigger(target, 'foo');
      expect(callCount).toBe(2);
      expect(dummy).toBe(12);
      
      // 触发 bar 的更新
      target.bar = 20;
      trigger(target, 'bar');
      expect(callCount).toBe(3);
      expect(dummy).toBe(30);
    });

    it('不应该触发无关属性的副作用函数', () => {
      const target = { foo: 1, bar: 2 };
      let dummy;
      let callCount = 0;
      
      effect(() => {
        callCount++;
        dummy = target.foo;
        track(target, 'foo');
      });
      
      expect(callCount).toBe(1);
      expect(dummy).toBe(1);
      
      // 触发无关属性 bar 的更新，不应该触发副作用函数
      trigger(target, 'bar');
      expect(callCount).toBe(1); // 应该保持不变
      expect(dummy).toBe(1);
      
      // 触发相关属性 foo 的更新
      target.foo = 10;
      trigger(target, 'foo');
      expect(callCount).toBe(2);
      expect(dummy).toBe(10);
    });
  });

  describe('边界情况', () => {
    it('没有 activeEffect 时，track 应该不做任何事情', () => {
      const target = { foo: 1 };
      const key = 'foo';
      
      // 直接调用 track，没有在 effect 中
      expect(() => {
        track(target, key);
      }).not.toThrow();
    });

    it('没有依赖时，trigger 应该不做任何事情', () => {
      const target = { foo: 1 };
      const key = 'foo';
      
      expect(() => {
        trigger(target, key);
      }).not.toThrow();
    });

    it('触发不存在的属性依赖应该不做任何事情', () => {
      const target = { foo: 1 };
      let callCount = 0;
      
      effect(() => {
        callCount++;
        track(target, 'foo');
      });
      
      expect(callCount).toBe(1);
      
      // 触发不存在的属性
      trigger(target, 'nonexistent');
      expect(callCount).toBe(1); // 不应该触发
    });

    it('应该处理副作用函数中的异常', () => {
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });
      
      expect(() => {
        effect(errorFn);
      }).toThrow('Test error');
      
      expect(errorFn).toHaveBeenCalledTimes(1);
    });

    it('应该支持嵌套的副作用函数', () => {
      const target = { foo: 1, bar: 2 };
      let dummy1, dummy2;
      let callCount1 = 0, callCount2 = 0;
      
      effect(() => {
        callCount1++;
        dummy1 = target.foo;
        track(target, 'foo');
        
        effect(() => {
          callCount2++;
          dummy2 = target.bar;
          track(target, 'bar');
        });
      });
      
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
      expect(dummy1).toBe(1);
      expect(dummy2).toBe(2);
    });
  });

  describe('内存管理', () => {
    it('应该能处理同一个对象的多个属性', () => {
      const target = { a: 1, b: 2, c: 3 };
      const calls = { a: 0, b: 0, c: 0 };
      
      // 为每个属性创建副作用函数
      Object.keys(target).forEach(key => {
        effect(() => {
          calls[key]++;
          track(target, key);
        });
      });
      
      expect(calls.a).toBe(1);
      expect(calls.b).toBe(1);
      expect(calls.c).toBe(1);
      
      // 分别触发每个属性
      trigger(target, 'a');
      expect(calls.a).toBe(2);
      expect(calls.b).toBe(1);
      expect(calls.c).toBe(1);
      
      trigger(target, 'b');
      expect(calls.a).toBe(2);
      expect(calls.b).toBe(2);
      expect(calls.c).toBe(1);
    });

    it('应该能处理多个对象', () => {
      const target1 = { foo: 1 };
      const target2 = { bar: 2 };
      let dummy1, dummy2;
      let callCount1 = 0, callCount2 = 0;
      
      effect(() => {
        callCount1++;
        dummy1 = target1.foo;
        track(target1, 'foo');
      });
      
      effect(() => {
        callCount2++;
        dummy2 = target2.bar;
        track(target2, 'bar');
      });
      
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
      
      trigger(target1, 'foo');
      expect(callCount1).toBe(2);
      expect(callCount2).toBe(1);
      
      trigger(target2, 'bar');
      expect(callCount1).toBe(2);
      expect(callCount2).toBe(2);
    });
  });
});
