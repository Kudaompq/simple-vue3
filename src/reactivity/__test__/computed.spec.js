import { describe, it, expect, vi } from 'vitest';
import { computed } from '../computed.js';
import { reactive } from '../reactive.js';
import { ref } from '../ref.js';
import { effect } from '../effect.js';

describe('computed', () => {
    describe('基本功能', () => {
        it('应该返回一个带有 value 属性的对象', () => {
            const c = computed(() => 1);
            expect(typeof c).toBe('object');
            expect(c.value).toBe(1);
        });

        it('应该计算简单的表达式', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);
            expect(c.value).toBe(2);
        });

        it('当依赖变化时应该重新计算', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);

            expect(c.value).toBe(2);

            value.value = 2;
            expect(c.value).toBe(3);
        });

        it('应该支持多个依赖', () => {
            const value1 = ref(1);
            const value2 = ref(2);
            const c = computed(() => value1.value + value2.value);

            expect(c.value).toBe(3);

            value1.value = 2;
            expect(c.value).toBe(4);

            value2.value = 3;
            expect(c.value).toBe(5);
        });
    });

    describe('响应式更新', () => {
        it('computed 作为 effect 的依赖时应该正确更新', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = c.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(2);

            // 修改依赖
            value.value = 2;
            expect(dummy).toBe(3);
            expect(callCount).toBe(2);
        });

        it('应该支持嵌套的 computed', () => {
            const value = ref(1);
            const c1 = computed(() => value.value + 1);
            const c2 = computed(() => c1.value + 1);

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = c2.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(3); // 1 + 1 + 1

            value.value = 2;
            expect(callCount).toBe(2);
            expect(dummy).toBe(4); // 2 + 1 + 1
        });
    });

    describe('与 reactive 结合', () => {
        it('应该支持 reactive 对象作为依赖', () => {
            const state = reactive({ count: 1, multiplier: 2 });
            const c = computed(() => state.count * state.multiplier);

            expect(c.value).toBe(2);

            state.count = 2;
            expect(c.value).toBe(4);

            state.multiplier = 3;
            expect(c.value).toBe(6);
        });

        it('应该支持嵌套对象属性', () => {
            const state = reactive({
                user: {
                    profile: {
                        age: 25
                    }
                }
            });

            const c = computed(() => state.user.profile.age >= 18 ? 'adult' : 'minor');

            expect(c.value).toBe('adult');

            state.user.profile.age = 16;
            expect(c.value).toBe('minor');
        });
    });

    describe('setter 功能', () => {
        it('应该支持 getter/setter 选项对象', () => {
            const value = ref(1);
            const c = computed({
                get: () => value.value + 1,
                set: (newValue) => {
                    value.value = newValue - 1;
                }
            });

            expect(c.value).toBe(2);

            c.value = 10;
            expect(value.value).toBe(9);
            expect(c.value).toBe(10);
        });

        it('只有 getter 时设置值应该发出警告', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const value = ref(1);
            const c = computed(() => value.value + 1);

            c.value = 10;
            expect(consoleSpy).toHaveBeenCalledWith('Computed property is readonly');

            consoleSpy.mockRestore();
        });
    });

    describe('边界情况', () => {
        it('应该处理返回 undefined 的计算', () => {
            const value = ref(1);
            const c = computed(() => {
                if (value.value > 0) return value.value;
                // 隐式返回 undefined
            });

            expect(c.value).toBe(1);

            value.value = -1;
            expect(c.value).toBe(undefined);
        });

        it('应该正确处理 falsy 值', () => {
            const value = ref(0);
            const c = computed(() => value.value || 'default');

            expect(c.value).toBe('default');

            value.value = '';
            expect(c.value).toBe('default');

            value.value = false;
            expect(c.value).toBe('default');

            value.value = 'truthy';
            expect(c.value).toBe('truthy');
        });
    });

    describe('实际应用场景', () => {
        it('应该支持计数器场景', () => {
            const count = ref(0);
            const doubledCount = computed(() => count.value * 2);

            expect(doubledCount.value).toBe(0);

            count.value = 5;
            expect(doubledCount.value).toBe(10);

            count.value = -3;
            expect(doubledCount.value).toBe(-6);
        });

        it('应该支持表单验证场景', () => {
            const email = ref('');
            const password = ref('');

            const isValidEmail = computed(() => {
                return email.value.includes('@') && email.value.includes('.');
            });

            const isValidPassword = computed(() => {
                return password.value.length >= 8;
            });

            const canSubmit = computed(() => {
                return isValidEmail.value && isValidPassword.value;
            });

            // 初始状态
            expect(canSubmit.value).toBe(false);
            expect(isValidEmail.value).toBe(false);
            expect(isValidPassword.value).toBe(false);

            // 设置有效邮箱
            email.value = 'test@example.com';
            expect(isValidEmail.value).toBe(true);
            expect(isValidPassword.value).toBe(false);
            expect(canSubmit.value).toBe(false);

            // 设置有效密码
            password.value = 'password123';
            expect(isValidPassword.value).toBe(true);
            expect(isValidEmail.value).toBe(true);
            expect(canSubmit.value).toBe(true);
        });

        it('应该支持数据过滤场景', () => {
            const items = ref([
                { name: 'Apple', price: 1.5 },
                { name: 'Banana', price: 0.8 },
                { name: 'Orange', price: 1.2 }
            ]);

            const expensiveItems = computed(() => {
                return items.value.filter(item => item.price > 1.0);
            });

            expect(expensiveItems.value).toHaveLength(2);
            expect(expensiveItems.value[0].name).toBe('Apple');
            expect(expensiveItems.value[1].name).toBe('Orange');

            // 修改数据
            items.value = [
                { name: 'Apple', price: 1.5 },
                { name: 'Banana', price: 2.0 }, // 价格提高
                { name: 'Orange', price: 0.5 }  // 价格降低
            ];

            expect(expensiveItems.value).toHaveLength(2);
            expect(expensiveItems.value[0].name).toBe('Apple');
            expect(expensiveItems.value[1].name).toBe('Banana');
        });

        it('应该支持全名组合场景', () => {
            const firstName = ref('John');
            const lastName = ref('Doe');

            const fullName = computed({
                get: () => `${firstName.value} ${lastName.value}`,
                set: (newValue) => {
                    const [first, last] = newValue.split(' ');
                    firstName.value = first;
                    lastName.value = last;
                }
            });

            expect(fullName.value).toBe('John Doe');

            firstName.value = 'Jane';
            expect(fullName.value).toBe('Jane Doe');

            fullName.value = 'Alice Smith';
            expect(firstName.value).toBe('Alice');
            expect(lastName.value).toBe('Smith');
            expect(fullName.value).toBe('Alice Smith');
        });
    });
    it('应该懒执行', () => {
        const getter = vi.fn(() => 123);
        const c = computed(getter);

        // 未访问前不会执行
        expect(getter).not.toHaveBeenCalled();

        // 第一次访问会触发
        expect(c.value).toBe(123);
        expect(getter).toHaveBeenCalledTimes(1);
    });
    it('未变更依赖时不应重新计算', () => {
  const value = ref(1);
  const getter = vi.fn(() => value.value + 1);
  const c = computed(getter);

  expect(c.value).toBe(2);
  expect(getter).toHaveBeenCalledTimes(1);

  // 再次读取，不应重新计算
  expect(c.value).toBe(2);
  expect(getter).toHaveBeenCalledTimes(1);

  // 依赖变更，重新计算
  value.value = 2;
  expect(c.value).toBe(3);
  expect(getter).toHaveBeenCalledTimes(2);
});
});
