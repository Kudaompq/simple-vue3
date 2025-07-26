import { reactive } from './reactivity/reactive.js';
import { effect } from './reactivity/effect.js';
console.log('Simple Vue3 启动中...');
// 这里将是您的 Vue3 框架代码
const counter = reactive({count: 0})
effect(() => {
    console.log(`Counter: ${counter.count}`);
})
window.counter = counter; // 方便在浏览器控制台访问