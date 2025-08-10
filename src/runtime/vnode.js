
/**
 * 特殊节点符号
 */
export const Text = Symbol('Text');
export const Fragment = Symbol('Fragment');

/**
 * 节点类型标志，用于区分不同类型的节点
 * 对于源码中复杂的类型本项目中仅仅对于元素节点、文本节点、片段节点、组件节点进行了区分
 * 通过位运算来快速判断节点类型结构
 */
export const ShapeFlags = {
    ELEMENT: 1,
    TEXT: 1 << 1,
    FRAGMENT: 1 << 2,
    COMPONENT: 1 << 3,
    TEXT_CHILDREN: 1 << 4,
    ARRAY_CHILDREN: 1 << 5,
    CHILDREN: (1 << 4) | (1 << 5),

}
/**
 * 创建虚拟节点，在源码中是判断类型再去执行对应的createVNode函数
 * 源码中是分成了三个方法 h => createVNode => createBaseVNode
 * @param {*} type 类型
 * @param {*} props 属性
 * @param {*} children 子节点
 */
export function h(type,props = null,children = null){
    let shapeFlag = 0;
    if (typeof type === 'string'){
        shapeFlag = ShapeFlags.ELEMENT;
    } else if (type === Text){
        shapeFlag = ShapeFlags.TEXT;
    } else if (type === Fragment){
        shapeFlag = ShapeFlags.FRAGMENT;
    } else {
        shapeFlag = ShapeFlags.COMPONENT;
    }

    // 处理子节点
    if (typeof children === 'string' || typeof children === 'number'){
        shapeFlag |= ShapeFlags.TEXT_CHILDREN;
        children = children.toString();
    } else if (Array.isArray(children)){
        shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } 

    return {
        type,
        props,
        children,
        shapeFlag,
        el: null,
        anchor: null,
        key: props && (props.key != null ? props.key : null),
        component: null, // 组件实例
        patchFlag: 0, // 用于优化的标志位 TODO: 后续进行性能优化
    }
    
}