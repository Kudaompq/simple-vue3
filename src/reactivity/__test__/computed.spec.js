import { describe, it, expect, vi } from 'vitest';
import { computed } from '../computed.js';
import { reactive } from '../reactive.js';
import { ref } from '../ref.js';
import { effect } from '../effect.js';

describe('computed', () => {
    describe('基本功能', () => {
        it('应该返回一个带有 value 属性的对象', () => {
            const c = computed(() => 1);
            expect(typeof c).toBe('object');
            expect(c.value).toBe(1);
        });

        it('应该计算简单的表达式', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);
            expect(c.value).toBe(2);
        });

        it('当依赖变化时应该重新计算', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);

            expect(c.value).toBe(2);

            value.value = 2;
            expect(c.value).toBe(3);
        });

        it('应该支持多个依赖', () => {
            const value1 = ref(1);
            const value2 = ref(2);
            const c = computed(() => value1.value + value2.value);

            expect(c.value).toBe(3);

            value1.value = 2;
            expect(c.value).toBe(4);

            value2.value = 3;
            expect(c.value).toBe(5);
        });
    });

    describe('响应式更新', () => {
        it('computed 作为 effect 的依赖时应该正确更新', () => {
            const value = ref(1);
            const c = computed(() => value.value + 1);

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = c.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(2);

            // 修改依赖
            value.value = 2;
            expect(dummy).toBe(3);
            expect(callCount).toBe(2);
        });

        it('应该支持嵌套的 computed', () => {
            const value = ref(1);
            const c1 = computed(() => value.value + 1);
            const c2 = computed(() => c1.value + 1);

            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = c2.value;
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(3); // 1 + 1 + 1

            value.value = 2;
            expect(callCount).toBe(2);
            expect(dummy).toBe(4); // 2 + 1 + 1
        });

        it('缓存状态下新的 effect 应该能正确收集依赖', () => {
            const value = ref(1);
            const c = computed(() => value.value * 2);

            // 第一次访问，触发计算
            expect(c.value).toBe(2);

            // 第二次访问，使用缓存
            expect(c.value).toBe(2);

            // 现在创建一个新的 effect，应该能正确收集依赖
            let dummy;
            let callCount = 0;

            effect(() => {
                callCount++;
                dummy = c.value; // 此时 computed 是缓存状态，但仍应收集依赖
            });

            expect(callCount).toBe(1);
            expect(dummy).toBe(2);

            // 修改依赖，新的 effect 应该被触发
            value.value = 5;
            expect(callCount).toBe(2);
            expect(dummy).toBe(10);
        });
    });

    describe('与 reactive 结合', () => {
        it('应该支持 reactive 对象作为依赖', () => {
            const state = reactive({ count: 1, multiplier: 2 });
            const c = computed(() => state.count * state.multiplier);

            expect(c.value).toBe(2);

            state.count = 2;
            expect(c.value).toBe(4);

            state.multiplier = 3;
            expect(c.value).toBe(6);
        });

        it('应该支持嵌套对象属性', () => {
            const state = reactive({
                user: {
                    profile: {
                        age: 25
                    }
                }
            });

            const c = computed(() => state.user.profile.age >= 18 ? 'adult' : 'minor');

            expect(c.value).toBe('adult');

            state.user.profile.age = 16;
            expect(c.value).toBe('minor');
        });
    });

    describe('setter 功能', () => {
        it('应该支持 getter/setter 选项对象', () => {
            const value = ref(1);
            const c = computed({
                get: () => value.value + 1,
                set: (newValue) => {
                    value.value = newValue - 1;
                }
            });

            expect(c.value).toBe(2);

            c.value = 10;
            expect(value.value).toBe(9);
            expect(c.value).toBe(10);
        });

        it('只有 getter 时设置值应该发出警告', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const value = ref(1);
            const c = computed(() => value.value + 1);

            c.value = 10;
            expect(consoleSpy).toHaveBeenCalledWith('Computed property is readonly');

            consoleSpy.mockRestore();
        });
    });

    describe('边界情况', () => {
        it('应该处理返回 undefined 的计算', () => {
            const value = ref(1);
            const c = computed(() => {
                if (value.value > 0) return value.value;
                // 隐式返回 undefined
            });

            expect(c.value).toBe(1);

            value.value = -1;
            expect(c.value).toBe(undefined);
        });

        it('应该正确处理 falsy 值', () => {
            const value = ref(0);
            const c = computed(() => value.value || 'default');

            expect(c.value).toBe('default');

            value.value = '';
            expect(c.value).toBe('default');

            value.value = false;
            expect(c.value).toBe('default');

            value.value = 'truthy';
            expect(c.value).toBe('truthy');
        });
    });

    describe('实际应用场景', () => {
        it('应该支持计数器场景', () => {
            const count = ref(0);
            const doubledCount = computed(() => count.value * 2);

            expect(doubledCount.value).toBe(0);

            count.value = 5;
            expect(doubledCount.value).toBe(10);

            count.value = -3;
            expect(doubledCount.value).toBe(-6);
        });

        it('应该支持表单验证场景', () => {
            const email = ref('');
            const password = ref('');

            const isValidEmail = computed(() => {
                return email.value.includes('@') && email.value.includes('.');
            });

            const isValidPassword = computed(() => {
                return password.value.length >= 8;
            });

            const canSubmit = computed(() => {
                return isValidEmail.value && isValidPassword.value;
            });

            // 初始状态
            expect(canSubmit.value).toBe(false);
            expect(isValidEmail.value).toBe(false);
            expect(isValidPassword.value).toBe(false);

            // 设置有效邮箱
            email.value = 'test@example.com';
            expect(isValidEmail.value).toBe(true);
            expect(isValidPassword.value).toBe(false);
            expect(canSubmit.value).toBe(false);

            // 设置有效密码
            password.value = 'password123';
            expect(isValidPassword.value).toBe(true);
            expect(isValidEmail.value).toBe(true);
            expect(canSubmit.value).toBe(true);
        });

        it('应该支持数据过滤场景', () => {
            const items = ref([
                { name: 'Apple', price: 1.5 },
                { name: 'Banana', price: 0.8 },
                { name: 'Orange', price: 1.2 }
            ]);

            const expensiveItems = computed(() => {
                return items.value.filter(item => item.price > 1.0);
            });

            expect(expensiveItems.value).toHaveLength(2);
            expect(expensiveItems.value[0].name).toBe('Apple');
            expect(expensiveItems.value[1].name).toBe('Orange');

            // 修改数据
            items.value = [
                { name: 'Apple', price: 1.5 },
                { name: 'Banana', price: 2.0 }, // 价格提高
                { name: 'Orange', price: 0.5 }  // 价格降低
            ];

            expect(expensiveItems.value).toHaveLength(2);
            expect(expensiveItems.value[0].name).toBe('Apple');
            expect(expensiveItems.value[1].name).toBe('Banana');
        });

        it('应该支持全名组合场景', () => {
            const firstName = ref('John');
            const lastName = ref('Doe');

            const fullName = computed({
                get: () => `${firstName.value} ${lastName.value}`,
                set: (newValue) => {
                    const [first, last] = newValue.split(' ');
                    firstName.value = first;
                    lastName.value = last;
                }
            });

            expect(fullName.value).toBe('John Doe');

            firstName.value = 'Jane';
            expect(fullName.value).toBe('Jane Doe');

            fullName.value = 'Alice Smith';
            expect(firstName.value).toBe('Alice');
            expect(lastName.value).toBe('Smith');
            expect(fullName.value).toBe('Alice Smith');
        });
    });
    it('应该懒执行', () => {
        const getter = vi.fn(() => 123);
        const c = computed(getter);

        // 未访问前不会执行
        expect(getter).not.toHaveBeenCalled();

        // 第一次访问会触发
        expect(c.value).toBe(123);
        expect(getter).toHaveBeenCalledTimes(1);
    });
    it('未变更依赖时不应重新计算', () => {
  const value = ref(1);
  const getter = vi.fn(() => value.value + 1);
  const c = computed(getter);

  expect(c.value).toBe(2);
  expect(getter).toHaveBeenCalledTimes(1);

  // 再次读取，不应重新计算
  expect(c.value).toBe(2);
  expect(getter).toHaveBeenCalledTimes(1);

  // 依赖变更，重新计算
  value.value = 2;
  expect(c.value).toBe(3);
  expect(getter).toHaveBeenCalledTimes(2);
});

    describe('综合测试场景', () => {
        it('应该支持复杂的电商购物车场景', () => {
            // 商品数据
            const products = ref([
                { id: 1, name: 'iPhone', price: 999, quantity: 0 },
                { id: 2, name: 'MacBook', price: 1299, quantity: 0 },
                { id: 3, name: 'AirPods', price: 179, quantity: 0 }
            ]);

            // 用户设置
            const userSettings = reactive({
                vipLevel: 1, // 1: 普通, 2: VIP, 3: 超级VIP
                discountCode: '',
                region: 'US' // US, EU, CN
            });

            // 税率配置
            const taxRates = reactive({
                US: 0.08,  // 8%
                EU: 0.20,  // 20%
                CN: 0.13   // 13%
            });

            // 计算购物车中的商品
            const cartItems = computed(() => {
                return products.value.filter(product => product.quantity > 0);
            });

            // 计算小计（不含税和折扣）
            const subtotal = computed(() => {
                return cartItems.value.reduce((sum, item) => {
                    return sum + (item.price * item.quantity);
                }, 0);
            });

            // 计算VIP折扣
            const vipDiscount = computed(() => {
                const { vipLevel } = userSettings;
                if (vipLevel === 1) return 0;      // 普通用户无折扣
                if (vipLevel === 2) return 0.05;   // VIP 5%折扣
                if (vipLevel === 3) return 0.10;   // 超级VIP 10%折扣
                return 0;
            });

            // 计算优惠码折扣
            const couponDiscount = computed(() => {
                const { discountCode } = userSettings;
                if (discountCode === 'SAVE10') return 0.10;  // 10%折扣
                if (discountCode === 'SAVE20') return 0.20;  // 20%折扣
                if (discountCode === 'NEWUSER') return 0.15; // 新用户15%折扣
                return 0;
            });

            // 计算总折扣（VIP折扣和优惠码折扣可叠加，但最多30%）
            const totalDiscount = computed(() => {
                const total = vipDiscount.value + couponDiscount.value;
                return Math.min(total, 0.30); // 最多30%折扣
            });

            // 计算折扣后金额
            const discountedAmount = computed(() => {
                return subtotal.value * (1 - totalDiscount.value);
            });

            // 计算税费
            const taxAmount = computed(() => {
                const rate = taxRates[userSettings.region] || 0;
                return discountedAmount.value * rate;
            });

            // 计算最终总价
            const finalTotal = computed(() => {
                return discountedAmount.value + taxAmount.value;
            });

            // 计算购物车摘要信息
            const cartSummary = computed(() => {
                const itemCount = cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
                return {
                    totalItems: itemCount,
                    uniqueProducts: cartItems.value.length,
                    averagePrice: itemCount > 0 ? subtotal.value / itemCount : 0,
                    savings: subtotal.value - discountedAmount.value
                };
            });

            // 判断是否符合免费配送条件
            const freeShipping = computed(() => {
                return finalTotal.value >= 100 || userSettings.vipLevel >= 2;
            });

            // 计算配送费
            const shippingCost = computed(() => {
                if (freeShipping.value) return 0;
                if (userSettings.region === 'US') return 9.99;
                if (userSettings.region === 'EU') return 12.99;
                if (userSettings.region === 'CN') return 6.99;
                return 15.99; // 其他地区
            });

            // 计算包含配送费的最终总价
            const grandTotal = computed(() => {
                return finalTotal.value + shippingCost.value;
            });

            // 初始状态测试
            expect(cartItems.value).toHaveLength(0);
            expect(subtotal.value).toBe(0);
            expect(finalTotal.value).toBe(0);
            expect(freeShipping.value).toBe(false);

            // 添加商品到购物车
            products.value[0].quantity = 1; // iPhone x1
            products.value[2].quantity = 2; // AirPods x2

            expect(cartItems.value).toHaveLength(2);
            expect(subtotal.value).toBe(1357); // 999 + 179*2
            expect(totalDiscount.value).toBe(0); // 普通用户无折扣
            expect(discountedAmount.value).toBe(1357);
            expect(taxAmount.value).toBeCloseTo(108.56); // 1357 * 0.08
            expect(finalTotal.value).toBeCloseTo(1465.56);
            expect(freeShipping.value).toBe(true); // 超过100免费配送
            expect(grandTotal.value).toBeCloseTo(1465.56);

            // 升级为VIP用户
            userSettings.vipLevel = 2;
            expect(vipDiscount.value).toBe(0.05);
            expect(totalDiscount.value).toBe(0.05);
            expect(discountedAmount.value).toBeCloseTo(1289.15); // 1357 * 0.95
            expect(taxAmount.value).toBeCloseTo(103.13); // 1289.15 * 0.08
            expect(finalTotal.value).toBeCloseTo(1392.28);

            // 添加优惠码
            userSettings.discountCode = 'SAVE10';
            expect(couponDiscount.value).toBe(0.10);
            expect(totalDiscount.value).toBeCloseTo(0.15); // VIP 5% + 优惠码 10%
            expect(discountedAmount.value).toBeCloseTo(1153.45); // 1357 * 0.85

            // 切换地区到欧盟（高税率）
            userSettings.region = 'EU';
            expect(taxAmount.value).toBeCloseTo(230.69); // 1153.45 * 0.20
            expect(shippingCost.value).toBe(0); // VIP免费配送

            // 测试购物车摘要
            const summary = cartSummary.value;
            expect(summary.totalItems).toBe(3); // 1 iPhone + 2 AirPods
            expect(summary.uniqueProducts).toBe(2);
            expect(summary.averagePrice).toBeCloseTo(452.33); // 1357/3
            expect(summary.savings).toBeCloseTo(203.55); // 1357 - 1153.45

            // 添加更多商品，测试最大折扣限制
            products.value[1].quantity = 1; // MacBook x1
            userSettings.discountCode = 'SAVE20'; // 更高折扣码
            expect(couponDiscount.value).toBe(0.20);
            expect(totalDiscount.value).toBe(0.25); // VIP 5% + 优惠码 20%
            expect(subtotal.value).toBe(2656); // 999 + 1299 + 179*2

            // 升级到超级VIP，测试30%折扣上限
            userSettings.vipLevel = 3;
            expect(vipDiscount.value).toBe(0.10);
            expect(totalDiscount.value).toBe(0.30); // 上限30%: min(10% + 20%, 30%)
            expect(discountedAmount.value).toBeCloseTo(1859.2); // 2656 * 0.70
        });

        it('应该支持复杂的数据分析仪表板场景', () => {
            // 原始数据
            const rawData = ref([
                { date: '2024-01-01', sales: 1000, visitors: 5000, category: 'electronics' },
                { date: '2024-01-02', sales: 1200, visitors: 5500, category: 'clothing' },
                { date: '2024-01-03', sales: 800, visitors: 4800, category: 'electronics' },
                { date: '2024-01-04', sales: 1500, visitors: 6000, category: 'books' },
                { date: '2024-01-05', sales: 900, visitors: 4500, category: 'clothing' }
            ]);

            // 过滤器设置
            const filters = reactive({
                dateRange: { start: '2024-01-01', end: '2024-01-05' },
                categories: ['electronics', 'clothing', 'books'],
                minSales: 0
            });

            // 过滤后的数据
            const filteredData = computed(() => {
                return rawData.value.filter(item => {
                    const dateInRange = item.date >= filters.dateRange.start && 
                                       item.date <= filters.dateRange.end;
                    const categoryMatch = filters.categories.includes(item.category);
                    const salesMatch = item.sales >= filters.minSales;
                    
                    return dateInRange && categoryMatch && salesMatch;
                });
            });

            // 总销售额
            const totalSales = computed(() => {
                return filteredData.value.reduce((sum, item) => sum + item.sales, 0);
            });

            // 总访客数
            const totalVisitors = computed(() => {
                return filteredData.value.reduce((sum, item) => sum + item.visitors, 0);
            });

            // 平均转化率
            const conversionRate = computed(() => {
                if (totalVisitors.value === 0) return 0;
                return (totalSales.value / totalVisitors.value) * 100;
            });

            // 按类别分组的数据
            const dataByCategory = computed(() => {
                const groups = {};
                filteredData.value.forEach(item => {
                    if (!groups[item.category]) {
                        groups[item.category] = { sales: 0, visitors: 0, count: 0 };
                    }
                    groups[item.category].sales += item.sales;
                    groups[item.category].visitors += item.visitors;
                    groups[item.category].count += 1;
                });
                return groups;
            });

            // 最佳表现类别
            const topCategory = computed(() => {
                const categories = Object.entries(dataByCategory.value);
                if (categories.length === 0) return null;
                
                return categories.reduce((best, [name, data]) => {
                    return data.sales > best.sales ? { name, ...data } : best;
                }, { name: '', sales: -1 }); // 改为-1确保第一个类别能被选中
            });

            // 趋势分析（简化版）
            const trend = computed(() => {
                const data = filteredData.value;
                if (data.length < 2) return 'insufficient_data';
                
                const firstHalf = data.slice(0, Math.floor(data.length / 2));
                const secondHalf = data.slice(Math.floor(data.length / 2));
                
                const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.sales, 0) / firstHalf.length;
                const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.sales, 0) / secondHalf.length;
                
                const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
                
                if (changePercent > 10) return 'growing';
                if (changePercent < -10) return 'declining';
                return 'stable';
            });

            // 仪表板摘要
            const dashboardSummary = computed(() => {
                return {
                    totalRecords: filteredData.value.length,
                    totalSales: totalSales.value,
                    totalVisitors: totalVisitors.value,
                    avgSalesPerDay: filteredData.value.length > 0 ? totalSales.value / filteredData.value.length : 0,
                    conversionRate: conversionRate.value,
                    topCategory: topCategory.value?.name || 'none',
                    trend: trend.value,
                    categoriesCount: Object.keys(dataByCategory.value).length
                };
            });

            // 初始状态测试
            expect(filteredData.value).toHaveLength(5);
            expect(totalSales.value).toBe(5400);
            expect(totalVisitors.value).toBe(25800);
            expect(conversionRate.value).toBeCloseTo(20.93);
            expect(topCategory.value.name).toBe('clothing'); // clothing有2100销售额，books只有1500
            expect(trend.value).toBe('stable'); // 修正预期的趋势值

            // 应用类别过滤
            filters.categories = ['electronics'];
            expect(filteredData.value).toHaveLength(2);
            expect(totalSales.value).toBe(1800); // 1000 + 800
            expect(topCategory.value.name).toBe('electronics');

            // 应用销售额过滤
            filters.minSales = 1000;
            expect(filteredData.value).toHaveLength(1); // 只有第一条记录符合
            expect(totalSales.value).toBe(1000);

            // 应用日期范围过滤
            filters.dateRange = { start: '2024-01-02', end: '2024-01-04' };
            filters.categories = ['electronics', 'clothing', 'books'];
            filters.minSales = 0;
            
            expect(filteredData.value).toHaveLength(3);
            expect(totalSales.value).toBe(3500); // 1200 + 800 + 1500

            // 测试仪表板摘要
            const summary = dashboardSummary.value;
            expect(summary.totalRecords).toBe(3);
            expect(summary.avgSalesPerDay).toBeCloseTo(1166.67);
            expect(summary.categoriesCount).toBe(3);
        });

        it('应该支持多层嵌套依赖和循环更新', () => {
            // 用户信息
            const user = reactive({
                age: 25,
                income: 50000,
                creditScore: 700,
                location: 'urban'
            });

            // 基础评分计算
            const ageScore = computed(() => {
                if (user.age < 25) return 0.8;
                if (user.age < 35) return 1.0;
                if (user.age < 50) return 0.9;
                return 0.7;
            });

            const incomeScore = computed(() => {
                return Math.min(user.income / 100000, 1.0);
            });

            const creditScoreNormalized = computed(() => {
                return Math.min(user.creditScore / 850, 1.0);
            });

            const locationScore = computed(() => {
                return user.location === 'urban' ? 1.0 : 0.8;
            });

            // 综合评分
            const baseScore = computed(() => {
                return (ageScore.value * 0.2 + 
                        incomeScore.value * 0.3 + 
                        creditScoreNormalized.value * 0.4 + 
                        locationScore.value * 0.1) * 100;
            });

            // 风险等级
            const riskLevel = computed(() => {
                if (baseScore.value >= 80) return 'low';
                if (baseScore.value >= 60) return 'medium';
                if (baseScore.value >= 40) return 'high';
                return 'very_high';
            });

            // 贷款额度
            const loanLimit = computed(() => {
                const multiplier = {
                    'low': 5,
                    'medium': 3,
                    'high': 1.5,
                    'very_high': 0.5
                };
                return user.income * multiplier[riskLevel.value];
            });

            // 利率
            const interestRate = computed(() => {
                const baseRate = {
                    'low': 0.03,      // 3%
                    'medium': 0.05,   // 5%
                    'high': 0.08,     // 8%
                    'very_high': 0.12 // 12%
                };
                
                // 年龄调整
                let rate = baseRate[riskLevel.value];
                if (user.age < 25 || user.age > 65) rate += 0.01;
                
                return rate;
            });

            // 月供计算（简化版）
            const monthlyPayment = computed(() => {
                if (loanLimit.value === 0) return 0;
                const principal = loanLimit.value;
                const monthlyRate = interestRate.value / 12;
                const numPayments = 360; // 30年
                
                return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
            });

            // 还款能力评估
            const affordabilityRatio = computed(() => {
                const monthlyIncome = user.income / 12;
                return monthlyPayment.value / monthlyIncome;
            });

            // 最终审批状态
            const approvalStatus = computed(() => {
                if (riskLevel.value === 'very_high') return 'rejected';
                if (affordabilityRatio.value > 0.4) return 'rejected'; // 还款比例超过40%
                if (riskLevel.value === 'low' && affordabilityRatio.value < 0.3) return 'approved';
                return 'review_required';
            });

            // 综合报告
            const loanReport = computed(() => {
                return {
                    userId: `user_${user.age}_${user.creditScore}`,
                    scores: {
                        age: ageScore.value,
                        income: incomeScore.value,
                        credit: creditScoreNormalized.value,
                        location: locationScore.value,
                        overall: baseScore.value
                    },
                    assessment: {
                        riskLevel: riskLevel.value,
                        loanLimit: loanLimit.value,
                        interestRate: interestRate.value,
                        monthlyPayment: monthlyPayment.value,
                        affordabilityRatio: affordabilityRatio.value,
                        status: approvalStatus.value
                    },
                    timestamp: new Date().toISOString().split('T')[0]
                };
            });

            // 初始状态测试
            expect(baseScore.value).toBeCloseTo(77.94); // 重新计算正确值
            expect(riskLevel.value).toBe('medium');
            expect(loanLimit.value).toBe(150000); // 50000 * 3
            expect(approvalStatus.value).toBe('review_required');

            // 改善用户条件
            user.age = 30;
            user.income = 80000;
            user.creditScore = 750;

            expect(ageScore.value).toBe(1.0); // 25-35岁
            expect(incomeScore.value).toBe(0.8); // 80000/100000
            expect(creditScoreNormalized.value).toBeCloseTo(0.88); // 750/850
            expect(baseScore.value).toBeCloseTo(89.29); // 使用实际计算值
            expect(riskLevel.value).toBe('low'); // 89.29 >= 80，应该是low
            expect(loanLimit.value).toBe(400000); // 80000 * 5 (low risk)
            expect(interestRate.value).toBe(0.03); // 低风险利率
            expect(approvalStatus.value).toBe('approved');

            // 测试综合报告
            const report = loanReport.value;
            expect(report.userId).toBe('user_30_750');
            expect(report.scores.overall).toBeCloseTo(89.29); // 使用实际计算值
            expect(report.assessment.status).toBe('approved');
            expect(report.assessment.riskLevel).toBe('low');

            // 极端情况测试
            user.age = 70;
            user.income = 20000;
            user.creditScore = 500;
            user.location = 'rural';

            expect(riskLevel.value).toBe('high'); // 修正为实际的计算结果
            expect(approvalStatus.value).toBe('review_required'); // 修正为实际的审批状态
            expect(loanLimit.value).toBe(30000); // 20000 * 1.5 (high risk)
        });
    });
});
