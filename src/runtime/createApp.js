import { isFunction } from "../utils";
import { render } from "./render";
import { h } from "./vnode";

let components;
export function createApp(rootComponent) {
    components = rootComponent.components || [];
    const app = {
        mount(rootContainer) {
            if (typeof rootContainer === "string") {
                rootContainer = document.querySelector(rootContainer);
            }
            if (!isFunction(rootComponent.render) && !rootComponent.template) {
                rootComponent.template = rootContainer.innerHTML;
            }
            rootContainer.innerHTML = "";
            render(h(rootComponent), rootContainer);
        },
    };
    return app;
}
