/**
 * 处理属性的更新，注意不应该去修改key属性，对key属性需要进行特判
 * @param {*} el
 * @param {*} oldProps
 * @param {*} newProps
 * @returns
 */
export function patchProps(el, oldProps, newProps) {
  if (oldProps === newProps) {
    return;
  }
  oldProps = oldProps || {};
  newProps = newProps || {};
  // 新增的属性判断是否变化，变化则进行添加
  for (const key in newProps) {
    if (key === "key") continue;
    const prev = oldProps[key];
    const next = newProps[key];
    if (prev !== next) {
      patchDomProp(el, key, prev, next);
    }
  }
  // 对于旧的属性判断是否存在于新的属性中，如果不存在则删除
  for (const key in oldProps) {
    if (key !== "key" && !(key in newProps)) {
      patchDomProp(el, key, oldProps[key], null);
    }
  }
}

// 用于判断是否是DOM属性
const domPropsRE = /[A-Z]|^(value|checked|selected|muted)$/;

/**
 * 对于DOM属性进行更新
 * @param {*} el 元素节点
 * @param {*} key 属性名
 * @param {*} prev 旧属性值
 * @param {*} next 新属性值
 */
function patchDomProp(el, key, prev, next) {
  switch (key) {
    // 对于class属性需要特殊处理，因为class属性是一个字符串
    case "class":
      el.className = next || "";
      break;
    // 对于style属性需要特殊处理，因为style属性是一个对象
    case "style":
      if (!next) {
        el.removeAttribute("style");
      } else {
        for (const styleName in next) {
          el.style[styleName] = next[styleName];
        }
        if (prev) {
          for (const styleName in prev) {
            if (!(styleName in next)) {
              el.style[styleName] = "";
            }
          }
        }
      }
      break;
    default:
      // 避免原生事件比如onclick
      if (/^on[A-Z]/.test(key)) {
        if (prev !== next) {
          const eventName = key.slice(2).toLowerCase();
          if (prev) {
            el.removeEventListener(eventName, prev);
          }
          if (next) {
            el.addEventListener(eventName, next);
          }
        }
      }
      // 特定的DOM属性需要特殊处理，比如value、checked、selected、muted
      // 这些DOM属性不能直接通过setAttribute设置属性值，否则会失效
      else if (domPropsRE.test(key)) {
        if (next === "" && typeof el[key] === "boolean") {
          next = true;
        }
        el[key] = next;
      } else {
        if (next == null || next === false) {
          el.removeAttribute(key);
        } else {
          // 通过setAttribute设置属性值，属性值自动转化为字符串
          el.setAttribute(key, next);
        }
      }
      break;
  }
}
