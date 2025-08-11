import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../createApp.js";
import { render } from "../render.js";
import { h } from "../vnode.js";

// Mock dependencies
vi.mock("../render.js");
vi.mock("../vnode.js");

describe("createApp", () => {
    let mockRender;
    let mockH;
    let container;

    beforeEach(() => {
        // Setup mocks
        mockRender = vi.mocked(render);
        mockH = vi.mocked(h);
        mockH.mockReturnValue({ type: "div", children: "test" });

        // Create container
        container = document.createElement("div");
        container.id = "app";
        document.body.appendChild(container);

        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.removeChild(container);
        vi.clearAllMocks();
    });

    describe("基本功能", () => {
        it("应该返回一个包含mount方法的app对象", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Hello World");
                },
            };

            const app = createApp(rootComponent);

            expect(app).toBeDefined();
            expect(app.mount).toBeDefined();
            expect(typeof app.mount).toBe("function");
        });

        it("应该正确处理组件的components属性", () => {
            const childComponent = {
                render() {
                    return h("span", null, "Child");
                },
            };

            const rootComponent = {
                components: [childComponent],
                render() {
                    return h("div", null, "Parent");
                },
            };

            const app = createApp(rootComponent);
            expect(app).toBeDefined();
        });

        it("应该处理没有components属性的组件", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "No Components");
                },
            };

            const app = createApp(rootComponent);
            expect(app).toBeDefined();
        });
    });

    describe("mount方法", () => {
        it("应该能够挂载到DOM元素", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Hello World");
                },
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalledWith(
                { type: "div", children: "test" },
                container
            );
        });

        it("应该能够通过选择器字符串挂载", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Hello World");
                },
            };

            // Mock querySelector
            const originalQuerySelector = document.querySelector;
            document.querySelector = vi.fn().mockReturnValue(container);

            const app = createApp(rootComponent);
            app.mount("#app");

            expect(document.querySelector).toHaveBeenCalledWith("#app");
            expect(mockRender).toHaveBeenCalledWith(
                { type: "div", children: "test" },
                container
            );

            // Restore original querySelector
            document.querySelector = originalQuerySelector;
        });

        it("应该清空容器内容", () => {
            container.innerHTML = "<p>Original Content</p>";

            const rootComponent = {
                render() {
                    return h("div", null, "New Content");
                },
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(container.innerHTML).toBe("");
        });

        it("应该处理有render函数的组件", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Rendered Content");
                },
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });

        it("应该处理有template属性的组件", () => {
            const rootComponent = {
                template: "<div>Template Content</div>",
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(rootComponent.template).toBe("<div>Template Content</div>");
            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });

        it("应该从容器innerHTML提取template（当组件没有render和template时）", () => {
            container.innerHTML = "<h1>Container Template</h1>";

            const rootComponent = {}; // 没有render和template

            const app = createApp(rootComponent);
            app.mount(container);

            expect(rootComponent.template).toBe("<h1>Container Template</h1>");
            expect(container.innerHTML).toBe(""); // 容器应该被清空
            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });

        it("应该优先使用render函数而不是template", () => {
            container.innerHTML = "<p>Container Content</p>";

            const rootComponent = {
                render() {
                    return h("div", null, "Render Function");
                },
                template: "<span>Template Content</span>",
            };

            const app = createApp(rootComponent);
            app.mount(container);

            // template不应该被容器内容覆盖
            expect(rootComponent.template).toBe("<span>Template Content</span>");
            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });

        it("应该优先使用template而不是容器innerHTML", () => {
            container.innerHTML = "<p>Container Content</p>";

            const rootComponent = {
                template: "<div>Explicit Template</div>",
            };

            const app = createApp(rootComponent);
            app.mount(container);

            // template不应该被容器内容覆盖
            expect(rootComponent.template).toBe("<div>Explicit Template</div>");
            expect(container.innerHTML).toBe(""); // 容器仍然被清空
            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });
    });

    describe("边界情况", () => {
        it("应该处理空的rootComponent", () => {
            const rootComponent = {};

            const app = createApp(rootComponent);
            expect(app).toBeDefined();
            expect(app.mount).toBeDefined();
        });

        it("应该处理null容器选择器", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Test");
                },
            };

            // Mock querySelector to return null
            const originalQuerySelector = document.querySelector;
            document.querySelector = vi.fn().mockReturnValue(null);

            const app = createApp(rootComponent);

            expect(() => {
                app.mount("#nonexistent");
            }).toThrow(); // 应该抛出错误，因为容器为null

            // Restore original querySelector
            document.querySelector = originalQuerySelector;
        });

        it("应该处理空容器innerHTML", () => {
            container.innerHTML = "";

            const rootComponent = {}; // 没有render和template

            const app = createApp(rootComponent);
            app.mount(container);

            expect(rootComponent.template).toBe("");
            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });

        it("应该处理复杂的容器innerHTML", () => {
            container.innerHTML = `
                <div class="header">
                    <h1>Title</h1>
                    <nav>Navigation</nav>
                </div>
                <main>
                    <p>Content</p>
                </main>
            `;

            const rootComponent = {};

            const app = createApp(rootComponent);
            app.mount(container);

            expect(rootComponent.template).toContain("<div class=\"header\">");
            expect(rootComponent.template).toContain("<h1>Title</h1>");
            expect(rootComponent.template).toContain("<main>");
            expect(container.innerHTML).toBe("");
        });
    });

    describe("集成测试", () => {
        it("应该正确处理完整的应用挂载流程", () => {
            const childComponent = {
                render() {
                    return h("span", null, "Child");
                },
            };

            const rootComponent = {
                components: [childComponent],
                render() {
                    return h("div", { class: "app" }, [
                        h("h1", null, "My App"),
                        h(childComponent),
                    ]);
                },
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalledWith(
                { type: "div", children: "test" },
                container
            );
        });

        it("应该支持多次挂载到不同容器", () => {
            const rootComponent = {
                render() {
                    return h("div", null, "Reusable App");
                },
            };

            const container2 = document.createElement("div");
            document.body.appendChild(container2);

            const app = createApp(rootComponent);

            // 第一次挂载
            app.mount(container);
            expect(mockRender).toHaveBeenCalledTimes(1);

            // 第二次挂载到不同容器
            app.mount(container2);
            expect(mockRender).toHaveBeenCalledTimes(2);
            expect(mockRender).toHaveBeenLastCalledWith(
                { type: "div", children: "test" },
                container2
            );

            document.body.removeChild(container2);
        });

        it("应该正确处理带有setup函数的组件", () => {
            const rootComponent = {
                setup() {
                    return {
                        message: "Hello from setup",
                    };
                },
                render(ctx) {
                    return h("div", null, ctx.message);
                },
            };

            const app = createApp(rootComponent);
            app.mount(container);

            expect(mockH).toHaveBeenCalledWith(rootComponent);
            expect(mockRender).toHaveBeenCalled();
        });
    });
});