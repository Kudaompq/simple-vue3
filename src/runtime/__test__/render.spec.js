import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "../render.js";
import { h, Text, Fragment } from "../vnode.js";

describe("render", () => {
    let container;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    describe("基本渲染功能", () => {
        it("应该能渲染简单的元素节点", () => {
            const vnode = h("div", { id: "test" }, "Hello World");
            render(vnode, container);

            expect(container.innerHTML).toBe(
                '<div id="test">Hello World</div>'
            );
            expect(container._vnode).toBe(vnode);
        });

        it("应该能渲染带有多个属性的元素", () => {
            const vnode = h(
                "div",
                {
                    id: "test",
                    class: "container",
                    "data-value": "123",
                },
                "Content"
            );
            render(vnode, container);

            const element = container.firstChild;
            expect(element.id).toBe("test");
            expect(element.className).toBe("container");
            expect(element.getAttribute("data-value")).toBe("123");
            expect(element.textContent).toBe("Content");
        });

        it("应该能渲染文本节点", () => {
            const vnode = h(Text, null, "Hello Text");
            render(vnode, container);

            expect(container.textContent).toBe("Hello Text");
            expect(container.firstChild.nodeType).toBe(Node.TEXT_NODE);
        });

        it("应该能渲染片段节点", () => {
            const vnode = h(Fragment, null, [
                h("span", null, "First"),
                h("span", null, "Second"),
            ]);
            render(vnode, container);

            expect(container.innerHTML).toBe(
                "<span>First</span><span>Second</span>"
            );
            expect(container.childNodes.length).toBe(4); // 2个锚点 + 2个span
        });

        it("应该能渲染数组子节点", () => {
            const vnode = h("div", null, [
                h("span", null, "Child 1"),
                h("span", null, "Child 2"),
                h("span", null, "Child 3"),
            ]);
            render(vnode, container);

            expect(container.innerHTML).toBe(
                "<div><span>Child 1</span><span>Child 2</span><span>Child 3</span></div>"
            );
        });
    });

    describe("更新功能", () => {
        it("应该能更新元素的文本内容", () => {
            const vnode1 = h("div", null, "Old Text");
            const vnode2 = h("div", null, "New Text");

            render(vnode1, container);
            expect(container.innerHTML).toBe("<div>Old Text</div>");

            render(vnode2, container);
            expect(container.innerHTML).toBe("<div>New Text</div>");
        });

        it("应该能更新元素的属性", () => {
            const vnode1 = h(
                "div",
                { id: "old", class: "old-class" },
                "Content"
            );
            const vnode2 = h(
                "div",
                { id: "new", class: "new-class", title: "tooltip" },
                "Content"
            );

            render(vnode1, container);
            const element = container.firstChild;
            expect(element.id).toBe("old");
            expect(element.className).toBe("old-class");
            expect(element.title).toBe("");

            render(vnode2, container);
            expect(element.id).toBe("new");
            expect(element.className).toBe("new-class");
            expect(element.title).toBe("tooltip");
        });

        it("应该能从文本子节点更新为数组子节点", () => {
            const vnode1 = h("div", null, "Text Content");
            const vnode2 = h("div", null, [
                h("span", null, "Child 1"),
                h("span", null, "Child 2"),
            ]);

            render(vnode1, container);
            expect(container.innerHTML).toBe("<div>Text Content</div>");

            render(vnode2, container);
            expect(container.innerHTML).toBe(
                "<div><span>Child 1</span><span>Child 2</span></div>"
            );
        });

        it("应该能从数组子节点更新为文本子节点", () => {
            const vnode1 = h("div", null, [
                h("span", null, "Child 1"),
                h("span", null, "Child 2"),
            ]);
            const vnode2 = h("div", null, "New Text Content");

            render(vnode1, container);
            expect(container.innerHTML).toBe(
                "<div><span>Child 1</span><span>Child 2</span></div>"
            );

            render(vnode2, container);
            expect(container.innerHTML).toBe("<div>New Text Content</div>");
        });

        it("应该能更新文本节点的内容", () => {
            const vnode1 = h(Text, null, "Old Text");
            const vnode2 = h(Text, null, "New Text");

            render(vnode1, container);
            expect(container.textContent).toBe("Old Text");

            render(vnode2, container);
            expect(container.textContent).toBe("New Text");
            expect(container.firstChild).toBe(vnode1.el); // 应该复用同一个文本节点
        });
    });

    describe("无key子节点更新", () => {
        it("应该正确处理相同长度的子节点更新", () => {
            const vnode1 = h("div", null, [
                h("span", null, "A"),
                h("span", null, "B"),
                h("span", null, "C"),
            ]);
            const vnode2 = h("div", null, [
                h("span", null, "X"),
                h("span", null, "Y"),
                h("span", null, "Z"),
            ]);

            render(vnode1, container);
            const originalChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span></div>"
            );

            render(vnode2, container);
            const newChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>X</span><span>Y</span><span>Z</span></div>"
            );

            // 应该复用相同位置的元素
            expect(newChildren[0]).toBe(originalChildren[0]);
            expect(newChildren[1]).toBe(originalChildren[1]);
            expect(newChildren[2]).toBe(originalChildren[2]);
        });

        it("应该正确处理新增子节点", () => {
            const vnode1 = h("div", null, [
                h("span", null, "A"),
                h("span", null, "B"),
            ]);
            const vnode2 = h("div", null, [
                h("span", null, "A"),
                h("span", null, "B"),
                h("span", null, "C"),
                h("span", null, "D"),
            ]);

            render(vnode1, container);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span></div>"
            );

            render(vnode2, container);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span><span>D</span></div>"
            );
        });

        it("应该正确处理删除子节点", () => {
            const vnode1 = h("div", null, [
                h("span", null, "A"),
                h("span", null, "B"),
                h("span", null, "C"),
                h("span", null, "D"),
            ]);
            const vnode2 = h("div", null, [
                h("span", null, "A"),
                h("span", null, "B"),
            ]);

            render(vnode1, container);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span><span>D</span></div>"
            );

            render(vnode2, container);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span></div>"
            );
        });
    });

    describe("有key子节点更新", () => {
        it("应该正确处理简单的key更新", () => {
            const vnode1 = h("div", null, [
                h("span", { key: "a" }, "A"),
                h("span", { key: "b" }, "B"),
                h("span", { key: "c" }, "C"),
            ]);
            const vnode2 = h("div", null, [
                h("span", { key: "a" }, "A-updated"),
                h("span", { key: "b" }, "B-updated"),
                h("span", { key: "c" }, "C-updated"),
            ]);

            render(vnode1, container);
            const originalChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span></div>"
            );

            render(vnode2, container);
            const newChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A-updated</span><span>B-updated</span><span>C-updated</span></div>"
            );

            // 应该复用相同key的元素
            expect(newChildren[0]).toBe(originalChildren[0]);
            expect(newChildren[1]).toBe(originalChildren[1]);
            expect(newChildren[2]).toBe(originalChildren[2]);
        });

        it("应该正确处理key顺序变化", () => {
            const vnode1 = h("div", null, [
                h("span", { key: "a" }, "A"),
                h("span", { key: "b" }, "B"),
                h("span", { key: "c" }, "C"),
            ]);
            const vnode2 = h("div", null, [
                h("span", { key: "c" }, "C"),
                h("span", { key: "a" }, "A"),
                h("span", { key: "b" }, "B"),
            ]);

            render(vnode1, container);
            const originalChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span></div>"
            );

            render(vnode2, container);
            const newChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>C</span><span>A</span><span>B</span></div>"
            );

            // 应该复用相同key的元素，但位置发生变化
            expect(newChildren[0]).toBe(originalChildren[2]); // C
            expect(newChildren[1]).toBe(originalChildren[0]); // A
            expect(newChildren[2]).toBe(originalChildren[1]); // B
        });

        it("应该正确处理新增和删除key节点", () => {
            const vnode1 = h("div", null, [
                h("span", { key: "a" }, "A"),
                h("span", { key: "b" }, "B"),
                h("span", { key: "c" }, "C"),
            ]);
            const vnode2 = h("div", null, [
                h("span", { key: "a" }, "A"),
                h("span", { key: "d" }, "D"), // 新增
                h("span", { key: "c" }, "C"),
                // 删除了 key='b'
            ]);

            render(vnode1, container);
            const originalChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span></div>"
            );

            render(vnode2, container);
            const newChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>D</span><span>C</span></div>"
            );

            // A和C应该被复用
            expect(newChildren[0]).toBe(originalChildren[0]); // A
            expect(newChildren[2]).toBe(originalChildren[2]); // C
            // D是新创建的
            expect(newChildren[1]).not.toBe(originalChildren[1]);
        });

        it("应该正确处理复杂的key变化场景", () => {
            // 测试最长递增子序列算法
            const vnode1 = h("div", null, [
                h("span", { key: "a" }, "A"),
                h("span", { key: "b" }, "B"),
                h("span", { key: "c" }, "C"),
                h("span", { key: "d" }, "D"),
                h("span", { key: "e" }, "E"),
            ]);
            const vnode2 = h("div", null, [
                h("span", { key: "e" }, "E"),
                h("span", { key: "c" }, "C"),
                h("span", { key: "a" }, "A"),
                h("span", { key: "f" }, "F"), // 新增
                h("span", { key: "d" }, "D"),
                // 删除了 key='b'
            ]);

            render(vnode1, container);
            const originalChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span></div>"
            );

            render(vnode2, container);
            const newChildren = Array.from(container.firstChild.children);
            expect(container.innerHTML).toBe(
                "<div><span>E</span><span>C</span><span>A</span><span>F</span><span>D</span></div>"
            );

            // 应该复用相同key的元素
            expect(newChildren[0]).toBe(originalChildren[4]); // E
            expect(newChildren[1]).toBe(originalChildren[2]); // C
            expect(newChildren[2]).toBe(originalChildren[0]); // A
            expect(newChildren[4]).toBe(originalChildren[3]); // D
            // F是新创建的
            expect(newChildren[3]).not.toBe(originalChildren[1]);
        });
    });

    describe("卸载功能", () => {
        it("应该能卸载元素节点", () => {
            const vnode = h("div", null, "Content");
            render(vnode, container);
            expect(container.innerHTML).toBe("<div>Content</div>");

            render(null, container);
            expect(container.innerHTML).toBe("");
            expect(container._vnode).toBe(null);
        });

        it("应该能卸载文本节点", () => {
            const vnode = h(Text, null, "Text Content");
            render(vnode, container);
            expect(container.textContent).toBe("Text Content");

            render(null, container);
            expect(container.textContent).toBe("");
        });

        it("应该能卸载片段节点", () => {
            const vnode = h(Fragment, null, [
                h("span", null, "First"),
                h("span", null, "Second"),
            ]);
            render(vnode, container);
            expect(container.innerHTML).toBe(
                "<span>First</span><span>Second</span>"
            );

            render(null, container);
            expect(container.innerHTML).toBe("");
        });
    });

    describe("节点类型替换", () => {
        it("应该能从元素节点替换为文本节点", () => {
            const vnode1 = h("div", null, "Element Content");
            const vnode2 = h(Text, null, "Text Content");

            render(vnode1, container);
            expect(container.innerHTML).toBe("<div>Element Content</div>");

            render(vnode2, container);
            expect(container.textContent).toBe("Text Content");
            expect(container.firstChild.nodeType).toBe(Node.TEXT_NODE);
        });

        it("应该能从文本节点替换为元素节点", () => {
            const vnode1 = h(Text, null, "Text Content");
            const vnode2 = h("div", null, "Element Content");

            render(vnode1, container);
            expect(container.textContent).toBe("Text Content");

            render(vnode2, container);
            expect(container.innerHTML).toBe("<div>Element Content</div>");
        });

        it("应该能从不同类型的元素节点替换", () => {
            const vnode1 = h("div", null, "Div Content");
            const vnode2 = h("span", null, "Span Content");

            render(vnode1, container);
            expect(container.innerHTML).toBe("<div>Div Content</div>");

            render(vnode2, container);
            expect(container.innerHTML).toBe("<span>Span Content</span>");
        });
    });

    describe("边界情况", () => {
        it("应该正确处理空子节点", () => {
            const vnode = h("div", null, []);
            render(vnode, container);
            expect(container.innerHTML).toBe("<div></div>");
        });

        it("应该正确处理null子节点", () => {
            const vnode = h("div", null, null);
            render(vnode, container);
            expect(container.innerHTML).toBe("<div></div>");
        });

        it("应该正确处理undefined子节点", () => {
            const vnode = h("div", null, undefined);
            render(vnode, container);
            expect(container.innerHTML).toBe("<div></div>");
        });

        it("应该正确处理嵌套的片段节点", () => {
            const vnode = h("div", null, [
                h(Fragment, null, [
                    h("span", null, "First"),
                    h("span", null, "Second"),
                ]),
                h("p", null, "Paragraph"),
            ]);
            render(vnode, container);
            expect(container.innerHTML).toBe(
                "<div><span>First</span><span>Second</span><p>Paragraph</p></div>"
            );
        });

        it("应该正确处理混合类型的子节点", () => {
            const vnode = h("div", null, [
                h(Text, null, "Text Node"),
                h("span", null, "Element Node"),
                h(Fragment, null, [h("em", null, "Fragment Child")]),
            ]);
            render(vnode, container);
            expect(container.innerHTML).toBe(
                "<div>Text Node<span>Element Node</span><em>Fragment Child</em></div>"
            );
        });
    });

    describe("性能测试", () => {
        it("应该能处理大量节点的渲染", () => {
            const children = [];
            for (let i = 0; i < 1000; i++) {
                children.push(h("div", { key: i }, `Item ${i}`));
            }
            const vnode = h("div", null, children);

            const startTime = performance.now();
            render(vnode, container);
            const endTime = performance.now();

            expect(container.children[0].children.length).toBe(1000);
            expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
        });

        it("应该能高效处理大量节点的更新", () => {
            // 创建初始的1000个节点
            const children1 = [];
            for (let i = 0; i < 1000; i++) {
                children1.push(h("div", { key: i }, `Item ${i}`));
            }
            const vnode1 = h("div", null, children1);
            render(vnode1, container);

            // 更新其中的500个节点
            const children2 = [];
            for (let i = 0; i < 1000; i++) {
                if (i % 2 === 0) {
                    children2.push(h("div", { key: i }, `Updated Item ${i}`));
                } else {
                    children2.push(h("div", { key: i }, `Item ${i}`));
                }
            }
            const vnode2 = h("div", null, children2);

            const startTime = performance.now();
            render(vnode2, container);
            const endTime = performance.now();

            expect(container.children[0].children.length).toBe(1000);
            expect(container.children[0].children[0].textContent).toBe(
                "Updated Item 0"
            );
            expect(container.children[0].children[1].textContent).toBe(
                "Item 1"
            );
            expect(endTime - startTime).toBeLessThan(50); // 更新应该更快
        });
    });
});
