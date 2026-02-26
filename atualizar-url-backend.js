// Script para atualizar URL do backend nos arquivos do frontend
// Uso: node atualizar-url-backend.js "https://seu-backend.vercel.app"

const fs = require('fs');
const path = require('path');

// Obter URL do backend da linha de comando
const newBackendUrl = process.argv[2];

if (!newBackendUrl) {
  console.error('❌ Erro: URL do backend não fornecida!');
  console.log('\n📝 Uso:');
  console.log('   node atualizar-url-backend.js "https://seu-backend.vercel.app"');
  console.log('\n💡 Exemplo:');
  console.log('   node atualizar-url-backend.js "https://agendamentoup-backend.vercel.app"');
  process.exit(1);
}

// Remover barra final se houver
const cleanUrl = newBackendUrl.replace(/\/$/, '');
const apiUrl = `${cleanUrl}/api`;

console.log('🔄 Atualizando URLs do backend...');
console.log(`📡 Nova URL: ${apiUrl}`);
console.log('');

// Arquivos para atualizar
const filesToUpdate = [
  {
    path: 'frontend/js/config-api.js',
    patterns: [
      {
        old: /https:\/\/agendamentoup\.onrender\.com\/api/g,
        new: apiUrl
      },
      {
        old: /https:\/\/evaagendamento\.onrender\.com\/api/g,
        new: apiUrl
      }
    ]
  },
  {
    path: 'frontend/js/auth.js',
    patterns: [
      {
        old: /https:\/\/agendamentoup\.onrender\.com/g,
        new: cleanUrl
      },
      {
        old: /https:\/\/evaagendamento\.onrender\.com/g,
        new: cleanUrl
      }
    ]
  },
  {
    path: 'frontend/index.html',
    patterns: [
      {
        old: /https:\/\/agendamentoup\.onrender\.com\/api/g,
        new: apiUrl
      }
    ]
  },
  {
    path: 'frontend/css/index.html',
    patterns: [
      {
        old: /https:\/\/evaagendamento\.onrender\.com\/api/g,
        new: apiUrl
      }
    ]
  }
];

let updatedFiles = 0;
let totalReplacements = 0;

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo não encontrado: ${file.path}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileUpdated = false;
  let fileReplacements = 0;

  file.patterns.forEach(pattern => {
    const matches = content.match(pattern.old);
    if (matches) {
      content = content.replace(pattern.old, pattern.new);
      fileReplacements += matches.length;
      fileUpdated = true;
    }
  });

  if (fileUpdated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file.path} - ${fileReplacements} substituição(ões)`);
    updatedFiles++;
    totalReplacements += fileReplacements;
  } else {
    console.log(`ℹ️  ${file.path} - Nenhuma alteração necessária`);
  }
});

console.log('');
console.log('========================================');
console.log(`✅ Atualização concluída!`);
console.log(`📝 Arquivos atualizados: ${updatedFiles}`);
console.log(`🔄 Total de substituições: ${totalReplacements}`);
console.log('========================================');
console.log('');
console.log('🚀 Agora você pode fazer deploy no Firebase:');
console.log('   firebase deploy --only hosting');


