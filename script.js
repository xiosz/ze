// 云端订单管理系统 - Supabase版本
// 配置信息 - 请替换为您的Supabase信息

const SUPABASE_CONFIG = {
    url: "https://sttktysayrdwrntuonke.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dGt0eXNheXJkd3JudHVvbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MjY0NzQsImV4cCI6MjA0NjIwMjQ3NH0.qVxvwDdFfD_wO8kKBVgnFm9Z2fqOCf1wC6Z6jCDK_tk" // 替换为您的anon key
};

class CloudOrderSystem {
    constructor() {
        // 系统配置
        this.config = {
            password: '000223', // 默认密码
            localKey: 'order_system_local_backup',
            autoSync: true,
            syncInterval: 30000 // 30秒自动同步
        };
        
        // 状态变量
        this.orders = [];
        this.filteredOrders = [];
        this.sortAscending = true;
        this.lastSyncTime = null;
        this.syncTimer = null;
        this.supabase = null;
        this.isOnline = false;
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 初始化
        this.init();
    }
    
    cacheElements() {
        // 按钮
        this.assignBtn = document.getElementById('assignBtn');
        this.processBtn = document.getElementById('processBtn');
        this.syncBtn = document.getElementById('syncBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sortBtn = document.getElementById('sortBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // 弹窗相关
        this.assignModal = document.getElementById('assignModal');
        this.passwordModal = document.getElementById('passwordModal');
        this.confirmModal = document.getElementById('confirmModal');
        this.closeBtns = document.querySelectorAll('.close');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.cancelAdminBtn = document.getElementById('cancelAdminBtn');
        this.verifyBtn = document.getElementById('verifyBtn');
        this.confirmYes = document.getElementById('confirmYes');
        this.confirmNo = document.getElementById('confirmNo');
        
        // 表单元素
        this.orderForm = document.getElementById('orderForm');
        this.togglePassword = document.getElementById('togglePassword');
        this.toggleAdminPassword = document.getElementById('toggleAdminPassword');
        this.passwordInput = document.getElementById('password');
        this.adminPasswordInput = document.getElementById('adminPassword');
        
        // 搜索和过滤
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.priorityFilter = document.getElementById('priorityFilter');
        
        // 显示区域
        this.processSection = document.getElementById('processSection');
        this.ordersList = document.getElementById('ordersList');
        
        // 统计元素
        this.totalOrdersEl = document.getElementById('totalOrders');
        this.pendingOrdersEl = document.getElementById('pendingOrders');
        this.completedOrdersEl = document.getElementById('completedOrders');
        this.totalRevenueEl = document.getElementById('totalRevenue');
        this.syncStatusEl = document.getElementById('syncStatus');
        this.lastSyncEl = document.getElementById('lastSync');
        this.connectionStatusEl = document.getElementById('connectionStatus');
        this.storageUsedEl = document.getElementById('storageUsed');
        this.confirmMessage = document.getElementById('confirmMessage');
    }
    
    async init() {
        // 绑定事件
        this.bindEvents();
        
        // 初始化Supabase
        await this.initSupabase();
        
        // 加载数据
        await this.loadData();
        
        // 更新UI
        this.updateUI();
        
        // 开始自动同步
        if (this.config.autoSync) {
            this.startAutoSync();
        }
    }
    
    bindEvents() {
        // 主按钮事件
        this.assignBtn.addEventListener('click', () => this.openModal());
        this.processBtn.addEventListener('click', () => this.showProcessSection());
        this.syncBtn.addEventListener('click', () => this.syncWithCloud());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.clearBtn.addEventListener('click', () => this.confirmClearData());
        this.sortBtn.addEventListener('click', () => this.toggleSort());
        this.refreshBtn.addEventListener('click', () => this.refreshData());
        
        // 弹窗事件
        this.closeBtns.forEach(btn => {
            if (btn.classList.contains('admin-close')) {
                btn.addEventListener('click', () => this.closePasswordModal());
            } else {
                btn.addEventListener('click', () => this.closeModal());
            }
        });
        
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.cancelAdminBtn.addEventListener('click', () => this.closePasswordModal());
        this.verifyBtn.addEventListener('click', () => this.verifyPassword());
        this.confirmYes.addEventListener('click', () => this.executeConfirmedAction());
        this.confirmNo.addEventListener('click', () => this.closeConfirmModal());
        
        // 表单事件
        this.orderForm.addEventListener('submit', (e) => this.submitOrder(e));
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility(this.passwordInput, this.togglePassword));
        this.toggleAdminPassword.addEventListener('click', () => this.togglePasswordVisibility(this.adminPasswordInput, this.toggleAdminPassword));
        this.searchInput.addEventListener('input', () => this.filterOrders());
        this.statusFilter.addEventListener('change', () => this.filterOrders());
        this.priorityFilter.addEventListener('change', () => this.filterOrders());
        
        // 弹窗外部点击关闭
        window.addEventListener('click', (e) => {
            if (e.target === this.assignModal) this.closeModal();
            if (e.target === this.passwordModal) this.closePasswordModal();
            if (e.target === this.confirmModal) this.closeConfirmModal();
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closePasswordModal();
                this.closeConfirmModal();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openModal();
            }
        });
    }
    
    // ==================== Supabase 相关方法 ====================
    
    async initSupabase() {
        try {
            // 创建Supabase客户端
            this.supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
            
            // 测试连接
            const { data, error } = await this.supabase
                .from('orders')
                .select('id')
                .limit(1);
                
            if (error) throw error;
            
            this.isOnline = true;
            this.updateConnectionStatus('connected');
            this.showNotification('云端连接成功', 'success');
            
        } catch (error) {
            console.error('Supabase连接失败:', error);
            this.isOnline = false;
            this.updateConnectionStatus('disconnected');
            this.showNotification('使用离线模式，请检查网络连接', 'warning');
        }
    }
    
    updateConnectionStatus(status) {
        const dot = this.connectionStatusEl;
        const statusText = this.syncStatusEl;
        
        dot.className = 'status-dot';
        
        switch(status) {
            case 'connected':
                dot.classList.add('connected');
                statusText.textContent = '已连接';
                break;
            case 'disconnected':
                dot.classList.add('disconnected');
                statusText.textContent = '未连接';
                break;
            case 'connecting':
                dot.classList.add('connecting');
                statusText.textContent = '连接中...';
                break;
        }
    }
    
    // ==================== 数据管理 ====================
    
    async loadData() {
        // 首先尝试从云端加载
        if (this.isOnline) {
            try {
                await this.loadFromCloud();
                this.showNotification('云端数据加载成功', 'success');
                return;
            } catch (error) {
                console.error('加载云端数据失败:', error);
                this.isOnline = false;
                this.updateConnectionStatus('disconnected');
            }
        }
        
        // 如果云端失败，从本地加载
        this.loadFromLocal();
        this.showNotification('使用本地备份数据', 'info');
    }
    
    async loadFromCloud() {
        if (!this.supabase) {
            throw new Error('Supabase未初始化');
        }
        
        this.updateConnectionStatus('connecting');
        
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            this.orders = data || [];
            this.lastSyncTime = new Date().toISOString();
            this.updateSyncStatus();
            
            // 备份到本地
            this.saveToLocal();
            
            this.updateConnectionStatus('connected');
            return true;
            
        } catch (error) {
            this.updateConnectionStatus('disconnected');
            throw error;
        }
    }
    
    loadFromLocal() {
        try {
            const saved = localStorage.getItem(this.config.localKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.orders = data.orders || [];
                this.lastSyncTime = data.lastSyncTime || null;
                this.updateSyncStatus();
            }
        } catch (error) {
            console.error('加载本地数据失败:', error);
            this.orders = [];
        }
    }
    
    async saveToCloud() {
        if (!this.isOnline || !this.supabase) {
            throw new Error('云端连接不可用');
        }
        
        this.updateConnectionStatus('connecting');
        
        try {
            // 清空云端表
            const { error: deleteError } = await this.supabase
                .from('orders')
                .delete()
                .gte('id', 0);
                
            if (deleteError) throw deleteError;
            
            // 如果有数据，插入到云端
            if (this.orders.length > 0) {
                const { error: insertError } = await this.supabase
                    .from('orders')
                    .insert(this.orders);
                    
                if (insertError) throw insertError;
            }
            
            this.lastSyncTime = new Date().toISOString();
            this.updateSyncStatus();
            
            this.updateConnectionStatus('connected');
            return true;
            
        } catch (error) {
            this.updateConnectionStatus('disconnected');
            throw error;
        }
    }
    
    saveToLocal() {
        const data = {
            orders: this.orders,
            lastSyncTime: this.lastSyncTime
        };
        
        localStorage.setItem(this.config.localKey, JSON.stringify(data));
    }
    
    // ==================== 弹窗管理 ====================
    
    openModal() {
        this.assignModal.style.display = 'block';
        this.orderForm.reset();
        document.getElementById('orderName').focus();
    }
    
    closeModal() {
        this.assignModal.style.display = 'none';
    }
    
    openPasswordModal() {
        this.passwordModal.style.display = 'block';
        this.adminPasswordInput.value = '';
        this.adminPasswordInput.focus();
    }
    
    closePasswordModal() {
        this.passwordModal.style.display = 'none';
    }
    
    openConfirmModal(message) {
        this.confirmMessage.textContent = message;
        this.confirmModal.style.display = 'block';
    }
    
    closeConfirmModal() {
        this.confirmModal.style.display = 'none';
    }
    
    // ==================== 密码验证 ====================
    
    verifyPassword() {
        const password = this.adminPasswordInput.value.trim();
        
        if (password === this.config.password) {
            this.closePasswordModal();
            this.showProcessSection();
            this.showNotification('密码验证成功', 'success');
        } else {
            this.showNotification('密码错误，请重试', 'error');
            this.adminPasswordInput.value = '';
            this.adminPasswordInput.focus();
        }
    }
    
    togglePasswordVisibility(inputElement, toggleButton) {
        const type = inputElement.type === 'password' ? 'text' : 'password';
        inputElement.type = type;
        toggleButton.innerHTML = type === 'password' 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    }
    
    // ==================== 订单管理 ====================
    
    async submitOrder(event) {
        event.preventDefault();
        
        // 验证密码
        const password = this.passwordInput.value.trim();
        if (password !== this.config.password) {
            this.showNotification('提交密码错误，请重试', 'error');
            this.passwordInput.focus();
            this.passwordInput.select();
            return;
        }
        
        // 创建订单对象
        const order = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: document.getElementById('orderName').value.trim(),
            assigner: document.getElementById('assigner').value.trim(),
            price: parseFloat(document.getElementById('price').value) || 0,
            remarks: document.getElementById('remarks').value.trim(),
            priority: document.getElementById('priority').value,
            status: document.getElementById('status').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // 验证必填字段
        if (!order.name || !order.assigner) {
            this.showNotification('请填写单名和派单人', 'warning');
            return;
        }
        
        if (order.price <= 0) {
            this.showNotification('请输入有效的价格', 'warning');
            return;
        }
        
        // 添加到本地数组
        this.orders.unshift(order);
        
        // 保存到本地
        this.saveToLocal();
        
        // 尝试同步到云端
        if (this.isOnline) {
            try {
                await this.saveToCloud();
                this.showNotification('订单已保存到云端', 'success');
            } catch (error) {
                this.showNotification('订单保存到本地，云端同步失败', 'warning');
            }
        } else {
            this.showNotification('订单保存到本地（离线模式）', 'info');
        }
        
        // 更新UI
        this.filterOrders();
        this.updateUI();
        this.closeModal();
    }
    
    // ==================== 订单显示 ====================
    
    showProcessSection() {
        this.openPasswordModal();
    }
    
    filterOrders() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const statusFilterValue = this.statusFilter.value;
        const priorityFilterValue = this.priorityFilter.value;
        
        this.filteredOrders = this.orders.filter(order => {
            const matchesSearch = order.name.toLowerCase().includes(searchTerm) ||
                                 order.assigner.toLowerCase().includes(searchTerm) ||
                                 (order.remarks && order.remarks.toLowerCase().includes(searchTerm)) ||
                                 order.price.toString().includes(searchTerm);
            
            const matchesStatus = statusFilterValue === 'all' || order.status === statusFilterValue;
            const matchesPriority = priorityFilterValue === 'all' || order.priority === priorityFilterValue;
            
            return matchesSearch && matchesStatus && matchesPriority;
        });
        
        this.renderOrders();
    }
    
    renderOrders() {
        if (this.filteredOrders.length === 0) {
            this.ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-clipboard"></i>
                    </div>
                    <h3>暂无订单</h3>
                    <p>${this.searchInput.value || this.statusFilter.value !== 'all' || this.priorityFilter.value !== 'all' ? 
                        '没有找到符合条件的订单' : 
                        '点击"派单"按钮创建您的第一个订单'}</p>
                </div>
            `;
            return;
        }
        
        // 排序
        const sortedOrders = [...this.filteredOrders].sort((a, b) => {
            return this.sortAscending 
                ? new Date(b.created_at) - new Date(a.created_at)
                : new Date(a.created_at) - new Date(b.created_at);
        });
        
        this.ordersList.innerHTML = sortedOrders.map(order => `
            <div class="order-card ${order.status} ${order.priority === 'urgent' ? 'urgent' : ''}" 
                 onclick="orderSystem.toggleOrderStatus(${order.id})">
                <div class="order-header">
                    <div>
                        <div class="order-title">${order.name}</div>
                        <div class="order-id">#${order.id}</div>
                    </div>
                    <span class="order-priority priority-${order.priority}">
                        ${this.getPriorityText(order.priority)}
                    </span>
                </div>
                
                <div class="order-details">
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-user"></i> 派单人</span>
                        <span class="detail-value">${order.assigner}</span>
                    </div>
                    
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-tag"></i> 价格</span>
                        <span class="detail-value order-price">¥${order.price.toFixed(2)}</span>
                    </div>
                    
                    ${order.remarks ? `
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-comment"></i> 备注</span>
                        <span class="detail-value">${order.remarks}</span>
                    </div>
                    ` : ''}
                    
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-clock"></i> 创建时间</span>
                        <span class="detail-value">${this.formatDate(order.created_at)}</span>
                    </div>
                </div>
                
                <div class="order-status status-${order.status}">
                    ${this.getStatusText(order.status)}
                </div>
            </div>
        `).join('');
    }
    
    // ==================== 订单操作 ====================
    
    async toggleOrderStatus(id) {
        const orderIndex = this.orders.findIndex(order => order.id === id);
        if (orderIndex === -1) return;
        
        const order = this.orders[orderIndex];
        const statuses = ['pending', 'processing', 'completed'];
        const currentIndex = statuses.indexOf(order.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        
        this.orders[orderIndex].status = statuses[nextIndex];
        this.orders[orderIndex].updated_at = new Date().toISOString();
        
        // 保存到本地
        this.saveToLocal();
        
        // 同步到云端
        if (this.isOnline) {
            try {
                await this.saveToCloud();
            } catch (error) {
                console.error('状态更新同步失败:', error);
            }
        }
        
        // 更新UI
        this.filterOrders();
        this.updateUI();
        
        this.showNotification(`订单 "${order.name}" 状态已更新为 ${this.getStatusText(statuses[nextIndex])}`, 'success');
    }
    
    // ==================== 数据操作 ====================
    
    async syncWithCloud() {
        if (!this.isOnline) {
            this.showNotification('无法连接到云端，请检查网络', 'error');
            return;
        }
        
        try {
            this.showNotification('正在同步到云端...', 'info');
            await this.saveToCloud();
            this.showNotification('云端同步完成', 'success');
        } catch (error) {
            console.error('同步失败:', error);
            this.showNotification('同步失败: ' + error.message, 'error');
        }
    }
    
    async refreshData() {
        if (!this.isOnline) {
            this.showNotification('无法连接到云端', 'warning');
            return;
        }
        
        try {
            this.showNotification('正在刷新数据...', 'info');
            await this.loadFromCloud();
            this.filterOrders();
            this.updateUI();
            this.showNotification('数据刷新成功', 'success');
        } catch (error) {
            console.error('刷新失败:', error);
            this.showNotification('刷新失败: ' + error.message, 'error');
        }
    }
    
    exportData() {
        const data = {
            orders: this.orders,
            exportDate: new Date().toISOString(),
            totalOrders: this.orders.length,
            totalRevenue: this.orders.reduce((sum, order) => sum + order.price, 0),
            pendingOrders: this.orders.filter(o => o.status === 'pending').length,
            completedOrders: this.orders.filter(o => o.status === 'completed').length
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('数据导出成功', 'success');
    }
    
    confirmClearData() {
        if (this.orders.length === 0) {
            this.showNotification('当前没有数据可清除', 'info');
            return;
        }
        
        this.openConfirmModal('您确定要清空所有订单数据吗？此操作将从云端和本地永久删除所有订单，不可恢复！');
        this.currentAction = 'clearData';
    }
    
    async executeConfirmedAction() {
        switch(this.currentAction) {
            case 'clearData':
                await this.clearAllData();
                break;
        }
        
        this.closeConfirmModal();
    }
    
    async clearAllData() {
        try {
            // 清空本地数据
            this.orders = [];
            this.saveToLocal();
            
            // 清空云端数据
            if (this.isOnline && this.supabase) {
                const { error } = await this.supabase
                    .from('orders')
                    .delete()
                    .gte('id', 0);
                    
                if (error) throw error;
            }
            
            this.filterOrders();
            this.updateUI();
            
            this.showNotification('所有数据已清空', 'success');
            
        } catch (error) {
            console.error('清空数据失败:', error);
            this.showNotification('清空数据失败: ' + error.message, 'error');
        }
    }
    
    // ==================== 自动同步 ====================
    
    startAutoSync() {
        this.syncTimer = setInterval(() => {
            if (this.isOnline && this.orders.length > 0) {
                this.syncWithCloud().catch(console.error);
            }
        }, this.config.syncInterval);
    }
    
    // ==================== UI更新 ====================
    
    updateUI() {
        // 更新统计数据
        const totalOrders = this.orders.length;
        const pendingOrders = this.orders.filter(o => o.status === 'pending').length;
        const completedOrders = this.orders.filter(o => o.status === 'completed').length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + order.price, 0);
        
        this.totalOrdersEl.textContent = totalOrders;
        this.pendingOrdersEl.textContent = pendingOrders;
        this.completedOrdersEl.textContent = completedOrders;
        this.totalRevenueEl.textContent = `¥${totalRevenue.toFixed(2)}`;
        this.storageUsedEl.textContent = totalOrders;
        
        // 显示打单区域（如果已验证）
        if (this.processSection.classList.contains('hidden')) {
            this.processSection.classList.remove('hidden');
        }
        
        // 更新同步状态
        this.updateSyncStatus();
    }
    
    updateSyncStatus() {
        if (this.lastSyncTime) {
            const syncDate = new Date(this.lastSyncTime);
            const now = new Date();
            const diffMs = now - syncDate;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) {
                this.lastSyncEl.textContent = '刚刚';
            } else if (diffMins < 60) {
                this.lastSyncEl.textContent = `${diffMins}分钟前`;
            } else if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60);
                this.lastSyncEl.textContent = `${hours}小时前`;
            } else {
                this.lastSyncEl.textContent = syncDate.toLocaleDateString('zh-CN');
            }
        } else {
            this.lastSyncEl.textContent = '从未同步';
        }
    }
    
    // ==================== 辅助方法 ====================
    
    toggleSort() {
        this.sortAscending = !this.sortAscending;
        this.sortBtn.innerHTML = this.sortAscending 
            ? '<i class="fas fa-sort-amount-down"></i>'
            : '<i class="fas fa-sort-amount-up"></i>';
        this.filterOrders();
    }
    
    getPriorityText(priority) {
        const texts = {
            'low': '低优先级',
            'medium': '中优先级',
            'high': '高优先级',
            'urgent': '紧急'
        };
        return texts[priority] || priority;
    }
    
    getStatusText(status) {
        const texts = {
            'pending': '待处理',
            'processing': '处理中',
            'completed': '已完成'
        };
        return texts[status] || status;
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '日期无效';
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        
        // 移除旧的通知（最多保留3个）
        const oldNotifications = container.querySelectorAll('.notification');
        if (oldNotifications.length >= 3) {
            oldNotifications[0].remove();
        }
        
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        const titles = {
            'success': '成功',
            'error': '错误',
            'warning': '警告',
            'info': '信息'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${titles[type] || '通知'}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        container.appendChild(notification);
        
        // 5秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => notification.remove(), 500);
            }
        }, 5000);
    }
}

// 全局实例
let orderSystem;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        orderSystem = new CloudOrderSystem();
        // 暴露给全局以便HTML调用
        window.orderSystem = orderSystem;
    } catch (error) {
        console.error('系统初始化失败:', error);
        alert('系统初始化失败，请检查控制台错误信息');
    }
});