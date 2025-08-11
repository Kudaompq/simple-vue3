import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountComponent, updateComponentProps } from "../component.js";
import { h, Fragment } from "../vnode.js";
import { reactive, ref } from "../../reactivity/index.js";
import { effect } from "../../reactivity/effect.js";
import { nextTick, queueJob } from "../scheduler.js";

describe("component", () => {
    let container;
    let mockPatch;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        mockPatch = vi.fn();
    });

    afterEach(() => {
        document.body.removeChild(container);
        vi.clearAllMocks();
    });

    describe("updateComponentProps", () => {
        it("应该正确更新组件的props和attrs", () => {
            const originComp = {
                props: ["title", "count"],
            };
            const vnode = {
                type: originComp,
                props: {
                    title: "Hello",
                    count: 10,
                    id: "test",
                    class: "container",
                },
            };
            const instance = {
                props: {},
                attrs: {},
            };

            updateComponentProps(instance, vnode);

            expect(instance.props.title).toBe("Hello");
            expect(instance.props.count).toBe(10);
            expect(instance.attrs.id).toBe("test");
            expect(instance.attrs.class).toBe("container");
        });

        it("应该将props转换为响应式对象", () => {
            const originComp = {
                props: ["value"],
            };
            const vnode = {
                type: originComp,
                props: { value: 42 },
            };
            const instance = {
                props: {},
                attrs: {},
            };

            updateComponentProps(instance, vnode);

            // 检查props是否为响应式
            let dummy;
            let callCount = 0;
            effect(() => {
                callCount++;
                dummy = instance.props.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(42);

            // 修改props应该触发副作用
            instance.props.value = 100;
            expect(callCount).toBe(2);
            expect(dummy).toBe(100);
        });

        it("应该处理没有props定义的组件", () => {
            const originComp = {}; // 没有props定义
            const vnode = {
                type: originComp,
                props: {
                    id: "test",
                    class: "container",
                },
            };
            const instance = {
                props: {},
                attrs: {},
            };

            updateComponentProps(instance, vnode);

            expect(Object.keys(instance.props)).toHaveLength(0);
            expect(instance.attrs.id).toBe("test");
            expect(instance.attrs.class).toBe("container");
        });
    });

    describe("mountComponent", () => {
        it("应该正确挂载简单组件", () => {
            const TestComponent = {
                setup(props) {
                    return {
                        message: "Hello World",
                    };
                },
                render(ctx) {
                    return h("div", null, ctx.message);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            expect(vnode.component).toBeDefined();
            expect(vnode.component.isMounted).toBe(true);
            expect(vnode.component.setupState.message).toBe("Hello World");
            expect(vnode.component.ctx.message).toBe("Hello World");
            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: "div",
                    children: "Hello World",
                }),
                container,
                null
            );
        });

        it("应该正确处理组件的props", () => {
            const TestComponent = {
                props: ["title", "count"],
                setup(props) {
                    return {
                        doubled: props.count * 2,
                    };
                },
                render(ctx) {
                    return h("div", null, `${ctx.title}: ${ctx.doubled}`);
                },
            };

            const vnode = h(TestComponent, {
                title: "Count",
                count: 5,
                id: "test",
            });
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(instance.props.title).toBe("Count");
            expect(instance.props.count).toBe(5);
            expect(instance.attrs.id).toBe("test");
            expect(instance.setupState.doubled).toBe(10);
            expect(instance.ctx.title).toBe("Count");
            expect(instance.ctx.count).toBe(5);
            expect(instance.ctx.doubled).toBe(10);
        });

        it("应该正确处理响应式数据", () => {
            const TestComponent = {
                setup() {
                    const count = ref(0);
                    const state = reactive({ message: "Hello" });
                    return {
                        count,
                        state,
                    };
                },
                render(ctx) {
                    return h("div", null, `${ctx.state.message}: ${ctx.count}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(instance.setupState.count.value).toBe(0);
            expect(instance.setupState.state.message).toBe("Hello");
            // ctx中的ref值没有被自动解包，仍然是RefImpl对象
            expect(instance.ctx.count.value).toBe(0);
            expect(instance.ctx.state.message).toBe("Hello");
        });

        it("应该正确处理attrs传递给子树", () => {
            const TestComponent = {
                setup() {
                    return { message: "Test" };
                },
                render(ctx) {
                    return h("div", { class: "component" }, ctx.message);
                },
            };

            const vnode = h(TestComponent, {
                id: "test",
                "data-value": "123",
            });
            mountComponent(vnode, container, null, mockPatch);

            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: "div",
                    props: expect.objectContaining({
                        class: "component",
                        id: "test",
                        "data-value": "123",
                    }),
                }),
                container,
                null
            );
        });

        it("应该创建响应式更新函数", () => {
            let renderCallCount = 0;
            const TestComponent = {
                setup() {
                    const count = ref(0);
                    return { count };
                },
                render(ctx) {
                    renderCallCount++;
                    return h("div", null, `Count: ${ctx.count}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            expect(renderCallCount).toBe(1);
            expect(mockPatch).toHaveBeenCalledTimes(1);

            // 修改响应式数据应该触发重新渲染
            const instance = vnode.component;
            instance.setupState.count = 5;

            // 由于我们没有真正的调度器，这里只能验证effect被创建
            expect(instance.update).toBeDefined();
            expect(typeof instance.update).toBe("function");
        });

        it("应该正确处理组件更新", () => {
            const TestComponent = {
                props: ["value"],
                setup(props) {
                    return {
                        doubled: props.value * 2,
                    };
                },
                render(ctx) {
                    return h("div", null, `Value: ${ctx.doubled}`);
                },
            };

            const vnode = h(TestComponent, { value: 5 });
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(instance.isMounted).toBe(true);
            expect(mockPatch).toHaveBeenCalledTimes(1);

            // 模拟组件更新
            const newVnode = h(TestComponent, { value: 10 });
            instance.next = newVnode;
            instance.update();

            expect(instance.next).toBe(null);
            expect(mockPatch).toHaveBeenCalledTimes(2);
            // 注意：由于props没有响应式更新，doubled值仍然是原来的10
            expect(mockPatch).toHaveBeenLastCalledWith(
                expect.any(Object), // prev subTree
                expect.objectContaining({
                    type: "div",
                    children: "Value: 10",
                }),
                container,
                null
            );
        });

        it("应该处理没有setup函数的组件", () => {
            const TestComponent = {
                render() {
                    return h("div", null, "Static Component");
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(instance.setupState).toBe(undefined);
            expect(instance.ctx).toEqual({});
            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: "div",
                    children: "Static Component",
                }),
                container,
                null
            );
        });

        it("应该正确设置vnode.el", () => {
            const TestComponent = {
                render() {
                    return h("div", null, "Test");
                },
            };

            const vnode = h(TestComponent, {});
            const mockSubTree = { el: document.createElement("div") };

            // 模拟patch函数设置subTree.el
            mockPatch.mockImplementation((n1, n2) => {
                n2.el = mockSubTree.el;
            });

            mountComponent(vnode, container, null, mockPatch);

            expect(vnode.el).toBe(mockSubTree.el);
        });

        it("应该正确处理Fragment子树", () => {
            const TestComponent = {
                setup() {
                    return { items: ["A", "B", "C"] };
                },
                render(ctx) {
                    return h(
                        Fragment,
                        null,
                        ctx.items.map((item) => h("span", null, item))
                    );
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: Fragment,
                    children: expect.arrayContaining([
                        expect.objectContaining({
                            type: "span",
                            children: "A",
                        }),
                        expect.objectContaining({
                            type: "span",
                            children: "B",
                        }),
                        expect.objectContaining({
                            type: "span",
                            children: "C",
                        }),
                    ]),
                }),
                container,
                null
            );
        });
    });

    describe("组件生命周期", () => {
        it("应该正确管理组件的挂载状态", () => {
            const TestComponent = {
                setup() {
                    return { message: "Hello" };
                },
                render(ctx) {
                    return h("div", null, ctx.message);
                },
            };

            const vnode = h(TestComponent, {});
            const instance = {
                props: {},
                attrs: {},
                setupState: null,
                ctx: null,
                update: null,
                isMounted: false,
            };

            expect(instance.isMounted).toBe(false);

            mountComponent(vnode, container, null, mockPatch);

            expect(vnode.component.isMounted).toBe(true);
        });
    });

    describe("错误处理", () => {
        it("应该处理render函数返回非VNode的情况", () => {
            const TestComponent = {
                render() {
                    return "Plain String"; // 返回字符串而不是VNode
                },
            };

            const vnode = h(TestComponent, {});

            expect(() => {
                mountComponent(vnode, container, null, mockPatch);
            }).not.toThrow();

            // normalizeVNode应该将字符串转换为Text VNode
            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: expect.any(Symbol), // Text symbol
                    children: "Plain String",
                }),
                container,
                null
            );
        });

        it("应该处理render函数返回数组的情况", () => {
            const TestComponent = {
                render() {
                    return [h("div", null, "First"), h("div", null, "Second")];
                },
            };

            const vnode = h(TestComponent, {});

            expect(() => {
                mountComponent(vnode, container, null, mockPatch);
            }).not.toThrow();

            // normalizeVNode应该将数组转换为Fragment VNode
            expect(mockPatch).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    type: Fragment,
                    children: expect.arrayContaining([
                        expect.objectContaining({
                            type: "div",
                            children: "First",
                        }),
                        expect.objectContaining({
                            type: "div",
                            children: "Second",
                        }),
                    ]),
                }),
                container,
                null
            );
        });
    });

    describe("调度器集成", () => {
        beforeEach(() => {
            // 清除调度器队列
            vi.clearAllMocks();
        });

        it("应该使用调度器进行异步更新", async () => {
            let renderCount = 0;
            const TestComponent = {
                setup() {
                    const count = ref(0);
                    return { count };
                },
                render(ctx) {
                    renderCount++;
                    return h("div", null, `Count: ${ctx.count.value}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(renderCount).toBe(1);
            expect(mockPatch).toHaveBeenCalledTimes(1);

            // 同步修改多次响应式数据
            instance.setupState.count.value = 1;
            instance.setupState.count.value = 2;
            instance.setupState.count.value = 3;

            // 由于使用了调度器，更新应该是异步的，此时还没有重新渲染
            expect(renderCount).toBe(1);
            expect(mockPatch).toHaveBeenCalledTimes(1);

            // 等待下一个tick，调度器应该执行更新
            await nextTick();

            // 现在应该只执行一次更新（批处理）
            expect(renderCount).toBe(2);
            expect(mockPatch).toHaveBeenCalledTimes(2);
            expect(mockPatch).toHaveBeenLastCalledWith(
                 expect.any(Object),
                 expect.objectContaining({
                     type: "div",
                     children: "Count: 3",
                 }),
                 container,
                 null
             );
        });

        it("应该正确处理多个组件的异步更新", async () => {
            let renderCount1 = 0;
            let renderCount2 = 0;

            const TestComponent1 = {
                setup() {
                    const count = ref(0);
                    return { count };
                },
                render(ctx) {
                    renderCount1++;
                    return h("div", { id: "comp1" }, `Comp1: ${ctx.count.value}`);
                },
            };

            const TestComponent2 = {
                setup() {
                    const value = ref("A");
                    return { value };
                },
                render(ctx) {
                    renderCount2++;
                    return h("div", { id: "comp2" }, `Comp2: ${ctx.value.value}`);
                },
            };

            const vnode1 = h(TestComponent1, {});
            const vnode2 = h(TestComponent2, {});

            mountComponent(vnode1, container, null, mockPatch);
            mountComponent(vnode2, container, null, mockPatch);

            const instance1 = vnode1.component;
            const instance2 = vnode2.component;

            expect(renderCount1).toBe(1);
            expect(renderCount2).toBe(1);
            expect(mockPatch).toHaveBeenCalledTimes(2);

            // 同时修改两个组件的响应式数据
            instance1.setupState.count.value = 10;
            instance2.setupState.value.value = "B";

            // 由于使用了调度器，更新应该是异步的
            expect(renderCount1).toBe(1);
            expect(renderCount2).toBe(1);
            expect(mockPatch).toHaveBeenCalledTimes(2);

            // 等待调度器执行
            await nextTick();

            // 两个组件都应该更新
            expect(renderCount1).toBe(2);
            expect(renderCount2).toBe(2);
            expect(mockPatch).toHaveBeenCalledTimes(4);
        });

        it("应该在同一个tick内批处理同一组件的多次更新", async () => {
            let renderCount = 0;
            const TestComponent = {
                setup() {
                    const state = reactive({ count: 0, message: "Hello" });
                    return { state };
                },
                render(ctx) {
                    renderCount++;
                    return h("div", null, `${ctx.state.message}: ${ctx.state.count}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;
            expect(renderCount).toBe(1);

            // 在同一个tick内多次修改不同的响应式属性
            instance.setupState.state.count = 5;
            instance.setupState.state.message = "Updated";
            instance.setupState.state.count = 10;

            // 更新应该是异步的
            expect(renderCount).toBe(1);

            await nextTick();

            // 应该只执行一次更新
            expect(renderCount).toBe(2);
            expect(mockPatch).toHaveBeenLastCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    type: "div",
                    children: "Updated: 10",
                }),
                container,
                null
            );
        });

        it("应该正确处理nextTick回调", async () => {
            let callbackExecuted = false;
            const TestComponent = {
                setup() {
                    const count = ref(0);
                    return { count };
                },
                render(ctx) {
                    return h("div", null, `Count: ${ctx.count.value}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;

            // 修改响应式数据并在nextTick中执行回调
            instance.setupState.count.value = 42;

            nextTick(() => {
                callbackExecuted = true;
                // 在nextTick回调中，DOM应该已经更新
                 expect(mockPatch).toHaveBeenLastCalledWith(
                     expect.any(Object),
                     expect.objectContaining({
                         type: "div",
                         children: "Count: 42",
                     }),
                     container,
                     null
                 );
            });

            // 回调还没有执行
            expect(callbackExecuted).toBe(false);

            await nextTick();

            // 现在回调应该已经执行
            expect(callbackExecuted).toBe(true);
        });

        it("应该正确处理嵌套的nextTick调用", async () => {
            const executionOrder = [];
            const TestComponent = {
                setup() {
                    const count = ref(0);
                    return { count };
                },
                render(ctx) {
                    return h("div", null, `Count: ${ctx.count.value}`);
                },
            };

            const vnode = h(TestComponent, {});
            mountComponent(vnode, container, null, mockPatch);

            const instance = vnode.component;

            instance.setupState.count.value = 1;

            nextTick(() => {
                executionOrder.push("first");
                nextTick(() => {
                    executionOrder.push("nested");
                });
            });

            nextTick(() => {
                executionOrder.push("second");
            });

            await nextTick();
            await nextTick(); // 等待嵌套的nextTick

            expect(executionOrder).toEqual(["first", "second", "nested"]);
        });
    });
});
