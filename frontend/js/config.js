// Configurações da Logo e Interface
// Este arquivo permite configurar facilmente a logo e outras propriedades da interface

const CONFIG = {
    // Configurações da Logo
    logo: {
        // Caminho para a imagem da logo (relativo à pasta assets/)
        // Exemplos:
        // - "logo.png" (logo na pasta assets)
        // - "images/logo.svg" (logo em subpasta)
        // - "https://exemplo.com/logo.png" (URL externa)
        path: "logo.png",

       // Propriedades da Logo
    width: "auto",      // Deixe a largura automática para não esticar
    maxHeight: "80px",  // Aumente um pouco a altura (estava 60px) se necessário
    alt: "Logo EvaCloud"
    },

    // Configurações do Tema
    theme: {
        default: "dark",        // "dark" ou "light"
        showToggle: true        // Mostrar botão de alternar tema
    },

    // Configurações do Sistema
    system: {
        title: "EvAgendamento - Sistema de Agendamento Inteligente",
        tagline: "Sistema de Agendamento Inteligente"
    }
};

// Função para aplicar as configurações
function applyConfig() {
    // Aplicar configuração da logo
    const logoImage = document.getElementById('logoImage');
    if (logoImage && CONFIG.logo.path) {
        logoImage.src = `assets/${CONFIG.logo.path}`;
        logoImage.style.width = CONFIG.logo.width;
        logoImage.style.maxHeight = CONFIG.logo.maxHeight;
        logoImage.alt = CONFIG.logo.alt;

        // Verificar se a logo carregou com sucesso
        logoImage.onload = function() {
            logoImage.style.display = 'block';
        };

        logoImage.onerror = function() {
            console.warn(`Logo não encontrada: assets/${CONFIG.logo.path}. Verifique se o arquivo existe.`);
            logoImage.style.display = 'none';
        };
    }

    // Aplicar configurações do tema
    if (CONFIG.theme.default === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // Ocultar botão de toggle se necessário
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && !CONFIG.theme.showToggle) {
        themeToggle.style.display = 'none';
    }

    // Aplicar configurações do sistema
    document.title = CONFIG.system.title;
    const tagline = document.querySelector('.tagline');
    if (tagline) {
        tagline.textContent = CONFIG.system.tagline;
    }
}

// Inicializar configurações quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', applyConfig);
