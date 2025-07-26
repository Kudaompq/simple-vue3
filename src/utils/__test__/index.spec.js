import { describe, it, expect } from 'vitest';
import { isObject, hasChanged } from '../../utils/index.js';

describe('utils', () => {
  describe('isObject', () => {
    it('应该正确识别对象', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ foo: 1 })).toBe(true);
      expect(isObject([])).toBe(true);
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new RegExp(''))).toBe(true);
    });

    it('应该正确识别非对象', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(1)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(false)).toBe(false);
      expect(isObject(Symbol('test'))).toBe(false);
      expect(isObject(() => {})).toBe(false);
    });

    it('应该正确处理边界情况', () => {
      expect(isObject(0)).toBe(false);
      expect(isObject('')).toBe(false);
      expect(isObject(NaN)).toBe(false);
      expect(isObject(Infinity)).toBe(false);
      expect(isObject(-Infinity)).toBe(false);
    });
  });

  describe('hasChanged', () => {
    it('应该正确检测值的变化', () => {
      // 基本类型变化
      expect(hasChanged(1, 2)).toBe(true);
      expect(hasChanged('a', 'b')).toBe(true);
      expect(hasChanged(true, false)).toBe(true);
      expect(hasChanged(null, undefined)).toBe(true);
      
      // 类型变化
      expect(hasChanged(1, '1')).toBe(true);
      expect(hasChanged(0, false)).toBe(true);
      expect(hasChanged('', false)).toBe(true);
    });

    it('应该正确检测值未变化', () => {
      // 相同的基本类型值
      expect(hasChanged(1, 1)).toBe(false);
      expect(hasChanged('test', 'test')).toBe(false);
      expect(hasChanged(true, true)).toBe(false);
      expect(hasChanged(false, false)).toBe(false);
      expect(hasChanged(null, null)).toBe(false);
      expect(hasChanged(undefined, undefined)).toBe(false);
      
      // 相同的对象引用
      const obj = { foo: 1 };
      expect(hasChanged(obj, obj)).toBe(false);
      
      const arr = [1, 2, 3];
      expect(hasChanged(arr, arr)).toBe(false);
    });

    it('应该正确处理对象引用', () => {
      // 不同的对象实例，即使内容相同也应该被认为是变化了
      expect(hasChanged({ foo: 1 }, { foo: 1 })).toBe(true);
      expect(hasChanged([1, 2, 3], [1, 2, 3])).toBe(true);
      
      // 同一个对象引用应该被认为是没有变化
      const obj = { foo: 1 };
      expect(hasChanged(obj, obj)).toBe(false);
    });

    it('应该正确处理 NaN', () => {
      // NaN 的特殊情况：NaN !== NaN，但在这个函数中我们认为 NaN 到 NaN 没有变化
      expect(hasChanged(NaN, NaN)).toBe(false);
      expect(hasChanged(1, NaN)).toBe(true);
      expect(hasChanged(NaN, 1)).toBe(true);
    });

    it('应该正确处理 +0 和 -0', () => {
      // +0 和 -0 在 === 比较中是相等的
      expect(hasChanged(0, -0)).toBe(false);
      expect(hasChanged(-0, 0)).toBe(false);
    });

    it('应该正确处理特殊值', () => {
      expect(hasChanged(Infinity, Infinity)).toBe(false);
      expect(hasChanged(-Infinity, -Infinity)).toBe(false);
      expect(hasChanged(Infinity, -Infinity)).toBe(true);
      
      expect(hasChanged(null, 0)).toBe(true);
      expect(hasChanged(undefined, 0)).toBe(true);
      expect(hasChanged(null, '')).toBe(true);
      expect(hasChanged(undefined, '')).toBe(true);
    });

    it('应该正确处理 Symbol', () => {
      const sym1 = Symbol('test');
      const sym2 = Symbol('test');
      
      expect(hasChanged(sym1, sym1)).toBe(false);
      expect(hasChanged(sym1, sym2)).toBe(true);
    });

    it('应该正确处理函数', () => {
      const fn1 = () => {};
      const fn2 = () => {};
      
      expect(hasChanged(fn1, fn1)).toBe(false);
      expect(hasChanged(fn1, fn2)).toBe(true);
    });
  });
});
