document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const assignBtn = document.getElementById('assignBtn');
    const processBtn = document.getElementById('processBtn');
    const clearBtn = document.getElementById('clearBtn');
    const assignModal = document.getElementById('assignModal');
    const closeBtn = assignModal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const orderForm = document.getElementById('orderForm');
    const processSection = document.getElementById('processSection');
    const ordersList = document.getElementById('ordersList');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortBtn = document.getElementById('sortBtn');
    
    // 统计元素
    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingOrdersEl = document.getElementById('pendingOrders');
    const completedOrdersEl = document.getElementById('completedOrders');
    
    // 存储订单的数组
    let orders = JSON.parse(localStorage.getItem('orders')) || [];
    let sortAscending = true;
    
    // 初始化
    updateStats();
    
    // 事件监听器
    assignBtn.addEventListener('click', openModal);
    processBtn.addEventListener('click', showProcessSection);
    clearBtn.addEventListener('click', clearAllOrders);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    orderForm.addEventListener('submit', submitOrder);
    searchInput.addEventListener('input', filterOrders);
    statusFilter.addEventListener('change', filterOrders);
    sortBtn.addEventListener('click', toggleSort);
    
    // 点击弹窗外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === assignModal) {
            closeModal();
        }
    });
    
    // 打开弹窗
    function openModal() {
        assignModal.style.display = 'block';
        document.getElementById('orderForm').reset();
        document.getElementById('status').value = 'pending';
        document.getElementById('priority').value = 'medium';
        document.getElementById('orderName').focus();
    }
    
    // 关闭弹窗
    function closeModal() {
        assignModal.style.display = 'none';
    }
    
    // 显示打单区域
    function showProcessSection() {
        processSection.classList.remove('hidden');
        renderOrders();
    }
    
    // 提交订单
    function submitOrder(event) {
        event.preventDefault();
        
        const order = {
            id: Date.now(),
            name: document.getElementById('orderName').value.trim(),
            assigner: document.getElementById('assigner').value.trim(),
            price: parseFloat(document.getElementById('price').value) || 0,
            remarks: document.getElementById('remarks').value.trim(),
            priority: document.getElementById('priority').value,
            status: document.getElementById('status').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 验证
        if (!order.name || !order.assigner) {
            alert('请填写单名和派单人');
            return;
        }
        
        orders.push(order);
        saveOrders();
        renderOrders();
        updateStats();
        closeModal();
        
        // 显示成功消息
        showNotification(`订单 "${order.name}" 创建成功！`);
    }
    
    // 保存订单到localStorage
    function saveOrders() {
        localStorage.setItem('orders', JSON.stringify(orders));
    }
    
    // 渲染订单列表
    function renderOrders(filteredOrders = orders) {
        if (filteredOrders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>暂无订单</h3>
                    <p>${searchInput.value || statusFilter.value !== 'all' ? '没有找到符合条件的订单' : '点击"派单"按钮创建您的第一个订单'}</p>
                </div>
            `;
            return;
        }
        
        // 排序
        const sortedOrders = [...filteredOrders].sort((a, b) => {
            return sortAscending 
                ? new Date(b.createdAt) - new Date(a.createdAt)
                : new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        ordersList.innerHTML = sortedOrders.map(order => `
            <div class="order-card ${order.status} ${order.priority === 'urgent' ? 'urgent' : ''}" 
                 data-id="${order.id}" onclick="toggleOrderStatus(${order.id})">
                <div class="order-header">
                    <div>
                        <div class="order-title">${order.name}</div>
                        <div class="order-detail">
                            <span class="detail-label"><i class="fas fa-user"></i> 派单人</span>
                            <span class="detail-value">${order.assigner}</span>
                        </div>
                    </div>
                    <span class="order-priority priority-${order.priority}">
                        ${getPriorityText(order.priority)}
                    </span>
                </div>
                
                <div class="order-details">
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-tag"></i> 价格</span>
                        <span class="detail-value order-price">¥${order.price.toFixed(2)}</span>
                    </div>
                    
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-comment"></i> 备注</span>
                        <span class="detail-value">${order.remarks || '无'}</span>
                    </div>
                    
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-clock"></i> 创建时间</span>
                        <span class="detail-value">${formatDate(order.createdAt)}</span>
                    </div>
                    
                    <div class="order-detail">
                        <span class="detail-label"><i class="fas fa-spinner"></i> 状态</span>
                        <span class="order-status status-${order.status}">
                            ${getStatusText(order.status)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 切换订单状态
    window.toggleOrderStatus = function(id) {
        const orderIndex = orders.findIndex(order => order.id === id);
        if (orderIndex === -1) return;
        
        const order = orders[orderIndex];
        const statuses = ['pending', 'processing', 'completed'];
        const currentIndex = statuses.indexOf(order.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        
        orders[orderIndex].status = statuses[nextIndex];
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        saveOrders();
        renderOrders();
        updateStats();
        
        showNotification(`订单 "${order.name}" 状态已更新为 ${getStatusText(statuses[nextIndex])}`);
    };
    
    // 过滤订单
    function filterOrders() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusFilterValue = statusFilter.value;
        
        const filtered = orders.filter(order => {
            const matchesSearch = order.name.toLowerCase().includes(searchTerm) ||
                                 order.assigner.toLowerCase().includes(searchTerm) ||
                                 order.remarks.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilterValue === 'all' || order.status === statusFilterValue;
            
            return matchesSearch && matchesStatus;
        });
        
        renderOrders(filtered);
    }
    
    // 切换排序
    function toggleSort() {
        sortAscending = !sortAscending;
        sortBtn.innerHTML = sortAscending 
            ? '<i class="fas fa-sort-amount-down"></i> 按时间排序'
            : '<i class="fas fa-sort-amount-up"></i> 按时间排序';
        renderOrders();
    }
    
    // 清空所有订单
    function clearAllOrders() {
        if (orders.length === 0) {
            showNotification('当前没有订单可清除');
            return;
        }
        
        if (confirm('确定要清空所有订单吗？此操作不可撤销！')) {
            orders = [];
            saveOrders();
            renderOrders();
            updateStats();
            showNotification('所有订单已清空');
        }
    }
    
    // 更新统计信息
    function updateStats() {
        totalOrdersEl.textContent = `总计: ${orders.length}`;
        const pendingCount = orders.filter(o => o.status === 'pending').length;
        const completedCount = orders.filter(o => o.status === 'completed').length;
        pendingOrdersEl.textContent = `待处理: ${pendingCount}`;
        completedOrdersEl.textContent = `已完成: ${completedCount}`;
    }
    
    // 辅助函数
    function getPriorityText(priority) {
        const texts = {
            'low': '低优先级',
            'medium': '中优先级',
            'high': '高优先级',
            'urgent': '紧急'
        };
        return texts[priority] || priority;
    }
    
    function getStatusText(status) {
        const texts = {
            'pending': '待处理',
            'processing': '处理中',
            'completed': '已完成'
        };
        return texts[status] || status;
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function showNotification(message) {
        // 移除现有的通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 创建新通知
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2ecc71;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 1001;
                animation: slideInRight 0.3s, fadeOut 0.3s 2.7s;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas fa-check-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});