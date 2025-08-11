/* 任务队列 */
const queue = [];
let isFlushing = false;
const resolvePromise = Promise.resolve();
let currentFlushPromise = null;
const set = new Set();

/**
 * 在DOM渲染后（update执行后）执行
 * @param {*} fn
 * @returns
 */
export function nextTick(fn) {
    const p = currentFlushPromise || resolvePromise;
    return fn ? p.then(fn) : p;
}

/**
 * 入队
 * @param {*} job 任务函数
 */
export function queueJob(job) {
    if (!set.has(job)) {
        set.add(job);
        queue.push(job);
        queueFlush();
    }
}

function queueFlush() {
    if (!isFlushing) {
        isFlushing = true;
        currentFlushPromise = resolvePromise.then(flushJobs);
    }
}

/**
 * 刷新任务队列（执行任务队列）
 */
function flushJobs() {
    try {
        for (let i = 0; i < queue.length; i++) {
            const job = queue[i];
            job();
        }
    } finally {
        isFlushing = false;
        queue.length = 0;
        set.clear();
        currentFlushPromise = null;
    }
}
