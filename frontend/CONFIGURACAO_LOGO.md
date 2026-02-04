# Configuração da Logo - EvAgendamento

## Como Adicionar uma Logo

### Passo 1: Preparar a Imagem da Logo
1. Coloque sua imagem da logo na pasta `frontend/assets/`
2. Formatos suportados: PNG, JPG, JPEG, SVG, WebP
3. Tamanho recomendado: máximo 200x200 pixels
4. Nomeie o arquivo como `logo.png` ou `logo.jpg`

### Passo 2: Configurar a Logo
Abra o arquivo `frontend/js/config.js` e localize a seção `CONFIG.logo`:

```javascript
logo: {
    path: "logo.png",           // ← ALTERE AQUI o nome do seu arquivo
    width: "80px",              // ← Largura da logo
    maxHeight: "60px",          // ← Altura máxima
    alt: "Logo EvAgendamento"   // ← Texto alternativo
}
```

### Exemplos de Configuração

#### Logo SVG (recomendado):
```javascript
path: "logo.svg"
```

#### Logo PNG:
```javascript
path: "minha-logo.png"
```

#### Logo em subpasta:
```javascript
path: "images/logo.svg"
```

#### Logo de URL externa:
```javascript
path: "https://meusite.com/logo.png"
```

#### Logo maior:
```javascript
width: "120px",
maxHeight: "80px"
```

### Passo 3: Testar
1. Salve o arquivo `config.js`
2. Abra o navegador e acesse a aplicação
3. A logo deve aparecer acima do texto "EvAgendamento"

## Dicas

- **Transparência**: Use PNG com fundo transparente para melhor integração
- **Tamanho**: Mantenha a logo proporcional para não quebrar o layout
- **Qualidade**: Use imagens de alta qualidade que não pixelizem
- **Acessibilidade**: Configure o `alt` com uma descrição adequada da logo

## Solução de Problemas

### Logo não aparece:
- Verifique se o arquivo existe na pasta `assets/`
- Confirme se o nome do arquivo está correto no `config.js`
- Verifique se há erros no console do navegador (F12)

### Logo aparece cortada:
- Ajuste o `maxHeight` para um valor maior
- Redimensione a imagem original

### Logo muito pequena/grande:
- Ajuste os valores de `width` e `maxHeight`

## Estrutura de Arquivos
```
frontend/
├── assets/
│   └── logo.png          ← SUA LOGO AQUI
├── js/
│   └── config.js         ← CONFIGURAÇÕES
├── css/
│   └── styles.css        ← ESTILOS
└── index.html            ← PÁGINA PRINCIPAL
```
