import { describe, it, expect, vi } from 'vitest';
import { reactive, isReactive } from '../reactive.js';
import { effect } from '../effect.js';

describe('响应式系统集成测试', () => {
  describe('基本响应式流程', () => {
    it('应该完整地工作：创建响应式对象 -> 副作用函数 -> 依赖收集 -> 触发更新', () => {
      // 1. 创建响应式对象
      const state = reactive({
        count: 0,
        name: 'Vue3'
      });

      expect(isReactive(state)).toBe(true);

      // 2. 创建副作用函数
      let renderCount = 0;
      let computedValue;

      const renderEffect = effect(() => {
        renderCount++;
        computedValue = `${state.name}: ${state.count}`;
      });

      // 3. 首次执行应该收集依赖
      expect(renderCount).toBe(1);
      expect(computedValue).toBe('Vue3: 0');

      // 4. 修改响应式对象应该触发副作用函数
      state.count = 1;
      expect(renderCount).toBe(2);
      expect(computedValue).toBe('Vue3: 1');

      state.name = 'Simple Vue3';
      expect(renderCount).toBe(3);
      expect(computedValue).toBe('Simple Vue3: 1');

      // 5. 手动执行副作用函数
      renderEffect();
      expect(renderCount).toBe(4);
      expect(computedValue).toBe('Simple Vue3: 1');
    });

    it('应该支持多个副作用函数同时监听同一个响应式对象', () => {
      const state = reactive({ value: 1 });
      
      let effect1Count = 0;
      let effect2Count = 0;
      let result1, result2;

      effect(() => {
        effect1Count++;
        result1 = state.value * 2;
      });

      effect(() => {
        effect2Count++;
        result2 = state.value + 10;
      });

      expect(effect1Count).toBe(1);
      expect(effect2Count).toBe(1);
      expect(result1).toBe(2);
      expect(result2).toBe(11);

      // 修改状态应该触发所有相关副作用函数
      state.value = 5;
      expect(effect1Count).toBe(2);
      expect(effect2Count).toBe(2);
      expect(result1).toBe(10);
      expect(result2).toBe(15);
    });

    it('应该支持条件依赖收集', () => {
      const state = reactive({
        show: true,
        a: 1,
        b: 2
      });

      let effectCount = 0;
      let result;

      effect(() => {
        effectCount++;
        result = state.show ? state.a : state.b;
      });

      expect(effectCount).toBe(1);
      expect(result).toBe(1);

      // 修改当前依赖的属性
      state.a = 10;
      expect(effectCount).toBe(2);
      expect(result).toBe(10);

      // 修改当前不依赖的属性，不应该触发更新
      state.b = 20;
      expect(effectCount).toBe(2);
      expect(result).toBe(10);

      // 切换条件
      state.show = false;
      expect(effectCount).toBe(3);
      expect(result).toBe(20);

      // 现在修改 b 应该触发更新，修改 a 不应该
      state.b = 30;
      expect(effectCount).toBe(4);
      expect(result).toBe(30);

      state.a = 100;
      expect(effectCount).toBe(4); // 不应该触发更新
      expect(result).toBe(30);
    });
  });

  describe('嵌套响应式对象', () => {
    it('应该处理嵌套对象的响应式', () => {
      const state = reactive({
        user: {
          profile: {
            name: 'Alice',
            age: 25
          },
          settings: {
            theme: 'dark'
          }
        }
      });

      let effectCount = 0;
      let userName, userAge, theme;

      effect(() => {
        effectCount++;
        userName = state.user.profile.name;
        userAge = state.user.profile.age;
        theme = state.user.settings.theme;
      });

      expect(effectCount).toBe(1);
      expect(userName).toBe('Alice');
      expect(userAge).toBe(25);
      expect(theme).toBe('dark');

      // 修改嵌套属性
      state.user.profile.name = 'Bob';
      expect(effectCount).toBe(2);
      expect(userName).toBe('Bob');

      state.user.profile.age = 30;
      expect(effectCount).toBe(3);
      expect(userAge).toBe(30);

      state.user.settings.theme = 'light';
      expect(effectCount).toBe(4);
      expect(theme).toBe('light');
    });

    it('应该处理数组的响应式', () => {
      const state = reactive({
        items: [1, 2, 3],
        nested: [{ name: 'item1' }, { name: 'item2' }]
      });

      let effectCount = 0;
      let firstItem, arrayLength, nestedName;

      effect(() => {
        effectCount++;
        firstItem = state.items[0];
        arrayLength = state.items.length;
        nestedName = state.nested[0].name;
      });

      expect(effectCount).toBe(1);
      expect(firstItem).toBe(1);
      expect(arrayLength).toBe(3);
      expect(nestedName).toBe('item1');

      // 修改数组元素
      state.items[0] = 10;
      expect(effectCount).toBe(2);
      expect(firstItem).toBe(10);

      // 修改数组长度
      state.items.push(4);
      expect(effectCount).toBe(3);
      expect(arrayLength).toBe(4);

      // 修改嵌套对象
      state.nested[0].name = 'updated item1';
      expect(effectCount).toBe(4);
      expect(nestedName).toBe('updated item1');
    });
  });

  describe('性能优化', () => {
    it('相同值不应该触发更新', () => {
      const state = reactive({ value: 1 });
      let effectCount = 0;

      effect(() => {
        effectCount++;
        state.value;
      });

      expect(effectCount).toBe(1);

      // 设置相同的值
      state.value = 1;
      expect(effectCount).toBe(1); // 不应该触发更新

      // 设置不同的值
      state.value = 2;
      expect(effectCount).toBe(2);

      // 再次设置相同的值
      state.value = 2;
      expect(effectCount).toBe(2); // 不应该触发更新
    });

    it('应该正确处理 NaN 值', () => {
      const state = reactive({ value: NaN });
      let effectCount = 0;

      effect(() => {
        effectCount++;
        state.value;
      });

      expect(effectCount).toBe(1);

      // NaN 到 NaN 不应该触发更新
      state.value = NaN;
      expect(effectCount).toBe(1);

      // NaN 到其他值应该触发更新
      state.value = 1;
      expect(effectCount).toBe(2);

      // 其他值到 NaN 应该触发更新
      state.value = NaN;
      expect(effectCount).toBe(3);
    });
  });

  describe('错误处理', () => {
    it('副作用函数中的错误不应该影响其他副作用函数', () => {
      const state = reactive({ value: 1 });
      
      let normalEffectCount = 0;
      let errorEffectCount = 0;

      // 正常的副作用函数
      effect(() => {
        normalEffectCount++;
        state.value;
      });

      // 会抛出错误的副作用函数
      const errorEffect = effect(() => {
        errorEffectCount++;
        state.value;
        if (state.value === 2) {
          throw new Error('Test error');
        }
      });

      expect(normalEffectCount).toBe(1);
      expect(errorEffectCount).toBe(1);

      // 触发错误
      expect(() => {
        state.value = 2;
      }).toThrow('Test error');

      // 正常的副作用函数应该仍然被触发
      expect(normalEffectCount).toBe(2);
      expect(errorEffectCount).toBe(2);

      // 继续修改值，正常的副作用函数应该继续工作
      state.value = 3;
      expect(normalEffectCount).toBe(3);
    });
  });

  describe('实际应用场景', () => {
    it('应该能实现简单的计数器功能', () => {
      const counter = reactive({ count: 0 });
      
      // 模拟视图更新
      let displayText = '';
      effect(() => {
        displayText = `Count: ${counter.count}`;
      });

      expect(displayText).toBe('Count: 0');

      // 模拟用户操作
      counter.count++;
      expect(displayText).toBe('Count: 1');

      counter.count += 5;
      expect(displayText).toBe('Count: 6');

      counter.count = 0;
      expect(displayText).toBe('Count: 0');
    });

    it('应该能实现简单的购物车功能', () => {
      const cart = reactive({
        items: [
          { name: 'Apple', price: 1, quantity: 2 },
          { name: 'Banana', price: 0.5, quantity: 3 }
        ]
      });

      let totalPrice = 0;
      let totalItems = 0;

      effect(() => {
        totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      expect(totalPrice).toBe(3.5); // 2*1 + 3*0.5
      expect(totalItems).toBe(5);

      // 修改商品数量
      cart.items[0].quantity = 3;
      expect(totalPrice).toBe(4.5); // 3*1 + 3*0.5
      expect(totalItems).toBe(6);

      // 添加新商品
      cart.items.push({ name: 'Orange', price: 0.8, quantity: 2 });
      expect(totalPrice).toBe(6.1); // 3*1 + 3*0.5 + 2*0.8
      expect(totalItems).toBe(8);
    });

    it('应该能实现表单验证功能', () => {
      const form = reactive({
        username: '',
        email: '',
        password: ''
      });

      let isValid = false;
      let errors = [];

      effect(() => {
        errors = [];
        
        if (!form.username || form.username.length < 3) {
          errors.push('Username must be at least 3 characters');
        }
        
        if (!form.email || !form.email.includes('@')) {
          errors.push('Email must be valid');
        }
        
        if (!form.password || form.password.length < 6) {
          errors.push('Password must be at least 6 characters');
        }
        
        isValid = errors.length === 0;
      });

      expect(isValid).toBe(false);
      expect(errors).toHaveLength(3);

      // 填写用户名
      form.username = 'john';
      expect(isValid).toBe(false);
      expect(errors).toHaveLength(2);

      // 填写邮箱
      form.email = 'john@example.com';
      expect(isValid).toBe(false);
      expect(errors).toHaveLength(1);

      // 填写密码
      form.password = 'password123';
      expect(isValid).toBe(true);
      expect(errors).toHaveLength(0);

      // 修改为无效的邮箱
      form.email = 'invalid-email';
      expect(isValid).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Email must be valid');
    });
  });
});
