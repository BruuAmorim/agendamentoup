# 🚀 Como Iniciar o Sistema EvAgendamento

## Início Rápido

Execute o arquivo `start-system.bat` para iniciar automaticamente ambos os servidores:

```bash
start-system.bat
```

## URLs de Acesso

Após iniciar o sistema, acesse:

- **Login:** http://localhost:8080/css/index.html
- **Admin:** http://localhost:8080/admin/dashboard
- **Usuário:** http://localhost:8080/app/agendamentos

## API REST (Integrações Externas)

- **API Base:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health
- **Horários Disponíveis:** http://localhost:3000/api/slots/:date
- **Documentação:** http://localhost:3000/api/health

## Contas de Teste

- **Admin:** brunadevv@gmail.com / admin123
- **Usuário:** usuarioteste@gmail.com / Mudar@123

## Solução de Problemas

Se receber "ERR_CONNECTION_REFUSED":

1. Certifique-se de que executou `start-system.bat`
2. Verifique se as portas 3000 (backend) e 8080 (frontend) estão livres
3. Se necessário, mate processos nas portas:
   ```bash
   # Windows - matar processo na porta
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

## Arquitetura

- **Backend:** Node.js + Express (porta 3000)
- **Frontend:** HTML/CSS/JS + http-server (porta 8080)
- **Banco:** SQLite (desenvolvimento)</contents>
</xai:function_call">Iniciar o Sistema EvAgendamento

## Início Rápido

Execute o arquivo `start-system.bat` para iniciar automaticamente ambos os servidores:

```bash
start-system.bat
```

## URLs de Acesso

Após iniciar o sistema, acesse:

- **Login:** http://localhost:8080/css/index.html
- **Admin:** http://localhost:8080/admin/dashboard
- **Usuário:** http://localhost:8080/app/agendamentos

## API REST (Integrações Externas)

- **API Base:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health
- **Horários Disponíveis:** http://localhost:3000/api/slots/:date
- **Documentação:** http://localhost:3000/api/health

## Contas de Teste

- **Admin:** brunadevv@gmail.com / admin123
- **Usuário:** usuarioteste@gmail.com / Mudar@123

## Solução de Problemas

Se receber "ERR_CONNECTION_REFUSED":

1. Certifique-se de que executou `start-system.bat`
2. Verifique se as portas 3000 (backend) e 8080 (frontend) estão livres
3. Se necessário, mate processos nas portas:
   ```bash
   # Windows - matar processo na porta
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

## Arquitetura

- **Backend:** Node.js + Express (porta 3000)
- **Frontend:** HTML/CSS/JS + http-server (porta 8080)
- **Banco:** SQLite (desenvolvimento)







