import { ShapeFlags } from "./vnode.js";
import { patchProps } from "./patchProps.js";
import { mountComponent } from "./component.js";

/**
 * 渲染函数,在源码中对于渲染函数中所调用的方法抽象出了一个RenderOptions，
 * 可以通过自定义RenderOptions来实现平台无关性，
 * 例如在浏览器环境中可以自定义RenderOptions来实现DOM操作，
 * 在服务器端环境中可以自定义RenderOptions来实现SSR操作，
 * @param {*} vnode
 * @param {*} container
 */
export function render(vnode, container) {
    const prevNode = container._vnode;
    if (!vnode) {
        if (prevNode) {
            unmount(prevNode);
        }
    } else {
        patch(prevNode, vnode, container);
    }
    container._vnode = vnode;
}

/**
 * 卸载函数,用于卸载节点
 * @param {*} vnode
 */
function unmount(vnode) {
    const { shapeFlag, el } = vnode;
    if (shapeFlag & ShapeFlags.COMPONENT) {
        unmountComponent(vnode);
    } else if (shapeFlag & ShapeFlags.FRAGMENT) {
        unmountFragment(vnode);
    } else {
        el.parentNode.removeChild(el);
    }
}

/**
 * 打补丁函数,用于更新节点
 * @param {*} n1 旧节点
 * @param {*} n2 新节点
 * @param {*} container 容器
 * @param {*} anchor 锚点
 */
function patch(n1, n2, container, anchor) {
    if (n1 && !isSameVNodeType(n1, n2)) {
        // 不同类型的节点需要卸载旧节点
        anchor = (n1.anchor || n1.el).nextSibling;
        unmount(n1);
        n1 = null;
    }
    const { shapeFlag } = n2;
    if (shapeFlag & ShapeFlags.ELEMENT) {
        // 元素节点
        processElement(n1, n2, container, anchor);
    } else if (shapeFlag & ShapeFlags.TEXT) {
        // 文本节点
        processText(n1, n2, container, anchor);
    } else if (shapeFlag & ShapeFlags.FRAGMENT) {
        // 片段节点
        processFragment(n1, n2, container, anchor);
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
        // 组件节点
        processComponent(n1, n2, container, anchor);
    }
}

function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}
//  ======================================
//               元素节点相关
//  ======================================

/**
 * 处理元素节点
 * @param {*} n1 旧节点
 * @param {*} n2 新节点
 * @param {*} container 容器
 * @param {*} anchor 锚点
 */
function processElement(n1, n2, container, anchor) {
    if (n1 == null) {
        mountElement(n2, container, anchor);
    } else {
        patchElement(n1, n2);
    }
}

/**
 * 挂载元素节点
 * @param {*} vnode
 * @param {*} container
 * @param {*} anchor
 */
function mountElement(vnode, container, anchor) {
    const { type, props, children, shapeFlag } = vnode;
    const el = document.createElement(type);
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(children, el, null);
    }
    if (props) {
        patchProps(el, null, props);
    }
    vnode.el = el;
    container.insertBefore(el, anchor || null);
}

/**
 * 更新元素节点
 * @param {*} n1
 * @param {*} n2
 */
function patchElement(n1, n2) {
    n2.el = n1.el;
    patchProps(n2.el, n1.props, n2.props);
    patchChildren(n1, n2, n2.el);
}

/**
 * 挂载子节点
 * @param {*} children
 * @param {*} container
 * @param {*} anchor
 */
function mountChildren(children, container, anchor) {
    children.forEach((child) => {
        patch(null, child, container, anchor);
    });
}

function patchChildren(n1, n2, el, anchor) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;
    // n2 是文本节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1);
        }
        if (c2 !== c1) {
            el.textContent = c2;
        }
    } else {
        // c2 是array 或者是 null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                if (c1[0] && c1[0].key != null && c2[0] && c2[0].key != null) {
                    patchKeyedChildren(c1, c2, el, anchor);
                } else {
                    patchUnkeyedChildren(c1, c2, el, anchor);
                }
            } else {
                unmountChildren(c1);
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                el.textContent = "";
            }
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                mountChildren(c2, el, anchor);
            }
        }
    }
}

function unmountChildren(children) {
    children.forEach((child) => {
        unmount(child);
    });
}

//  ======================================
//               文本节点相关
//  ======================================
/**
 * 处理文本节点
 * @param {*} n1 旧节点
 * @param {*} n2 新节点
 * @param {*} container 容器
 * @param {*} anchor 锚点
 */
function processText(n1, n2, container, anchor) {
    if (n1 == null) {
        mountTextNode(n2, container, anchor);
    } else {
        // 复用当前node节点
        n2.el = n1.el;
        n2.el.textContent = n2.children;
    }
}

/**
 * 挂载文本节点
 * @param {*} n2
 * @param {*} container
 * @param {*} anchor
 */
function mountTextNode(n2, container, anchor) {
    n2.el = document.createTextNode(n2.children);
    container.insertBefore(n2.el, anchor || null);
}

//  ======================================
//               片段节点相关
//  ======================================

/**
 * 处理片段节点
 * @param {*} n1
 * @param {*} n2
 * @param {*} container
 * @param {*} anchor
 */
function processFragment(n1, n2, container, anchor) {
    /**
     * 对于新的片段节点，创建两个锚点，并插入到容器中
     * 为什么要创建锚点？
     * 因为片段节点没有自己的DOM元素，所以需要创建两个锚点来标识片段的开始和结束
     * 这样在更新时，可以快速定位到片段的开始和结束位置，从而避免重新渲染整个片段
     */
    const fragmentStartAnchor = (n2.el = n1
        ? n1.el
        : document.createTextNode(""));
    const fragmentEndAnchor = (n2.anchor = n1
        ? n1.anchor
        : document.createTextNode(""));
    if (n1 == null) {
        container.insertBefore(fragmentStartAnchor, anchor || null);
        container.insertBefore(fragmentEndAnchor, anchor || null);
        mountChildren(n2.children, container, fragmentEndAnchor);
    } else {
        patchChildren(n1, n2, container, anchor);
    }
}

/**
 * 卸载片段节点
 * @param {*} vnode 片段节点
 */
function unmountFragment(vnode) {
    let { el: cur, anchor: ed } = vnode;
    while (cur !== ed) {
        let next = cur.nextSibling;
        cur.parentNode.removeChild(cur);
        cur = next;
    }
    cur.parentNode.removeChild(cur);
}

// ======================================
//               组件节点相关
// ======================================

/**
 * 处理组件节点
 * @param {*} n1 旧节点
 * @param {*} n2 新节点
 * @param {*} container 容器
 * @param {*} anchor 锚点
 */
function processComponent(n1, n2, container, anchor) {
    if (n1 == null) {
        mountComponent(n2, container, anchor, patch);
    } else {
        updateComponent(n1, n2);
    }
}

function unmountComponent(vnode) {
    const { component } = vnode;
    unmount(component.subTree);
}

function updateComponent(n1, n2) {
    n2.component = n1.component;
    n2.component.next = n2;
    n2.component.update();
}

// ======================================
//               patch相关
// ======================================

/**
 * 处理没有key的情况
 * 按照下标处理，如果多出则新增，少于则删除
 * @param {*} c1 旧子节点
 * @param {*} c2 新子节点
 * @param {*} container 容器
 * @param {*} anchor 锚点
 */
function patchUnkeyedChildren(c1, c2, container, anchor) {
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    for (let i = 0; i < commonLength; i++) {
        const oldVNode = c1[i];
        const newVNode = c2[i];
        patch(oldVNode, newVNode, container, anchor);
    }
    if (newLength > oldLength) {
        mountChildren(c2.slice(commonLength), container, anchor);
    } else if (oldLength > newLength) {
        unmountChildren(c1.slice(newLength));
    }
}

/**
 * 处理有key的情况
 * @param {*} c1
 * @param {*} c2
 * @param {*} container
 * @param {*} anchor
 */
function patchKeyedChildren(c1, c2, container, anchor) {
    let i = 0,
        e1 = c1.length - 1,
        e2 = c2.length - 1;
    // 从左往右遍历找到第一个不同的节点
    while (i <= e1 && i <= e2 && c1[i].key === c2[i].key) {
        patch(c1[i], c2[i], container, anchor);
        i++;
    }
    // 从右往左遍历找到第一个不同的节点
    while (i <= e1 && i <= e2 && c1[e1].key === c2[e2].key) {
        patch(c1[e1], c2[e2], container, anchor);
        e1--;
        e2--;
    }
    // 如果 i > e1, 说明旧节点已经遍历完毕，新的节点还有剩余，需要新增
    if (i > e1) {
        const nextPost = e2 + 1;
        // 找到下一个节点的锚点，然后通过patch插入到锚点之前
        const curAnchor = nextPost < c2.length ? c2[nextPost].el : anchor;
        for (let j = i; j <= e2; j++) {
            patch(null, c2[j], container, curAnchor);
        }
    } else if (i > e2) {
        // 如果 i > e2, 说明新节点已经遍历完毕，旧的节点还有剩余，需要删除
        for (let j = i; j <= e1; j++) {
            unmount(c1[j]);
        }
    } else {
        // 中间情况最难处理
        // 存储旧值及其下标
        const map = new Map();
        for (let j = i; j <= e1; j++) {
            const prev = c1[j];
            map.set(prev.key, { prev, j });
        }
        // 存储最大匹配索引的位置，用于优化移动操作，如果匹配的索引小于maxIndex，则需要易懂
        let maxIndex = 0;
        let move = false;
        // 存储待挂载节点
        let toMounted = [];
        // 存储新节点在旧节点的位置
        const source = new Array(e2 - i + 1).fill(-1);
        for (let k = 0; k < e2 - i + 1; k++) {
            const next = c2[k + i];
            if (map.has(next.key)) {
                const { prev, j } = map.get(next.key);
                patch(prev, next, container, anchor);
                if (j < maxIndex) {
                    move = true;
                } else {
                    maxIndex = j;
                }
                source[k] = j;
                map.delete(next.key);
            } else {
                toMounted.push(k + i);
            }
        }
        // 如果还存在未处理的节点，说明这些节点是需要删除的
        map.forEach(({ prev }) => {
            unmount(prev);
        });
        if (move) {
            // 获取最长递增子序列
            const seq = getSequence(source);
            let j = seq.length - 1;
            for (let k = source.length - 1; k >= 0; k--) {
                if (k === seq[j] && source[k] !== -1) {
                    // 如果当前节点在最长递增子序列中，说明当前节点不需要移动
                    j--;
                } else {
                    const pos = k + i;
                    const nextPos = pos + 1;
                    // 找的到下一个节点就用下一个节点，没有的话就用anchor
                    const curAnchor = (c2[nextPos] && c2[nextPos].el) || anchor;
                    if (source[k] === -1) {
                        patch(null, c2[pos], container, curAnchor);
                    } else {
                        container.insertBefore(c2[pos].el, curAnchor);
                    }
                }
            }
        } else if (toMounted.length) {
            // 7.不需要移动，但还有未添加的元素
            for (let k = toMounted.length - 1; k >= 0; k--) {
                const pos = toMounted[k];
                const nextPos = pos + 1;
                const curAnchor = (c2[nextPos] && c2[nextPos].el) || anchor;
                patch(null, c2[pos], container, curAnchor);
            }
        }
    }
}

/**
 * 获取最长递增子序列,时间复杂度最优O(n) ，最坏O(nlogn)
 * @param {*} nums
 */
function getSequence(nums) {
    const ans = [];
    const position = [];
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === -1) continue;
        if (nums.length && nums[i] > ans[ans.length - 1]) {
            ans.push(nums[i]);
            position.push(ans.length - 1);
        } else {
            let l = -1,
                r = ans.length;
            while (l + 1 < r) {
                let m = Math.floor((l + r) / 2);
                if (ans[m] < nums[i]) {
                    l = m;
                } else {
                    r = m;
                }
            }
            ans[r] = nums[i];
            position.push(r);
        }
    }
    let cur = ans.length - 1;
    for (let i = position.length - 1; i >= 0; i--) {
        if (position[i] === cur) {
            ans[cur--] = i;
        }
    }
    return ans;
}

// 写个getSequence的测试例子
// getSequence 测试用例
console.log("测试1:", getSequence([2, 3, 1, 5, 4])); // 期望输出: [0,1,3] 或 [0,1,4]
console.log("====================");
console.log("测试2:", getSequence([1, 2, 3, 4])); // 期望输出: [0,1,2,3]
console.log("====================");
console.log("测试3:", getSequence([4, 3, 2, 1])); // 期望输出: [0]
console.log("====================");
console.log("测试4:", getSequence([1, -1, 2, -1, 3])); // 期望输出: [0,2,4]
console.log("====================");
console.log("测试5:", getSequence([-1, -1, -1])); // 期望输出: []
