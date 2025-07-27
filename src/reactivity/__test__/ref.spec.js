import { describe, it, expect, vi } from 'vitest';
import { ref, isRef } from '../ref.js';
import { effect } from '../effect.js';
import { reactive, isReactive } from '../reactive.js';

describe('ref', () => {
    describe('基本功能', () => {
        it('应该创建 ref 对象', () => {
            const r = ref(1);
            expect(isRef(r)).toBe(true);
            expect(r.value).toBe(1);
        });

        it('应该返回相同的 ref 对象', () => {
            const r1 = ref(1);
            const r2 = ref(r1);
            expect(r1).toBe(r2);
        });

        it('应该能设置和获取值', () => {
            const r = ref(1);
            expect(r.value).toBe(1);

            r.value = 2;
            expect(r.value).toBe(2);
        });

        it('应该支持各种类型的值', () => {
            // 数字
            const numRef = ref(42);
            expect(numRef.value).toBe(42);

            // 字符串
            const strRef = ref('hello');
            expect(strRef.value).toBe('hello');

            // 布尔值
            const boolRef = ref(true);
            expect(boolRef.value).toBe(true);

            // null 和 undefined
            const nullRef = ref(null);
            expect(nullRef.value).toBe(null);

            const undefinedRef = ref(undefined);
            expect(undefinedRef.value).toBe(undefined);

            // 数组
            const arrayRef = ref([1, 2, 3]);
            expect(arrayRef.value).toEqual([1, 2, 3]);

            // 对象
            const objRef = ref({ foo: 'bar' });
            expect(objRef.value).toEqual({ foo: 'bar' });
        });
    });

    describe('对象值处理', () => {
        it('应该将对象值转换为响应式', () => {
            const obj = { foo: 1 };
            const r = ref(obj);

            expect(isReactive(r.value)).toBe(true);
            expect(r.value).not.toBe(obj); // 应该是一个新的响应式代理
            expect(r.value.foo).toBe(1);
        });

        it('设置新对象值时应该转换为响应式', () => {
            const r = ref({ foo: 1 });
            const newObj = { bar: 2 };

            r.value = newObj;

            expect(isReactive(r.value)).toBe(true);
            expect(r.value).not.toBe(newObj); // 应该是一个新的响应式代理
            expect(r.value.bar).toBe(2);
        });

        it('应该处理嵌套对象', () => {
            const r = ref({
                nested: {
                    value: 1
                }
            });

            expect(isReactive(r.value)).toBe(true);
            expect(isReactive(r.value.nested)).toBe(true);
            expect(r.value.nested.value).toBe(1);
        });

        it('应该处理数组', () => {
            const r = ref([{ value: 1 }, { value: 2 }]);

            expect(isReactive(r.value)).toBe(true);
            expect(isReactive(r.value[0])).toBe(true);
            expect(r.value[0].value).toBe(1);
        });
    });

    describe('响应式更新', () => {
        it('应该在值改变时触发副作用函数', () => {
            const r = ref(1);
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = r.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(1);

            r.value = 2;
            expect(callCount).toBe(2);
            expect(dummy).toBe(2);
        });

        it('应该在设置相同值时不触发副作用函数', () => {
            const r = ref(1);
            let callCount = 0;

            effect(() => {
                callCount++;
                r.value;
            });

            expect(callCount).toBe(1);

            // 设置相同的值
            r.value = 1;
            expect(callCount).toBe(1); // 不应该再次触发
        });

        it('应该支持多个副作用函数', () => {
            const r = ref(1);
            let dummy1, dummy2;
            let callCount1 = 0, callCount2 = 0;

            effect(() => {
                callCount1++;
                dummy1 = r.value * 2;
            });

            effect(() => {
                callCount2++;
                dummy2 = r.value + 10;
            });

            expect(callCount1).toBe(1);
            expect(callCount2).toBe(1);
            expect(dummy1).toBe(2);
            expect(dummy2).toBe(11);

            r.value = 5;
            expect(callCount1).toBe(2);
            expect(callCount2).toBe(2);
            expect(dummy1).toBe(10);
            expect(dummy2).toBe(15);
        });

        it('应该支持对象属性的响应式更新', () => {
            const r = ref({ count: 0 });
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = r.value.count;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(0);

            // 修改对象属性
            r.value.count = 1;
            expect(callCount).toBe(2);
            expect(dummy).toBe(1);
        });

        it('应该支持替换整个对象值', () => {
            const r = ref({ count: 0 });
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = r.value.count;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(0);

            // 替换整个对象
            r.value = { count: 5 };
            expect(callCount).toBe(2);
            expect(dummy).toBe(5);
        });
    });

    describe('边界情况', () => {
        it('应该正确处理 NaN 值', () => {
            const r = ref(NaN);
            let callCount = 0;

            effect(() => {
                callCount++;
                r.value;
            });

            expect(callCount).toBe(1);

            // NaN 到 NaN 不应该触发更新
            r.value = NaN;
            expect(callCount).toBe(1);

            // NaN 到其他值应该触发更新
            r.value = 1;
            expect(callCount).toBe(2);
        });

        it('应该正确处理 0 和 -0', () => {
            const r = ref(0);
            let callCount = 0;

            effect(() => {
                callCount++;
                r.value;
            });

            expect(callCount).toBe(1);

            // 0 到 -0 不应该触发更新（在 === 比较中相等）
            r.value = -0;
            expect(callCount).toBe(1);
        });

        it('应该正确处理 null 和 undefined 之间的转换', () => {
            const r = ref(null);
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = r.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(null);

            r.value = undefined;
            expect(callCount).toBe(2);
            expect(dummy).toBe(undefined);

            r.value = null;
            expect(callCount).toBe(3);
            expect(dummy).toBe(null);
        });

        it('应该处理从原始值到对象的转换', () => {
            const r = ref(1);
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = typeof r.value === 'object' ? r.value.foo : r.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(1);

            // 从原始值转换为对象
            r.value = { foo: 'bar' };
            expect(callCount).toBe(2);
            expect(dummy).toBe('bar');
            expect(isReactive(r.value)).toBe(true);
        });

        it('应该处理从对象到原始值的转换', () => {
            const r = ref({ foo: 'bar' });
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = typeof r.value === 'object' ? r.value.foo : r.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe('bar');

            // 从对象转换为原始值
            r.value = 42;
            expect(callCount).toBe(2);
            expect(dummy).toBe(42);
        });
    });

    describe('isRef', () => {
        it('应该正确识别 ref 对象', () => {
            const r = ref(1);
            expect(isRef(r)).toBe(true);
        });

        it('应该正确识别非 ref 对象', () => {
            expect(isRef(1)).toBe(false);
            expect(isRef('string')).toBe(false);
            expect(isRef(true)).toBe(false);
            expect(isRef(null)).toBe(false);
            expect(isRef(undefined)).toBe(false);
            expect(isRef({})).toBe(false);
            expect(isRef([])).toBe(false);
            expect(isRef(() => { })).toBe(false);
        });

        it('应该正确识别响应式对象不是 ref', () => {
            const reactive_obj = reactive({ foo: 1 });
            expect(isRef(reactive_obj)).toBe(false);
        });
    });

    describe('与 reactive 的结合', () => {
        it('ref 对象可以放在 reactive 对象中，应该自动解包', () => {
            const count = ref(0);
            const state = reactive({
                count
            });

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = state.count; // ✅ 自动解包，不需要 .value
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(0);

            count.value = 1; // 触发 effect，state.count 会自动反映变化
            expect(dummy).toBe(1);
            expect(callCount).toBe(2);

            state.count = 2; // 自动同步到 count.value
            expect(dummy).toBe(2);
            expect(count.value).toBe(2);
            expect(callCount).toBe(3);
        });

        it('reactive 对象中多个 ref 应该都能自动解包', () => {
            const state = reactive({
                count: ref(0),
                name: ref('vue')
            });

            let dummyCount, dummyName;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummyCount = state.count;
                dummyName = state.name;
            });

            expect(callCount).toBe(1);
            expect(dummyCount).toBe(0);
            expect(dummyName).toBe('vue');

            // 修改会触发更新
            state.count = 1;
            expect(dummyCount).toBe(1);
            expect(callCount).toBe(2);

            state.name = 'vue3';
            expect(dummyName).toBe('vue3');
            expect(callCount).toBe(3);
        });

        it('reactive 对象可以作为 ref 的值', () => {
            // 创建一个 reactive 对象
            const reactiveObj = reactive({
                count: 0,
                name: 'vue'
            });

            // 将 reactive 对象作为 ref 的值
            const refOfReactive = ref(reactiveObj);

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = refOfReactive.value.count + refOfReactive.value.name.length;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(3); // 0 + 3 (vue的长度)

            // 通过 ref 访问修改 reactive 对象的属性
            refOfReactive.value.count = 5;
            expect(callCount).toBe(2);
            expect(dummy).toBe(8); // 5 + 3

            refOfReactive.value.name = 'vue3';
            expect(callCount).toBe(3);
            expect(dummy).toBe(9); // 5 + 4 (vue3的长度)

            // 直接修改原始 reactive 对象也应该触发更新
            reactiveObj.count = 10;
            expect(callCount).toBe(4);
            expect(dummy).toBe(14); // 10 + 4

            // 替换整个 reactive 对象
            const newReactiveObj = reactive({ count: 20, name: 'react' });
            refOfReactive.value = newReactiveObj;
            expect(callCount).toBe(5);
            expect(dummy).toBe(25); // 20 + 5 (react的长度)
        });

        it('ref 中包含 reactive 的嵌套结构', () => {
            const state = ref({
                user: reactive({
                    profile: {
                        name: 'Alice',
                        age: 25
                    },
                    settings: reactive({
                        theme: 'dark',
                        language: 'zh'
                    })
                })
            });

            let summary;
            let callCount = 0;

            effect(() => {
                callCount++;
                const { profile, settings } = state.value.user;
                summary = `${profile.name} (${profile.age}) - ${settings.theme}/${settings.language}`;
            });

            expect(callCount).toBe(1);
            expect(summary).toBe('Alice (25) - dark/zh');

            // 修改嵌套的 reactive 对象
            state.value.user.profile.name = 'Bob';
            expect(callCount).toBe(2);
            expect(summary).toBe('Bob (25) - dark/zh');

            state.value.user.settings.theme = 'light';
            expect(callCount).toBe(3);
            expect(summary).toBe('Bob (25) - light/zh');

            // 替换整个 ref 的值
            state.value = {
                user: reactive({
                    profile: { name: 'Charlie', age: 30 },
                    settings: reactive({ theme: 'auto', language: 'en' })
                })
            };
            expect(callCount).toBe(4);
            expect(summary).toBe('Charlie (30) - auto/en');
        });
    });

    describe('实际应用场景', () => {
        it('应该支持计数器场景', () => {
            const count = ref(0);

            const increment = () => count.value++;
            const decrement = () => count.value--;

            let displayValue;
            effect(() => {
                displayValue = `Count: ${count.value}`;
            });

            expect(displayValue).toBe('Count: 0');

            increment();
            expect(displayValue).toBe('Count: 1');

            increment();
            expect(displayValue).toBe('Count: 2');

            decrement();
            expect(displayValue).toBe('Count: 1');
        });

        it('应该支持表单字段场景', () => {
            const username = ref('');
            const email = ref('');

            let isValid;
            effect(() => {
                isValid = username.value.length >= 3 && email.value.includes('@');
            });

            expect(isValid).toBe(false);

            username.value = 'john';
            expect(isValid).toBe(false);

            email.value = 'john@example.com';
            expect(isValid).toBe(true);

            username.value = 'jo'; // 小于 3 个字符
            expect(isValid).toBe(false);
        });

        it('应该支持复杂数据结构', () => {
            const user = ref({
                profile: {
                    name: 'Alice',
                    age: 25
                },
                preferences: {
                    theme: 'dark',
                    language: 'zh'
                }
            });

            let summary;
            effect(() => {
                const { profile, preferences } = user.value;
                summary = `${profile.name} (${profile.age}) - ${preferences.theme}/${preferences.language}`;
            });

            expect(summary).toBe('Alice (25) - dark/zh');

            user.value.profile.name = 'Bob';
            expect(summary).toBe('Bob (25) - dark/zh');

            user.value.preferences.theme = 'light';
            expect(summary).toBe('Bob (25) - light/zh');

            // 替换整个对象
            user.value = {
                profile: { name: 'Charlie', age: 30 },
                preferences: { theme: 'auto', language: 'en' }
            };
            expect(summary).toBe('Charlie (30) - auto/en');
        });
    });
});
