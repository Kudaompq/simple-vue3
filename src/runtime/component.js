import { effect, reactive } from "../reactivity";
import { normalizeVNode } from "./vnode.js";
/**
 * 更新组件的props和attrs
 * @param {Component Instance} instance
 * @param {Component VNode} vnode
 */
export function updateComponentProps(instance, vnode) {
    const { type: originComp, props: vnodeProps } = vnode;
    // 处理props和attrs
    for (const key in vnodeProps) {
        if (originComp.props && originComp.props.includes(key)) {
            instance.props[key] = vnodeProps[key];
        } else {
            instance.attrs[key] = vnodeProps[key];
        }
    }
    // 将props转换为响应式对象 在源码中应该是通过proxyRefs实现的？
    instance.props = reactive(instance.props);
}

export function mountComponent(vnode, container, anchor, patch) {
    const { type: originComp } = vnode;
    // 创建组件实例
    const instance = {
        props: {},
        attrs: {},
        setupState: null, // 存储setup返回的响应式数据
        ctx: null, // 存储setup返回的响应式数据和props
        // 源码：instance.setupState = proxyRefs(setupResult)
        update: null,
        isMounted: false,
    };

    // 处理props和attrs
    updateComponentProps(instance, vnode);

    // 调用setup 返回响应式数据
    instance.setupState = originComp.setup?.(instance.props, {
        attrs: instance.attrs,
    });
    instance.ctx = {
        ...instance.props,
        ...instance.setupState,
    };
    instance.update = effect(() => {
        if (!instance.isMounted) {
            const subTree = (instance.subTree = normalizeVNode(
                originComp.render(instance.ctx)
            ));
            if (Object.keys(instance.attrs)) {
                subTree.props = {
                    ...subTree.props,
                    ...instance.attrs,
                };
            }
            patch(null, subTree, container, anchor);
            instance.isMounted = true;
            vnode.el = subTree.el;
        } else {
            // 如果next存在，则说明是被动更新，否则是主动更新
            if (instance.next) {
                vnode = instance.next;
                instance.next = null;
                updateComponentProps(instance, vnode);
                instance.ctx = {
                    ...instance.props,
                    ...instance.setupState,
                };
            }
            const prev = instance.subTree;
            // vnode 子树
            const subTree = (instance.subTree = normalizeVNode(
                originComp.render(instance.ctx)
            ));
            if (Object.keys(instance.attrs)) {
                subTree.props = {
                    ...subTree.props,
                    ...instance.attrs,
                };
            }
            patch(prev, subTree, container, anchor);
            vnode.el = subTree.el;
        }
    });
    vnode.component = instance;
}
