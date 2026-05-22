const NotificationSystem = {
    container: null,
    
    init() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(title, message, type = 'error', duration = 5000) {
        if (!this.container) this.init();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                ${icons[type] || icons.error}
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="notification-progress"></div>
        `;
        
        this.container.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('hiding');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        });
    },
    
    success(title, message) { this.show(title, message, 'success'); },
    error(title, message)   { this.show(title, message, 'error');   },
    warning(title, message) { this.show(title, message, 'warning'); },
    info(title, message)    { this.show(title, message, 'info');    }
};

function showNotification(message, type = 'error') {
    const titles = {
        error: 'Erro',
        success: 'Sucesso',
        warning: 'Atenção',
        info: 'Informação'
    };
    NotificationSystem.show(titles[type] || 'Erro', message, type);
}

const CONFIG = {
    API_BASE: window.location.hostname === 'localhost' ? '/api' : 'https://edusp.crimsonzerohub.xyz',
    preparasp_PROXY: window.location.hostname === 'localhost' ? '/api' : 'https://praxis.crimsonzerohub.xyz',
    CAPTCHA_ENDPOINT: 'https://clever.crimsonzerohub.xyz/captcha',
    UA: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    BOOKMARKLET_CODE: `javascript:(async()=>{if("pt.preparaspacademy.org"!==window.location.hostname)return;let e=await fetch("https://pt.preparaspacademy.org/api/internal/graphql/createTransferAuthTokenMutation?lang=pt&app=preparaspacademy",{headers:{"content-type":"application/json","x-ka-fkey":"1"},referrer:"https://pt.preparaspacademy.org/settings/account",body:JSON.stringify({operationName:"createTransferAuthTokenMutation",query:"mutation createTransferAuthTokenMutation($canvasProfileKeyName: String) {\\n  createTransferAuthToken(canvasProfileKeyName: $canvasProfileKeyName) {\\n    token\\n    __typename\\n  }\\n}",variables:{}}),method:"POST",mode:"cors",credentials:"include"}),a=(await e.json()).data.createTransferAuthToken.token;open("https://preparasp.crimsonzerohub.xyz/redirect?token="+a)})();`,
    TOKEN_VALIDITY_MS: 22 * 60 * 60 * 1000,
    STORAGE_KEYS: {
        LOGIN_ACCOUNT: 'preparasp_login_account',
        BOOKMARKLET_SESSION: 'preparasp_book_session',
        CURRENT_METHOD: 'preparasp_auth_method',
        SESSION: 'preparasp_session'        
    }
};




const Storage = {



    saveToLoginsList(ra, password) {
        let logins = this.getAllLogins();
        const idx = logins.findIndex(l => l.ra === ra);
        if (idx !== -1) logins[idx].password = password;
        else logins.push({ ra, password });
        localStorage.setItem('seduc_logins', JSON.stringify(logins));
    },

    getAllLogins() {
        const data = localStorage.getItem('seduc_logins');
        return data ? JSON.parse(data) : [];
    },

    removeLoginFromList(ra) {
        let logins = this.getAllLogins().filter(l => l.ra !== ra);
        localStorage.setItem('seduc_logins', JSON.stringify(logins));
    },


    saveSession(ra, password, preparaspToken, sessionData) {
        const account = {
            ra,
            password,
            preparasp_token: preparaspToken,
            token_created_at: Date.now(),
            bearer_token: sessionData.bearer_token,
            session_token: sessionData.session_token,
            analytics_session_id: sessionData.analytics_session_id,
            user: sessionData.user
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.LOGIN_ACCOUNT, JSON.stringify(account));
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD, 'login');


        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({
            bearer_token: sessionData.bearer_token,
            session_token: sessionData.session_token,
            analytics_session_id: sessionData.analytics_session_id,
            user: sessionData.user
        }));

        this.saveToLoginsList(ra, password);
    },

    getLoginAccount() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGIN_ACCOUNT);
        return data ? JSON.parse(data) : null;
    },

    
    getSession() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
        return data ? JSON.parse(data) : null;
    },

    
    updateSession(sessionData) {
        const account = this.getLoginAccount();
        if (account) {
            account.bearer_token = sessionData.bearer_token;
            account.session_token = sessionData.session_token;
            account.analytics_session_id = sessionData.analytics_session_id;
            account.user = sessionData.user;
            account.token_created_at = Date.now();
            localStorage.setItem(CONFIG.STORAGE_KEYS.LOGIN_ACCOUNT, JSON.stringify(account));
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({
            bearer_token: sessionData.bearer_token,
            session_token: sessionData.session_token,
            analytics_session_id: sessionData.analytics_session_id,
            user: sessionData.user
        }));
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD, 'login');
    },



    saveBookmarkletSession(sessionData) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.BOOKMARKLET_SESSION, JSON.stringify(sessionData));
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD, 'bookmarklet');
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({
            bearer_token: sessionData.bearer_token,
            session_token: sessionData.session_token,
            analytics_session_id: sessionData.analytics_session_id,
            user: sessionData.user
        }));
    },

    getBookmarkletSession() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.BOOKMARKLET_SESSION);
        return data ? JSON.parse(data) : null;
    },



    isLoginTokenValid() {
        const account = this.getLoginAccount();
        if (!account || !account.token_created_at) return false;
        return (Date.now() - account.token_created_at) < CONFIG.TOKEN_VALIDITY_MS;
    },

    clearAll() {
        [
            CONFIG.STORAGE_KEYS.LOGIN_ACCOUNT,
            CONFIG.STORAGE_KEYS.BOOKMARKLET_SESSION,
            CONFIG.STORAGE_KEYS.CURRENT_METHOD,
            CONFIG.STORAGE_KEYS.SESSION,
            'seduc_logins'
        ].forEach(k => localStorage.removeItem(k));
    },

    clearLogin() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LOGIN_ACCOUNT);
        if (localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD) === 'login') {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
        }
    },

    clearBookmarklet() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.BOOKMARKLET_SESSION);
        if (localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD) === 'bookmarklet') {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_METHOD);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
        }
    }
};





async function fullLoginProcess(ra, password) {
    const loginResp = await fetch(`${CONFIG.API_BASE}/registration/edusp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': CONFIG.UA },
        body: JSON.stringify({ realm: "edusp", platform: "webclient", id: ra, password })
    });

    if (!loginResp.ok) throw new Error("Credenciais incorretas. Verifique seu RA e senha.");
    const { auth_token } = await loginResp.json();

    const genResp = await fetch(`${CONFIG.API_BASE}/mas/external-auth/seducsp_token/generate?card_label=Prepara%20SP`, {
        headers: { "x-api-key": auth_token, "user-agent": CONFIG.UA }
    });

    if (!genResp.ok) throw new Error("Erro ao gerar token de acesso.");
    const { token } = await genResp.json();

    return token;
}

async function redeempreparaspToken(tokenLabel, authHeaderToken) {
    const resp = await fetch(`${CONFIG.preparasp_PROXY}/token`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-captcha-auth": authHeaderToken
        },
        body: JSON.stringify({ token_preparasp: tokenLabel })
    });

    if (resp.status === 403) throw new Error("Erro de Captcha. Recarregue a página.");
    if (!resp.ok)            throw new Error("Erro ao resgatar token da preparasp Academy.");

    const data = await resp.json();

    if (!data.success || !data.bearer_token) {
        throw new Error("Resposta inválida do servidor. Tente novamente.");
    }

    return data; 
}





document.addEventListener('DOMContentLoaded', async () => {

    // ── Token da URL ou sessionStorage ───────────────────────────
    const urlParams   = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        // Token novo — apagar TUDO para garantir conta limpa
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem('preparasp_label_token', tokenFromUrl);
        history.replaceState(null, '', window.location.pathname);
    }

    const labelToken = tokenFromUrl || sessionStorage.getItem('preparasp_label_token');

    if (!labelToken) {
        window.location.href = 'https://crimsonzerohub.xyz';
        return;
    }

    // ── Verificar se já tem sessão válida salva ───────────────────
    const existingSession = Storage.getSession();
    if (existingSession && existingSession.bearer_token) {
        showNotification('Sessão restaurada! Redirecionando...', 'success');
        setTimeout(() => { window.location.href = '/cronograma'; }, 600);
        return;
    }

    // ── Resgatar token e redirecionar ────────────────────────────
    try {
        showNotification('Acessando Prepara SP...', 'info');

        const sessionData = await redeempreparaspToken(labelToken, 'no-captcha');

        Storage.saveBookmarkletSession(sessionData);

        showNotification('Sucesso! Redirecionando...', 'success');
        setTimeout(() => { window.location.href = '/cronograma'; }, 600);

    } catch (err) {
        showNotification(err.message, 'error');
        console.error(err);
    }
    // ─────────────────────────────────────────────────────────────
});


const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
        50%       { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
    }
`;
document.head.appendChild(style);