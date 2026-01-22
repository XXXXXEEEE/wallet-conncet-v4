// 全局变量
let provider = null;
let userAddress = null;
let currentChainId = null;

// 默认的 EIP-712 TypedData V4 示例
const defaultTypedDataV4 = {
    types: {
        EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
        ],
        Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" }
        ],
        Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" }
        ]
    },
    primaryType: "Mail",
    domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 1,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
    },
    message: {
        from: {
            name: "Alice",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
        },
        to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
        },
        contents: "Hello, Bob!"
    }
};

// 默认的 TypedData V3 示例（与 V4 相同，但用于 V3 方法）
const defaultTypedDataV3 = {
    types: {
        EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
        ],
        Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" }
        ],
        Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" }
        ]
    },
    primaryType: "Mail",
    domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 1,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
    },
    message: {
        from: {
            name: "Charlie",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
        },
        to: {
            name: "Dave",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
        },
        contents: "Hello from V3!"
    }
};

// 默认的 TypedData Legacy (V1) 示例
const defaultTypedDataLegacy = [
    {
        type: "string",
        name: "Message",
        value: "Hi, Alice!"
    },
    {
        type: "uint32",
        name: "A number",
        value: "1337"
    }
];

// 网络名称映射
const networkNames = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Mumbai Testnet",
    56: "BSC Mainnet",
    97: "BSC Testnet",
    42161: "Arbitrum One",
    10: "Optimism",
    43114: "Avalanche C-Chain",
    66: "OKX Chain Mainnet",
    65: "OKX Chain Testnet"
};

// 初始化页面
function init() {
    // 设置默认数据
    document.getElementById('typedDataV4Input').value = JSON.stringify(defaultTypedDataV4, null, 2);
    document.getElementById('typedDataV3Input').value = JSON.stringify(defaultTypedDataV3, null, 2);
    document.getElementById('typedDataLegacyInput').value = JSON.stringify(defaultTypedDataLegacy, null, 2);

    // 更新预览
    updatePreview('typedDataV4Input', 'typedDataV4Preview');
    updatePreview('typedDataV3Input', 'typedDataV3Preview');
    updatePreview('typedDataLegacyInput', 'typedDataLegacyPreview');

    // 监听输入变化
    document.getElementById('typedDataV4Input').addEventListener('input', () => updatePreview('typedDataV4Input', 'typedDataV4Preview'));
    document.getElementById('typedDataV3Input').addEventListener('input', () => updatePreview('typedDataV3Input', 'typedDataV3Preview'));
    document.getElementById('typedDataLegacyInput').addEventListener('input', () => updatePreview('typedDataLegacyInput', 'typedDataLegacyPreview'));

    // 检查是否已安装 OKX 钱包
    checkOKXWallet();
}

// 检查 OKX 钱包
function checkOKXWallet() {
    if (typeof window.okxwallet !== 'undefined') {
        console.log('OKX Wallet 已检测到');
        provider = window.okxwallet;

        // 监听账户变化
        provider.on('accountsChanged', handleAccountsChanged);
        provider.on('chainChanged', handleChainChanged);

        // 检查是否已连接
        provider.request({ method: 'eth_accounts' }).then(accounts => {
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            }
        });
    } else {
        console.log('未检测到 OKX Wallet');
    }
}

// 连接钱包
async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    
    if (!window.okxwallet) {
        alert('请先安装 OKX Wallet 扩展程序！\n\n访问: https://www.okx.com/web3');
        window.open('https://www.okx.com/web3', '_blank');
        return;
    }

    try {
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<span class="loading"><span class="spinner"></span><span>连接中...</span></span>';

        provider = window.okxwallet;

        // 请求连接
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });

        handleAccountsChanged(accounts);

    } catch (error) {
        console.error('连接失败:', error);
        alert('连接钱包失败: ' + (error.message || error));
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<span>🦊</span><span>连接 OKX 钱包</span>';
    }
}

// 处理账户变化
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // 断开连接
        userAddress = null;
        currentChainId = null;
        updateUI(false);
        return;
    }

    userAddress = accounts[0];

    // 获取链 ID
    try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        currentChainId = parseInt(chainId, 16);
    } catch (e) {
        currentChainId = 1;
    }

    // 更新 TypedData 中的 chainId
    updateTypedDataChainId();

    updateUI(true);
}

// 处理链变化
function handleChainChanged(chainId) {
    currentChainId = parseInt(chainId, 16);
    document.getElementById('chainId').textContent = currentChainId;
    document.getElementById('networkName').textContent = networkNames[currentChainId] || 'Unknown Network';
    
    // 更新 TypedData 中的 chainId
    updateTypedDataChainId();
}

// 更新 TypedData 中的 chainId
function updateTypedDataChainId() {
    ['typedDataV4Input', 'typedDataV3Input'].forEach(inputId => {
        try {
            const input = document.getElementById(inputId);
            const typedData = JSON.parse(input.value);
            if (typedData.domain && currentChainId) {
                typedData.domain.chainId = currentChainId;
                input.value = JSON.stringify(typedData, null, 2);
                const previewId = inputId.replace('Input', 'Preview');
                updatePreview(inputId, previewId);
            }
        } catch (e) {
            // 忽略解析错误
        }
    });
}

// 更新 UI
function updateUI(connected) {
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const connectSection = document.getElementById('connectSection');
    const walletInfo = document.getElementById('walletInfo');

    // 所有签名按钮
    const signButtons = [
        'personalSignBtn',
        'signV4Btn',
        'signV3Btn',
        'signLegacyBtn'
    ];

    if (connected) {
        statusBadge.className = 'status-badge connected';
        statusText.textContent = '已连接';
        connectSection.classList.add('hidden');
        walletInfo.classList.remove('hidden');

        // 启用所有签名按钮
        signButtons.forEach(id => {
            document.getElementById(id).disabled = false;
        });

        // 更新钱包信息
        document.getElementById('walletAddress').textContent = 
            userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        document.getElementById('chainId').textContent = currentChainId;
        document.getElementById('networkName').textContent = 
            networkNames[currentChainId] || 'Unknown Network';

    } else {
        statusBadge.className = 'status-badge disconnected';
        statusText.textContent = '未连接';
        connectSection.classList.remove('hidden');
        walletInfo.classList.add('hidden');

        // 禁用所有签名按钮
        signButtons.forEach(id => {
            document.getElementById(id).disabled = true;
        });

        const connectBtn = document.getElementById('connectBtn');
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<span>🦊</span><span>连接 OKX 钱包</span>';
    }
}

// 更新预览
function updatePreview(inputId, previewId) {
    const input = document.getElementById(inputId).value;
    const preview = document.getElementById(previewId);

    try {
        const parsed = JSON.parse(input);
        const formatted = JSON.stringify(parsed, null, 2);
        
        // 语法高亮
        const highlighted = formatted
            .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
            .replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>')
            .replace(/: (\d+)/g, ': <span class="number">$1</span>');
        
        preview.innerHTML = highlighted;
    } catch (e) {
        preview.innerHTML = '<span style="color: var(--error);">JSON 解析错误: ' + e.message + '</span>';
    }
}

// Personal Sign
async function personalSign() {
    if (!userAddress || !provider) {
        alert('请先连接钱包！');
        return;
    }

    const btn = document.getElementById('personalSignBtn');
    const resultBox = document.getElementById('personalSignResult');
    const resultValue = document.getElementById('personalSignResultValue');

    try {
        const message = document.getElementById('personalSignMessage').value;

        btn.disabled = true;
        btn.innerHTML = '<span class="loading"><span class="spinner"></span><span>等待签名...</span></span>';

        // 将消息转换为 hex
        const msgHex = '0x' + Array.from(new TextEncoder().encode(message))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const signature = await provider.request({
            method: 'personal_sign',
            params: [msgHex, userAddress, {
                silentSignPass: true
            }]
        });

        resultBox.classList.remove('hidden', 'error');
        resultBox.classList.add('success');
        resultValue.className = 'result-value success';
        resultValue.textContent = signature;

        console.log('Personal Sign 成功:', signature);

    } catch (error) {
        console.error('Personal Sign 失败:', error);
        
        resultBox.classList.remove('hidden', 'success');
        resultBox.classList.add('error');
        resultValue.className = 'result-value error';
        resultValue.textContent = '签名失败: ' + (error.message || error);

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔐</span><span>执行 Personal Sign</span>';
    }
}

// SignTypedData V4
async function signTypedDataV4() {
    if (!userAddress || !provider) {
        alert('请先连接钱包！');
        return;
    }

    const btn = document.getElementById('signV4Btn');
    const resultBox = document.getElementById('signV4Result');
    const resultValue = document.getElementById('signV4ResultValue');

    try {
        const typedDataInput = document.getElementById('typedDataV4Input').value;
        const typedData = JSON.parse(typedDataInput);

        btn.disabled = true;
        btn.innerHTML = '<span class="loading"><span class="spinner"></span><span>等待签名...</span></span>';

        const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [userAddress, JSON.stringify(typedData), {
                silentSignPass: true
            }]
        });

        resultBox.classList.remove('hidden', 'error');
        resultBox.classList.add('success');
        resultValue.className = 'result-value success';
        resultValue.textContent = signature;

        console.log('SignTypedData V4 成功:', signature);

    } catch (error) {
        console.error('SignTypedData V4 失败:', error);
        
        resultBox.classList.remove('hidden', 'success');
        resultBox.classList.add('error');
        resultValue.className = 'result-value error';
        resultValue.textContent = '签名失败: ' + (error.message || error);

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔐</span><span>执行 SignTypedData V4</span>';
    }
}

// SignTypedData V3
async function signTypedDataV3() {
    if (!userAddress || !provider) {
        alert('请先连接钱包！');
        return;
    }

    const btn = document.getElementById('signV3Btn');
    const resultBox = document.getElementById('signV3Result');
    const resultValue = document.getElementById('signV3ResultValue');

    try {
        const typedDataInput = document.getElementById('typedDataV3Input').value;
        const typedData = JSON.parse(typedDataInput);

        btn.disabled = true;
        btn.innerHTML = '<span class="loading"><span class="spinner"></span><span>等待签名...</span></span>';

        const signature = await provider.request({
            method: 'eth_signTypedData_v3',
            params: [userAddress, JSON.stringify(typedData), {
                silentSignPass: true
            }]
        });

        resultBox.classList.remove('hidden', 'error');
        resultBox.classList.add('success');
        resultValue.className = 'result-value success';
        resultValue.textContent = signature;

        console.log('SignTypedData V3 成功:', signature);

    } catch (error) {
        console.error('SignTypedData V3 失败:', error);
        
        resultBox.classList.remove('hidden', 'success');
        resultBox.classList.add('error');
        resultValue.className = 'result-value error';
        resultValue.textContent = '签名失败: ' + (error.message || error);

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔐</span><span>执行 SignTypedData V3</span>';
    }
}

// SignTypedData Legacy (V1)
async function signTypedDataLegacy() {
    if (!userAddress || !provider) {
        alert('请先连接钱包！');
        return;
    }

    const btn = document.getElementById('signLegacyBtn');
    const resultBox = document.getElementById('signLegacyResult');
    const resultValue = document.getElementById('signLegacyResultValue');

    try {
        const typedDataInput = document.getElementById('typedDataLegacyInput').value;
        const typedData = JSON.parse(typedDataInput);

        btn.disabled = true;
        btn.innerHTML = '<span class="loading"><span class="spinner"></span><span>等待签名...</span></span>';

        const signature = await provider.request({
            method: 'eth_signTypedData',
            params: [typedData, userAddress, {
                silentSignPass: true
            }]
        });

        resultBox.classList.remove('hidden', 'error');
        resultBox.classList.add('success');
        resultValue.className = 'result-value success';
        resultValue.textContent = signature;

        console.log('SignTypedData Legacy 成功:', signature);

    } catch (error) {
        console.error('SignTypedData Legacy 失败:', error);
        
        resultBox.classList.remove('hidden', 'success');
        resultBox.classList.add('error');
        resultValue.className = 'result-value error';
        resultValue.textContent = '签名失败: ' + (error.message || error);

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔐</span><span>执行 SignTypedData</span>';
    }
}

// 复制结果
function copyResult(elementId) {
    const resultValue = document.getElementById(elementId).textContent;
    
    if (resultValue && !resultValue.startsWith('签名失败')) {
        navigator.clipboard.writeText(resultValue).then(() => {
            const copyBtn = event.target.closest('.copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span>✅</span><span>已复制!</span>';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    }
}

// 页面加载完成后初始化
window.addEventListener('load', init);
