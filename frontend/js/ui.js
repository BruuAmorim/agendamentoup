// UI Helpers para EvAgendamento
// Funções utilitárias para manipulação da interface

class UIHelpers {

    // Formatação de datas
    static formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            ...options
        });
    }

    // Formatação de hora
    static formatTime(timeString, options = {}) {
        // Se já estiver no formato HH:MM, retornar como está
        if (typeof timeString === 'string' && timeString.includes(':')) {
            return timeString;
        }

        // Se for um objeto Date, extrair hora
        if (timeString instanceof Date) {
            return timeString.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                ...options
            });
        }

        return timeString;
    }

    // Formatação de data e hora completa
    static formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Formatação de telefone brasileiro
    static formatPhone(phoneString) {
        if (!phoneString) return '';

        // Remover todos os caracteres não numéricos
        const cleaned = phoneString.replace(/\D/g, '');

        // Formatar de acordo com o tamanho
        if (cleaned.length === 11) {
            // Celular com DDD: (11) 99999-9999
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            // Fixo com DDD: (11) 9999-9999
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 9) {
            // Celular sem DDD: 99999-9999
            return cleaned.replace(/(\d{5})(\d{4})/, '$1-$2');
        } else if (cleaned.length === 8) {
            // Fixo sem DDD: 9999-9999
            return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
        }

        return phoneString; // Retornar original se não conseguir formatar
    }

    // Validação de e-mail
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validação de telefone brasileiro
    static isValidPhone(phone) {
        if (!phone) return true; // Telefone é opcional

        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 8 && cleaned.length <= 11;
    }

    // Formatação de duração em minutos para texto legível
    static formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}min`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (remainingMinutes === 0) {
            return `${hours}h`;
        }

        return `${hours}h ${remainingMinutes}min`;
    }

    // Cálculo de tempo restante até o agendamento
    static getTimeUntilAppointment(appointmentDate, appointmentTime) {
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        const now = new Date();

        const diffMs = appointmentDateTime - now;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMs < 0) {
            return { text: 'Expirado', status: 'expired' };
        }

        if (diffDays > 0) {
            return {
                text: `${diffDays} dia${diffDays > 1 ? 's' : ''}`,
                status: diffDays <= 1 ? 'urgent' : 'normal'
            };
        }

        if (diffHours > 0) {
            return {
                text: `${diffHours}h ${diffMinutes % 60}min`,
                status: diffHours <= 2 ? 'urgent' : 'normal'
            };
        }

        if (diffMinutes > 0) {
            return {
                text: `${diffMinutes}min`,
                status: diffMinutes <= 30 ? 'urgent' : 'normal'
            };
        }

        return { text: 'Agora', status: 'now' };
    }

    // Geração de avatar baseado no nome
    static generateAvatar(name, size = 40) {
        const initials = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');

        const colors = [
            '#9333ea', '#7c3aed', '#a855f7', '#c084fc',
            '#10b981', '#059669', '#34d399', '#6ee7b7',
            '#f59e0b', '#d97706', '#fbbf24', '#fcd34d',
            '#ef4444', '#dc2626', '#f87171', '#fca5a5'
        ];

        const colorIndex = name.length % colors.length;
        const backgroundColor = colors[colorIndex];

        return {
            initials,
            backgroundColor,
            textColor: '#ffffff',
            size
        };
    }

    // Criação de elemento de avatar
    static createAvatarElement(name, size = 40) {
        const avatarData = this.generateAvatar(name, size);
        const avatar = document.createElement('div');

        avatar.className = 'avatar';
        avatar.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${avatarData.backgroundColor}, ${this.adjustColor(avatarData.backgroundColor, -20)});
            color: ${avatarData.textColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: ${size * 0.4}px;
            text-transform: uppercase;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        avatar.textContent = avatarData.initials;
        return avatar;
    }

    // Ajuste de cor (para gradientes)
    static adjustColor(color, amount) {
        // Simplificação: apenas ajustar brilho
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;

        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;

        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
    }

    // Animação de fade in
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';

        const start = performance.now();

        const fade = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = elapsed / duration;

            if (progress < 1) {
                element.style.opacity = progress;
                requestAnimationFrame(fade);
            } else {
                element.style.opacity = '1';
            }
        };

        requestAnimationFrame(fade);
    }

    // Animação de fade out
    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity) || 1;

        const fade = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = elapsed / duration;

            if (progress < 1) {
                element.style.opacity = startOpacity * (1 - progress);
                requestAnimationFrame(fade);
            } else {
                element.style.opacity = '0';
                element.style.display = 'none';
            }
        };

        requestAnimationFrame(fade);
    }

    // Loading spinner
    static createSpinner(size = 20) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border: 2px solid var(--border-color);
            border-top: 2px solid var(--accent-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
        `;

        return spinner;
    }

    // Modal de confirmação customizada
    static async showConfirmDialog(message, title = 'Confirmação', options = {}) {
        const {
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            confirmClass = 'btn-primary',
            cancelClass = 'btn-secondary'
        } = options;

        return new Promise((resolve) => {
            // Criar overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 3000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Criar modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: var(--bg-card);
                backdrop-filter: blur(20px);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-2xl);
                max-width: 400px;
                width: 90%;
                box-shadow: var(--shadow);
            `;

            modal.innerHTML = `
                <h3 style="margin-bottom: var(--spacing-lg); color: var(--text-primary);">${title}</h3>
                <p style="margin-bottom: var(--spacing-xl); color: var(--text-secondary); line-height: 1.6;">${message}</p>
                <div style="display: flex; gap: var(--spacing-md); justify-content: flex-end;">
                    <button class="${cancelClass}" id="confirm-cancel">${cancelText}</button>
                    <button class="${confirmClass}" id="confirm-ok">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Eventos
            const handleCancel = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };

            const handleConfirm = () => {
                document.body.removeChild(overlay);
                resolve(true);
            };

            document.getElementById('confirm-cancel').addEventListener('click', handleCancel);
            document.getElementById('confirm-ok').addEventListener('click', handleConfirm);

            // Fechar ao clicar no overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            });

            // Fechar com ESC
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    handleCancel();
                }
            });
        });
    }

    // Tooltip
    static showTooltip(element, text, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 4px;
            font-size: var(--font-size-sm);
            white-space: nowrap;
            z-index: 4000;
            pointer-events: none;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 5;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = rect.bottom + 5;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - 5;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + 5;
                break;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        // Auto-remover após 3 segundos
        setTimeout(() => {
            if (tooltip.parentElement) {
                tooltip.remove();
            }
        }, 3000);

        return tooltip;
    }

    // Debounce para funções
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle para funções
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Detectar se está em mobile
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Detectar se está em tablet
    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    // Detectar se está em desktop
    static isDesktop() {
        return window.innerWidth > 1024;
    }

    // Copiar texto para clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (error) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    // Download de dados como JSON
    static downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    // Formatação de moeda brasileira
    static formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Calcular idade baseada na data de nascimento
    static calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }
}

// Exportar para uso global
window.UIHelpers = UIHelpers;



